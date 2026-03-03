# -*- coding: utf-8 -*-
"""
migrate_sheets_data.py

Migracao de dados do Google Sheets / CSVs para o ELLAHOS Supabase.
Importa freelancers (vendors + bank_accounts), jobs e custos (cost_items).

Modos:
  csv      Lê arquivos CSV da pasta --csv-dir (padrão: scripts/data/)
  sheets   Lê diretamente do Google Sheets via API (requer OAuth)

Uso básico (modo CSV):
  python scripts/migrate_sheets_data.py --mode csv --csv-dir scripts/data

Variáveis de ambiente:
  SUPABASE_URL              URL do projeto (padrão: https://etvapcxesaxhsvzgaane.supabase.co)
  SUPABASE_SERVICE_ROLE_KEY Chave service_role (bypass RLS) — OBRIGATÓRIO
  TENANT_ID                 UUID do tenant Ellah Filmes — OBRIGATÓRIO

Arquivos CSV esperados em --csv-dir:
  freelancers.csv  — Colunas: nome, email, banco, documento_pix (sem cabeçalho)
  jobs.csv         — Ver seção "Formato CSVs" no README-migration.md
  costs.csv        — Ver seção "Formato CSVs" no README-migration.md
"""

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional, Tuple

# Forca stdout/stderr para UTF-8 no Windows (cp1252 nao suporta caracteres como ->)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf-8-sig"):
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Dependência opcional: python-dotenv (não fatal se ausente)
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv não instalado — variáveis devem estar no ambiente

# ---------------------------------------------------------------------------
# Dependência opcional: requests (necessário para o cliente Supabase REST)
# ---------------------------------------------------------------------------
try:
    import requests
except ImportError:
    print("[ERRO] Pacote 'requests' não encontrado. Execute: pip install requests")
    sys.exit(1)


# ===========================================================================
# Configuração
# ===========================================================================

SUPABASE_URL: str = os.getenv(
    "SUPABASE_URL", "https://etvapcxesaxhsvzgaane.supabase.co"
).rstrip("/")

SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
TENANT_ID: str = os.getenv("TENANT_ID", "")

# Identificador de origem registrado no campo import_source
IMPORT_SOURCE: str = f"migration_sheets_{datetime.now(timezone.utc).strftime('%Y%m%d')}"

# Mapeamentos de status de job: texto livre → ENUM job_status
JOB_STATUS_MAP: Dict[str, str] = {
    # Português coloquial / planilhas
    "em andamento":             "pos_producao",
    "em produção":              "producao_filmagem",
    "producao":                 "producao_filmagem",
    "filmagem":                 "producao_filmagem",
    "filmando":                 "producao_filmagem",
    "finalizado":               "finalizado",
    "finalizada":               "finalizado",
    "entregue":                 "entregue",
    "entregue ao cliente":      "entregue",
    "cancelado":                "cancelado",
    "cancelada":                "cancelado",
    "briefing":                 "briefing_recebido",
    "briefing recebido":        "briefing_recebido",
    "orçamento":                "orcamento_elaboracao",
    "orcamento":                "orcamento_elaboracao",
    "orçamento enviado":        "orcamento_enviado",
    "orcamento enviado":        "orcamento_enviado",
    "aguardando aprovação":     "aguardando_aprovacao",
    "aguardando aprovacao":     "aguardando_aprovacao",
    "aprovado":                 "aprovado_selecao_diretor",
    "aprovada":                 "aprovado_selecao_diretor",
    "pre producao":             "pre_producao",
    "pré produção":             "pre_producao",
    "pre-producao":             "pre_producao",
    "pós produção":             "pos_producao",
    "pos producao":             "pos_producao",
    "pos-producao":             "pos_producao",
    "edição":                   "pos_producao",
    "edicao":                   "pos_producao",
    "aguardando aprovação final": "aguardando_aprovacao_final",
    "pausado":                  "pausado",
    # Inglês (possível nas planilhas)
    "in progress":              "producao_filmagem",
    "done":                     "finalizado",
    "delivered":                "entregue",
    "cancelled":                "cancelado",
    "canceled":                 "cancelado",
    "briefing received":        "briefing_recebido",
    "approved":                 "aprovado_selecao_diretor",
    "pre production":           "pre_producao",
    "post production":          "pos_producao",
    "paused":                   "pausado",
}

# Mapeamento de tipo de projeto: texto livre → ENUM project_type
PROJECT_TYPE_MAP: Dict[str, str] = {
    "filme publicitário":       "filme_publicitario",
    "filme publicitario":       "filme_publicitario",
    "comercial":                "filme_publicitario",
    "commercial":               "filme_publicitario",
    "publicitario":             "filme_publicitario",
    "publicidade":              "filme_publicitario",
    "branded content":          "branded_content",
    "branded":                  "branded_content",
    "content":                  "branded_content",
    "videoclipe":               "videoclipe",
    "clipe":                    "videoclipe",
    "clip":                     "videoclipe",
    "music video":              "videoclipe",
    "documentário":             "documentario",
    "documentario":             "documentario",
    "documentary":              "documentario",
    "conteúdo digital":         "conteudo_digital",
    "conteudo digital":         "conteudo_digital",
    "digital":                  "conteudo_digital",
    "social media":             "conteudo_digital",
    "evento":                   "evento_livestream",
    "livestream":               "evento_livestream",
    "live":                     "evento_livestream",
    "institucional":            "institucional",
    "institutional":            "institucional",
    "motion":                   "motion_graphics",
    "motion graphics":          "motion_graphics",
    "animação":                 "motion_graphics",
    "animacao":                 "motion_graphics",
    "fotografia":               "fotografia",
    "foto":                     "fotografia",
    "photo":                    "fotografia",
    "outro":                    "outro",
    "other":                    "outro",
}

# Mapeamento de condição de pagamento
PAYMENT_CONDITION_MAP: Dict[str, str] = {
    "a vista":          "a_vista",
    "à vista":          "a_vista",
    "avista":           "a_vista",
    "c/nf 30":          "cnf_30",
    "cnf 30":           "cnf_30",
    "cnf30":            "cnf_30",
    "c/nf 40":          "cnf_40",
    "cnf 40":           "cnf_40",
    "cnf40":            "cnf_40",
    "c/nf 45":          "cnf_45",
    "cnf 45":           "cnf_45",
    "cnf45":            "cnf_45",
    "c/nf 60":          "cnf_60",
    "cnf 60":           "cnf_60",
    "cnf60":            "cnf_60",
    "c/nf 90":          "cnf_90",
    "cnf 90":           "cnf_90",
    "cnf90":            "cnf_90",
    "s/nf 30":          "snf_30",
    "snf 30":           "snf_30",
    "snf30":            "snf_30",
}

# Mapeamento banco de texto livre → (bank_code, bank_name_canonico)
BANK_NORMALIZE: Dict[str, Tuple[Optional[str], str]] = {
    "nubank":           ("260", "Nu Pagamentos"),
    "nu bank":          ("260", "Nu Pagamentos"),
    "nu":               ("260", "Nu Pagamentos"),
    "260":              ("260", "Nu Pagamentos"),
    "itau":             ("341", "Itau Unibanco"),
    "itaú":             ("341", "Itau Unibanco"),
    "bradesco":         ("237", "Bradesco"),
    "banco do brasil":  ("001", "Banco do Brasil"),
    "bb":               ("001", "Banco do Brasil"),
    "caixa":            ("104", "Caixa Economica Federal"),
    "cef":              ("104", "Caixa Economica Federal"),
    "santander":        ("033", "Santander"),
    "inter":            ("077", "Banco Inter"),
    "banco inter":      ("077", "Banco Inter"),
    "c6":               ("336", "C6 Bank"),
    "c6 bank":          ("336", "C6 Bank"),
    "picpay":           ("380", "PicPay"),
    "mercado pago":     ("323", "Mercado Pago"),
    "safra":            ("422", "Safra"),
    "sicoob":           ("756", "Sicoob"),
    "sicredi":          ("748", "Sicredi"),
    "original":         ("212", "Banco Original"),
    "neon":             ("655", "Neon"),
    "next":             ("237", "Bradesco"),
    "pagbank":          ("290", "PagBank"),
    "pagseguro":        ("290", "PagBank"),
    "cora":             ("403", "Cora"),
    "stone":            ("197", "Stone"),
    "xp":               ("102", "XP Investimentos"),
    "will":             ("280", "Will Bank"),
    "iti":              ("341", "Itau Unibanco"),
}


# ===========================================================================
# Cores ANSI para terminal
# ===========================================================================

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

_verbose_global = False


def _log(msg: str, level: str = "INFO") -> None:
    if level == "DEBUG" and not _verbose_global:
        return
    now = datetime.now(timezone.utc).strftime("%H:%M:%S")
    color = {
        "OK":    GREEN,
        "SKIP":  YELLOW,
        "ERROR": RED,
        "INFO":  CYAN,
        "WARN":  YELLOW,
        "DEBUG": RESET,
    }.get(level, RESET)
    print(f"{color}[{now}] [{level:5s}] {msg}{RESET}", flush=True)


def log_ok(msg: str)    -> None: _log(msg, "OK")
def log_skip(msg: str)  -> None: _log(msg, "SKIP")
def log_error(msg: str) -> None: _log(msg, "ERROR")
def log_info(msg: str)  -> None: _log(msg, "INFO")
def log_warn(msg: str)  -> None: _log(msg, "WARN")
def log_debug(msg: str) -> None: _log(msg, "DEBUG")


# ===========================================================================
# Utilitários de normalização
# ===========================================================================

def normalize_text(text: str) -> str:
    """
    Normaliza texto: lowercase, strip, remove acentos, colapsa espaços extras.
    Equivalente ao normalize_vendor_name() do PostgreSQL.
    """
    if not text:
        return ""
    text = text.strip()
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", "", ascii_str)
    return re.sub(r"\s+", " ", cleaned).lower().strip()


def only_digits(value: str) -> str:
    """Retorna apenas os dígitos de uma string."""
    return re.sub(r"\D", "", value or "")


def parse_brl(value: str) -> Optional[float]:
    """
    Converte string de moeda brasileira para float.
    Aceita: 'R$ 1.000,00', '1.000,00', '1000', '50.000,00'.
    Retorna None se inválido ou zero.
    """
    if not value:
        return None
    v = value.strip()
    v = re.sub(r"[R\$\s]", "", v)
    if not v or v in ("-", "–", "—"):
        return None
    v_clean = re.sub(r"[\s\-]", "", v)
    if not v_clean:
        return None
    if "," in v:
        v = v.replace(".", "").replace(",", ".")
    else:
        dot_idx = v.rfind(".")
        if dot_idx != -1:
            after = v[dot_idx + 1:]
            if len(after) == 3:
                v = v.replace(".", "")
    try:
        f = float(v)
        return f if f != 0.0 else None
    except ValueError:
        return None


def parse_date_br(value: str) -> Optional[str]:
    """
    Converte DD/MM/YYYY ou DD/MM/YY → YYYY-MM-DD.
    Retorna None se inválido.
    """
    if not value:
        return None
    v = value.strip()
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", v)
    if m:
        day, month, year = m.groups()
        if len(year) == 2:
            year = "20" + year
        try:
            date(int(year), int(month), int(day))  # valida
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        except ValueError:
            return None
    # Tenta YYYY-MM-DD direto
    m2 = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", v)
    if m2:
        return v
    return None


def detect_document(raw: str) -> Dict[str, Any]:
    """
    Analisa campo bruto (CPF / CNPJ / email / telefone / UUID) e retorna dict:
    { entity_type, cpf, cnpj, pix_key, pix_key_type }
    """
    result: Dict[str, Any] = {
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

    # UUID / chave aleatória PIX
    if re.match(
        r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        raw,
    ):
        result["pix_key"] = raw
        result["pix_key_type"] = "aleatoria"
        return result

    # E-mail PIX
    if "@" in raw and "." in raw.split("@")[-1]:
        result["pix_key"] = raw
        result["pix_key_type"] = "email"
        return result

    # CNPJ: 14 dígitos
    if len(digits) == 14:
        result["entity_type"] = "pj"
        result["cnpj"] = digits
        result["pix_key"] = digits
        result["pix_key_type"] = "cnpj"
        return result

    # CPF: 11 dígitos
    if len(digits) == 11:
        result["cpf"] = digits
        result["pix_key"] = digits
        result["pix_key_type"] = "cpf"
        return result

    # Telefone
    if 8 <= len(digits) <= 13:
        phone = ("+" + digits) if raw.startswith("+") else digits
        result["pix_key"] = phone
        result["pix_key_type"] = "telefone"
        return result

    # Fallback: chave aleatória
    result["pix_key"] = raw
    result["pix_key_type"] = "aleatoria"
    return result


def normalize_bank(raw: str) -> Tuple[Optional[str], Optional[str]]:
    """Normaliza texto de banco → (bank_code, bank_name). Retorna (None, raw) se desconhecido."""
    if not raw or not raw.strip():
        return None, None
    key = raw.strip().lower()
    if key in BANK_NORMALIZE:
        return BANK_NORMALIZE[key]
    for k, v in BANK_NORMALIZE.items():
        if k in key:
            return v
    return None, raw.strip()


def map_job_status(raw: str) -> str:
    """Converte status textual para ENUM job_status. Fallback: briefing_recebido."""
    if not raw:
        return "briefing_recebido"
    key = normalize_text(raw)
    return JOB_STATUS_MAP.get(key, "briefing_recebido")


def map_project_type(raw: str) -> str:
    """Converte tipo de projeto textual para ENUM project_type. Fallback: outro."""
    if not raw:
        return "outro"
    key = normalize_text(raw)
    return PROJECT_TYPE_MAP.get(key, "outro")


def map_payment_condition(raw: str) -> Optional[str]:
    """Converte condição de pagamento textual para ENUM. Retorna None se desconhecido."""
    if not raw:
        return None
    key = normalize_text(raw)
    # Remove "dias" no final: "cnf 30 dias" → "cnf 30"
    key_no_dias = re.sub(r"\s*dias$", "", key).strip()
    return PAYMENT_CONDITION_MAP.get(key, PAYMENT_CONDITION_MAP.get(key_no_dias))


# ===========================================================================
# Cliente Supabase REST (service_role — bypass RLS)
# ===========================================================================

class SupabaseRestClient:
    """
    Cliente para a PostgREST API do Supabase.
    Usa service_role key → ignora RLS completamente.
    """

    def __init__(self, url: str, key: str) -> None:
        if not url:
            raise ValueError("SUPABASE_URL não configurado.")
        if not key:
            raise ValueError(
                "SUPABASE_SERVICE_ROLE_KEY não configurado. "
                "Exporte a variável de ambiente antes de rodar o script."
            )
        self.base_url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _table_url(self, table: str) -> str:
        return f"{self.base_url}/rest/v1/{table}"

    def select(
        self,
        table: str,
        filters: Optional[Dict[str, str]] = None,
        columns: str = "*",
    ) -> List[Dict]:
        """
        SELECT com filtros opcionais no estilo PostgREST.
        Exemplo: filters={"tenant_id": "eq.uuid", "deleted_at": "is.null"}
        """
        params: Dict[str, str] = {"select": columns}
        if filters:
            params.update(filters)
        resp = requests.get(self._table_url(table), headers=self.headers, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def insert(self, table: str, data: Dict) -> Optional[Dict]:
        """INSERT de um registro. Retorna o registro criado."""
        resp = requests.post(
            self._table_url(table),
            headers=self.headers,
            data=json.dumps(data, default=str),
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) else result

    def upsert(self, table: str, data: Dict, on_conflict: str) -> Optional[Dict]:
        """
        INSERT com ON CONFLICT DO UPDATE (upsert).
        on_conflict: nome da coluna ou colunas separadas por vírgula.
        """
        headers = {
            **self.headers,
            "Prefer": f"return=representation,resolution=merge-duplicates",
        }
        resp = requests.post(
            self._table_url(table),
            headers=headers,
            data=json.dumps(data, default=str),
            params={"on_conflict": on_conflict},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) else result

    def update(self, table: str, data: Dict, filters: Dict[str, str]) -> Optional[Dict]:
        """UPDATE com filtros PostgREST."""
        resp = requests.patch(
            self._table_url(table),
            headers=self.headers,
            data=json.dumps(data, default=str),
            params=filters,
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        return result[0] if isinstance(result, list) and result else None


# ===========================================================================
# Leitor de CSV (modo CSV)
# ===========================================================================

def read_csv_file(filepath: str) -> List[Dict[str, str]]:
    """
    Lê um CSV como lista de dicts, com fallback de encoding utf-8-sig → latin-1.
    Retorna lista vazia se arquivo não encontrado.
    """
    if not os.path.isfile(filepath):
        log_warn(f"Arquivo não encontrado: {filepath}")
        return []

    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            with open(filepath, newline="", encoding=encoding, errors="replace") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            log_debug(f"Lido {filepath} ({len(rows)} linhas, encoding={encoding})")
            return rows
        except (UnicodeDecodeError, Exception):
            continue

    log_error(f"Não foi possível ler: {filepath}")
    return []


def read_csv_raw(filepath: str) -> List[List[str]]:
    """
    Lê CSV sem header como lista de listas.
    Usado para freelancers.csv (sem cabeçalho fixo).
    """
    if not os.path.isfile(filepath):
        log_warn(f"Arquivo não encontrado: {filepath}")
        return []

    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            with open(filepath, newline="", encoding=encoding, errors="replace") as f:
                reader = csv.reader(f)
                rows = list(reader)
            return rows
        except (UnicodeDecodeError, Exception):
            continue
    return []


# ===========================================================================
# Migrador base
# ===========================================================================

class DataMigrator:
    """
    Classe base do migrador. Implementa lógica de persistência e helpers.
    Subclasses implementam os métodos _load_freelancers/_load_jobs/_load_costs.
    """

    def __init__(self, dry_run: bool = False) -> None:
        self.dry_run = dry_run
        self.client = SupabaseRestClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.tenant_id = TENANT_ID
        self.stats: Dict[str, int] = {
            "vendors_created":       0,
            "vendors_skipped":       0,
            "bank_accounts_created": 0,
            "clients_created":       0,
            "clients_skipped":       0,
            "jobs_created":          0,
            "jobs_skipped":          0,
            "cost_items_created":    0,
            "cost_items_skipped":    0,
            "errors":                0,
        }
        self.error_log: List[str] = []

        # Caches em memória para evitar múltiplas queries à mesma tabela
        self._vendor_cache: Dict[str, str]  = {}   # normalized_name → id
        self._client_cache: Dict[str, str]  = {}   # normalized_name → id
        self._job_cache: Dict[str, str]     = {}   # code            → id

    # -----------------------------------------------------------------------
    # Validação de configuração
    # -----------------------------------------------------------------------

    def _validate_config(self) -> None:
        if not self.tenant_id:
            log_error("TENANT_ID não configurado. Exporte a variável de ambiente.")
            sys.exit(1)
        if not SUPABASE_SERVICE_KEY:
            log_error("SUPABASE_SERVICE_ROLE_KEY não configurado.")
            sys.exit(1)

    # -----------------------------------------------------------------------
    # Helpers de cache e lookup
    # -----------------------------------------------------------------------

    def _load_vendor_cache(self) -> None:
        """Carrega todos os vendors do tenant em memória para dedup rápido."""
        log_info("Carregando cache de vendors...")
        try:
            rows = self.client.select(
                "vendors",
                {
                    "tenant_id": f"eq.{self.tenant_id}",
                    "deleted_at": "is.null",
                },
                columns="id,normalized_name,email",
            )
            for r in rows:
                if r.get("normalized_name"):
                    self._vendor_cache[r["normalized_name"]] = r["id"]
            log_debug(f"  {len(self._vendor_cache)} vendors em cache.")
        except Exception as e:
            log_warn(f"Não foi possível pré-carregar vendor cache: {e}")

    def _load_client_cache(self) -> None:
        """Carrega todos os clients do tenant em memória."""
        log_info("Carregando cache de clients...")
        try:
            rows = self.client.select(
                "clients",
                {"tenant_id": f"eq.{self.tenant_id}", "deleted_at": "is.null"},
                columns="id,name",
            )
            for r in rows:
                key = normalize_text(r.get("name", ""))
                if key:
                    self._client_cache[key] = r["id"]
            log_debug(f"  {len(self._client_cache)} clients em cache.")
        except Exception as e:
            log_warn(f"Não foi possível pré-carregar client cache: {e}")

    def _load_job_cache(self) -> None:
        """Carrega todos os jobs do tenant em memória (por code)."""
        log_info("Carregando cache de jobs...")
        try:
            rows = self.client.select(
                "jobs",
                {"tenant_id": f"eq.{self.tenant_id}", "deleted_at": "is.null"},
                columns="id,code,title",
            )
            for r in rows:
                code = (r.get("code") or "").strip()
                if code:
                    self._job_cache[code.lower()] = r["id"]
                # Também indexa por título normalizado como fallback
                title_key = normalize_text(r.get("title", ""))
                if title_key:
                    self._job_cache[f"title:{title_key}"] = r["id"]
            log_debug(f"  {len(self._job_cache)} entries de job em cache.")
        except Exception as e:
            log_warn(f"Não foi possível pré-carregar job cache: {e}")

    def _find_vendor_id(self, name: str, email: Optional[str] = None) -> Optional[str]:
        """Busca vendor por nome normalizado ou email. Retorna UUID ou None."""
        norm = normalize_text(name)
        if norm in self._vendor_cache:
            return self._vendor_cache[norm]
        # Tenta busca por email no cache (itera — O(n) mas cache é pequeno)
        if email:
            norm_email = email.strip().lower()
            try:
                rows = self.client.select(
                    "vendors",
                    {
                        "tenant_id": f"eq.{self.tenant_id}",
                        "email": f"eq.{norm_email}",
                        "deleted_at": "is.null",
                    },
                    columns="id,normalized_name",
                )
                if rows:
                    vendor_id = rows[0]["id"]
                    self._vendor_cache[rows[0].get("normalized_name", norm)] = vendor_id
                    return vendor_id
            except Exception:
                pass
        return None

    def _find_or_create_client(self, client_name: str) -> Optional[str]:
        """
        Encontra client por nome ou cria um novo.
        Retorna o UUID do client.
        """
        if not client_name or not client_name.strip():
            return None

        key = normalize_text(client_name)
        if key in self._client_cache:
            return self._client_cache[key]

        if self.dry_run:
            log_skip(f"[DRY-RUN] Criaria client: {client_name}")
            return None

        try:
            rows = self.client.select(
                "clients",
                {
                    "tenant_id": f"eq.{self.tenant_id}",
                    "deleted_at": "is.null",
                },
                columns="id,name",
            )
            for r in rows:
                if normalize_text(r.get("name", "")) == key:
                    client_id = r["id"]
                    self._client_cache[key] = client_id
                    return client_id

            # Cria novo client
            result = self.client.insert("clients", {
                "tenant_id": self.tenant_id,
                "name": client_name.strip().title(),
                "is_active": True,
            })
            client_id = result["id"]
            self._client_cache[key] = client_id
            self.stats["clients_created"] += 1
            log_ok(f"  Client criado: {client_name} (id={client_id})")
            return client_id
        except Exception as e:
            self._record_error(f"clients/_find_or_create: {e}")
            return None

    def _find_job_id(self, code: str, title: str = "") -> Optional[str]:
        """Encontra job_id por code ou título. Retorna UUID ou None."""
        if code:
            job_id = self._job_cache.get(code.strip().lower())
            if job_id:
                return job_id
        if title:
            key = f"title:{normalize_text(title)}"
            return self._job_cache.get(key)
        return None

    # -----------------------------------------------------------------------
    # Persistência
    # -----------------------------------------------------------------------

    def _record_error(self, msg: str) -> None:
        self.stats["errors"] += 1
        self.error_log.append(msg)
        log_error(msg)

    # -----------------------------------------------------------------------
    # Migração de Freelancers → vendors + bank_accounts
    # -----------------------------------------------------------------------

    def migrate_freelancers(self) -> None:
        """
        Importa freelancers como vendors (+ bank_accounts quando disponível).
        Subclasses sobrescrevem _load_freelancers() para retornar os dados.
        """
        print(f"\n{BOLD}--- Migrando Freelancers → vendors ---{RESET}")
        rows = self._load_freelancers()
        if not rows:
            log_warn("Nenhum dado de freelancer encontrado.")
            return

        self._load_vendor_cache()

        for i, row in enumerate(rows, start=1):
            self._process_freelancer_row(row, i)

    def _process_freelancer_row(self, row: Dict[str, Any], line_num: int) -> None:
        """Processa uma linha de freelancer e persiste vendor + bank_account."""
        # Suporta tanto dict (CSV com header) quanto list (CSV sem header)
        if isinstance(row, (list, tuple)):
            cols = list(row) + [""] * 8
            full_name_raw = cols[0]
            email_raw     = cols[1] if len(cols) > 1 else ""
            bank_raw      = cols[2] if len(cols) > 2 else ""
            doc_raw       = cols[3] if len(cols) > 3 else ""
            phone_raw     = cols[4] if len(cols) > 4 else ""
            agency_raw    = cols[5] if len(cols) > 5 else ""
            account_raw   = cols[6] if len(cols) > 6 else ""
            notes_raw     = cols[7] if len(cols) > 7 else ""
        else:
            # Normaliza possíveis variações de nome de coluna
            full_name_raw = (
                row.get("nome") or row.get("name") or row.get("full_name") or ""
            )
            email_raw  = row.get("email") or row.get("e-mail") or ""
            bank_raw   = (
                row.get("banco") or row.get("bank") or row.get("bank_name") or ""
            )
            doc_raw    = (
                row.get("documento_pix") or row.get("cpf") or row.get("cnpj")
                or row.get("documento") or row.get("pix") or ""
            )
            phone_raw  = row.get("telefone") or row.get("phone") or ""
            agency_raw = row.get("agencia") or row.get("agency") or ""
            account_raw = row.get("conta") or row.get("account") or ""
            notes_raw  = row.get("observacoes") or row.get("notes") or ""

        full_name_raw = (full_name_raw or "").strip()
        email_raw     = (email_raw or "").strip()
        bank_raw      = (bank_raw or "").strip()
        doc_raw       = (doc_raw or "").strip()
        phone_raw     = (phone_raw or "").strip()
        agency_raw    = (agency_raw or "").strip()
        account_raw   = (account_raw or "").strip()

        if not full_name_raw:
            log_debug(f"Linha {line_num}: nome vazio — ignorada.")
            return

        # Pula linhas de cabeçalho que possam ter escapado
        if normalize_text(full_name_raw) in ("nome", "name", "full name", "freelancer"):
            log_debug(f"Linha {line_num}: linha de cabeçalho — ignorada.")
            return

        full_name = full_name_raw.title()
        email     = email_raw if email_raw else None
        phone     = phone_raw if phone_raw else None

        doc_info   = detect_document(doc_raw)
        bank_code, bank_name = normalize_bank(bank_raw)

        log_debug(
            f"Linha {line_num}: {full_name} | email={email} "
            f"| entity={doc_info['entity_type']} | bank={bank_name}"
        )

        if self.dry_run:
            log_skip(
                f"[DRY-RUN] Linha {line_num}: vendor '{full_name}' "
                f"({doc_info['entity_type']})"
            )
            return

        # Verifica duplicata por nome normalizado ou email
        existing_id = self._find_vendor_id(full_name, email)
        if existing_id:
            log_skip(f"Linha {line_num}: vendor '{full_name}' já existe (id={existing_id})")
            self.stats["vendors_skipped"] += 1
            return

        # Monta payload do vendor
        vendor_payload: Dict[str, Any] = {
            "tenant_id":     self.tenant_id,
            "full_name":     full_name,
            "entity_type":   doc_info["entity_type"],
            "import_source": IMPORT_SOURCE,
        }
        if email:
            vendor_payload["email"] = email
        if phone:
            vendor_payload["phone"] = phone
        if doc_info["cpf"]:
            vendor_payload["cpf"] = doc_info["cpf"]
        if doc_info["cnpj"]:
            vendor_payload["cnpj"] = doc_info["cnpj"]

        try:
            vendor = self.client.insert("vendors", vendor_payload)
            vendor_id: str = vendor["id"]
            self._vendor_cache[normalize_text(full_name)] = vendor_id
            self.stats["vendors_created"] += 1
            log_ok(f"Linha {line_num}: vendor criado '{full_name}' (id={vendor_id})")
        except Exception as e:
            self._record_error(f"Linha {line_num}: vendor '{full_name}': {e}")
            return

        # Monta payload da conta bancária
        bank_payload: Dict[str, Any] = {
            "tenant_id": self.tenant_id,
            "vendor_id": vendor_id,
            "is_primary": True,
        }
        if bank_name:
            bank_payload["bank_name"] = bank_name
        if bank_code:
            bank_payload["bank_code"] = bank_code
        if agency_raw:
            bank_payload["agency"] = agency_raw
        if account_raw:
            bank_payload["account_number"] = account_raw
        if doc_info["pix_key"]:
            bank_payload["pix_key"]      = doc_info["pix_key"]
            bank_payload["pix_key_type"] = doc_info["pix_key_type"]

        # Só persiste bank_account se tiver algum dado bancário útil
        has_bank_data = any(
            bank_payload.get(k) for k in
            ("bank_name", "pix_key", "agency", "account_number")
        )
        if has_bank_data:
            try:
                self.client.insert("bank_accounts", bank_payload)
                self.stats["bank_accounts_created"] += 1
                log_ok(
                    f"  bank_account criada para '{full_name}' "
                    f"(bank={bank_name}, pix_type={doc_info['pix_key_type']})"
                )
            except Exception as e:
                # Vendor já foi criado — registra aviso mas não conta como erro fatal
                log_warn(
                    f"  Vendor criado mas bank_account falhou para '{full_name}': {e}"
                )

    # -----------------------------------------------------------------------
    # Migração de Jobs
    # -----------------------------------------------------------------------

    def migrate_jobs(self) -> None:
        """Importa jobs para a tabela jobs."""
        print(f"\n{BOLD}--- Migrando Jobs ---{RESET}")
        rows = self._load_jobs()
        if not rows:
            log_warn("Nenhum dado de job encontrado.")
            return

        self._load_client_cache()
        self._load_job_cache()

        for i, row in enumerate(rows, start=1):
            self._process_job_row(row, i)

    def _process_job_row(self, row: Dict[str, Any], line_num: int) -> None:
        """Processa uma linha de job e persiste na tabela jobs."""
        # Extrai campos com fallback para múltiplos nomes de coluna
        title = (
            row.get("titulo") or row.get("title") or row.get("nome") or row.get("name") or ""
        ).strip()
        code_raw = (
            row.get("codigo") or row.get("code") or row.get("job_code") or row.get("id") or ""
        ).strip()
        client_name = (
            row.get("cliente") or row.get("client") or row.get("anunciante") or ""
        ).strip()
        agency_name = (
            row.get("agencia") or row.get("agency") or ""
        ).strip()
        status_raw = (
            row.get("status") or row.get("situacao") or ""
        ).strip()
        project_type_raw = (
            row.get("tipo") or row.get("type") or row.get("project_type") or ""
        ).strip()
        brand = (
            row.get("marca") or row.get("brand") or ""
        ).strip()
        briefing_date_raw = (
            row.get("data_briefing") or row.get("briefing_date") or row.get("data_inicio") or ""
        ).strip()
        delivery_date_raw = (
            row.get("data_entrega") or row.get("delivery_date") or row.get("expected_delivery_date") or ""
        ).strip()
        closed_value_raw = (
            row.get("valor_fechado") or row.get("closed_value") or row.get("valor") or ""
        ).strip()
        production_cost_raw = (
            row.get("custo_producao") or row.get("production_cost") or row.get("custo") or ""
        ).strip()
        notes = (
            row.get("observacoes") or row.get("notes") or row.get("obs") or ""
        ).strip()
        drive_url = (
            row.get("drive_url") or row.get("pasta_drive") or row.get("folder_url") or ""
        ).strip()

        if not title and not code_raw:
            log_debug(f"Linha {line_num}: título e código vazios — ignorada.")
            return

        # Pula linhas de cabeçalho
        if normalize_text(title) in ("titulo", "title", "nome", "job"):
            return

        # Verifica se já existe (idempotência por code)
        if code_raw:
            existing_id = self._find_job_id(code_raw, title)
            if existing_id:
                log_skip(f"Linha {line_num}: job '{code_raw} - {title}' já existe.")
                self.stats["jobs_skipped"] += 1
                return
        elif title:
            existing_id = self._find_job_id("", title)
            if existing_id:
                log_skip(f"Linha {line_num}: job '{title}' já existe.")
                self.stats["jobs_skipped"] += 1
                return

        if self.dry_run:
            log_skip(f"[DRY-RUN] Linha {line_num}: job '{code_raw} - {title}'")
            return

        # Resolve client_id (cria client se necessário)
        client_id = None
        if client_name:
            client_id = self._find_or_create_client(client_name)
        if not client_id:
            # jobs.client_id é NOT NULL — cria um placeholder "Desconhecido"
            client_id = self._find_or_create_client("Desconhecido")
            if not client_id:
                self._record_error(
                    f"Linha {line_num}: não foi possível resolver client_id para job '{title}'."
                )
                return

        # Gera code se não informado (ex: IMPORT-001)
        if not code_raw:
            code_raw = f"IMPORT-{line_num:04d}"

        # Calcula index_number: máximo existente + 1 (simplificado)
        # Na prática o script roda sequencialmente, incrementando o line_num como base
        index_number = line_num

        # job_aba = code + _ + title (truncado)
        safe_title = re.sub(r"[^a-zA-Z0-9\s]", "", title)[:30].strip().replace(" ", "_")
        job_aba = f"{code_raw}_{safe_title}"

        job_payload: Dict[str, Any] = {
            "tenant_id":    self.tenant_id,
            "index_number": index_number,
            "code":         code_raw,
            "job_aba":      job_aba,
            "title":        title if title else code_raw,
            "client_id":    client_id,
            "status":       map_job_status(status_raw),
            "project_type": map_project_type(project_type_raw),
            "import_source": IMPORT_SOURCE,  # armazenado em custom_fields pois jobs não tem import_source direto
        }

        # custom_fields para rastreabilidade
        job_payload["custom_fields"] = {
            "import_source": IMPORT_SOURCE,
            "import_line": line_num,
        }
        # Remove import_source do nível raiz (não existe na tabela jobs)
        del job_payload["import_source"]

        if brand:
            job_payload["brand"] = brand
        if notes:
            job_payload["notes"] = notes
        if drive_url:
            job_payload["drive_folder_url"] = drive_url
        if briefing_date_raw:
            parsed = parse_date_br(briefing_date_raw)
            if parsed:
                job_payload["briefing_date"] = parsed
        if delivery_date_raw:
            parsed = parse_date_br(delivery_date_raw)
            if parsed:
                job_payload["expected_delivery_date"] = parsed
        if closed_value_raw:
            val = parse_brl(closed_value_raw)
            if val is not None:
                job_payload["closed_value"] = val
        if production_cost_raw:
            val = parse_brl(production_cost_raw)
            if val is not None:
                job_payload["production_cost"] = val

        # Resolve agency_id se informada
        if agency_name:
            agency_id = self._find_or_create_agency(agency_name)
            if agency_id:
                job_payload["agency_id"] = agency_id

        try:
            result = self.client.upsert(
                "jobs",
                job_payload,
                on_conflict="tenant_id,code",
            )
            job_id: str = result["id"]
            self._job_cache[code_raw.lower()] = job_id
            self._job_cache[f"title:{normalize_text(title)}"] = job_id
            self.stats["jobs_created"] += 1
            log_ok(f"Linha {line_num}: job criado/atualizado '{code_raw} - {title}' (id={job_id})")
        except Exception as e:
            self._record_error(f"Linha {line_num}: job '{code_raw}': {e}")

    def _find_or_create_agency(self, agency_name: str) -> Optional[str]:
        """Encontra ou cria uma agência. Retorna UUID."""
        key = normalize_text(agency_name)
        try:
            rows = self.client.select(
                "agencies",
                {
                    "tenant_id": f"eq.{self.tenant_id}",
                    "deleted_at": "is.null",
                },
                columns="id,name",
            )
            for r in rows:
                if normalize_text(r.get("name", "")) == key:
                    return r["id"]

            if self.dry_run:
                log_skip(f"[DRY-RUN] Criaria agency: {agency_name}")
                return None

            result = self.client.insert("agencies", {
                "tenant_id": self.tenant_id,
                "name": agency_name.strip().title(),
                "is_active": True,
            })
            log_ok(f"  Agency criada: {agency_name}")
            return result["id"]
        except Exception as e:
            log_warn(f"  Não foi possível resolver agency '{agency_name}': {e}")
            return None

    # -----------------------------------------------------------------------
    # Migração de Custos → cost_items
    # -----------------------------------------------------------------------

    def migrate_costs(self) -> None:
        """
        Importa custos para a tabela cost_items.
        Requer que vendors e jobs já existam no banco.
        """
        print(f"\n{BOLD}--- Migrando Custos → cost_items ---{RESET}")
        rows = self._load_costs()
        if not rows:
            log_warn("Nenhum dado de custo encontrado.")
            return

        self._load_vendor_cache()
        self._load_job_cache()

        for i, row in enumerate(rows, start=1):
            self._process_cost_row(row, i)

    def _process_cost_row(self, row: Dict[str, Any], line_num: int) -> None:
        """Processa uma linha de custo e persiste em cost_items."""
        # Campos do item
        job_code = (
            row.get("job_code") or row.get("codigo_job") or row.get("job") or ""
        ).strip()
        job_title = (row.get("job_titulo") or row.get("job_title") or "").strip()
        item_num_raw = (
            row.get("item") or row.get("item_number") or row.get("categoria") or "1"
        ).strip()
        sub_item_raw = (
            row.get("sub_item") or row.get("sub_item_number") or "1"
        ).strip()
        description = (
            row.get("descricao") or row.get("description") or row.get("service_description") or ""
        ).strip()
        unit_value_raw = (
            row.get("valor_unitario") or row.get("unit_value") or row.get("valor") or ""
        ).strip()
        qty_raw = (
            row.get("quantidade") or row.get("quantity") or row.get("qtde") or "1"
        ).strip()
        vendor_name_raw = (
            row.get("fornecedor") or row.get("vendor") or row.get("vendor_name") or ""
        ).strip()
        payment_cond_raw = (
            row.get("condicao_pagamento") or row.get("payment_condition") or row.get("c_nf") or ""
        ).strip()
        payment_due_raw = (
            row.get("data_pagamento") or row.get("payment_due_date") or row.get("vencimento") or ""
        ).strip()
        notes = (
            row.get("observacoes") or row.get("notes") or row.get("obs") or ""
        ).strip()
        pago_raw = (
            row.get("pago") or row.get("paid") or row.get("status_pagamento") or ""
        ).strip()
        overtime_h_raw = (
            row.get("horas_extra") or row.get("overtime_hours") or ""
        ).strip()
        overtime_r_raw = (
            row.get("valor_he") or row.get("overtime_rate") or ""
        ).strip()
        actual_paid_raw = (
            row.get("valor_pago") or row.get("actual_paid_value") or ""
        ).strip()
        vendor_email_raw = (
            row.get("email_fornecedor") or row.get("vendor_email") or row.get("email") or ""
        ).strip()
        vendor_pix_raw = (
            row.get("pix") or row.get("vendor_pix") or ""
        ).strip()

        if not description:
            log_debug(f"Linha {line_num}: descrição vazia — ignorada.")
            return

        # Resolve job_id
        job_id = self._find_job_id(job_code, job_title)
        if not job_id:
            log_warn(
                f"Linha {line_num}: job não encontrado para code='{job_code}' "
                f"title='{job_title}' — importando sem job_id (custo avulso)."
            )
            # cost_items permite job_id NULL (custo fixo/avulso)

        # Parse item/sub_item numbers
        try:
            item_num = int(float(item_num_raw)) if item_num_raw else 1
            item_num = max(1, min(99, item_num))
        except (ValueError, TypeError):
            item_num = 1

        try:
            sub_item = int(float(sub_item_raw)) if sub_item_raw else 1
            sub_item = max(0, min(99, sub_item))
        except (ValueError, TypeError):
            sub_item = 1

        # Parse valores monetários
        unit_value  = parse_brl(unit_value_raw)
        overtime_h  = parse_brl(overtime_h_raw)
        overtime_r  = parse_brl(overtime_r_raw)
        actual_paid = parse_brl(actual_paid_raw)

        try:
            qty = int(float(qty_raw)) if qty_raw else 1
            qty = max(1, qty)
        except (ValueError, TypeError):
            qty = 1

        # Payment
        payment_condition = map_payment_condition(payment_cond_raw)
        payment_due_date  = parse_date_br(payment_due_raw)

        # Status de pagamento
        pago_norm = normalize_text(pago_raw)
        is_paid   = pago_norm in ("pago", "sim", "yes", "true", "1", "s")
        item_status    = "pago" if is_paid else "orcado"
        payment_status = "pago" if is_paid else "pendente"
        payment_date   = payment_due_date if is_paid else None

        # Resolve vendor_id
        vendor_id: Optional[str] = None
        vendor_name_snapshot: Optional[str] = None
        if vendor_name_raw and not vendor_name_raw.startswith("R$"):
            # Tenta encontrar no cache/banco
            vendor_id = self._find_vendor_id(vendor_name_raw, vendor_email_raw or None)
            vendor_name_snapshot = vendor_name_raw.strip()

        # Verifica idempotência: busca por import_source + descrição + item_number + sub_item_number + job_id
        if not self.dry_run:
            try:
                filters: Dict[str, str] = {
                    "tenant_id":          f"eq.{self.tenant_id}",
                    "service_description": f"eq.{description}",
                    "item_number":        f"eq.{item_num}",
                    "sub_item_number":    f"eq.{sub_item}",
                    "import_source":      f"eq.{IMPORT_SOURCE}",
                }
                if job_id:
                    filters["job_id"] = f"eq.{job_id}"
                existing = self.client.select("cost_items", filters, columns="id")
                if existing:
                    log_skip(
                        f"Linha {line_num}: cost_item já existe "
                        f"(item={item_num}.{sub_item} '{description[:40]}') — ignorado."
                    )
                    self.stats["cost_items_skipped"] += 1
                    return
            except Exception:
                pass  # Se a query falhar, tenta inserir (pior caso: duplicata tratada pelo DB)

        if self.dry_run:
            log_skip(
                f"[DRY-RUN] Linha {line_num}: cost_item item={item_num}.{sub_item} "
                f"'{description[:50]}' vendor={vendor_name_raw}"
            )
            return

        # Monta payload
        cost_payload: Dict[str, Any] = {
            "tenant_id":          self.tenant_id,
            "item_number":        item_num,
            "sub_item_number":    sub_item,
            "service_description": description,
            "sort_order":         line_num,
            "quantity":           qty,
            "item_status":        item_status,
            "nf_request_status":  "pendente",
            "payment_status":     payment_status,
            "import_source":      IMPORT_SOURCE,
        }

        if job_id:
            cost_payload["job_id"] = job_id
        else:
            # cost_items sem job_id precisam de period_month (constraint do banco)
            cost_payload["period_month"] = datetime.now(timezone.utc).strftime("%Y-%m-01")

        if unit_value is not None:
            cost_payload["unit_value"] = unit_value
        if overtime_h is not None:
            cost_payload["overtime_hours"] = overtime_h
        if overtime_r is not None:
            cost_payload["overtime_rate"] = overtime_r
        if actual_paid is not None:
            cost_payload["actual_paid_value"] = actual_paid
        if notes:
            cost_payload["notes"] = notes
        if payment_condition:
            cost_payload["payment_condition"] = payment_condition
        if payment_due_date:
            cost_payload["payment_due_date"] = payment_due_date
        if payment_date:
            cost_payload["payment_date"] = payment_date
        if vendor_id:
            cost_payload["vendor_id"] = vendor_id
        if vendor_name_snapshot:
            cost_payload["vendor_name_snapshot"] = vendor_name_snapshot
        if vendor_email_raw and "@" in vendor_email_raw:
            cost_payload["vendor_email_snapshot"] = vendor_email_raw
        if vendor_pix_raw:
            cost_payload["vendor_pix_snapshot"] = vendor_pix_raw

        try:
            result = self.client.insert("cost_items", cost_payload)
            self.stats["cost_items_created"] += 1
            log_ok(
                f"Linha {line_num}: cost_item criado item={item_num}.{sub_item} "
                f"'{description[:40]}' (id={result['id']})"
            )
        except Exception as e:
            self._record_error(f"Linha {line_num}: cost_item '{description[:60]}': {e}")

    # -----------------------------------------------------------------------
    # Orquestração principal
    # -----------------------------------------------------------------------

    def migrate_all(self) -> None:
        """Roda migração completa na ordem correta (respeitando FKs)."""
        self._validate_config()
        print(f"\n{BOLD}{'=' * 60}{RESET}")
        print(f"{BOLD}  ELLAHOS — Migração de Dados{RESET}")
        print(f"{'=' * 60}")
        print(f"  Tenant:   {self.tenant_id}")
        print(f"  Target:   {SUPABASE_URL}")
        print(f"  Dry-run:  {self.dry_run}")
        print(f"  Source:   {IMPORT_SOURCE}")
        print(f"{'=' * 60}\n")

        # Ordem importa por causa das foreign keys
        self.migrate_freelancers()  # vendors (sem FK externa além de tenant)
        self.migrate_jobs()         # jobs (FK: clients)
        self.migrate_costs()        # cost_items (FK: jobs, vendors)

        self.print_summary()

    def print_summary(self) -> None:
        """Imprime resumo final da migração."""
        s = self.stats
        print(f"\n{BOLD}{'=' * 60}{RESET}")
        print(f"{BOLD}  RESUMO DA MIGRAÇÃO{RESET}")
        print(f"{'=' * 60}")
        if self.dry_run:
            print(f"{YELLOW}  MODO DRY-RUN — nenhum dado foi gravado{RESET}")
        print(f"  {GREEN}Vendors criados:         {s['vendors_created']}{RESET}")
        print(f"  {YELLOW}Vendors ignorados:       {s['vendors_skipped']}{RESET}")
        print(f"  {GREEN}Bank accounts criadas:   {s['bank_accounts_created']}{RESET}")
        print(f"  {GREEN}Clients criados:         {s['clients_created']}{RESET}")
        print(f"  {YELLOW}Clients ignorados:       {s['clients_skipped']}{RESET}")
        print(f"  {GREEN}Jobs criados/atualizados: {s['jobs_created']}{RESET}")
        print(f"  {YELLOW}Jobs ignorados:          {s['jobs_skipped']}{RESET}")
        print(f"  {GREEN}Cost items criados:      {s['cost_items_created']}{RESET}")
        print(f"  {YELLOW}Cost items ignorados:    {s['cost_items_skipped']}{RESET}")
        print(f"  {RED}Erros:                   {s['errors']}{RESET}")
        print(f"{'=' * 60}")
        if self.error_log:
            print(f"\n{RED}{BOLD}  ERROS DETALHADOS:{RESET}")
            for err in self.error_log[:50]:
                print(f"  {RED}• {err}{RESET}")
            if len(self.error_log) > 50:
                print(f"  ... e mais {len(self.error_log) - 50} erros.")

    # -----------------------------------------------------------------------
    # Métodos abstratos — implementados pelas subclasses
    # -----------------------------------------------------------------------

    def _load_freelancers(self) -> List[Any]:
        """Retorna lista de linhas de freelancers. Subclasses sobrescrevem."""
        return []

    def _load_jobs(self) -> List[Dict]:
        """Retorna lista de dicts com dados de jobs. Subclasses sobrescrevem."""
        return []

    def _load_costs(self) -> List[Dict]:
        """Retorna lista de dicts com dados de custos. Subclasses sobrescrevem."""
        return []


# ===========================================================================
# Migrador CSV
# ===========================================================================

class CsvMigrator(DataMigrator):
    """
    Migrador que lê dados de arquivos CSV locais.

    Estrutura esperada em --csv-dir:
      freelancers.csv  — Sem cabeçalho: nome,email,banco,documento_pix[,telefone,agencia,conta,obs]
                         OU Com cabeçalho: nome,email,banco,documento_pix,...
      jobs.csv         — Com cabeçalho: titulo,codigo,cliente,agencia,status,tipo,marca,...
      costs.csv        — Com cabeçalho: job_code,item,sub_item,descricao,valor_unitario,...
    """

    def __init__(self, csv_dir: str, dry_run: bool = False) -> None:
        super().__init__(dry_run=dry_run)
        self.csv_dir = csv_dir

    def _path(self, filename: str) -> str:
        return os.path.join(self.csv_dir, filename)

    def _load_freelancers(self) -> List[Any]:
        """
        Lê freelancers.csv.
        Detecta automaticamente se tem cabeçalho ou não.
        """
        filepath = self._path("freelancers.csv")
        if not os.path.isfile(filepath):
            log_warn(f"freelancers.csv não encontrado em: {self.csv_dir}")
            return []

        # Lê raw para detectar se a primeira linha é cabeçalho
        raw_rows = read_csv_raw(filepath)
        if not raw_rows:
            return []

        first = [c.strip().lower() for c in (raw_rows[0] if raw_rows else [])]
        has_header = any(
            col in first for col in ("nome", "name", "full_name", "email")
        )

        if has_header:
            # Lê com DictReader
            rows = read_csv_file(filepath)
            log_info(f"freelancers.csv: {len(rows)} linhas com cabeçalho.")
            return rows
        else:
            log_info(f"freelancers.csv: {len(raw_rows)} linhas sem cabeçalho.")
            return raw_rows

    def _load_jobs(self) -> List[Dict]:
        filepath = self._path("jobs.csv")
        rows = read_csv_file(filepath)
        log_info(f"jobs.csv: {len(rows)} linhas.")
        return rows

    def _load_costs(self) -> List[Dict]:
        filepath = self._path("costs.csv")
        rows = read_csv_file(filepath)
        log_info(f"costs.csv: {len(rows)} linhas.")
        return rows


# ===========================================================================
# Migrador Google Sheets (stub — requer OAuth)
# ===========================================================================

class SheetsMigrator(DataMigrator):
    """
    Migrador que lê dados diretamente do Google Sheets via API.

    Requer:
    - credentials.json (OAuth 2.0 ou Service Account) em scripts/
    - Variáveis de ambiente SHEET_FREELANCERS_ID, SHEET_JOBS_ID, SHEET_COSTS_ID
    - pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
    """

    SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

    def __init__(self, dry_run: bool = False) -> None:
        super().__init__(dry_run=dry_run)
        self.sheet_ids = {
            "freelancers": os.getenv("SHEET_FREELANCERS_ID", ""),
            "jobs":        os.getenv("SHEET_JOBS_ID", ""),
            "costs":       os.getenv("SHEET_COSTS_ID", ""),
        }
        self._sheets_service = None

    def _get_service(self):
        """Inicializa o serviço Google Sheets (lazy)."""
        if self._sheets_service:
            return self._sheets_service
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            creds_path = os.path.join(
                os.path.dirname(__file__), "credentials.json"
            )
            if not os.path.isfile(creds_path):
                log_error(
                    f"credentials.json não encontrado em: {creds_path}. "
                    "Faça download do Service Account JSON no Google Cloud Console."
                )
                sys.exit(1)

            creds = service_account.Credentials.from_service_account_file(
                creds_path, scopes=self.SCOPES
            )
            self._sheets_service = build("sheets", "v4", credentials=creds)
            return self._sheets_service
        except ImportError:
            log_error(
                "google-api-python-client não instalado. "
                "Execute: pip install -r scripts/requirements-migrate.txt"
            )
            sys.exit(1)

    def _read_sheet(self, spreadsheet_id: str, range_name: str = "A1:ZZ") -> List[List[str]]:
        """
        Lê um range de uma planilha e retorna lista de listas.
        A primeira linha é tratada como cabeçalho.
        """
        if not spreadsheet_id:
            log_warn(f"SHEET ID não configurado para range {range_name}.")
            return []
        service = self._get_service()
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=range_name)
            .execute()
        )
        return result.get("values", [])

    def _sheet_to_dicts(self, rows: List[List[str]]) -> List[Dict[str, str]]:
        """Converte lista de linhas (com cabeçalho na primeira linha) para lista de dicts."""
        if not rows:
            return []
        headers = [h.strip().lower() for h in rows[0]]
        result = []
        for row in rows[1:]:
            padded = row + [""] * (len(headers) - len(row))
            result.append(dict(zip(headers, padded)))
        return result

    def _load_freelancers(self) -> List[Dict]:
        log_info(f"Lendo freelancers da planilha: {self.sheet_ids['freelancers']}")
        raw = self._read_sheet(self.sheet_ids["freelancers"], "EQUIPE!A:H")
        dicts = self._sheet_to_dicts(raw)
        log_info(f"  {len(dicts)} freelancers encontrados.")
        return dicts

    def _load_jobs(self) -> List[Dict]:
        log_info(f"Lendo jobs da planilha: {self.sheet_ids['jobs']}")
        raw = self._read_sheet(self.sheet_ids["jobs"], "JOBS!A:Z")
        dicts = self._sheet_to_dicts(raw)
        log_info(f"  {len(dicts)} jobs encontrados.")
        return dicts

    def _load_costs(self) -> List[Dict]:
        log_info(f"Lendo custos da planilha: {self.sheet_ids['costs']}")
        raw = self._read_sheet(self.sheet_ids["costs"], "CUSTOS_REAIS!A:AH")
        dicts = self._sheet_to_dicts(raw)
        log_info(f"  {len(dicts)} custos encontrados.")
        return dicts


# ===========================================================================
# Entry point CLI
# ===========================================================================

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Migração de dados Google Sheets → ELLAHOS Supabase.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Rodar migracao completa em modo CSV (dry-run primeiro)
  python scripts/migrate_sheets_data.py --dry-run

  # Migrar so freelancers
  python scripts/migrate_sheets_data.py --only freelancers

  # Migrar de CSV em diretorio especifico
  python scripts/migrate_sheets_data.py --csv-dir /dados/planilhas

  # Migrar via Google Sheets API
  python scripts/migrate_sheets_data.py --mode sheets
        """,
    )
    parser.add_argument(
        "--mode",
        choices=["csv", "sheets"],
        default="csv",
        help="Fonte de dados: 'csv' (padrão) ou 'sheets' (Google API).",
    )
    parser.add_argument(
        "--csv-dir",
        default="scripts/data",
        dest="csv_dir",
        help="Diretório com os CSVs (padrão: scripts/data/).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Simula sem gravar nenhum dado no Supabase.",
    )
    parser.add_argument(
        "--only",
        choices=["freelancers", "jobs", "costs"],
        default=None,
        help="Roda apenas uma etapa da migração.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Exibe logs DEBUG detalhados.",
    )
    return parser


def main() -> None:
    global _verbose_global
    parser = build_parser()
    args = parser.parse_args()
    _verbose_global = args.verbose

    # Valida configuração mínima
    if not TENANT_ID:
        log_error(
            "TENANT_ID não configurado.\n"
            "  Exporte: export TENANT_ID=<uuid-do-tenant>\n"
            "  Ou crie um arquivo .env com TENANT_ID=<uuid>"
        )
        sys.exit(1)
    if not SUPABASE_SERVICE_KEY:
        log_error(
            "SUPABASE_SERVICE_ROLE_KEY não configurado.\n"
            "  Encontre em: Supabase Dashboard → Project Settings → API → service_role"
        )
        sys.exit(1)

    # Instancia o migrador correto
    if args.mode == "csv":
        # Resolve caminho absoluto caso seja relativo
        csv_dir = args.csv_dir
        if not os.path.isabs(csv_dir):
            # Resolve relativo ao CWD
            csv_dir = os.path.join(os.getcwd(), csv_dir)
        if not os.path.isdir(csv_dir):
            log_warn(f"Diretório CSV não existe: {csv_dir} — será criado se necessário.")
            os.makedirs(csv_dir, exist_ok=True)
        migrator: DataMigrator = CsvMigrator(csv_dir=csv_dir, dry_run=args.dry_run)
    else:
        migrator = SheetsMigrator(dry_run=args.dry_run)

    # Executa
    migrator._validate_config()

    if args.only:
        log_info(f"Rodando apenas: {args.only}")
        print(f"\n{BOLD}{'=' * 60}{RESET}")
        print(f"{BOLD}  ELLAHOS — Migração ({args.only}){RESET}")
        print(f"{'=' * 60}")
        print(f"  Tenant:   {TENANT_ID}")
        print(f"  Dry-run:  {args.dry_run}")
        print(f"{'=' * 60}\n")

        if args.only == "freelancers":
            if args.mode == "csv":
                migrator._load_vendor_cache()
            migrator.migrate_freelancers()
        elif args.only == "jobs":
            migrator.migrate_jobs()
        elif args.only == "costs":
            migrator.migrate_costs()

        migrator.print_summary()
    else:
        migrator.migrate_all()


if __name__ == "__main__":
    main()
