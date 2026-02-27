"""
Importa EQUIPE.csv para tabelas vendors + bank_accounts no Supabase.

US-FIN-032 — Fase 10 Modulo Financeiro
Documentacao: docs/specs/analise-custos-reais-detalhada.md (secao 2)

Uso:
    python scripts/migration/import_equipe.py --csv PATH --tenant-id UUID [--dry-run] [--verbose]

Variaveis de ambiente obrigatorias:
    SUPABASE_URL             URL do projeto Supabase (ex: https://xxx.supabase.co)
    SUPABASE_SERVICE_ROLE_KEY  Chave service_role (bypass RLS)
"""

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import requests

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

# Mapeamento de texto livre de banco -> (codigo_ispb, nome_canonico)
BANK_NORMALIZE = {
    "nubank": ("260", "Nu Pagamentos"),
    "nu bank": ("260", "Nu Pagamentos"),
    "nu": ("260", "Nu Pagamentos"),
    "260": ("260", "Nu Pagamentos"),
    "itau": ("341", "Itau Unibanco"),
    "itaú": ("341", "Itau Unibanco"),
    "itaú ": ("341", "Itau Unibanco"),
    "itau ": ("341", "Itau Unibanco"),
    "bradesco": ("237", "Bradesco"),
    "banco do brasil": ("001", "Banco do Brasil"),
    "bb": ("001", "Banco do Brasil"),
    "caixa": ("104", "Caixa Economica Federal"),
    "cef": ("104", "Caixa Economica Federal"),
    "santander": ("033", "Santander"),
    "inter": ("077", "Banco Inter"),
    "banco inter": ("077", "Banco Inter"),
    "077-bancointer": ("077", "Banco Inter"),
    "c6": ("336", "C6 Bank"),
    "c6 bank": ("336", "C6 Bank"),
    "picpay": ("380", "PicPay"),
    "mercado pago": ("323", "Mercado Pago"),
    "safra": ("422", "Safra"),
    "sicoob": ("756", "Sicoob"),
    "sicredi": ("748", "Sicredi"),
    "original": ("212", "Banco Original"),
    "neon": ("655", "Neon"),
    "next": ("237", "Bradesco"),  # Next e marca do Bradesco
    "pagbank": ("290", "PagBank"),
    "pagseguro": ("290", "PagBank"),
    "cora": ("403", "Cora"),
    "stone": ("197", "Stone"),
    "xp": ("102", "XP Investimentos"),
    "will": ("280", "Will Bank"),
}

# Cores ANSI para output no terminal
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
CYAN = "\033[96m"
BOLD = "\033[1m"


# ---------------------------------------------------------------------------
# Utilitarios de log
# ---------------------------------------------------------------------------

def log(msg: str, level: str = "INFO", verbose: bool = False) -> None:
    """Imprime mensagem com timestamp e cor conforme nivel."""
    if level == "DEBUG" and not verbose:
        return
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    color = {
        "OK": GREEN,
        "SKIP": YELLOW,
        "ERROR": RED,
        "INFO": CYAN,
        "DEBUG": RESET,
    }.get(level, RESET)
    print(f"{color}[{now}] [{level:5s}] {msg}{RESET}")


def log_ok(msg: str) -> None:
    log(msg, "OK")


def log_skip(msg: str) -> None:
    log(msg, "SKIP")


def log_error(msg: str) -> None:
    log(msg, "ERROR")


def log_info(msg: str) -> None:
    log(msg, "INFO")


# ---------------------------------------------------------------------------
# Normalizacao de texto
# ---------------------------------------------------------------------------

def normalize_name(name: str) -> str:
    """
    Normaliza nome de vendor igual ao PostgreSQL normalize_vendor_name().
    Lower + trim + remove acentos + remove caracteres especiais (exceto espaco e hifen).
    """
    # Remove acentos via unicodedata (equivalente ao unaccent do Postgres)
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    # Remove tudo que nao for alfanumerico, espaco ou hifen
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", "", ascii_str)
    return cleaned.lower().strip()


def only_digits(value: str) -> str:
    """Retorna apenas os digitos de uma string."""
    return re.sub(r"\D", "", value)


# ---------------------------------------------------------------------------
# Deteccao de tipo de documento e chave PIX
# ---------------------------------------------------------------------------

def detect_document_type(raw: str) -> dict:
    """
    Analisa campo bruto (col 3 da EQUIPE) e retorna:
    {
        entity_type: 'pf' | 'pj',
        cpf: str | None,
        cnpj: str | None,
        pix_key: str | None,
        pix_key_type: str | None,
    }
    """
    result = {
        "entity_type": "pf",
        "cpf": None,
        "cnpj": None,
        "pix_key": None,
        "pix_key_type": None,
    }

    if not raw or not raw.strip():
        return result

    raw = raw.strip()
    digits = only_digits(raw)

    # UUID / chave aleatoria PIX (formato: 8-4-4-4-12)
    uuid_pattern = re.compile(
        r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    )
    if uuid_pattern.match(raw):
        result["pix_key"] = raw
        result["pix_key_type"] = "aleatoria"
        return result

    # E-mail PIX
    if "@" in raw and "." in raw.split("@")[-1]:
        result["pix_key"] = raw.strip()
        result["pix_key_type"] = "email"
        # Sem informacao de CPF/CNPJ
        return result

    # CNPJ: 14 digitos
    if len(digits) == 14:
        result["entity_type"] = "pj"
        result["cnpj"] = digits
        result["pix_key"] = digits
        result["pix_key_type"] = "cnpj"
        return result

    # CPF: 11 digitos
    if len(digits) == 11:
        result["entity_type"] = "pf"
        result["cpf"] = digits
        result["pix_key"] = digits
        result["pix_key_type"] = "cpf"
        return result

    # Telefone: 8+ digitos (formato nacional ou internacional)
    if len(digits) >= 8:
        phone_clean = digits if not raw.startswith("+") else "+" + digits
        result["pix_key"] = phone_clean
        result["pix_key_type"] = "telefone"
        return result

    # Fallback: trata como chave aleatoria
    result["pix_key"] = raw
    result["pix_key_type"] = "aleatoria"
    return result


def normalize_bank(raw: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Normaliza texto livre de banco para (bank_code, bank_name).
    Retorna (None, None) se nao reconhecido.
    """
    if not raw or not raw.strip():
        return None, None

    key = raw.strip().lower()
    # Tenta match exato
    if key in BANK_NORMALIZE:
        return BANK_NORMALIZE[key]

    # Tenta match parcial (banco contem a chave)
    for k, v in BANK_NORMALIZE.items():
        if k in key:
            return v

    # Retorna o nome original sem codigo
    return None, raw.strip()


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

    def select(self, table: str, filters: Optional[Dict] = None) -> List[Dict]:
        """GET de registros com filtros opcionais."""
        params = filters or {}
        resp = requests.get(self._url(table), headers=self.headers, params=params)
        resp.raise_for_status()
        return resp.json()

    def insert(self, table: str, data: dict) -> dict:
        """POST para inserir um registro. Retorna o registro criado."""
        resp = requests.post(
            self._url(table),
            headers=self.headers,
            data=json.dumps(data),
        )
        resp.raise_for_status()
        result = resp.json()
        # Supabase retorna lista quando Prefer=return=representation
        return result[0] if isinstance(result, list) else result


# ---------------------------------------------------------------------------
# Logica principal de importacao
# ---------------------------------------------------------------------------

def find_existing_vendor(
    client: SupabaseClient, tenant_id: str, normalized: str, email: Optional[str]
) -> Optional[Dict]:
    """
    Busca vendor existente por normalized_name ou email.
    Retorna o primeiro match ou None.
    """
    # Busca por normalized_name
    try:
        rows = client.select(
            "vendors",
            {
                "tenant_id": f"eq.{tenant_id}",
                "normalized_name": f"eq.{normalized}",
                "deleted_at": "is.null",
            },
        )
        if rows:
            return rows[0]
    except Exception:
        pass

    # Busca secundaria por email (se disponivel)
    if email:
        try:
            rows = client.select(
                "vendors",
                {
                    "tenant_id": f"eq.{tenant_id}",
                    "email": f"eq.{email}",
                    "deleted_at": "is.null",
                },
            )
            if rows:
                return rows[0]
        except Exception:
            pass

    return None


def process_row(
    row: List[str],
    line_number: int,
    client: SupabaseClient,
    tenant_id: str,
    import_source: str,
    dry_run: bool,
    verbose: bool,
) -> Dict:
    """
    Processa uma linha do EQUIPE.csv e persiste (ou simula) vendor + bank_account.
    Retorna dicionario com resultado: {'status': 'created'|'skipped'|'error', 'detail': str}.
    """
    # Garante colunas suficientes
    while len(row) < 4:
        row.append("")

    raw_name = row[0].strip()
    raw_email = row[1].strip() if len(row) > 1 else ""
    raw_bank = row[2].strip() if len(row) > 2 else ""
    raw_doc = row[3].strip() if len(row) > 3 else ""

    if not raw_name:
        return {"status": "error", "detail": f"Linha {line_number}: nome vazio"}

    # Normaliza nome (title case para legibilidade)
    full_name = raw_name.title()
    normalized = normalize_name(raw_name)
    email = raw_email if raw_email else None

    # Detecta tipo de documento e PIX
    doc_info = detect_document_type(raw_doc)
    bank_code, bank_name = normalize_bank(raw_bank)

    log(
        f"Linha {line_number}: {full_name} | email={email} | "
        f"entity={doc_info['entity_type']} | bank={bank_name}",
        "DEBUG",
        verbose,
    )

    if dry_run:
        log_skip(
            f"[DRY-RUN] Linha {line_number}: criaria vendor '{full_name}' "
            f"({doc_info['entity_type']}) + bank_account"
        )
        return {"status": "dry_run", "detail": f"Vendor: {full_name}"}

    # Verifica se ja existe
    existing = find_existing_vendor(client, tenant_id, normalized, email)
    if existing:
        log_skip(
            f"Linha {line_number}: vendor '{full_name}' ja existe "
            f"(id={existing['id']}, normalized='{existing['normalized_name']}')"
        )
        return {
            "status": "skipped",
            "detail": f"Vendor existente: {existing['id']}",
            "vendor_id": existing["id"],
        }

    # Monta payload do vendor
    vendor_payload = {
        "tenant_id": tenant_id,
        "full_name": full_name,
        "entity_type": doc_info["entity_type"],
        "email": email,
        "import_source": import_source,
    }
    if doc_info["cpf"]:
        vendor_payload["cpf"] = doc_info["cpf"]
    if doc_info["cnpj"]:
        vendor_payload["cnpj"] = doc_info["cnpj"]

    try:
        vendor = client.insert("vendors", vendor_payload)
        vendor_id = vendor["id"]
        log_ok(f"Linha {line_number}: vendor criado '{full_name}' (id={vendor_id})")
    except Exception as exc:
        log_error(f"Linha {line_number}: falha ao criar vendor '{full_name}': {exc}")
        return {"status": "error", "detail": str(exc)}

    # Monta payload da conta bancaria
    bank_payload: dict = {
        "tenant_id": tenant_id,
        "vendor_id": vendor_id,
        "is_primary": True,
    }
    if bank_name:
        bank_payload["bank_name"] = bank_name
    if bank_code:
        bank_payload["bank_code"] = bank_code
    if doc_info["pix_key"]:
        bank_payload["pix_key"] = doc_info["pix_key"]
        bank_payload["pix_key_type"] = doc_info["pix_key_type"]

    try:
        client.insert("bank_accounts", bank_payload)
        log_ok(
            f"  bank_account criada para '{full_name}' "
            f"(bank={bank_name}, pix_type={doc_info['pix_key_type']})"
        )
    except Exception as exc:
        log_error(
            f"  Falha ao criar bank_account para vendor {vendor_id}: {exc}. "
            "Vendor foi criado, corrija manualmente."
        )
        return {
            "status": "partial",
            "detail": f"Vendor criado mas bank_account falhou: {exc}",
            "vendor_id": vendor_id,
        }

    return {"status": "created", "vendor_id": vendor_id}


def read_csv(path: str) -> List[List[str]]:
    """
    Le CSV com tentativa de encoding utf-8-sig, fallback para latin-1.
    Retorna lista de linhas (cada linha e lista de strings).
    """
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            with open(path, newline="", encoding=encoding) as f:
                reader = csv.reader(f)
                rows = list(reader)
            return rows
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Nao foi possivel ler o arquivo com encodings utf-8-sig ou latin-1: {path}")


def run(args: argparse.Namespace) -> None:
    """Executa a importacao completa."""
    # Valida variaveis de ambiente
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

    log_info(f"Lendo CSV: {args.csv}")
    rows = read_csv(args.csv)
    log_info(f"Total de linhas encontradas: {len(rows)}")

    client = SupabaseClient(supabase_url, service_key)
    import_source = f"migration_equipe_{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    # Contadores
    counters = {
        "created": 0,
        "skipped": 0,
        "errors": 0,
        "dry_run": 0,
        "bank_accounts": 0,
    }

    for i, row in enumerate(rows, start=1):
        # Pula linhas completamente vazias
        if not any(cell.strip() for cell in row):
            continue

        try:
            result = process_row(
                row,
                i,
                client,
                args.tenant_id,
                import_source,
                args.dry_run,
                args.verbose,
            )
            status = result["status"]
            if status == "created":
                counters["created"] += 1
                counters["bank_accounts"] += 1
            elif status == "partial":
                counters["created"] += 1  # vendor criado
                counters["errors"] += 1   # bank_account falhou
            elif status == "skipped":
                counters["skipped"] += 1
            elif status == "dry_run":
                counters["dry_run"] += 1
            else:
                counters["errors"] += 1
        except Exception as exc:
            log_error(f"Linha {i}: excecao inesperada: {exc}")
            counters["errors"] += 1

    # Relatorio final
    print()
    print(f"{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  RELATORIO DE IMPORTACAO: EQUIPE.csv{RESET}")
    print(f"{'=' * 60}")
    if args.dry_run:
        print(f"{YELLOW}  MODO DRY-RUN: nenhum dado foi persistido{RESET}")
        print(f"  Simulacoes: {counters['dry_run']}")
    else:
        print(f"{GREEN}  Vendors criados:        {counters['created']}{RESET}")
        print(f"{YELLOW}  Duplicatas ignoradas:   {counters['skipped']}{RESET}")
        print(f"{GREEN}  Bank accounts criadas:  {counters['bank_accounts']}{RESET}")
        print(f"{RED}  Linhas com erro:        {counters['errors']}{RESET}")
    print(f"{'=' * 60}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Importa EQUIPE.csv para vendors + bank_accounts no Supabase."
    )
    parser.add_argument(
        "--csv",
        required=True,
        help="Caminho para o arquivo EQUIPE.csv",
    )
    parser.add_argument(
        "--tenant-id",
        required=True,
        dest="tenant_id",
        help="UUID do tenant no Supabase",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Simula a importacao sem persistir dados",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Exibe logs detalhados (DEBUG)",
    )

    args = parser.parse_args()

    if not os.path.isfile(args.csv):
        log_error(f"Arquivo nao encontrado: {args.csv}")
        sys.exit(1)

    run(args)


if __name__ == "__main__":
    main()
