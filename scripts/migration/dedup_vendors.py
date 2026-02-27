"""
Identifica e opcionalmente resolve duplicatas de vendors no Supabase.

US-FIN-031 — Fase 10 Modulo Financeiro
Documentacao: docs/architecture/fase-10-modulo-financeiro-architecture.md (ADR-024)

Uso:
    # Apenas gera relatorio YAML (padrao)
    python scripts/migration/dedup_vendors.py --tenant-id UUID

    # Modo interativo: perguntar qual vendor manter em cada cluster
    python scripts/migration/dedup_vendors.py --tenant-id UUID --interactive

    # Aplica o merge de acordo com dedup_report.yaml existente
    python scripts/migration/dedup_vendors.py --tenant-id UUID --apply --report dedup_report.yaml

Variaveis de ambiente obrigatorias:
    SUPABASE_URL             URL do projeto Supabase
    SUPABASE_SERVICE_ROLE_KEY  Chave service_role (bypass RLS)
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
import yaml

# ---------------------------------------------------------------------------
# Cores ANSI
# ---------------------------------------------------------------------------

GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
CYAN = "\033[96m"
BOLD = "\033[1m"


# ---------------------------------------------------------------------------
# Utilitarios de log
# ---------------------------------------------------------------------------

def log_ok(msg: str) -> None:
    print(f"{GREEN}[OK   ] {msg}{RESET}")


def log_skip(msg: str) -> None:
    print(f"{YELLOW}[SKIP ] {msg}{RESET}")


def log_error(msg: str) -> None:
    print(f"{RED}[ERROR] {msg}{RESET}")


def log_info(msg: str) -> None:
    print(f"{CYAN}[INFO ] {msg}{RESET}")


# ---------------------------------------------------------------------------
# Normalizacao de nome (replica normalize_vendor_name() do PostgreSQL)
# ---------------------------------------------------------------------------

def normalize_name(name: str) -> str:
    """
    Normaliza nome igual ao PostgreSQL normalize_vendor_name():
    lower + trim + remove acentos + remove caracteres especiais (exceto espaco e hifen).
    """
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", "", ascii_str)
    return cleaned.lower().strip()


# ---------------------------------------------------------------------------
# Cliente Supabase REST API
# ---------------------------------------------------------------------------

class SupabaseClient:
    """Cliente simples para a REST API do Supabase usando service_role key."""

    def __init__(self, url: str, key: str):
        self.base_url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _url(self, table: str) -> str:
        return f"{self.base_url}/rest/v1/{table}"

    def select_all(self, table: str, filters: Optional[Dict] = None) -> List[Dict]:
        """
        GET paginado de todos os registros.
        Supabase limita 1000 por request — usa Range header para paginar.
        """
        all_rows: List[Dict] = []
        page_size = 1000
        offset = 0

        while True:
            hdrs = dict(self.headers)
            hdrs["Range"] = f"{offset}-{offset + page_size - 1}"
            params = dict(filters or {})
            resp = requests.get(self._url(table), headers=hdrs, params=params)
            resp.raise_for_status()
            page = resp.json()
            if not page:
                break
            all_rows.extend(page)
            if len(page) < page_size:
                break
            offset += page_size

        return all_rows

    def post_merge(self, vendor_id: str, alias_ids: List[str]) -> Dict:
        """
        Chama POST /vendors/:id/merge via Edge Function vendors.
        O endpoint reatribui cost_items e bank_accounts dos aliases para o primario
        e marca os aliases como deleted.
        """
        url = f"{self.base_url}/functions/v1/vendors"
        payload = {
            "action": "merge",
            "primary_vendor_id": vendor_id,
            "alias_vendor_ids": alias_ids,
        }
        resp = requests.post(
            url,
            headers=self.headers,
            data=json.dumps(payload),
        )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Agrupamento de duplicatas
# ---------------------------------------------------------------------------

def build_clusters(vendors: List[Dict]) -> List[List[Dict]]:
    """
    Agrupa vendors por normalized_name.
    Retorna apenas clusters com 2+ vendors (duplicatas reais).
    Usa normalized_name do banco se disponivel, senao recalcula localmente.
    """
    groups: Dict[str, List[Dict]] = {}
    for v in vendors:
        # Prefere o normalized_name armazenado (GENERATED column do Postgres)
        norm = v.get("normalized_name") or normalize_name(v.get("full_name", ""))
        groups.setdefault(norm, []).append(v)

    clusters = [grp for grp in groups.values() if len(grp) > 1]
    # Ordena cada cluster por data de criacao (mais antigo primeiro = candidato a primario)
    for cluster in clusters:
        cluster.sort(key=lambda v: v.get("created_at", ""))

    return clusters


def choose_primary_interactive(cluster: List[Dict]) -> Optional[Dict]:
    """
    Modo interativo: exibe os vendors do cluster e pede ao usuario escolher o principal.
    """
    print()
    print(f"{BOLD}Cluster de duplicatas (normalized: '{cluster[0].get('normalized_name')}'):{RESET}")
    for i, v in enumerate(cluster):
        print(
            f"  [{i + 1}] id={v['id'][:8]}... | "
            f"nome='{v.get('full_name')}' | "
            f"email={v.get('email')} | "
            f"cpf={v.get('cpf')} | "
            f"cnpj={v.get('cnpj')} | "
            f"criado={v.get('created_at', '')[:10]}"
        )

    while True:
        choice = input(
            f"  Qual manter como principal? [1-{len(cluster)}] ou 's' para pular: "
        ).strip()
        if choice.lower() == "s":
            return None
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(cluster):
                return cluster[idx]
        except ValueError:
            pass
        print(f"  {RED}Opcao invalida. Digite um numero entre 1 e {len(cluster)} ou 's'.{RESET}")


# ---------------------------------------------------------------------------
# Geracao do relatorio YAML
# ---------------------------------------------------------------------------

def build_report(clusters: List[List[Dict]]) -> Dict:
    """
    Constroi estrutura de relatorio para serializar em YAML.
    O primeiro vendor de cada cluster e sugerido como primario (mais antigo).
    """
    report_clusters = []
    for cluster in clusters:
        primary = cluster[0]
        aliases = cluster[1:]
        report_clusters.append({
            "primary_vendor_id": primary["id"],
            "primary_name": primary.get("full_name", ""),
            "primary_email": primary.get("email"),
            "primary_cpf": primary.get("cpf"),
            "primary_cnpj": primary.get("cnpj"),
            "normalized_name": primary.get("normalized_name", ""),
            "aliases": [
                {
                    "vendor_id": a["id"],
                    "name": a.get("full_name", ""),
                    "email": a.get("email"),
                    "cpf": a.get("cpf"),
                    "cnpj": a.get("cnpj"),
                    "created_at": a.get("created_at", "")[:10],
                }
                for a in aliases
            ],
            "action": "merge",  # ou 'skip' — editavel manualmente
        })
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_clusters": len(clusters),
        "total_duplicate_vendors": sum(len(c) - 1 for c in clusters),
        "clusters": report_clusters,
    }


# ---------------------------------------------------------------------------
# Aplicacao do merge
# ---------------------------------------------------------------------------

def apply_merges(
    client: SupabaseClient,
    report: Dict,
    dry_run: bool,
) -> Dict:
    """
    Para cada cluster com action='merge' no relatorio, chama o endpoint de merge.
    """
    counters = {"merged": 0, "skipped": 0, "errors": 0}

    for cluster in report.get("clusters", []):
        action = cluster.get("action", "merge")
        if action != "merge":
            log_skip(
                f"Cluster '{cluster.get('primary_name')}': action='{action}', pulando."
            )
            counters["skipped"] += 1
            continue

        primary_id = cluster.get("primary_vendor_id")
        alias_ids = [a["vendor_id"] for a in cluster.get("aliases", [])]

        if not alias_ids:
            log_skip(f"Cluster '{cluster.get('primary_name')}': sem aliases, pulando.")
            counters["skipped"] += 1
            continue

        if dry_run:
            log_skip(
                f"[DRY-RUN] Merge: primario={primary_id[:8]}... aliases={[a[:8] for a in alias_ids]}"
            )
            counters["skipped"] += 1
            continue

        try:
            result = client.post_merge(primary_id, alias_ids)
            log_ok(
                f"Merge OK: '{cluster.get('primary_name')}' "
                f"absorveu {len(alias_ids)} alias(es). Resposta: {result}"
            )
            counters["merged"] += 1
        except Exception as exc:
            log_error(
                f"Falha ao mergear cluster '{cluster.get('primary_name')}': {exc}"
            )
            counters["errors"] += 1

    return counters


# ---------------------------------------------------------------------------
# Fluxo principal
# ---------------------------------------------------------------------------

def run(args: argparse.Namespace) -> None:
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        log_error(
            "Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias."
        )
        sys.exit(1)

    if not args.tenant_id:
        log_error("--tenant-id e obrigatorio.")
        sys.exit(1)

    client = SupabaseClient(supabase_url, service_key)

    # Modo --apply: le relatorio existente e aplica merges
    if args.apply:
        report_path = getattr(args, "report", "scripts/migration/dedup_report.yaml")
        if not os.path.isfile(report_path):
            log_error(f"Relatorio nao encontrado: {report_path}")
            sys.exit(1)
        with open(report_path, encoding="utf-8") as f:
            report = yaml.safe_load(f)

        log_info(
            f"Aplicando merges do relatorio: {report_path} "
            f"({report.get('total_clusters', 0)} clusters)"
        )
        counters = apply_merges(client, report, dry_run=args.dry_run)

        print()
        print(f"{BOLD}{'=' * 50}{RESET}")
        print(f"{BOLD}  RESULTADO DO MERGE{RESET}")
        print(f"{'=' * 50}")
        print(f"{GREEN}  Clusters mergeados: {counters['merged']}{RESET}")
        print(f"{YELLOW}  Pulados:            {counters['skipped']}{RESET}")
        print(f"{RED}  Erros:              {counters['errors']}{RESET}")
        print(f"{'=' * 50}")
        return

    # Busca todos os vendors do tenant
    log_info(f"Buscando vendors do tenant {args.tenant_id}...")
    try:
        vendors = client.select_all(
            "vendors",
            {
                "tenant_id": f"eq.{args.tenant_id}",
                "deleted_at": "is.null",
                "select": "id,full_name,normalized_name,email,cpf,cnpj,created_at,import_source",
            },
        )
    except Exception as exc:
        log_error(f"Falha ao buscar vendors: {exc}")
        sys.exit(1)

    log_info(f"Total de vendors encontrados: {len(vendors)}")

    clusters = build_clusters(vendors)
    log_info(f"Clusters de duplicatas encontrados: {len(clusters)}")

    if not clusters:
        log_ok("Nenhuma duplicata encontrada. Base de vendors esta limpa.")
        return

    # Contagem de duplicatas
    total_dups = sum(len(c) - 1 for c in clusters)
    log_info(f"Total de vendors duplicados (a remover): {total_dups}")

    # Modo interativo
    if args.interactive:
        report_clusters = []
        for cluster in clusters:
            primary = choose_primary_interactive(cluster)
            if primary is None:
                for v in cluster:
                    report_clusters.append(
                        {
                            "primary_vendor_id": v["id"],
                            "primary_name": v.get("full_name", ""),
                            "aliases": [],
                            "action": "skip",
                        }
                    )
                continue

            aliases = [v for v in cluster if v["id"] != primary["id"]]
            report_clusters.append(
                {
                    "primary_vendor_id": primary["id"],
                    "primary_name": primary.get("full_name", ""),
                    "primary_email": primary.get("email"),
                    "normalized_name": primary.get("normalized_name", ""),
                    "aliases": [
                        {
                            "vendor_id": a["id"],
                            "name": a.get("full_name", ""),
                            "email": a.get("email"),
                        }
                        for a in aliases
                    ],
                    "action": "merge",
                }
            )

        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "mode": "interactive",
            "total_clusters": len(report_clusters),
            "clusters": report_clusters,
        }
    else:
        # Modo report automatico
        report = build_report(clusters)

    # Salva relatorio YAML
    report_path = getattr(args, "report", "scripts/migration/dedup_report.yaml")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        yaml.dump(report, f, allow_unicode=True, sort_keys=False, default_flow_style=False)

    log_ok(f"Relatorio salvo em: {report_path}")

    # Exibe resumo no terminal
    print()
    print(f"{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  RELATORIO DE DEDUP: vendors{RESET}")
    print(f"{'=' * 60}")
    print(f"  Total de vendors: {len(vendors)}")
    print(f"  Clusters duplicatas: {len(clusters)}")
    print(f"{RED}  Vendors duplicados (a remover): {total_dups}{RESET}")
    print()
    print(f"  Clusters encontrados:")
    for c in clusters[:20]:  # Limita exibicao a 20 clusters
        primary = c[0]
        aliases_names = ", ".join(v.get("full_name", "") for v in c[1:])
        print(
            f"  - '{primary.get('full_name')}' "
            f"({len(c) - 1} alias): {aliases_names}"
        )
    if len(clusters) > 20:
        print(f"  ... e mais {len(clusters) - 20} clusters (ver {report_path})")
    print()
    print(
        f"  Para aplicar merges: python scripts/migration/dedup_vendors.py "
        f"--tenant-id {args.tenant_id} --apply --report {report_path}"
    )
    print(f"{'=' * 60}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Identifica duplicatas de vendors no Supabase e gera relatorio YAML."
    )
    parser.add_argument(
        "--tenant-id",
        required=True,
        dest="tenant_id",
        help="UUID do tenant no Supabase",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Modo interativo: perguntar qual vendor manter em cada cluster",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplica o merge conforme relatorio YAML existente",
    )
    parser.add_argument(
        "--report",
        default="scripts/migration/dedup_report.yaml",
        help="Caminho do arquivo YAML de saida (ou entrada com --apply)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Com --apply: simula merges sem persistir",
    )

    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
