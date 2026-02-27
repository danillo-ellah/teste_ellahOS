"""
Gera SQL INSERT para vendors + bank_accounts a partir dos CSVs de EQUIPE.
Dedup por:
  1) normalized_name (lowercase + trim + remove acentos)
  2) CPF/CNPJ (mesma entidade com nome ligeiramente diferente)
"""

import re
import unicodedata

TENANT_ID = '11111111-1111-1111-1111-111111111111'
IMPORT_SOURCE = 'migration_equipe_20260227'

CSV_FILES = [
    r'C:\Users\danil\ellahos\docs\specs\planilha-custos\GG_033_ILHAPURA_ORNARE_UNUM - EQUIPE.csv',
    r'C:\Users\danil\ellahos\docs\specs\planilha-custos\GG_038_Quer Fazer_ Senac!_SENAC SP - EQUIPE.csv',
]

# Sufixos que indicam pessoa jurídica no nome
PJ_SUFFIXES = re.compile(
    r'\b(ltda|me|eireli|s\.?\s*a\.?|inc\.?|lta\s+me|locacoes|locações|servicos|serviços|'
    r'transportes|locadora|catering|eventos|filmagens|producoes|produções|gravacoes|gravações|'
    r'grip\s+ltda|fullcine|cinegripp|speclight|ficcao|transkinderr)\b',
    re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Helpers de normalização
# ---------------------------------------------------------------------------

def remove_accents(s: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )

def normalize_key(name: str) -> str:
    """Chave de dedup: lowercase, sem acentos, trim, espaços simples."""
    return re.sub(r'\s+', ' ', remove_accents(name.strip().lower()))

def title_case(name: str) -> str:
    """Title Case preservando artigos comuns em minúsculo quando não são a primeira palavra."""
    small = {'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'a', 'o', 'um', 'uma'}
    words = name.strip().split()
    result = []
    for i, w in enumerate(words):
        if i == 0 or w.lower() not in small:
            result.append(w.capitalize())
        else:
            result.append(w.lower())
    return ' '.join(result)

def clean_digits(s: str) -> str:
    """Remove tudo que não for dígito."""
    return re.sub(r'\D', '', s)

def sql_escape(s: str) -> str:
    """Escapa aspas simples para SQL."""
    return s.replace("'", "''")

# ---------------------------------------------------------------------------
# Detecção de tipo de documento / PIX
# ---------------------------------------------------------------------------

UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

def classify_pix(raw: str):
    """
    Retorna (pix_key_clean, pix_key_type, cpf_digits_or_None, cnpj_digits_or_None)
    pix_key_type: 'cpf'|'cnpj'|'email'|'telefone'|'aleatoria'|None
    """
    raw = raw.strip()

    # Remove prefixos comuns como "Pix(cpf):", "CNPJ:", "CPF", "chave email" etc.
    raw_clean = re.sub(
        r'^(pix\s*[\(\-:]*\s*)?(cpf|cnpj|celular|telefone|chave\s+email)[\s:\-]*',
        '', raw, flags=re.IGNORECASE
    ).strip()

    # Remove sufixos como "(cnpj)", "CPF", "celular", "(chave email)" etc.
    raw_clean = re.sub(
        r'\s*([\(\[]\s*)?(cpf|cnpj|celular|telefone|chave\s+email)(\s*[\)\]])?$',
        '', raw_clean, flags=re.IGNORECASE
    ).strip()

    # Verifica UUID
    if UUID_RE.match(raw_clean.lower()):
        return raw_clean.lower(), 'aleatoria', None, None

    # Verifica e-mail
    if EMAIL_RE.match(raw_clean):
        return raw_clean.lower(), 'email', None, None

    # Extrai só dígitos
    digits = clean_digits(raw_clean)

    if len(digits) == 11:
        return digits, 'cpf', digits, None
    if len(digits) == 14:
        return digits, 'cnpj', None, digits

    # CNPJ com zero inicial faltando (13 digitos) → pad para 14
    if len(digits) == 13:
        cnpj14 = digits.zfill(14)
        return cnpj14, 'cnpj', None, cnpj14

    # Telefone: 10-11 dígitos (com DDD)
    if 10 <= len(digits) <= 11:
        return digits, 'telefone', None, None

    # Fallback: testa o raw original como e-mail (remove sufixo de descrição primeiro)
    raw_strip = raw.strip().lower()
    raw_strip = re.sub(r'\s*\(chave\s+email\)\s*$', '', raw_strip).strip()
    if EMAIL_RE.match(raw_strip):
        return raw_strip, 'email', None, None

    # Não reconhecido (ex: #ERROR!, texto livre) → retorna None
    return None, None, None, None


# ---------------------------------------------------------------------------
# Normalização de banco
# ---------------------------------------------------------------------------

BANK_MAP = [
    (r'nu\s*pagamentos?|nubank|nu\s*bank|nubenk|nu\b', 'Nu Pagamentos', '260'),
    (r'ita[uú]', 'Itau Unibanco', '341'),
    (r'bradesco', 'Bradesco', '237'),
    (r'banco\s+do\s+brasil|b\.?\s*b\.?\b', 'Banco do Brasil', '001'),
    (r'caixa\s*(econ[oô]mica)?|c\.?\s*e\.?\s*f\.?|cef\b', 'Caixa Economica Federal', '104'),
    (r'santander', 'Santander', '033'),
    (r'inter\b|banco\s+inter', 'Banco Inter', '077'),
    (r'c6\s*bank|c6\b|banco\s+c6', 'C6 Bank', '336'),
    (r'picpay', 'PicPay', '380'),
    (r'mercado\s*pago', 'Mercado Pago', '323'),
    (r'cora\b', 'Cora', '403'),
    (r'neon\b', 'Neon', '536'),
    (r'pefisa|palmeiras\s*pay', 'Pefisa', '174'),
    (r'dock\b', 'Dock', '301'),
    (r'brasil\b', 'Banco do Brasil', '001'),
]

CODE_TO_NAME = {
    '001': 'Banco do Brasil', '033': 'Santander', '077': 'Banco Inter',
    '104': 'Caixa Economica Federal', '174': 'Pefisa', '206': 'Banco 206',
    '237': 'Bradesco', '260': 'Nu Pagamentos', '301': 'Dock',
    '323': 'Mercado Pago', '336': 'C6 Bank', '341': 'Itau Unibanco',
    '380': 'PicPay', '403': 'Cora', '536': 'Neon',
}

def normalize_bank(raw: str):
    """Retorna (bank_name, bank_code)."""
    if not raw or not raw.strip():
        return None, None
    s = raw.strip().lower()
    for pattern, name, code in BANK_MAP:
        if re.search(pattern, s):
            return name, code
    # Tenta extrair código numérico puro (ex: "237", "341", "77")
    code_match = re.match(r'^0*(\d{1,3})\b', s)
    if code_match:
        code_raw = code_match.group(1).zfill(3)
        return CODE_TO_NAME.get(code_raw, f'Banco {code_raw}'), code_raw
    return raw.strip()[:60], None


# ---------------------------------------------------------------------------
# Leitura dos CSVs
# ---------------------------------------------------------------------------

def read_csv(path: str):
    """Le CSV — tenta UTF-8 primeiro, depois latin-1."""
    rows = []
    for enc in ('utf-8-sig', 'utf-8', 'latin-1'):
        try:
            with open(path, encoding=enc, errors='replace') as f:
                for line in f:
                    line = line.rstrip('\r\n')
                    if not line.strip():
                        continue
                    parts = line.split(',')
                    if len(parts) < 2:
                        continue
                    nome = parts[0].strip()
                    email = parts[1].strip().lower() if len(parts) > 1 else ''
                    banco = parts[2].strip() if len(parts) > 2 else ''
                    # Reagrupa campos 3+ caso haja vírgula interna no PIX
                    pix_raw = ','.join(parts[3:]).strip() if len(parts) > 3 else ''
                    rows.append((nome, email, banco, pix_raw))
            return rows
        except Exception:
            continue
    return rows


# ---------------------------------------------------------------------------
# Processamento principal
# ---------------------------------------------------------------------------

def process():
    all_rows = []
    for path in CSV_FILES:
        rows = read_csv(path)
        all_rows.extend(rows)

    seen_name_keys = set()  # dedup por nome normalizado
    seen_cpf = set()        # dedup por CPF
    seen_cnpj = set()       # dedup por CNPJ

    vendors = []

    for nome, email, banco, pix_raw in all_rows:
        # Pula linhas com nome inválido/vazio
        if not nome or len(nome.strip()) < 2:
            continue

        # Se o campo "nome" é um e-mail (ex: linha 154), pula
        if EMAIL_RE.match(nome.strip()):
            continue

        # Remove possíveis sufixos com CNPJ/CPF embutidos no nome (ex: linha 75)
        nome_clean = re.sub(r'\s+\d[\d\.\-/]+[\d]\s*$', '', nome).strip()
        if not nome_clean:
            nome_clean = nome.strip()

        # PIX / documento
        pix_key, pix_type, cpf_digits, cnpj_digits = classify_pix(pix_raw)

        # --- DEDUP por CPF/CNPJ ---
        if cpf_digits and cpf_digits in seen_cpf:
            continue
        if cnpj_digits and cnpj_digits in seen_cnpj:
            continue

        # --- DEDUP por nome normalizado ---
        name_key = normalize_key(nome_clean)
        if name_key in seen_name_keys:
            continue

        # Registra nas vistas de dedup
        seen_name_keys.add(name_key)
        if cpf_digits:
            seen_cpf.add(cpf_digits)
        if cnpj_digits:
            seen_cnpj.add(cnpj_digits)

        # Title Case
        full_name = title_case(nome_clean)

        # E-mail: valida
        email_val = email if EMAIL_RE.match(email) else None

        # Banco
        bank_name, bank_code = normalize_bank(banco)

        # entity_type: CNPJ → pj, CPF → pf, sufixo PJ no nome → pj, default pf
        if cnpj_digits:
            entity_type = 'pj'
        elif cpf_digits:
            entity_type = 'pf'
        elif PJ_SUFFIXES.search(nome_clean):
            entity_type = 'pj'
        else:
            entity_type = 'pf'

        vendors.append({
            'full_name': full_name,
            'email': email_val,
            'entity_type': entity_type,
            'cpf': cpf_digits,
            'cnpj': cnpj_digits,
            'bank_name': bank_name,
            'bank_code': bank_code,
            'pix_key': pix_key,
            'pix_type': pix_type,
        })

    return vendors


# ---------------------------------------------------------------------------
# Geração do SQL
# ---------------------------------------------------------------------------

def fmt_str(v) -> str:
    if v is None:
        return 'NULL'
    return f"'{sql_escape(str(v))}'"

def generate_sql(vendors):
    lines = []
    lines.append('-- ============================================================')
    lines.append('-- Migration: EQUIPE CSV -> vendors + bank_accounts')
    lines.append('-- Gerado em: 2026-02-27')
    lines.append(f'-- Total de vendors (apos dedup): {len(vendors)}')
    lines.append('-- Fontes: GG_033 EQUIPE.csv + GG_038 EQUIPE.csv (identicos)')
    lines.append('-- Dedup aplicado: nome normalizado + CPF + CNPJ')
    lines.append('-- ============================================================')
    lines.append('')
    lines.append('BEGIN;')
    lines.append('')

    # Um statement CTE por vendor (vendor + bank_account encadeados via RETURNING)
    for i, v in enumerate(vendors):
        n = i + 1
        alias_v = f'ins_vendor_{n}'
        alias_b = f'ins_bank_{n}'

        v_cols = 'tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active'
        v_vals = (
            f"'{TENANT_ID}', "
            f"{fmt_str(v['full_name'])}, "
            f"'{v['entity_type']}', "
            f"{fmt_str(v['email'])}, "
            f"{fmt_str(v['cpf'])}, "
            f"{fmt_str(v['cnpj'])}, "
            f"'{IMPORT_SOURCE}', "
            f"true"
        )

        has_bank = v['pix_key'] is not None or v['bank_name'] is not None

        if has_bank:
            lines.append(f'-- #{n}: {v["full_name"]}')
            lines.append(f'WITH {alias_v} AS (')
            lines.append(f'  INSERT INTO vendors ({v_cols})')
            lines.append(f'  VALUES ({v_vals})')
            lines.append(f'  RETURNING id')
            lines.append(f'),')
            lines.append(f'{alias_b} AS (')

            ba_cols = 'tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type'
            ba_vals = (
                f"'{TENANT_ID}', "
                f"(SELECT id FROM {alias_v}), "
                f"true, "
                f"{fmt_str(v['bank_name'])}, "
                f"{fmt_str(v['bank_code'])}, "
                f"{fmt_str(v['pix_key'])}, "
                f"{fmt_str(v['pix_type'])}"
            )
            lines.append(f'  INSERT INTO bank_accounts ({ba_cols})')
            lines.append(f'  VALUES ({ba_vals})')
            lines.append(f'  RETURNING id')
            lines.append(f')')
            lines.append(f'SELECT {alias_v}.id AS vendor_id, {alias_b}.id AS bank_account_id')
            lines.append(f'FROM {alias_v}, {alias_b};')
        else:
            # Sem dados bancarios reconheciveis: INSERT simples do vendor
            lines.append(f'-- #{n}: {v["full_name"]} (sem dados bancarios validos)')
            lines.append(f'INSERT INTO vendors ({v_cols})')
            lines.append(f'VALUES ({v_vals});')

        lines.append('')

    lines.append('COMMIT;')
    lines.append('')
    lines.append('-- ============================================================')
    lines.append('-- Verificacao pos-import')
    lines.append('-- ============================================================')
    lines.append(f"SELECT COUNT(*) AS total_vendors FROM vendors WHERE import_source = '{IMPORT_SOURCE}';")
    lines.append('')
    lines.append(f"SELECT COUNT(*) AS total_bank_accounts FROM bank_accounts")
    lines.append(f"  WHERE tenant_id = '{TENANT_ID}'")
    lines.append(f"    AND vendor_id IN (SELECT id FROM vendors WHERE import_source = '{IMPORT_SOURCE}');")
    lines.append('')
    lines.append('-- Detalhamento por entity_type')
    lines.append(f"SELECT entity_type, COUNT(*) FROM vendors WHERE import_source = '{IMPORT_SOURCE}' GROUP BY entity_type;")
    lines.append('')
    lines.append('-- Detalhamento por pix_key_type')
    lines.append(f"SELECT ba.pix_key_type, COUNT(*) FROM bank_accounts ba")
    lines.append(f"  JOIN vendors v ON v.id = ba.vendor_id")
    lines.append(f"  WHERE v.import_source = '{IMPORT_SOURCE}'")
    lines.append(f"  GROUP BY ba.pix_key_type ORDER BY COUNT(*) DESC;")

    return '\n'.join(lines)


if __name__ == '__main__':
    vendors = process()
    print(f'Vendors apos dedup: {len(vendors)}')

    sql = generate_sql(vendors)

    out_path = r'C:\Users\danil\ellahos\scripts\migration\equipe_insert.sql'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f'SQL escrito em: {out_path}')

    # Estatisticas
    pf = sum(1 for v in vendors if v['entity_type'] == 'pf')
    pj = sum(1 for v in vendors if v['entity_type'] == 'pj')
    sem_pix = sum(1 for v in vendors if v['pix_key'] is None)
    print(f'  PF: {pf} | PJ: {pj}')
    print(f'  Sem PIX valido: {sem_pix}')

    pix_types = {}
    for v in vendors:
        t = v['pix_type'] or 'sem_pix'
        pix_types[t] = pix_types.get(t, 0) + 1
    print('  PIX key types:')
    for k, c in sorted(pix_types.items(), key=lambda x: -x[1]):
        print(f'    {k}: {c}')

    print('\nVendors sem PIX valido (para revisao manual):')
    for v in vendors:
        if v['pix_key'] is None:
            print(f'  - {v["full_name"]} | {v["email"]} | pix_raw nao reconhecido')

    print('\nVerificacoes de casos especiais:')
    # Nicolas (deve ter email como pix)
    nic = next((v for v in vendors if 'presciutti' in normalize_key(v['full_name'])), None)
    if nic:
        print(f'  Nicolas: name={nic["full_name"]} pix={nic["pix_key"]} type={nic["pix_type"]}')
    # Bahia Grip (deve ser pj)
    bahia = next((v for v in vendors if 'bahia grip' in normalize_key(v['full_name'])), None)
    if bahia:
        print(f'  Bahia Grip: entity={bahia["entity_type"]} pix={bahia["pix_key"]} type={bahia["pix_type"]}')
    # Ivan Carlos (UUID)
    ivan = next((v for v in vendors if 'ivan carlos' in normalize_key(v['full_name'])), None)
    if ivan:
        print(f'  Ivan Carlos: pix={ivan["pix_key"]} type={ivan["pix_type"]}')
    # Aryane (deve aparecer 1x)
    aryanes = [v for v in vendors if 'aryane' in normalize_key(v['full_name'])]
    print(f'  Aryane count (deve ser 1): {len(aryanes)}')
    # Walter (deve aparecer 1x)
    walters = [v for v in vendors if 'walter edelcio' in normalize_key(v['full_name'])]
    print(f'  Walter Edelcio count (deve ser 1): {len(walters)}')
