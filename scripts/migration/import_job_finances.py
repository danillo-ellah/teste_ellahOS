"""
Importa CUSTOS_REAIS.csv para tabela cost_items no Supabase.

US-FIN-030 — Fase 10 Modulo Financeiro
Documentacao: docs/specs/analise-custos-reais-detalhada.md (secao 1 — mapeamento completo das 38 colunas)

Uso:
    python scripts/migration/import_job_finances.py \\
        --csv PATH \\
        --job-id UUID \\
        --tenant-id UUID \\
        [--dry-run] \\
        [--verbose]

Variaveis de ambiente obrigatorias:
    SUPABASE_URL               URL do projeto Supabase (ex: https://xxx.supabase.co)
    SUPABASE_SERVICE_ROLE_KEY  Chave service_role (bypass RLS)

Mapeamento de colunas do CSV (indices fixos, linha 18 = header):
    0:  ID (ignorar — sequencial da planilha)
    1:  JOB ID (numero do job na planilha, para validacao)
    2:  Item (item_number: 1-15 e 99)
    3:  Sub Item (sub_item_number: 0=cabecalho de categoria)
    4:  Destino da Verba (service_description)
    5:  Valor UNITARIO (unit_value, formato "R$  1.000,00")
    6:  Qtde (quantity)
    7:  Valor Total s/ HE (ignorado — GENERATED na tabela)
    8:  Fornecedor/Valor TOTAL (diverge entre jobs — ver nota na analise; ignorado)
    9:  Fornecedor (vendor_name_snapshot — nome do fornecedor)
    10: C/NF ou S/NF (payment_condition)
    11: Hora de Entrada (nota: "PAGO" = hack de controle; ignorado)
    12-15: Hora Extra (nao usados nos jobs analisados)
    16: OBSERVACOES (notes)
    17: DATA PAGAMENTO (payment_due_date, formato DD/MM/AAAA)
    18: TELEFONE (ignorado)
    19: E-MAIL (vendor_email_snapshot)
    20: Razao Social (vendor_name_snapshot se col 9 vazia)
    21: Titular / Favorecido (ignorado)
    22: CNPJ / CPF (ignorado — dado vem da EQUIPE via vendor_id)
    23: Banco (vendor_bank_snapshot)
    24-26: Agencia, Conta, Tipo (ignorados)
    27: PIX (vendor_pix_snapshot)
    28: PEDIDO NF (nf_request_status)
    29: FORNECEU NF? (nf_document recebido, nao persiste aqui)
    30: NF (nf_drive_url ou nf_filename)
    31: PAGO? (payment_status)
    32: Quando? (payment_date, formato DD/MM/AAAA)
    33: COMPROVANTE PAGAMENTO (payment_proof_filename)
    34-37: Colunas ocultas/formula (ignoradas na importacao — dados ja processados acima)
"""

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests

# ---------------------------------------------------------------------------
# Constantes de mapeamento
# ---------------------------------------------------------------------------

# Condicoes de pagamento: texto livre -> ENUM da tabela cost_items
PAYMENT_CONDITION_MAP = {
    "à vista": "a_vista",
    "a vista": "a_vista",
    "a_vista": "a_vista",
    "c/nf 30 dias": "cnf_30",
    "cnf 30": "cnf_30",
    "c/nf 40 dias": "cnf_40",
    "cnf 40": "cnf_40",
    "c/nf 45 dias": "cnf_45",
    "cnf 45": "cnf_45",
    "c/nf 60 dias": "cnf_60",
    "cnf 60": "cnf_60",
    "c/nf 90 dias": "cnf_90",
    "cnf 90": "cnf_90",
    "s/nf 30 dias": "snf_30",
    "snf 30": "snf_30",
}

# Status de pagamento: texto livre -> ENUM da tabela cost_items
PAYMENT_STATUS_MAP = {
    "pago": "pago",
    "paid": "pago",
}

# Status de pedido de NF: texto livre -> ENUM da tabela cost_items
NF_REQUEST_STATUS_MAP = {
    "pedido": "pedido",
    "sem": "nao_aplicavel",
    "sem nota": "nao_aplicavel",
    "": "pendente",
}

# Valores de col 37 que indicam NF validada OK
NF_VALIDATED_VALUES = {"true", "TRUE", "True"}

# Placeholder de data sem definicao (formula sheets retorna 1899-12-30)
DATE_PLACEHOLDER = "18991230"

# Cores ANSI
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
CYAN = "\033[96m"
BOLD = "\033[1m"

# Numero de linhas de metadados antes do header real (linhas 0-17 = indices 0 a 17)
METADATA_ROWS = 18

# Numero de colunas esperadas no CSV
EXPECTED_COLS = 38


# ---------------------------------------------------------------------------
# Utilitarios de log
# ---------------------------------------------------------------------------

def log(msg: str, level: str = "INFO", verbose: bool = False) -> None:
    if level == "DEBUG" and not verbose:
        return
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    color = {"OK": GREEN, "SKIP": YELLOW, "ERROR": RED, "INFO": CYAN, "DEBUG": RESET}.get(
        level, RESET
    )
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
# Normalizacao de nome (replica normalize_vendor_name() do PostgreSQL)
# ---------------------------------------------------------------------------

def normalize_name(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", "", ascii_str)
    return cleaned.lower().strip()


# ---------------------------------------------------------------------------
# Parse de valores monetarios
# ---------------------------------------------------------------------------

def parse_money(raw: str) -> Optional[float]:
    """
    Converte string monetaria brasileira para float.
    Exemplos: "R$  1.000,00" -> 1000.0, " R$  -   " -> None, "400,00" -> 400.0
    """
    if not raw or not raw.strip():
        return None

    # Remove R$, espacos extras, BOM chars
    cleaned = re.sub(r"[R\$\s]", "", raw.strip())
    # Remove marcador de zero/vazio: " -   " ou "-"
    if cleaned in ("-", "", "-   ", "–"):
        return None

    # Remove pontos de milhar e troca virgula decimal por ponto
    cleaned = cleaned.replace(".", "").replace(",", ".")

    try:
        value = float(cleaned)
        return value if value != 0.0 else None
    except ValueError:
        return None


def parse_date(raw: str) -> Optional[str]:
    """
    Converte data DD/MM/AAAA para ISO (YYYY-MM-DD).
    Retorna None se vazia ou se for o placeholder 18991230 (sem data).
    """
    if not raw or not raw.strip():
        return None

    # Formato DD/MM/AAAA
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw.strip())
    if m:
        day, month, year = m.groups()
        # Descarta o placeholder de sem data (1899-12-30)
        if year == "1899":
            return None
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    return None


def parse_payment_condition(raw: str) -> Optional[str]:
    """Mapeia texto livre de condicao de pagamento para ENUM da tabela."""
    if not raw or not raw.strip():
        return None
    key = raw.strip().lower()
    return PAYMENT_CONDITION_MAP.get(key)


def parse_payment_status(raw: str) -> str:
    """Mapeia texto livre de status de pagamento para ENUM."""
    if not raw or not raw.strip():
        return "pendente"
    return PAYMENT_STATUS_MAP.get(raw.strip().lower(), "pendente")


def parse_nf_request_status(raw_pedido: str, raw_forneceu: str) -> str:
    """
    Determina nf_request_status a partir de col 28 (PEDIDO NF) e col 29 (FORNECEU NF?).
    Hierarquia: forneceu SIM -> recebido, PEDIDO -> pedido, SEM -> nao_aplicavel, default -> pendente
    """
    forneceu_norm = (raw_forneceu or "").strip().lower()
    pedido_norm = (raw_pedido or "").strip().lower()

    if forneceu_norm == "sim":
        return "recebido"
    if forneceu_norm == "nao":
        return "pedido"
    if pedido_norm == "pedido":
        return "pedido"
    if pedido_norm in ("sem", "sem nota", "sem_nota"):
        return "nao_aplicavel"

    return "pendente"


def is_drive_url(value: str) -> bool:
    """Verifica se o valor e um link do Google Drive."""
    return value.startswith("https://drive.google.com") or value.startswith("https://docs.google.com")


def safe_col(row: List[str], index: int) -> str:
    """Retorna o valor da coluna ou string vazia se indice nao existir."""
    if index < len(row):
        return (row[index] or "").strip()
    return ""


# ---------------------------------------------------------------------------
# Cliente Supabase REST API
# ---------------------------------------------------------------------------

class SupabaseClient:
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
        resp = requests.get(self._url(table), headers=self.headers, params=filters or {})
        resp.raise_for_status()
        return resp.json()

    def insert(self, table: str, data: Dict) -> Dict:
        resp = requests.post(
            self._url(table),
            headers=self.headers,
            data=json.dumps(data),
        )
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) else result

    def insert_batch(self, table: str, records: List[Dict]) -> List[Dict]:
        """Insere multiplos registros em uma unica chamada POST."""
        resp = requests.post(
            self._url(table),
            headers=self.headers,
            data=json.dumps(records),
        )
        resp.raise_for_status()
        return resp.json()

    def find_vendor_by_name(self, tenant_id: str, normalized: str) -> Optional[Dict]:
        """Busca vendor por normalized_name."""
        try:
            rows = self.select(
                "vendors",
                {
                    "tenant_id": f"eq.{tenant_id}",
                    "normalized_name": f"eq.{normalized}",
                    "deleted_at": "is.null",
                    "limit": "1",
                },
            )
            return rows[0] if rows else None
        except Exception:
            return None

    def find_vendor_by_email(self, tenant_id: str, email: str) -> Optional[Dict]:
        """Busca vendor por email."""
        if not email:
            return None
        try:
            rows = self.select(
                "vendors",
                {
                    "tenant_id": f"eq.{tenant_id}",
                    "email": f"eq.{email}",
                    "deleted_at": "is.null",
                    "limit": "1",
                },
            )
            return rows[0] if rows else None
        except Exception:
            return None

    def check_cost_item_exists(
        self,
        tenant_id: str,
        job_id: str,
        item_number: int,
        sub_item_number: int,
        import_source: str,
    ) -> bool:
        """
        Verifica idempotencia: retorna True se o item ja foi importado.
        Usa combinacao de job_id + item_number + sub_item_number + import_source.
        """
        try:
            rows = self.select(
                "cost_items",
                {
                    "tenant_id": f"eq.{tenant_id}",
                    "job_id": f"eq.{job_id}",
                    "item_number": f"eq.{item_number}",
                    "sub_item_number": f"eq.{sub_item_number}",
                    "import_source": f"eq.{import_source}",
                    "deleted_at": "is.null",
                    "limit": "1",
                },
            )
            return len(rows) > 0
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Resolucao de vendor a partir do nome/email no CSV
# ---------------------------------------------------------------------------

def resolve_vendor(
    client: SupabaseClient,
    tenant_id: str,
    vendor_name: str,
    vendor_email: str,
    verbose: bool,
) -> Optional[str]:
    """
    Tenta encontrar vendor_id a partir do nome ou email.
    Retorna UUID do vendor ou None se nao encontrado.
    """
    if vendor_name:
        normalized = normalize_name(vendor_name)
        vendor = client.find_vendor_by_name(tenant_id, normalized)
        if vendor:
            log(
                f"  Vendor '{vendor_name}' encontrado por nome (id={vendor['id'][:8]}...)",
                "DEBUG",
                verbose,
            )
            return vendor["id"]

    if vendor_email:
        vendor = client.find_vendor_by_email(tenant_id, vendor_email)
        if vendor:
            log(
                f"  Vendor encontrado por email '{vendor_email}' (id={vendor['id'][:8]}...)",
                "DEBUG",
                verbose,
            )
            return vendor["id"]

    if vendor_name:
        log(
            f"  Vendor '{vendor_name}' nao encontrado na base — usando apenas snapshot",
            "DEBUG",
            verbose,
        )

    return None


# ---------------------------------------------------------------------------
# Conversao de linha CSV para payload cost_items
# ---------------------------------------------------------------------------

def row_to_payload(
    row: List[str],
    line_number: int,
    job_id: str,
    tenant_id: str,
    vendor_id: Optional[str],
    import_source: str,
    verbose: bool,
) -> Optional[Dict]:
    """
    Converte uma linha de dados do CSV em payload para inserir em cost_items.
    Retorna None se a linha deve ser ignorada (vazia ou invalida).
    """
    # Col 2: item_number
    raw_item = safe_col(row, 2)
    if not raw_item:
        log(f"Linha {line_number}: sem item_number, ignorando", "DEBUG", verbose)
        return None

    try:
        item_number = int(float(raw_item))
    except ValueError:
        log(f"Linha {line_number}: item_number invalido '{raw_item}', ignorando", "DEBUG", verbose)
        return None

    if not (1 <= item_number <= 99):
        log(f"Linha {line_number}: item_number fora de range ({item_number}), ignorando", "DEBUG", verbose)
        return None

    # Col 3: sub_item_number
    raw_sub = safe_col(row, 3)
    try:
        sub_item_number = int(float(raw_sub)) if raw_sub else 0
    except ValueError:
        sub_item_number = 0

    # Col 4: service_description (obrigatorio)
    service_description = safe_col(row, 4)
    if not service_description:
        log(f"Linha {line_number}: service_description vazia, ignorando", "DEBUG", verbose)
        return None

    # Col 5: unit_value
    unit_value = parse_money(safe_col(row, 5))

    # Col 6: quantity
    raw_qty = safe_col(row, 6)
    try:
        quantity = int(float(raw_qty)) if raw_qty else 1
        quantity = max(0, quantity)  # nao negativo
    except ValueError:
        quantity = 1

    # Cols 9, 19, 20: vendor
    vendor_name_raw = safe_col(row, 9)
    vendor_email_raw = safe_col(row, 19)
    vendor_bank_raw = safe_col(row, 23)
    vendor_pix_raw = safe_col(row, 27)

    # Fallback: col 20 (razao social) se col 9 vazia
    if not vendor_name_raw:
        vendor_name_raw = safe_col(row, 20)

    # Col 10: payment_condition
    payment_condition = parse_payment_condition(safe_col(row, 10))

    # Col 16: notes (observacoes)
    notes = safe_col(row, 16) or None

    # Col 17: payment_due_date
    payment_due_date = parse_date(safe_col(row, 17))

    # Cols 28, 29: nf_request_status
    nf_request_status = parse_nf_request_status(safe_col(row, 28), safe_col(row, 29))

    # Col 30: nf (drive url ou nome de arquivo)
    raw_nf = safe_col(row, 30)
    nf_drive_url = raw_nf if raw_nf and is_drive_url(raw_nf) else None
    nf_filename = raw_nf if raw_nf and not is_drive_url(raw_nf) else None

    # Col 31: payment_status
    payment_status = parse_payment_status(safe_col(row, 31))

    # Col 32: payment_date
    payment_date = parse_date(safe_col(row, 32))

    # Col 33: payment_proof_filename
    proof_raw = safe_col(row, 33)
    payment_proof_filename = proof_raw if proof_raw else None

    # Col 37: nf_validation_ok (status validacao n8n)
    raw_nf_valid = safe_col(row, 37)
    nf_validation_ok = raw_nf_valid.strip() in NF_VALIDATED_VALUES if raw_nf_valid else None

    # Monta payload
    payload: Dict = {
        "tenant_id": tenant_id,
        "job_id": job_id,
        "item_number": item_number,
        "sub_item_number": sub_item_number,
        "service_description": service_description,
        "quantity": quantity,
        "nf_request_status": nf_request_status,
        "payment_status": payment_status,
        "import_source": import_source,
    }

    # Campos opcionais — so inclui se tiver valor
    if unit_value is not None:
        payload["unit_value"] = unit_value
    if payment_condition:
        payload["payment_condition"] = payment_condition
    if payment_due_date:
        payload["payment_due_date"] = payment_due_date
    if notes:
        payload["notes"] = notes
    if vendor_id:
        payload["vendor_id"] = vendor_id
    if vendor_name_raw:
        payload["vendor_name_snapshot"] = vendor_name_raw
    if vendor_email_raw:
        payload["vendor_email_snapshot"] = vendor_email_raw
    if vendor_pix_raw:
        payload["vendor_pix_snapshot"] = vendor_pix_raw
    if vendor_bank_raw:
        payload["vendor_bank_snapshot"] = vendor_bank_raw
    if nf_drive_url:
        payload["nf_drive_url"] = nf_drive_url
    if nf_filename:
        payload["nf_filename"] = nf_filename
    if nf_validation_ok is not None:
        payload["nf_validation_ok"] = nf_validation_ok
    if payment_status == "pago":
        payload["item_status"] = "pago"
    if payment_date:
        payload["payment_date"] = payment_date
    if payment_proof_filename:
        payload["payment_proof_filename"] = payment_proof_filename

    return payload


# ---------------------------------------------------------------------------
# Leitura do CSV
# ---------------------------------------------------------------------------

def read_csv(path: str) -> List[List[str]]:
    """
    Le CSV com encoding latin-1 (padrao das planilhas GG_).
    Fallback para utf-8-sig se latin-1 falhar.
    """
    for encoding in ("latin-1", "utf-8-sig", "utf-8"):
        try:
            with open(path, "rb") as f:
                raw = f.read().decode(encoding)
            reader = csv.reader(raw.splitlines())
            return list(reader)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Nao foi possivel ler o CSV com encodings latin-1/utf-8-sig/utf-8: {path}")


def extract_job_number_from_metadata(rows: List[List[str]]) -> Optional[str]:
    """
    Tenta extrair o numero do job do cabecalho de metadados (linhas 0-17).
    Label NUMER JOB fica em col 4/5 da linha 2 ou 3.
    """
    for row in rows[:METADATA_ROWS]:
        for i, cell in enumerate(row):
            if "NUMER" in cell.upper() and "JOB" in cell.upper():
                # Valor esta na proxima coluna
                if i + 1 < len(row) and row[i + 1].strip():
                    return row[i + 1].strip()
    return None


# ---------------------------------------------------------------------------
# Fluxo principal
# ---------------------------------------------------------------------------

def run(args: argparse.Namespace) -> None:
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        log_error("Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.")
        sys.exit(1)

    if not args.job_id:
        log_error("--job-id e obrigatorio.")
        sys.exit(1)

    if not args.tenant_id:
        log_error("--tenant-id e obrigatorio.")
        sys.exit(1)

    log_info(f"Lendo CSV: {args.csv}")
    rows = read_csv(args.csv)
    log_info(f"Total de linhas no CSV: {len(rows)}")

    # Extrai numero do job dos metadados para validacao
    job_number_from_meta = extract_job_number_from_metadata(rows)
    if job_number_from_meta:
        log_info(f"Numero do job detectado no cabecalho: {job_number_from_meta}")

    # Pula as linhas de metadados (0 a METADATA_ROWS-1) e o header (linha METADATA_ROWS)
    data_rows = rows[METADATA_ROWS + 1:]
    log_info(f"Linhas de dados a processar: {len(data_rows)}")

    client = SupabaseClient(supabase_url, service_key)
    csv_slug = args.csv.replace("/", "_").replace("\\", "_")[:40]
    import_source = f"migration_{csv_slug}_{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    # Contadores
    counters = {
        "created": 0,
        "skipped": 0,
        "errors": 0,
        "dry_run": 0,
        "category_headers": 0,
    }

    # Cache de vendors ja resolvidos (normalized_name -> vendor_id) para evitar N+1
    vendor_cache: Dict[str, Optional[str]] = {}

    for line_offset, row in enumerate(data_rows):
        line_number = line_offset + METADATA_ROWS + 2  # numero real da linha no arquivo

        # Pula linhas completamente vazias
        if not any(cell.strip() for cell in row):
            continue

        try:
            # Resolve vendor a partir do nome/email na linha
            vendor_name_raw = safe_col(row, 9) or safe_col(row, 20)
            vendor_email_raw = safe_col(row, 19)
            vendor_id: Optional[str] = None

            if vendor_name_raw or vendor_email_raw:
                cache_key = normalize_name(vendor_name_raw) if vendor_name_raw else vendor_email_raw
                if cache_key not in vendor_cache:
                    vendor_cache[cache_key] = resolve_vendor(
                        client,
                        args.tenant_id,
                        vendor_name_raw,
                        vendor_email_raw,
                        args.verbose,
                    )
                vendor_id = vendor_cache[cache_key]

            # Constroi payload
            payload = row_to_payload(
                row,
                line_number,
                args.job_id,
                args.tenant_id,
                vendor_id,
                import_source,
                args.verbose,
            )

            if payload is None:
                continue

            item_number = payload["item_number"]
            sub_item_number = payload["sub_item_number"]
            service_desc = payload["service_description"]

            # Log de cabecalhos de categoria (sub_item=0)
            if sub_item_number == 0:
                counters["category_headers"] += 1
                log(
                    f"Linha {line_number}: CATEGORIA [{item_number}] '{service_desc}'",
                    "DEBUG",
                    args.verbose,
                )

            # Modo dry-run
            if args.dry_run:
                log_skip(
                    f"[DRY-RUN] Linha {line_number}: Item {item_number}.{sub_item_number} "
                    f"'{service_desc[:50]}'"
                )
                counters["dry_run"] += 1
                continue

            # Idempotencia: verifica se ja foi importado
            if client.check_cost_item_exists(
                args.tenant_id,
                args.job_id,
                item_number,
                sub_item_number,
                import_source,
            ):
                log_skip(
                    f"Linha {line_number}: Item {item_number}.{sub_item_number} ja importado, pulando"
                )
                counters["skipped"] += 1
                continue

            # Insere no banco
            inserted = client.insert("cost_items", payload)
            log_ok(
                f"Linha {line_number}: Item {item_number}.{sub_item_number} "
                f"'{service_desc[:50]}' criado (id={inserted['id'][:8]}...)"
            )
            counters["created"] += 1

        except requests.HTTPError as exc:
            body = ""
            try:
                body = exc.response.text[:300]
            except Exception:
                pass
            log_error(
                f"Linha {line_number}: HTTP error ao inserir item: {exc} | response: {body}"
            )
            counters["errors"] += 1
        except Exception as exc:
            log_error(f"Linha {line_number}: excecao inesperada: {exc}")
            counters["errors"] += 1

    # Relatorio final
    print()
    print(f"{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  RELATORIO DE IMPORTACAO: CUSTOS_REAIS.csv{RESET}")
    print(f"{'=' * 60}")
    print(f"  Job ID:         {args.job_id}")
    if job_number_from_meta:
        print(f"  Numero do job:  {job_number_from_meta}")
    print(f"  Import source:  {import_source}")
    print()
    if args.dry_run:
        print(f"{YELLOW}  MODO DRY-RUN: nenhum dado foi persistido{RESET}")
        print(f"  Simulacoes: {counters['dry_run']}")
    else:
        print(f"{GREEN}  Cost items criados:         {counters['created']}{RESET}")
        print(f"  Cabecalhos de categoria:    {counters['category_headers']}")
        print(f"{YELLOW}  Itens ja existentes (skip): {counters['skipped']}{RESET}")
        print(f"{RED}  Linhas com erro:            {counters['errors']}{RESET}")
    print()
    print(
        f"  Para rollback: DELETE FROM cost_items WHERE import_source = '{import_source}'"
    )
    print(f"{'=' * 60}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Importa CUSTOS_REAIS.csv para cost_items no Supabase."
    )
    parser.add_argument(
        "--csv",
        required=True,
        help="Caminho para o arquivo CUSTOS_REAIS.csv",
    )
    parser.add_argument(
        "--job-id",
        required=True,
        dest="job_id",
        help="UUID do job no Supabase (FK para tabela jobs)",
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
        help="Exibe logs detalhados (DEBUG) incluindo linhas ignoradas",
    )

    args = parser.parse_args()

    if not os.path.isfile(args.csv):
        log_error(f"Arquivo nao encontrado: {args.csv}")
        sys.exit(1)

    run(args)


if __name__ == "__main__":
    main()
