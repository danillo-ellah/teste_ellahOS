"""
parse_custos_csv.py

Parses CUSTOS_REAIS and EQUIPE CSVs for GG_033 (Ornare) and GG_038 (Senac).
Generates SQL INSERT files for cost_items and bank_accounts tables.

IMPORTANTE:
- Colunas geradas NUNCA incluidas: is_category_header, total_value, overtime_value, total_with_overtime
- Nenhum email enviado — apenas SQL gerado
- Vendor matching via subquery SQL (nao IDs hardcoded)
"""

import csv
import re
import os
import json
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
TENANT_ID = '11111111-1111-1111-1111-111111111111'
CREATED_BY = '22222222-2222-2222-2222-222222222222'
IMPORT_SOURCE_COST = 'migration_custos_20260227'
IMPORT_SOURCE_BANK = 'migration_equipe_20260227'
IMPORT_SOURCE_VENDOR = 'migration_equipe_20260227'

JOB_GG033 = '6ed38ac8-b75e-41be-b568-a47d312e9c84'
JOB_GG038 = '5eea24ed-2ae5-4c0f-9b67-9988a51ceb69'

BASE_DIR = Path('C:/Users/danil/ellahos/docs/specs/planilha-custos')
OUT_DIR  = Path('C:/Users/danil/ellahos/scripts/migration')

# Max SQL file size (~14 KB to stay safely under 15 KB)
MAX_CHUNK_BYTES = 14_000

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def normalize(s: str) -> str:
    """Lowercase, strip accents, collapse whitespace."""
    if not s:
        return ''
    s = s.strip()
    # Remove accents
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    # Lowercase and collapse spaces
    s = re.sub(r'\s+', ' ', s).lower().strip()
    return s


def parse_brl(value: str):
    """
    Convert Brazilian currency string to Decimal string or None.
    Handles: 'R$ 1.000,00', '1.000,00', '1000', '$50.000,00', etc.
    Returns: '1000.00' or None
    """
    if not value:
        return None
    v = value.strip()
    # Remove currency symbols
    v = re.sub(r'[R\$\s]', '', v)
    if not v or v in ('-', '–', '—'):
        return None
    # Detect if value is effectively zero
    # Pattern: '-  ' or '  -  ' after stripping
    v_clean = re.sub(r'[\s-]', '', v)
    if not v_clean:
        return None
    # Remove thousand separators (dots before a comma-decimal or 3-digit groups)
    # Brazilian: 1.234.567,89
    # Remove dots used as thousands sep
    if ',' in v:
        # dots are thousands separators, comma is decimal
        v = v.replace('.', '').replace(',', '.')
    else:
        # No comma — dots could be decimal (rare) or thousands
        # If there's exactly one dot with more than 2 digits after, treat as thousands
        dot_idx = v.rfind('.')
        if dot_idx != -1:
            after = v[dot_idx + 1:]
            if len(after) == 3:
                # likely thousands separator (no decimal part)
                v = v.replace('.', '')
            # else treat as decimal point
    try:
        f = float(v)
        if f == 0.0:
            return None
        return f'{f:.2f}'
    except ValueError:
        return None


def parse_date(value: str):
    """Parse DD/MM/YYYY -> YYYY-MM-DD, or None."""
    if not value:
        return None
    v = value.strip()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', v)
    if m:
        day, month, year = m.groups()
        return f'{year}-{month.zfill(2)}-{day.zfill(2)}'
    return None


def sql_str(value):
    """Return SQL string literal or NULL."""
    if value is None or str(value).strip() == '':
        return 'NULL'
    v = str(value).replace("'", "''")
    return f"'{v}'"


def sql_num(value):
    """Return SQL numeric literal or NULL."""
    if value is None:
        return 'NULL'
    return str(value)


def vendor_subquery(name: str) -> str:
    """Generate subquery to look up vendor id by normalized name."""
    safe = name.replace("'", "''")
    return (
        f"(SELECT id FROM vendors WHERE tenant_id = '{TENANT_ID}' "
        f"AND lower(trim(full_name)) = lower(trim('{safe}')) LIMIT 1)"
    )


# ---------------------------------------------------------------------------
# EQUIPE CSV parser — returns list of dicts with bank account data
# ---------------------------------------------------------------------------
def parse_equipe_csv(filepath: str) -> list:
    """
    EQUIPE CSV columns (no header row):
    col0: name
    col1: email
    col2: bank_name
    col3: pix_key (CNPJ, CPF, email, phone, or UUID)
    """
    rows = []
    with open(filepath, encoding='utf-8-sig', errors='replace') as f:
        reader = csv.reader(f)
        for line in reader:
            if not line or not line[0].strip():
                continue
            cols = line + [''] * 4  # pad to at least 4 cols
            name      = cols[0].strip()
            email     = cols[1].strip()
            bank_name = cols[2].strip()
            pix_key   = cols[3].strip()

            if not name or name.lower() in ('nome', 'name'):
                continue
            # Skip obvious garbage
            if '@' in name and len(name) < 40 and '.' in name:
                # Looks like an email was put in name field — skip
                continue

            rows.append({
                'name': name,
                'email': email,
                'bank_name': bank_name,
                'pix_key': pix_key,
            })
    return rows


def classify_pix_key(pix_key: str):
    """Classify PIX key type."""
    if not pix_key or pix_key.strip() == '':
        return None, None
    k = pix_key.strip()
    # UUID
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', k, re.I):
        return k, 'chave_aleatoria'
    # Email
    if re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', k):
        return k, 'email'
    # CNPJ: 14 digits (may have punctuation)
    digits = re.sub(r'\D', '', k)
    if len(digits) == 14:
        return digits, 'cnpj'
    # CPF: 11 digits
    if len(digits) == 11:
        return digits, 'cpf'
    # Phone: 10-11 digits
    if 10 <= len(digits) <= 13:
        return digits, 'telefone'
    # Could still be a partial text — store as-is with unknown type
    if k and len(k) > 2:
        return k, 'outro'
    return None, None


# ---------------------------------------------------------------------------
# CUSTOS_REAIS CSV parser
# ---------------------------------------------------------------------------
# GG_033 header row (row 19 in file = index 18):
# ID,JOB ID,Item,Sub Item,Destino da Verba,Valor UNITARIO,Qtde,Valor Total s/ HE,
# Fornecedor,Fornecedor,C/NF ou S/NF,Hora de Entrada,Hora de Saida,Total de Horas,
# Horas extras,Valor HE,OBSERVAÇÕES,DATA PAGAMENTO,TELEFONE,E-MAIL,Razão Social,
# Titular / Favorecido,CNPJ / CPF,Banco,Agência,Conta,C/P ou C/C,PIX,
# PEDIDO NF,FORNECEU NF?,NF,PAGO?,Quando?,COMPROVANTE PAGAMENTO,,,
#
# GG_038 has an extra "Valor TOTAL" column after "Valor Total s/ HE":
# ID,JOB ID,Item,Sub Item,Destino da Verba,Valor UNITARIO,Qtde,Valor Total s/ HE,
# Valor TOTAL,Fornecedor,C/NF ou S/NF,...

TOTAL_ROW_DESCRIPTIONS = {'total', 'mao de obra interna'}

# Mapeamento de valores de payment_condition da planilha para o ENUM do banco
PAYMENT_CONDITION_MAP = {
    'a vista':      'a_vista',
    'à vista':      'a_vista',
    'a_vista':      'a_vista',
    'c/nf 30 dias': 'cnf_30',
    'c/nf 30':      'cnf_30',
    'cnf 30':       'cnf_30',
    'cnf_30':       'cnf_30',
    'c/nf 40 dias': 'cnf_40',
    'c/nf 40':      'cnf_40',
    'cnf 40':       'cnf_40',
    'cnf_40':       'cnf_40',
    'c/nf 45 dias': 'cnf_45',
    'c/nf 45':      'cnf_45',
    'cnf 45':       'cnf_45',
    'cnf_45':       'cnf_45',
    'c/nf 60 dias': 'cnf_60',
    'c/nf 60':      'cnf_60',
    'cnf 60':       'cnf_60',
    'cnf_60':       'cnf_60',
    'c/nf 90 dias': 'cnf_90',
    'c/nf 90':      'cnf_90',
    'cnf 90':       'cnf_90',
    'cnf_90':       'cnf_90',
    's/nf 30 dias': 'snf_30',
    's/nf 30':      'snf_30',
    'snf 30':       'snf_30',
    'snf_30':       'snf_30',
}

def is_skip_row(row: dict) -> bool:
    """Skip rows that are totals, completely empty, or pure metadata."""
    desc = (row.get('service_description') or '').strip()
    if not desc:
        return True
    # Skip total rows
    if normalize(desc) in TOTAL_ROW_DESCRIPTIONS:
        return True
    if re.match(r'^total', normalize(desc)):
        return True
    return False


def parse_custos_csv(filepath: str, job_code: int) -> list:
    """
    Parse a CUSTOS_REAIS CSV file.
    Returns list of dicts ready to map to cost_items columns.
    """
    rows_out = []

    with open(filepath, encoding='utf-8-sig', errors='replace') as f:
        content = f.read()

    # Split into lines
    lines = content.splitlines()

    # Find header row (row 19 in 1-indexed = index 18)
    # Confirm by looking for 'ID' at start
    header_idx = None
    for i, line in enumerate(lines):
        if line.startswith('ID,'):
            header_idx = i
            break

    if header_idx is None:
        raise ValueError(f'Header row not found in {filepath}')

    data_lines = lines[header_idx + 1:]

    reader = csv.reader(data_lines)

    # Column mapping — both GG_033 and GG_038 share the same layout:
    # 0=ID, 1=JOB ID, 2=Item, 3=Sub Item, 4=Destino da Verba
    # 5=Valor UNITARIO, 6=Qtde, 7=Valor Total s/ HE, 8=Valor TOTAL (GG_038) / dup Fornecedor (GG_033)
    # 9=Fornecedor (actual person/company name)
    # 10=C/NF, 11=Hora Entrada, 12=Hora Saida, 13=Total Horas, 14=Horas extras, 15=Valor HE
    # 16=OBS, 17=DATA PGTO, 18=TELEFONE, 19=EMAIL, 20=Razao Social, 21=Titular
    # 22=CNPJ/CPF, 23=Banco, 24=Agencia, 25=Conta, 26=C/C, 27=PIX
    # 28=PEDIDO NF, 29=FORNECEU NF, 30=NF, 31=PAGO, 32=Quando, 33=COMPROVANTE

    COL_FORNECEDOR     = 9
    COL_CNF            = 10
    COL_HORA_ENTRADA   = 11
    COL_HORA_SAIDA     = 12
    COL_TOTAL_HORAS    = 13
    COL_HE             = 14
    COL_VALOR_HE       = 15
    COL_OBS            = 16
    COL_DATA_PGTO      = 17
    COL_TELEFONE       = 18
    COL_EMAIL          = 19
    COL_RAZAO_SOCIAL   = 20
    COL_TITULAR        = 21
    COL_CNPJ_CPF       = 22
    COL_BANCO          = 23
    COL_AGENCIA        = 24
    COL_CONTA          = 25
    COL_CC             = 26
    COL_PIX            = 27
    COL_PEDIDO_NF      = 28
    COL_FORNECEU_NF    = 29
    COL_NF             = 30
    COL_PAGO           = 31
    COL_QUANDO         = 32
    COL_COMPROVANTE    = 33

    sort_counter = 0
    last_valid_item_num = 1  # carry-forward para item_number=0

    for raw_row in reader:
        # Pad row
        row = raw_row + [''] * 40

        csv_id        = row[0].strip()
        item_num_s    = row[2].strip()
        sub_item_s    = row[3].strip()
        description   = row[4].strip()
        unit_value_s  = row[5].strip()
        qty_s         = row[6].strip()
        vendor_name   = row[COL_FORNECEDOR].strip()
        payment_cond  = row[COL_CNF].strip()
        overtime_h_s  = row[COL_HE].strip()
        overtime_r_s  = row[COL_VALOR_HE].strip()
        obs           = row[COL_OBS].strip()
        data_pgto     = row[COL_DATA_PGTO].strip()
        email         = row[COL_EMAIL].strip()
        razao_social  = row[COL_RAZAO_SOCIAL].strip()
        titular       = row[COL_TITULAR].strip()
        banco         = row[COL_BANCO].strip()
        agencia       = row[COL_AGENCIA].strip()
        conta         = row[COL_CONTA].strip()
        pix           = row[COL_PIX].strip()
        pago_flag     = row[COL_PAGO].strip()
        quando        = row[COL_QUANDO].strip()

        # Skip pure metadata / empty / total rows
        if not csv_id and not item_num_s and not description:
            continue
        if normalize(description) in {'', 'total', 'mao de obra interna'}:
            if not csv_id:
                continue

        # Parse item/sub_item numbers
        try:
            item_num = int(item_num_s) if item_num_s else None
        except ValueError:
            item_num = None

        try:
            sub_item = int(sub_item_s) if sub_item_s else None
        except ValueError:
            sub_item = None

        # Determine if this is a category header
        is_header = (sub_item == 0 or sub_item is None) and item_num is not None

        # Skip rows with no item_num at all (orphan rows)
        if item_num is None:
            # Still include if has description and values
            if not description:
                continue
            # Carry forward last valid item_number instead of using 0
            item_num = last_valid_item_num
        elif item_num >= 1:
            # Update carry-forward tracker only for valid values (1..99)
            last_valid_item_num = item_num

        if sub_item is None:
            sub_item = 0

        # CHECK: item_number must be 1..99. If still 0 for any reason, use carry-forward.
        if item_num == 0:
            item_num = last_valid_item_num

        # Skip pure TOTAL row
        if item_num == 15 and sub_item == 15:
            continue

        # Parse monetary values
        unit_val  = parse_brl(unit_value_s)
        try:
            qty = int(float(qty_s)) if qty_s and qty_s not in ('', '-') else 1
            if qty == 0:
                qty = 1
        except (ValueError, OverflowError):
            qty = 1

        overtime_h = parse_brl(overtime_h_s)
        overtime_r = parse_brl(overtime_r_s)

        # Payment date
        pay_date = parse_date(quando) or parse_date(data_pgto)

        # Determine payment status
        pago_norm = normalize(pago_flag)
        is_paid = pago_norm in ('pago', 'sim', 'true', '1')

        # item_status: 'pago' if paid, 'orcado' otherwise
        # NOTA: 'aprovado' NAO e valor valido no ENUM — usar 'orcado' para itens orcados/aprovados
        if is_paid:
            item_status = 'pago'
            payment_status = 'pago'
        else:
            item_status = 'orcado'
            payment_status = 'pendente'

        # Payment condition: mapear valor textual para ENUM do banco
        cnf_raw = payment_cond.strip() if payment_cond else None
        if cnf_raw:
            # Normalizar: lowercase, sem acentos, sem pontuacao extra
            cnf_normalized = normalize(cnf_raw)
            cnf_val = PAYMENT_CONDITION_MAP.get(cnf_normalized, None)
            if cnf_val is None:
                # Tentar sem 'dias' no final
                cnf_no_dias = cnf_normalized.replace(' dias', '').strip()
                cnf_val = PAYMENT_CONDITION_MAP.get(cnf_no_dias, None)
            if cnf_val is None:
                # Log valores desconhecidos para debug
                print(f'  WARN: payment_condition desconhecido: {repr(cnf_raw)} (normalizado: {repr(cnf_normalized)}) — usando NULL')
        else:
            cnf_val = None

        # Vendor snapshot fields
        # Clean up vendor_name — discard if it looks like a currency value or payment term
        vn_clean = vendor_name
        if vn_clean:
            vn_s = vn_clean.strip()
            if vn_s.startswith('R$') or vn_s.startswith('$') or re.match(r'^(PAGO|SIM|NÃO|À vista|C/NF|S/NF)', vn_s, re.I):
                vn_clean = None

        # Prefer titular over razao_social for display name
        vendor_display = titular or razao_social or vn_clean or None
        vendor_name_raw = vn_clean  # Use cleaned name for subquery

        # Vendor email: use email col directly from CSV
        vendor_email = email if email and '@' in email else None

        # PIX
        vendor_pix = pix if pix else None

        # Bank snapshot
        bank_parts = []
        if banco:
            bank_parts.append(banco)
        if agencia:
            bank_parts.append(f'Ag: {agencia}')
        if conta:
            bank_parts.append(f'Cc: {conta}')
        vendor_bank = ' | '.join(bank_parts) if bank_parts else None

        # Notes: combine obs + COLUNA NOTA message filtering
        note_parts = []
        if obs and 'COLUNA NOTA ZERADO' not in obs and obs.lower() not in ('arquivo não encontrado', 'valor não encontrado'):
            note_parts.append(obs)
        notes = ' | '.join(note_parts) if note_parts else None

        sort_counter += 1

        rows_out.append({
            'item_number':           item_num,
            'sub_item_number':       sub_item,
            'is_header':             is_header,
            'service_description':   description,
            'unit_value':            unit_val,
            'quantity':              qty,
            'overtime_hours':        overtime_h,
            'overtime_rate':         overtime_r,
            'payment_condition':     cnf_val,
            'payment_due_date':      parse_date(data_pgto),
            'payment_date':          pay_date,
            'payment_method':        None,
            'item_status':           item_status,
            'payment_status':        payment_status,
            'vendor_name_raw':       vendor_name_raw,
            'vendor_display':        vendor_display,
            'vendor_email':          vendor_email,
            'vendor_pix':            vendor_pix,
            'vendor_bank':           vendor_bank,
            'notes':                 notes,
            'sort_order':            sort_counter,
        })

    return rows_out


# ---------------------------------------------------------------------------
# SQL generation
# ---------------------------------------------------------------------------
def build_cost_item_insert(row: dict, job_id: str) -> str:
    """Build a single-row INSERT VALUES clause (without the INSERT INTO header)."""
    vendor_name_raw = row['vendor_name_raw']
    vendor_id_expr = 'NULL'
    # Only generate subquery if vendor_name_raw looks like an actual person/company
    # (not a currency value like 'R$  -' or payment terms)
    if vendor_name_raw:
        vn = vendor_name_raw.strip()
        is_currency = vn.startswith('R$') or vn.startswith('$')
        is_payment_term = re.match(r'^(PAGO|SIM|NÃO|À vista|C/NF|S/NF)', vn, re.I)
        is_valid = vn and len(vn) > 2 and not is_currency and not is_payment_term
        if is_valid:
            vendor_id_expr = vendor_subquery(vn)

    parts = [
        f"'{TENANT_ID}'",                            # tenant_id
        f"'{job_id}'",                               # job_id
        str(row['item_number']),                     # item_number
        str(row['sub_item_number']),                 # sub_item_number
        sql_str(row['service_description']),          # service_description
        str(row['sort_order']),                      # sort_order
        'NULL',                                      # period_month
        f"'{IMPORT_SOURCE_COST}'",                   # import_source
        sql_num(row['unit_value']),                  # unit_value
        str(row['quantity']),                        # quantity
        sql_num(row['overtime_hours']),              # overtime_hours
        sql_num(row['overtime_rate']),               # overtime_rate
        'NULL',                                      # actual_paid_value
        sql_str(row['notes']),                       # notes
        sql_str(row['payment_condition']),           # payment_condition
        sql_str(row['payment_due_date']),            # payment_due_date
        sql_str(row['payment_method']),              # payment_method
        vendor_id_expr,                              # vendor_id
        sql_str(row['vendor_display']),              # vendor_name_snapshot
        sql_str(row['vendor_email']),                # vendor_email_snapshot
        sql_str(row['vendor_pix']),                  # vendor_pix_snapshot
        sql_str(row['vendor_bank']),                 # vendor_bank_snapshot
        f"'{row['item_status']}'",                   # item_status
        "'pendente'",                                # nf_request_status
        f"'{row['payment_status']}'",                # payment_status
        sql_str(row['payment_date']),                # payment_date
        f"'{CREATED_BY}'",                           # created_by
    ]
    return '(' + ', '.join(parts) + ')'


COST_ITEM_COLS = (
    "tenant_id, job_id, item_number, sub_item_number, service_description, "
    "sort_order, period_month, import_source, unit_value, quantity, "
    "overtime_hours, overtime_rate, actual_paid_value, notes, "
    "payment_condition, payment_due_date, payment_method, "
    "vendor_id, vendor_name_snapshot, vendor_email_snapshot, "
    "vendor_pix_snapshot, vendor_bank_snapshot, "
    "item_status, nf_request_status, payment_status, payment_date, created_by"
)


def write_cost_items_sql(rows: list, job_id: str, prefix: str):
    """Write chunked SQL files for cost_items."""
    chunk_idx = 1
    current_chunks = []
    current_size = 0

    header = f"-- cost_items migration: {prefix}\n-- Generated by parse_custos_csv.py\n\n"
    insert_header = f"INSERT INTO cost_items ({COST_ITEM_COLS})\nVALUES\n"

    def flush_chunk(values_list, idx):
        filepath = OUT_DIR / f'cost_items_{prefix}_{idx}.sql'
        body = insert_header + ',\n'.join(values_list) + '\nON CONFLICT DO NOTHING;\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + body)
        print(f'  Wrote {filepath} ({len(values_list)} rows, {len(body)} bytes)')

    for row in rows:
        val_clause = build_cost_item_insert(row, job_id)
        val_bytes = len(val_clause.encode('utf-8')) + 2  # +2 for ",\n"

        if current_size + val_bytes > MAX_CHUNK_BYTES and current_chunks:
            flush_chunk(current_chunks, chunk_idx)
            chunk_idx += 1
            current_chunks = []
            current_size = 0

        current_chunks.append(val_clause)
        current_size += val_bytes

    if current_chunks:
        flush_chunk(current_chunks, chunk_idx)


# ---------------------------------------------------------------------------
# Bank accounts SQL
# ---------------------------------------------------------------------------
BANK_ACCT_COLS = (
    "tenant_id, vendor_id, bank_name, pix_key, pix_key_type, import_source, created_by"
)


def build_bank_account_insert(equipe_row: dict) -> str:
    name = equipe_row['name']
    bank_name = equipe_row['bank_name'] or None
    pix_raw   = equipe_row['pix_key']

    pix_key, pix_type = classify_pix_key(pix_raw)

    vendor_id_expr = vendor_subquery(name)

    parts = [
        f"'{TENANT_ID}'",
        vendor_id_expr,
        sql_str(bank_name),
        sql_str(pix_key),
        sql_str(pix_type),
        f"'{IMPORT_SOURCE_BANK}'",
        f"'{CREATED_BY}'",
    ]
    return '(' + ', '.join(parts) + ')'


def write_bank_accounts_sql(equipe_rows: list, prefix: str):
    """Write chunked SQL files for bank_accounts."""
    chunk_idx = 1
    current_chunks = []
    current_size = 0

    header = f"-- bank_accounts migration: {prefix}\n-- Generated by parse_custos_csv.py\n\n"
    insert_header = f"INSERT INTO bank_accounts ({BANK_ACCT_COLS})\nVALUES\n"

    def flush_chunk(values_list, idx):
        filepath = OUT_DIR / f'bank_accounts_{prefix}_{idx}.sql'
        body = insert_header + ',\n'.join(values_list) + '\nON CONFLICT DO NOTHING;\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + body)
        print(f'  Wrote {filepath} ({len(values_list)} rows, {len(body)} bytes)')

    for row in equipe_rows:
        val_clause = build_bank_account_insert(row)
        val_bytes = len(val_clause.encode('utf-8')) + 2

        if current_size + val_bytes > MAX_CHUNK_BYTES and current_chunks:
            flush_chunk(current_chunks, chunk_idx)
            chunk_idx += 1
            current_chunks = []
            current_size = 0

        current_chunks.append(val_clause)
        current_size += val_bytes

    if current_chunks:
        flush_chunk(current_chunks, chunk_idx)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print('=== ELLAHOS — Migracao CUSTOS_REAIS + EQUIPE ===\n')

    # --- GG_033 CUSTOS_REAIS ---
    print('[GG_033] Parsing CUSTOS_REAIS...')
    custos_033_path = str(BASE_DIR / 'GG_033_ILHAPURA_ORNARE_UNUM - CUSTOS_REAIS.csv')
    rows_033 = parse_custos_csv(custos_033_path, job_code=33)
    print(f'  Parsed {len(rows_033)} rows (including headers)')

    # Filter: keep only rows with non-empty description
    rows_033_filtered = [r for r in rows_033 if r['service_description']]
    print(f'  After filter: {len(rows_033_filtered)} rows')

    write_cost_items_sql(rows_033_filtered, JOB_GG033, 'gg033')

    # --- GG_038 CUSTOS_REAIS ---
    print('\n[GG_038] Parsing CUSTOS_REAIS...')
    custos_038_path = str(BASE_DIR / 'GG_038_Quer Fazer_ Senac!_SENAC SP - CUSTOS_REAIS.csv')
    rows_038 = parse_custos_csv(custos_038_path, job_code=38)
    print(f'  Parsed {len(rows_038)} rows (including headers)')

    rows_038_filtered = [r for r in rows_038 if r['service_description']]
    print(f'  After filter: {len(rows_038_filtered)} rows')

    write_cost_items_sql(rows_038_filtered, JOB_GG038, 'gg038')

    # --- EQUIPE files (bank accounts) ---
    print('\n[EQUIPE] Parsing EQUIPE CSVs for bank accounts...')

    equipe_033_path = str(BASE_DIR / 'GG_033_ILHAPURA_ORNARE_UNUM - EQUIPE.csv')
    equipe_038_path = str(BASE_DIR / 'GG_038_Quer Fazer_ Senac!_SENAC SP - EQUIPE.csv')

    equipe_033 = parse_equipe_csv(equipe_033_path)
    equipe_038 = parse_equipe_csv(equipe_038_path)

    print(f'  GG_033 EQUIPE: {len(equipe_033)} entries')
    print(f'  GG_038 EQUIPE: {len(equipe_038)} entries')

    # Deduplicate by normalized name across both files
    seen_names = set()
    all_equipe = []
    for row in equipe_033 + equipe_038:
        key = normalize(row['name'])
        if key and key not in seen_names:
            seen_names.add(key)
            all_equipe.append(row)

    print(f'  After dedup: {len(all_equipe)} unique equipe entries')

    write_bank_accounts_sql(all_equipe, 'equipe')

    print('\n=== Concluido ===')
    print(f'Arquivos gerados em: {OUT_DIR}')


if __name__ == '__main__':
    main()
