-- ============================================================
-- Migration: EQUIPE CSV -> vendors + bank_accounts
-- Gerado em: 2026-02-27
-- Total de vendors (apos dedup): 195
-- Fontes: GG_033 EQUIPE.csv + GG_038 EQUIPE.csv (identicos)
-- Dedup aplicado: nome normalizado + CPF + CNPJ
-- ============================================================

BEGIN;

-- #1: Andre de Oliveira Alves
WITH ins_vendor_1 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Andre de Oliveira Alves', 'pj', 'andre_rock_roll@hotmail.com', NULL, '19956170000172', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_1 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_1), true, 'Banco do Brasil', '001', '19956170000172', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_1.id AS vendor_id, ins_bank_1.id AS bank_account_id
FROM ins_vendor_1, ins_bank_1;

-- #2: Giulia Martinho Casado
WITH ins_vendor_2 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Giulia Martinho Casado', 'pj', 'giu.casado@gmail.com', NULL, '42786481000152', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_2 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_2), true, 'Nu Pagamentos', '260', '42786481000152', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_2.id AS vendor_id, ins_bank_2.id AS bank_account_id
FROM ins_vendor_2, ins_bank_2;

-- #3: José Luiz Lerma
WITH ins_vendor_3 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'José Luiz Lerma', 'pj', 'joseluizlerma@hotmail.com', NULL, '18549941000144', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_3 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_3), true, NULL, NULL, '18549941000144', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_3.id AS vendor_id, ins_bank_3.id AS bank_account_id
FROM ins_vendor_3, ins_bank_3;

-- #4: Marcelo Brito do Espírito Santo Filho
WITH ins_vendor_4 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcelo Brito do Espírito Santo Filho', 'pf', 'marcelobritofilho@gmail.com', '65218914568', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_4 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_4), true, 'Itau Unibanco', '341', '65218914568', 'cpf')
  RETURNING id
)
SELECT ins_vendor_4.id AS vendor_id, ins_bank_4.id AS bank_account_id
FROM ins_vendor_4, ins_bank_4;

-- #5: Marcello Luiz Garofalo Avian
WITH ins_vendor_5 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcello Luiz Garofalo Avian', 'pf', 'marcelloavian@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_5 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_5), true, 'Nu Pagamentos', '260', 'marcelloavian@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_5.id AS vendor_id, ins_bank_5.id AS bank_account_id
FROM ins_vendor_5, ins_bank_5;

-- #6: Gabriela Scardini Amato
WITH ins_vendor_6 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gabriela Scardini Amato', 'pj', 'gabiscardini@gmail.com', NULL, '43884138000103', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_6 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_6), true, 'Nu Pagamentos', '260', '43884138000103', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_6.id AS vendor_id, ins_bank_6.id AS bank_account_id
FROM ins_vendor_6, ins_bank_6;

-- #7: Michele Regina de Carvalho
WITH ins_vendor_7 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Michele Regina de Carvalho', 'pf', 'michele.regina2728@gmail.com', '21980742609', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_7 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_7), true, 'Itau Unibanco', '341', '21980742609', 'cpf')
  RETURNING id
)
SELECT ins_vendor_7.id AS vendor_id, ins_bank_7.id AS bank_account_id
FROM ins_vendor_7, ins_bank_7;

-- #8: Fábio José Ribeiro de Souza
WITH ins_vendor_8 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fábio José Ribeiro de Souza', 'pj', 'fabioribeirofabao@gmail.com', NULL, '27326583000100', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_8 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_8), true, 'Itau Unibanco', '341', '27326583000100', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_8.id AS vendor_id, ins_bank_8.id AS bank_account_id
FROM ins_vendor_8, ins_bank_8;

-- #9: Gabriella Alves de Castro Serra Lima
WITH ins_vendor_9 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gabriella Alves de Castro Serra Lima', 'pj', 'castro.gabi@live.com', NULL, '15316998000105', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_9 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_9), true, 'Nu Pagamentos', '260', '15316998000105', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_9.id AS vendor_id, ins_bank_9.id AS bank_account_id
FROM ins_vendor_9, ins_bank_9;

-- #10: Bianca Palermo de Menezes Guerra
WITH ins_vendor_10 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Bianca Palermo de Menezes Guerra', 'pf', 'biancaguerramakeup1@gmail.com', '03415954706', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_10 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_10), true, 'Bradesco', '237', '03415954706', 'cpf')
  RETURNING id
)
SELECT ins_vendor_10.id AS vendor_id, ins_bank_10.id AS bank_account_id
FROM ins_vendor_10, ins_bank_10;

-- #11: David Leonardo Nascimento
WITH ins_vendor_11 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'David Leonardo Nascimento', 'pf', 'davidleonascimento@gmail.com', '21997016341', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_11 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_11), true, 'Nu Pagamentos', '260', '21997016341', 'cpf')
  RETURNING id
)
SELECT ins_vendor_11.id AS vendor_id, ins_bank_11.id AS bank_account_id
FROM ins_vendor_11, ins_bank_11;

-- #12: Cedric Amaury Aveline
WITH ins_vendor_12 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cedric Amaury Aveline', 'pf', 'cedric.amaury@gmail.com', '11359442707', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_12 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_12), true, 'Banco do Brasil', '001', '11359442707', 'cpf')
  RETURNING id
)
SELECT ins_vendor_12.id AS vendor_id, ins_bank_12.id AS bank_account_id
FROM ins_vendor_12, ins_bank_12;

-- #13: Lidio Macario
WITH ins_vendor_13 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Lidio Macario', 'pf', 'lidiosalmodiando51@hotmail.com', '93719701700', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_13 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_13), true, 'Nu Pagamentos', '260', '93719701700', 'cpf')
  RETURNING id
)
SELECT ins_vendor_13.id AS vendor_id, ins_bank_13.id AS bank_account_id
FROM ins_vendor_13, ins_bank_13;

-- #14: Leonardo Graf Accioli Jaime
WITH ins_vendor_14 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Leonardo Graf Accioli Jaime', 'pf', 'legraf.1979@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_14 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_14), true, 'Itau Unibanco', '341', '8415260792', 'telefone')
  RETURNING id
)
SELECT ins_vendor_14.id AS vendor_id, ins_bank_14.id AS bank_account_id
FROM ins_vendor_14, ins_bank_14;

-- #15: Luciano da Silva Oliveira
WITH ins_vendor_15 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luciano da Silva Oliveira', 'pj', 'lucianoeletrica73@yahoo.com', NULL, '30890130000108', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_15 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_15), true, 'Banco Inter', '077', '30890130000108', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_15.id AS vendor_id, ins_bank_15.id AS bank_account_id
FROM ins_vendor_15, ins_bank_15;

-- #16: Jorge Sena Nascimento
WITH ins_vendor_16 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Jorge Sena Nascimento', 'pj', 'jsena4168@gmail.com', NULL, '30714772000156', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_16 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_16), true, 'Nú pagamentos', NULL, '30714772000156', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_16.id AS vendor_id, ins_bank_16.id AS bank_account_id
FROM ins_vendor_16, ins_bank_16;

-- #17: Cândido Dacio de Oliveira Neto
WITH ins_vendor_17 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cândido Dacio de Oliveira Neto', 'pj', 'netosuportecarioca@gmail.com', NULL, '40952981000191', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_17 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_17), true, 'Nubanck', NULL, '40952981000191', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_17.id AS vendor_id, ins_bank_17.id AS bank_account_id
FROM ins_vendor_17, ins_bank_17;

-- #18: Sérgio Luis de Mello Domingues
WITH ins_vendor_18 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sérgio Luis de Mello Domingues', 'pj', 'sergiomdomingues@hotmail.com', NULL, '10933321000100', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_18 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_18), true, 'Itau Unibanco', '341', '10933321000100', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_18.id AS vendor_id, ins_bank_18.id AS bank_account_id
FROM ins_vendor_18, ins_bank_18;

-- #19: Elcio Gonçalves Lima Nepomuceno
WITH ins_vendor_19 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Elcio Gonçalves Lima Nepomuceno', 'pj', 'elciolima@egladlog.com.br', NULL, '15003941000156', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_19 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_19), true, 'Itau Unibanco', '341', '15003941000156', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_19.id AS vendor_id, ins_bank_19.id AS bank_account_id
FROM ins_vendor_19, ins_bank_19;

-- #20: Sander Melo Santiago
WITH ins_vendor_20 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sander Melo Santiago', 'pj', 'sandersantiago999@gmail.com', NULL, '29097838000127', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_20 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_20), true, 'Nu Pagamentos', '260', '29097838000127', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_20.id AS vendor_id, ins_bank_20.id AS bank_account_id
FROM ins_vendor_20, ins_bank_20;

-- #21: Felipe Séllos Vilas Boas Machado
WITH ins_vendor_21 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Felipe Séllos Vilas Boas Machado', 'pj', 'felipesellos@gmail.com', NULL, '60231084000104', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_21 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_21), true, 'Mercado Pago', '323', '60231084000104', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_21.id AS vendor_id, ins_bank_21.id AS bank_account_id
FROM ins_vendor_21, ins_bank_21;

-- #22: Chien Ribeiro Faria
WITH ins_vendor_22 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Chien Ribeiro Faria', 'pj', 'chienribeiro@gmail.com', NULL, '23238749000177', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_22 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_22), true, 'Bradesco', '237', '23238749000177', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_22.id AS vendor_id, ins_bank_22.id AS bank_account_id
FROM ins_vendor_22, ins_bank_22;

-- #23: Sérgio de Oliveira Santos
WITH ins_vendor_23 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sérgio de Oliveira Santos', 'pf', 'sergiodeoliveirasantoas@gmil.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_23 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_23), true, 'Nu Pagamentos', '260', 'sergiodeoliveirasantos81@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_23.id AS vendor_id, ins_bank_23.id AS bank_account_id
FROM ins_vendor_23, ins_bank_23;

-- #24: Ricardo Rodrigues da Cunha
WITH ins_vendor_24 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ricardo Rodrigues da Cunha', 'pj', 'ricardo.dacunha20@gmail.com', NULL, '24528399000146', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_24 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_24), true, 'Nu Pagamentos', '260', '24528399000146', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_24.id AS vendor_id, ins_bank_24.id AS bank_account_id
FROM ins_vendor_24, ins_bank_24;

-- #25: Fernando Ricardo Hanriot Selasco Junior
WITH ins_vendor_25 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fernando Ricardo Hanriot Selasco Junior', 'pj', 'hanriotselasco@gmail.com', NULL, '57107839000140', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_25 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_25), true, 'Nu Pagamentos', '260', '57107839000140', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_25.id AS vendor_id, ins_bank_25.id AS bank_account_id
FROM ins_vendor_25, ins_bank_25;

-- #26: Aryane Vilarim Silva
WITH ins_vendor_26 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Aryane Vilarim Silva', 'pj', 'vilarimaryane@hotmail.com', NULL, '57004542000150', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_26 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_26), true, 'Nu Pagamentos', '260', '57004542000150', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_26.id AS vendor_id, ins_bank_26.id AS bank_account_id
FROM ins_vendor_26, ins_bank_26;

-- #27: Ana Paula Pereira
WITH ins_vendor_27 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ana Paula Pereira', 'pj', 'adm@bodyguardsuporte.com.br', NULL, '47817362000133', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_27 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_27), true, 'Caixa Economica Federal', '104', '47817362000133', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_27.id AS vendor_id, ins_bank_27.id AS bank_account_id
FROM ins_vendor_27, ins_bank_27;

-- #28: Mateus de Andrade Jaime
WITH ins_vendor_28 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Mateus de Andrade Jaime', 'pf', 'mateusandradejaime@gmail.com', '16115623766', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_28 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_28), true, 'Nu Pagamentos', '260', '16115623766', 'cpf')
  RETURNING id
)
SELECT ins_vendor_28.id AS vendor_id, ins_bank_28.id AS bank_account_id
FROM ins_vendor_28, ins_bank_28;

-- #29: Rodrigo Graf Accioli Graf
WITH ins_vendor_29 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rodrigo Graf Accioli Graf', 'pj', 'rodrigografaccioli@gmail.com', NULL, '31948365000176', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_29 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_29), true, 'Bradesco', '237', '31948365000176', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_29.id AS vendor_id, ins_bank_29.id AS bank_account_id
FROM ins_vendor_29, ins_bank_29;

-- #30: Evelyn Palmeira Branco
WITH ins_vendor_30 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Evelyn Palmeira Branco', 'pj', 'evelynpb@uol.com.br', NULL, '18055779000108', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_30 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_30), true, 'Itau Unibanco', '341', '18055779000108', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_30.id AS vendor_id, ins_bank_30.id AS bank_account_id
FROM ins_vendor_30, ins_bank_30;

-- #31: Felipe Amorim da Silva
WITH ins_vendor_31 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Felipe Amorim da Silva', 'pj', 'felipe.panda2@gmail.com', NULL, '59508519000128', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_31 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_31), true, 'Nu Pagamentos', '260', '59508519000128', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_31.id AS vendor_id, ins_bank_31.id AS bank_account_id
FROM ins_vendor_31, ins_bank_31;

-- #32: Rogério Soares Filho
WITH ins_vendor_32 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rogério Soares Filho', 'pj', 'soaresrogerio2012@gmail.com', NULL, '53925762000165', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_32 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_32), true, 'Dock', '301', '53925762000165', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_32.id AS vendor_id, ins_bank_32.id AS bank_account_id
FROM ins_vendor_32, ins_bank_32;

-- #33: Cristina Linhares Macedo
WITH ins_vendor_33 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cristina Linhares Macedo', 'pj', 'fischer.cris@gmail.com', NULL, '41799887000107', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_33 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_33), true, 'Santander', '033', '41799887000107', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_33.id AS vendor_id, ins_bank_33.id AS bank_account_id
FROM ins_vendor_33, ins_bank_33;

-- #34: Marcelo Martins
WITH ins_vendor_34 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcelo Martins', 'pj', 'marcelomartins1984.mm@gmail.com', NULL, '29589063000107', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_34 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_34), true, 'Nu Pagamentos', '260', '29589063000107', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_34.id AS vendor_id, ins_bank_34.id AS bank_account_id
FROM ins_vendor_34, ins_bank_34;

-- #35: Sabrina Lessa Guimarães Pereira
WITH ins_vendor_35 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sabrina Lessa Guimarães Pereira', 'pf', 'sabrinalessa@gmail.com', '21976628872', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_35 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_35), true, 'Santander', '033', '21976628872', 'cpf')
  RETURNING id
)
SELECT ins_vendor_35.id AS vendor_id, ins_bank_35.id AS bank_account_id
FROM ins_vendor_35, ins_bank_35;

-- #36: Victor Agueda Valentim
WITH ins_vendor_36 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Victor Agueda Valentim', 'pf', 'vvalentimfilmes@gmail.com', '21975996474', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_36 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_36), true, 'Caixa Economica Federal', '104', '21975996474', 'cpf')
  RETURNING id
)
SELECT ins_vendor_36.id AS vendor_id, ins_bank_36.id AS bank_account_id
FROM ins_vendor_36, ins_bank_36;

-- #37: Evandro da Silva Gomes
WITH ins_vendor_37 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Evandro da Silva Gomes', 'pj', 'gomes.transportadora@gmail.com', NULL, '12361902000132', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_37 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_37), true, 'Banco Inter', '077', '12361902000132', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_37.id AS vendor_id, ins_bank_37.id AS bank_account_id
FROM ins_vendor_37, ins_bank_37;

-- #38: Isaías Campos dos Santos
WITH ins_vendor_38 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Isaías Campos dos Santos', 'pf', 'isaiassantos1@hotmail.com', '82023298768', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_38 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_38), true, 'Nu Pagamentos', '260', '82023298768', 'cpf')
  RETURNING id
)
SELECT ins_vendor_38.id AS vendor_id, ins_bank_38.id AS bank_account_id
FROM ins_vendor_38, ins_bank_38;

-- #39: Hugo Freitas Mattos
WITH ins_vendor_39 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Hugo Freitas Mattos', 'pj', 'falacomigo@hugomattos.com', NULL, '44833100000174', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_39 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_39), true, 'Nu Pagamentos', '260', '44833100000174', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_39.id AS vendor_id, ins_bank_39.id AS bank_account_id
FROM ins_vendor_39, ins_bank_39;

-- #40: Luciana Sabino Cleto
WITH ins_vendor_40 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luciana Sabino Cleto', 'pf', 'lucianasabino@gmail.com', '21983551001', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_40 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_40), true, 'Itau Unibanco', '341', '21983551001', 'cpf')
  RETURNING id
)
SELECT ins_vendor_40.id AS vendor_id, ins_bank_40.id AS bank_account_id
FROM ins_vendor_40, ins_bank_40;

-- #41: Miguel Zisman Arruda Lima
WITH ins_vendor_41 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Miguel Zisman Arruda Lima', 'pf', 'miguelzismanprod@gmail.com', '21985797606', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_41 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_41), true, 'Banco do Brasil', '001', '21985797606', 'cpf')
  RETURNING id
)
SELECT ins_vendor_41.id AS vendor_id, ins_bank_41.id AS bank_account_id
FROM ins_vendor_41, ins_bank_41;

-- #42: Pablo Brizzi Cardoso
WITH ins_vendor_42 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Pablo Brizzi Cardoso', 'pj', 'pablobrizzicardoso1999@gmail.com', NULL, '38829240000176', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_42 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_42), true, 'Nu Pagamentos', '260', '38829240000176', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_42.id AS vendor_id, ins_bank_42.id AS bank_account_id
FROM ins_vendor_42, ins_bank_42;

-- #43: Julio Cesar Silva Azeredo
WITH ins_vendor_43 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Julio Cesar Silva Azeredo', 'pf', 'julio.320@hotmail.com', '14495161733', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_43 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_43), true, 'Nu Pagamentos', '260', '14495161733', 'cpf')
  RETURNING id
)
SELECT ins_vendor_43.id AS vendor_id, ins_bank_43.id AS bank_account_id
FROM ins_vendor_43, ins_bank_43;

-- #44: Carla Rebouças
WITH ins_vendor_44 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Carla Rebouças', 'pj', 'carlarebr@gmail.com', NULL, '30608981000115', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_44 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_44), true, 'Banco Inter', '077', '30608981000115', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_44.id AS vendor_id, ins_bank_44.id AS bank_account_id
FROM ins_vendor_44, ins_bank_44;

-- #45: Marcel Camargo Melfi
WITH ins_vendor_45 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcel Camargo Melfi', 'pj', 'marcelmelfi@gmail.com', NULL, '46971960000108', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_45 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_45), true, 'C6 Bank', '336', '46971960000108', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_45.id AS vendor_id, ins_bank_45.id AS bank_account_id
FROM ins_vendor_45, ins_bank_45;

-- #46: Ana Claudia Laforga
WITH ins_vendor_46 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ana Claudia Laforga', 'pj', 'analaforga@gmail.com', NULL, '17457239000198', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_46 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_46), true, 'Banco do Brasil', '001', '17457239000198', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_46.id AS vendor_id, ins_bank_46.id AS bank_account_id
FROM ins_vendor_46, ins_bank_46;

-- #47: Cristian Zinngraf
WITH ins_vendor_47 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cristian Zinngraf', 'pj', 'cristianeletrica@hotmail.com', NULL, '07232953000124', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_47 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_47), true, 'Banco Inter', '077', '07232953000124', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_47.id AS vendor_id, ins_bank_47.id AS bank_account_id
FROM ins_vendor_47, ins_bank_47;

-- #48: Giulio Beneduci Timoner
WITH ins_vendor_48 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Giulio Beneduci Timoner', 'pj', 'giuliotimoner@gmail.com', NULL, '41865240000136', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_48 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_48), true, 'Banco Inter', '077', '41865240000136', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_48.id AS vendor_id, ins_bank_48.id AS bank_account_id
FROM ins_vendor_48, ins_bank_48;

-- #49: Luiz Guilherme Amaral Said
WITH ins_vendor_49 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luiz Guilherme Amaral Said', 'pf', 'luizguilhermeamaralsaid@gmail.com', '11951658028', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_49 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_49), true, 'Santander', '033', '11951658028', 'cpf')
  RETURNING id
)
SELECT ins_vendor_49.id AS vendor_id, ins_bank_49.id AS bank_account_id
FROM ins_vendor_49, ins_bank_49;

-- #50: Vanessa Bruel de Carvalho Albernás
WITH ins_vendor_50 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Vanessa Bruel de Carvalho Albernás', 'pj', 'vanessaalbernas.casting@gmail.com', NULL, '15766214000140', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_50 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_50), true, 'C6 Bank', '336', '15766214000140', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_50.id AS vendor_id, ins_bank_50.id AS bank_account_id
FROM ins_vendor_50, ins_bank_50;

-- #51: Alexandre Oliver Lodi Harada
WITH ins_vendor_51 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Alexandre Oliver Lodi Harada', 'pf', 'aleharada@hotmail.com', '40790108852', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_51 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_51), true, 'Itau Unibanco', '341', '40790108852', 'cpf')
  RETURNING id
)
SELECT ins_vendor_51.id AS vendor_id, ins_bank_51.id AS bank_account_id
FROM ins_vendor_51, ins_bank_51;

-- #52: Helio de Jesus Dantas
WITH ins_vendor_52 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Helio de Jesus Dantas', 'pf', 'heliodantas@live.com', '11963870153', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_52 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_52), true, 'Caixa Economica Federal', '104', '11963870153', 'cpf')
  RETURNING id
)
SELECT ins_vendor_52.id AS vendor_id, ins_bank_52.id AS bank_account_id
FROM ins_vendor_52, ins_bank_52;

-- #53: Eduardo Santiago
WITH ins_vendor_53 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Eduardo Santiago', 'pf', 'eduardomcsantiago@gmail.com', '11957570512', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_53 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_53), true, 'Mercado Pago', '323', '11957570512', 'cpf')
  RETURNING id
)
SELECT ins_vendor_53.id AS vendor_id, ins_bank_53.id AS bank_account_id
FROM ins_vendor_53, ins_bank_53;

-- #54: Genivaldo Barreto Santos
WITH ins_vendor_54 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Genivaldo Barreto Santos', 'pj', 'genivaldobarreto53@gmail.com', NULL, '24916969000175', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_54 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_54), true, 'Itau Unibanco', '341', '24916969000175', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_54.id AS vendor_id, ins_bank_54.id AS bank_account_id
FROM ins_vendor_54, ins_bank_54;

-- #55: Peterson Augusto Lomovtov
WITH ins_vendor_55 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Peterson Augusto Lomovtov', 'pj', 'peterson.lomovtov@gmail.com', NULL, '35726441000150', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_55 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_55), true, 'Bradesco', '237', '35726441000150', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_55.id AS vendor_id, ins_bank_55.id AS bank_account_id
FROM ins_vendor_55, ins_bank_55;

-- #56: Paulo Vinícius Rodrigues da Silva
WITH ins_vendor_56 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Paulo Vinícius Rodrigues da Silva', 'pj', 'pauloviniciusrodrigues@gmail.com', NULL, '21783735000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_56 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_56), true, 'Banco Inter', '077', '21783735000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_56.id AS vendor_id, ins_bank_56.id AS bank_account_id
FROM ins_vendor_56, ins_bank_56;

-- #57: Leocimar de Souza Trezena Junior
WITH ins_vendor_57 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Leocimar de Souza Trezena Junior', 'pj', 'trezenajr@gmail.com', NULL, '12580057000196', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_57 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_57), true, 'Santander', '033', '12580057000196', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_57.id AS vendor_id, ins_bank_57.id AS bank_account_id
FROM ins_vendor_57, ins_bank_57;

-- #58: Guilherme de Oliveira Alves
WITH ins_vendor_58 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Guilherme de Oliveira Alves', 'pj', 'arkdark1992@gmail.com', NULL, '54075823000105', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_58 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_58), true, 'C6 Bank', '336', '54075823000105', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_58.id AS vendor_id, ins_bank_58.id AS bank_account_id
FROM ins_vendor_58, ins_bank_58;

-- #59: Weslley Barreto Santos
WITH ins_vendor_59 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Weslley Barreto Santos', 'pj', 'wbarreto2001@gmail.com', NULL, '47051824000154', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_59 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_59), true, 'Itau Unibanco', '341', '47051824000154', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_59.id AS vendor_id, ins_bank_59.id AS bank_account_id
FROM ins_vendor_59, ins_bank_59;

-- #60: Giovani Aparecido Alves
WITH ins_vendor_60 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Giovani Aparecido Alves', 'pj', NULL, NULL, '17713004000110', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_60 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_60), true, 'Bradesco', '237', '17713004000110', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_60.id AS vendor_id, ins_bank_60.id AS bank_account_id
FROM ins_vendor_60, ins_bank_60;

-- #61: Rodrigo César dos Reis Soares
WITH ins_vendor_61 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rodrigo César dos Reis Soares', 'pj', 'rodrigo.crs2022@gmail.com', NULL, '45455246000196', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_61 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_61), true, 'Nu Pagamentos', '260', '45455246000196', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_61.id AS vendor_id, ins_bank_61.id AS bank_account_id
FROM ins_vendor_61, ins_bank_61;

-- #62: Vinicius Trigo Pereira dos Santos
WITH ins_vendor_62 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Vinicius Trigo Pereira dos Santos', 'pf', 'viniciustrigoproducao@gmail.com', '11932311387', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_62 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_62), true, 'Nu Pagamentos', '260', '11932311387', 'cpf')
  RETURNING id
)
SELECT ins_vendor_62.id AS vendor_id, ins_bank_62.id AS bank_account_id
FROM ins_vendor_62, ins_bank_62;

-- #63: Arthur Caio Marau da Cruz
WITH ins_vendor_63 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Arthur Caio Marau da Cruz', 'pj', 'kboficial@gmail.com', NULL, '36660560000110', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_63 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_63), true, 'Nu Pagamentos', '260', '36660560000110', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_63.id AS vendor_id, ins_bank_63.id AS bank_account_id
FROM ins_vendor_63, ins_bank_63;

-- #64: Joan Josep Ibars Pallas
WITH ins_vendor_64 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Joan Josep Ibars Pallas', 'pf', 'j2i4p@yahoo.com.br', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_64 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_64), true, 'Nu Pagamentos', '260', 'j2i4p@icloud.com', 'email')
  RETURNING id
)
SELECT ins_vendor_64.id AS vendor_id, ins_bank_64.id AS bank_account_id
FROM ins_vendor_64, ins_bank_64;

-- #65: Jonas Augusto Barreiro
WITH ins_vendor_65 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Jonas Augusto Barreiro', 'pj', 'jonasaugustojn@hotmail.com', NULL, '34643425000130', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_65 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_65), true, 'Cora', '403', '34643425000130', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_65.id AS vendor_id, ins_bank_65.id AS bank_account_id
FROM ins_vendor_65, ins_bank_65;

-- #66: Everton Ferrari
WITH ins_vendor_66 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Everton Ferrari', 'pf', 'evertoonferrari@gmail.com', '41059198819', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_66 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_66), true, 'Banco Inter', '077', '41059198819', 'cpf')
  RETURNING id
)
SELECT ins_vendor_66.id AS vendor_id, ins_bank_66.id AS bank_account_id
FROM ins_vendor_66, ins_bank_66;

-- #67: Thomaz Neuhaus Tarre
WITH ins_vendor_67 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Thomaz Neuhaus Tarre', 'pj', 'thomaztarre@gmail.com', NULL, '32055092000101', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_67 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_67), true, 'Nu Pagamentos', '260', '32055092000101', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_67.id AS vendor_id, ins_bank_67.id AS bank_account_id
FROM ins_vendor_67, ins_bank_67;

-- #68: Clovis Santos Costa
WITH ins_vendor_68 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Clovis Santos Costa', 'pf', 'clovis_pessoa@hotmail.com', '11991903569', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_68 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_68), true, 'Bradesco', '237', '11991903569', 'cpf')
  RETURNING id
)
SELECT ins_vendor_68.id AS vendor_id, ins_bank_68.id AS bank_account_id
FROM ins_vendor_68, ins_bank_68;

-- #69: Marcelo dos Santos Amaral
WITH ins_vendor_69 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcelo dos Santos Amaral', 'pj', 'ready2flyimagensaereas@gmail.com', NULL, '29471827000165', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_69 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_69), true, 'Banco do Brasil', '001', '29471827000165', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_69.id AS vendor_id, ins_bank_69.id AS bank_account_id
FROM ins_vendor_69, ins_bank_69;

-- #70: Marcela Sinibaldi Gambelli
WITH ins_vendor_70 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcela Sinibaldi Gambelli', 'pj', 'magambelli@yahoo.com.br', NULL, '02607379000128', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_70 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_70), true, 'Itau Unibanco', '341', '02607379000128', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_70.id AS vendor_id, ins_bank_70.id AS bank_account_id
FROM ins_vendor_70, ins_bank_70;

-- #71: Alessandra Rosa Costa
WITH ins_vendor_71 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Alessandra Rosa Costa', 'pf', 'sandra8.rosacosta@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_71 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_71), true, 'Itau Unibanco', '341', 'sandra8.rosacosta@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_71.id AS vendor_id, ins_bank_71.id AS bank_account_id
FROM ins_vendor_71, ins_bank_71;

-- #72: Chao Tsai Ping
WITH ins_vendor_72 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Chao Tsai Ping', 'pf', 'vendaselitestock@gmail.com', '11964094742', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_72 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_72), true, 'Nu Pagamentos', '260', '11964094742', 'cpf')
  RETURNING id
)
SELECT ins_vendor_72.id AS vendor_id, ins_bank_72.id AS bank_account_id
FROM ins_vendor_72, ins_bank_72;

-- #73: Cinegripp Locação de Equipamento Cinematografico Ltda
WITH ins_vendor_73 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cinegripp Locação de Equipamento Cinematografico Ltda', 'pj', 'contato@cinegripp.com.br', NULL, '26122732000148', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_73 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_73), true, 'Itau Unibanco', '341', '26122732000148', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_73.id AS vendor_id, ins_bank_73.id AS bank_account_id
FROM ins_vendor_73, ins_bank_73;

-- #74: Joao Batista Frohlich
WITH ins_vendor_74 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Joao Batista Frohlich', 'pj', 'joaofrohlich@gmail.com', NULL, '22723577000164', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_74 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_74), true, 'Nu Pagamentos', '260', '22723577000164', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_74.id AS vendor_id, ins_bank_74.id AS bank_account_id
FROM ins_vendor_74, ins_bank_74;

-- #75: Lafayette Martins Ferreira
WITH ins_vendor_75 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Lafayette Martins Ferreira', 'pj', 'eliteradioslocacao@gmail.com', NULL, '51720930000150', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_75 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_75), true, 'Bradesco', '237', '51720930000150', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_75.id AS vendor_id, ins_bank_75.id AS bank_account_id
FROM ins_vendor_75, ins_bank_75;

-- #76: Speclight Locação de Equipamentos Ltda
WITH ins_vendor_76 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Speclight Locação de Equipamentos Ltda', 'pj', 'financeiro@speclight.com.br', NULL, '52454954000178', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_76 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_76), true, 'Itau Unibanco', '341', '52454954000178', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_76.id AS vendor_id, ins_bank_76.id AS bank_account_id
FROM ins_vendor_76, ins_bank_76;

-- #77: Simone Santos Cardoso
WITH ins_vendor_77 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Simone Santos Cardoso', 'pj', 'simonescardoso1@gmail.com', NULL, '23800384000122', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_77 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_77), true, 'Itau Unibanco', '341', '23800384000122', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_77.id AS vendor_id, ins_bank_77.id AS bank_account_id
FROM ins_vendor_77, ins_bank_77;

-- #78: Jeferson dos Santos Fleck
WITH ins_vendor_78 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Jeferson dos Santos Fleck', 'pf', 'proloc.jeff@gmail.com', '11947815905', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_78 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_78), true, 'Nu Pagamentos', '260', '11947815905', 'cpf')
  RETURNING id
)
SELECT ins_vendor_78.id AS vendor_id, ins_bank_78.id AS bank_account_id
FROM ins_vendor_78, ins_bank_78;

-- #79: Allan Cesar de Moraes Moreira
WITH ins_vendor_79 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Allan Cesar de Moraes Moreira', 'pj', 'allanczar@hotmail.com', NULL, '12232397000126', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_79 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_79), true, 'Mercado Pago', '323', '12232397000126', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_79.id AS vendor_id, ins_bank_79.id AS bank_account_id
FROM ins_vendor_79, ins_bank_79;

-- #80: Fábio Moraes
WITH ins_vendor_80 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fábio Moraes', 'pj', 'fabio.cinemadigital@gmail.com', NULL, '16698279000169', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_80 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_80), true, 'Nu Pagamentos', '260', '16698279000169', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_80.id AS vendor_id, ins_bank_80.id AS bank_account_id
FROM ins_vendor_80, ins_bank_80;

-- #81: Stella dos Santos Azevedo
WITH ins_vendor_81 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Stella dos Santos Azevedo', 'pf', 'stellah3@hotmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_81 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_81), true, 'Banco Inter', '077', 'stellah3@hotmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_81.id AS vendor_id, ins_bank_81.id AS bank_account_id
FROM ins_vendor_81, ins_bank_81;

-- #82: Luiz Eduardo Alves Matos
WITH ins_vendor_82 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luiz Eduardo Alves Matos', 'pf', 'leam12@gmail.com', '11989042940', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_82 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_82), true, 'Pefisa', '174', '11989042940', 'cpf')
  RETURNING id
)
SELECT ins_vendor_82.id AS vendor_id, ins_bank_82.id AS bank_account_id
FROM ins_vendor_82, ins_bank_82;

-- #83: Marcos Cesar Barbosa Felicio
WITH ins_vendor_83 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcos Cesar Barbosa Felicio', 'pj', 'marcoscfelicio@gmail.com', NULL, '18048932000170', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_83 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_83), true, 'Bradesco', '237', '18048932000170', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_83.id AS vendor_id, ins_bank_83.id AS bank_account_id
FROM ins_vendor_83, ins_bank_83;

-- #84: Edson Uchoa Rodrigues
WITH ins_vendor_84 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Edson Uchoa Rodrigues', 'pj', 'edson.uchoa@yahoo.com', NULL, '36810192000149', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_84 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_84), true, 'Nu Pagamentos', '260', '36810192000149', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_84.id AS vendor_id, ins_bank_84.id AS bank_account_id
FROM ins_vendor_84, ins_bank_84;

-- #85: Patricia Ribeiro Maita
WITH ins_vendor_85 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Patricia Ribeiro Maita', 'pj', 'patriciarmaita@gmail.com', NULL, '26750507000156', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_85 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_85), true, 'Nu Pagamentos', '260', '26750507000156', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_85.id AS vendor_id, ins_bank_85.id AS bank_account_id
FROM ins_vendor_85, ins_bank_85;

-- #86: Edson João de Lima
WITH ins_vendor_86 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Edson João de Lima', 'pj', 'edsondelima1810@gmail.com', NULL, '63944374000185', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_86 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_86), true, 'Banco Inter', '077', '63944374000185', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_86.id AS vendor_id, ins_bank_86.id AS bank_account_id
FROM ins_vendor_86, ins_bank_86;

-- #87: Rodrigo Moreira Baraldini
WITH ins_vendor_87 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rodrigo Moreira Baraldini', 'pf', 'rodrigobaraldini@gmail.com', '40267691866', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_87 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_87), true, 'Nu Pagamentos', '260', '40267691866', 'cpf')
  RETURNING id
)
SELECT ins_vendor_87.id AS vendor_id, ins_bank_87.id AS bank_account_id
FROM ins_vendor_87, ins_bank_87;

-- #88: Felipe Santana
WITH ins_vendor_88 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Felipe Santana', 'pf', 'fesantana83@gmail.com', '11990087286', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_88 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_88), true, 'Banco Inter', '077', '11990087286', 'cpf')
  RETURNING id
)
SELECT ins_vendor_88.id AS vendor_id, ins_bank_88.id AS bank_account_id
FROM ins_vendor_88, ins_bank_88;

-- #89: Anderson Ferreira Batista
WITH ins_vendor_89 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Anderson Ferreira Batista', 'pf', 'ferreand@yahoo.com.br', '11948313331', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_89 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_89), true, 'Bradesco', '237', '11948313331', 'cpf')
  RETURNING id
)
SELECT ins_vendor_89.id AS vendor_id, ins_bank_89.id AS bank_account_id
FROM ins_vendor_89, ins_bank_89;

-- #90: Walter Edelcio dos Santos
WITH ins_vendor_90 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Walter Edelcio dos Santos', 'pj', 'walteredelciodossantos@gmail.com', NULL, '54497791000136', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_90 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_90), true, 'Cora', '403', '54497791000136', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_90.id AS vendor_id, ins_bank_90.id AS bank_account_id
FROM ins_vendor_90, ins_bank_90;

-- #91: Fábio Ferreira Santos
WITH ins_vendor_91 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fábio Ferreira Santos', 'pj', 'fabio.fsantos27@gmail.com', NULL, '30449287000100', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_91 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_91), true, 'Banco Inter', '077', '30449287000100', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_91.id AS vendor_id, ins_bank_91.id AS bank_account_id
FROM ins_vendor_91, ins_bank_91;

-- #92: Joaquin Federico Corsiglia
WITH ins_vendor_92 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Joaquin Federico Corsiglia', 'pj', 'corsiglia.joaquin@gmail.com', NULL, '19262510000165', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_92 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_92), true, 'Itau Unibanco', '341', '19262510000165', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_92.id AS vendor_id, ins_bank_92.id AS bank_account_id
FROM ins_vendor_92, ins_bank_92;

-- #93: Luciano Bomfim Ferreira Lima
WITH ins_vendor_93 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luciano Bomfim Ferreira Lima', 'pj', 'luckyferreira@gmail.com', NULL, '35664120000178', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_93 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_93), true, 'Nu Pagamentos', '260', '35664120000178', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_93.id AS vendor_id, ins_bank_93.id AS bank_account_id
FROM ins_vendor_93, ins_bank_93;

-- #94: João Carlos Barbosa de Souza
WITH ins_vendor_94 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'João Carlos Barbosa de Souza', 'pf', 'joaosouza8925@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_94 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_94), true, 'Nu Pagamentos', '260', '8556743935', 'telefone')
  RETURNING id
)
SELECT ins_vendor_94.id AS vendor_id, ins_bank_94.id AS bank_account_id
FROM ins_vendor_94, ins_bank_94;

-- #95: Maria Consuelo Nascimento Seara
WITH ins_vendor_95 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Maria Consuelo Nascimento Seara', 'pf', 'consoseara@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_95 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_95), true, 'C6 Bank', '336', 'consoseara@outlook.com', 'email')
  RETURNING id
)
SELECT ins_vendor_95.id AS vendor_id, ins_bank_95.id AS bank_account_id
FROM ins_vendor_95, ins_bank_95;

-- #96: Robson Jequirica dos Santos
WITH ins_vendor_96 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Robson Jequirica dos Santos', 'pf', 'jequirica@hotmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_96 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_96), true, 'Santander', '033', 'bbinhobaiano@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_96.id AS vendor_id, ins_bank_96.id AS bank_account_id
FROM ins_vendor_96, ins_bank_96;

-- #97: Micael da Silva Alves
WITH ins_vendor_97 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Micael da Silva Alves', 'pf', 'dsa.micael@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_97 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_97), true, 'Nu Pagamentos', '260', 'dsa.micael@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_97.id AS vendor_id, ins_bank_97.id AS bank_account_id
FROM ins_vendor_97, ins_bank_97;

-- #98: Lázaro Francisco Noia Santos
WITH ins_vendor_98 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Lázaro Francisco Noia Santos', 'pj', 'lazaronoiaa@gmail.com', NULL, '49791349000188', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_98 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_98), true, 'Nu Pagamentos', '260', '49791349000188', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_98.id AS vendor_id, ins_bank_98.id AS bank_account_id
FROM ins_vendor_98, ins_bank_98;

-- #99: Igor Marcio de Assis Miranda
WITH ins_vendor_99 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Igor Marcio de Assis Miranda', 'pf', 'igormirada@gmail.com', '81432860534', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_99 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_99), true, 'Banco do Brasil', '001', '81432860534', 'cpf')
  RETURNING id
)
SELECT ins_vendor_99.id AS vendor_id, ins_bank_99.id AS bank_account_id
FROM ins_vendor_99, ins_bank_99;

-- #100: Edson do Vale Campos Pereira Júnior
WITH ins_vendor_100 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Edson do Vale Campos Pereira Júnior', 'pj', 'edsonjrw@gmail.com', NULL, '23515611000178', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_100 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_100), true, 'Banco do Brasil', '001', '23515611000178', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_100.id AS vendor_id, ins_bank_100.id AS bank_account_id
FROM ins_vendor_100, ins_bank_100;

-- #101: Bruna Tosta Di Paolo
WITH ins_vendor_101 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Bruna Tosta Di Paolo', 'pf', 'brunapaolo@hotmail.com', '71991337387', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_101 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_101), true, 'Bradesco', '237', '71991337387', 'cpf')
  RETURNING id
)
SELECT ins_vendor_101.id AS vendor_id, ins_bank_101.id AS bank_account_id
FROM ins_vendor_101, ins_bank_101;

-- #102: Emerson Estrela
WITH ins_vendor_102 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Emerson Estrela', 'pj', 'emersongiu@hotmail.com', NULL, '49553606000143', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_102 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_102), true, 'Banco Inter', '077', '49553606000143', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_102.id AS vendor_id, ins_bank_102.id AS bank_account_id
FROM ins_vendor_102, ins_bank_102;

-- #103: Gilmara da Silva Copa Barros
WITH ins_vendor_103 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gilmara da Silva Copa Barros', 'pf', 'gilmaradasilvacopa39@hotmail.com', '71993877305', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_103 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_103), true, 'Nu Pagamentos', '260', '71993877305', 'cpf')
  RETURNING id
)
SELECT ins_vendor_103.id AS vendor_id, ins_bank_103.id AS bank_account_id
FROM ins_vendor_103, ins_bank_103;

-- #104: Carlos Alberto Gonçalves da Silva
WITH ins_vendor_104 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Carlos Alberto Gonçalves da Silva', 'pj', 'carloss.albertto@gmail.com', NULL, '14592147000122', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_104 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_104), true, 'Banco Inter', '077', '14592147000122', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_104.id AS vendor_id, ins_bank_104.id AS bank_account_id
FROM ins_vendor_104, ins_bank_104;

-- #105: Luís Antônio Oliveira Lima
WITH ins_vendor_105 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luís Antônio Oliveira Lima', 'pj', 'luislima199104@outlook.com', NULL, '45621902000283', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_105 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_105), true, 'Nu Pagamentos', '260', '45621902000283', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_105.id AS vendor_id, ins_bank_105.id AS bank_account_id
FROM ins_vendor_105, ins_bank_105;

-- #106: Renan Costa Santana
WITH ins_vendor_106 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Renan Costa Santana', 'pj', 'renancosta78.santana@gmail.com', NULL, '50091136000122', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_106 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_106), true, 'Banco Inter', '077', '50091136000122', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_106.id AS vendor_id, ins_bank_106.id AS bank_account_id
FROM ins_vendor_106, ins_bank_106;

-- #107: Rodrigo Lima Maia
WITH ins_vendor_107 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rodrigo Lima Maia', 'pj', 'rodrigomaia.audiovisual@gmail.com', NULL, '47315715000105', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_107 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_107), true, 'Nu Pagamentos', '260', '47315715000105', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_107.id AS vendor_id, ins_bank_107.id AS bank_account_id
FROM ins_vendor_107, ins_bank_107;

-- #108: Daniel Talento
WITH ins_vendor_108 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Daniel Talento', 'pj', 'dtalento4@gmail.com', NULL, '09374330000111', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_108 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_108), true, 'Nu Pagamentos', '260', '09374330000111', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_108.id AS vendor_id, ins_bank_108.id AS bank_account_id
FROM ins_vendor_108, ins_bank_108;

-- #109: Antonio Jorge de Souza Moura Junior
WITH ins_vendor_109 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Antonio Jorge de Souza Moura Junior', 'pf', 'ajorgejunior@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_109 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_109), true, 'Santander', '033', '4015743504', 'telefone')
  RETURNING id
)
SELECT ins_vendor_109.id AS vendor_id, ins_bank_109.id AS bank_account_id
FROM ins_vendor_109, ins_bank_109;

-- #110: Guilherme Pinto Araujo
WITH ins_vendor_110 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Guilherme Pinto Araujo', 'pf', 'guilhermemtb1307@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_110 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_110), true, 'Nu Pagamentos', '260', 'guilhermeigluloc@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_110.id AS vendor_id, ins_bank_110.id AS bank_account_id
FROM ins_vendor_110, ins_bank_110;

-- #111: Ariane Letícia Neves dos Anjos
WITH ins_vendor_111 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ariane Letícia Neves dos Anjos', 'pf', 'arianel97@gmail.com', '71987266373', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_111 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_111), true, 'Bradesco', '237', '71987266373', 'cpf')
  RETURNING id
)
SELECT ins_vendor_111.id AS vendor_id, ins_bank_111.id AS bank_account_id
FROM ins_vendor_111, ins_bank_111;

-- #112: Tiago Cavalcanti Doliveira
WITH ins_vendor_112 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Tiago Cavalcanti Doliveira', 'pj', 'tiagocavalcanti@gmail.com', NULL, '56123411000129', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_112 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_112), true, 'Bradesco', '237', '56123411000129', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_112.id AS vendor_id, ins_bank_112.id AS bank_account_id
FROM ins_vendor_112, ins_bank_112;

-- #113: Diego Athayde Ribeiro
WITH ins_vendor_113 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Diego Athayde Ribeiro', 'pj', 'diegoatah@hotmail.com', NULL, '42532388000111', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_113 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_113), true, 'Banco Inter', '077', '42532388000111', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_113.id AS vendor_id, ins_bank_113.id AS bank_account_id
FROM ins_vendor_113, ins_bank_113;

-- #114: Marcos Leandro Rocha Medrado
WITH ins_vendor_114 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcos Leandro Rocha Medrado', 'pf', 'marcos.lrmedraro@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_114 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_114), true, 'Mercado Pago', '323', NULL, NULL)
  RETURNING id
)
SELECT ins_vendor_114.id AS vendor_id, ins_bank_114.id AS bank_account_id
FROM ins_vendor_114, ins_bank_114;

-- #115: Matheus Augusto Albergaria Silva
WITH ins_vendor_115 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Matheus Augusto Albergaria Silva', 'pf', 'matheusalbergaria51@gmail.com', '71996690578', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_115 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_115), true, 'Banco Inter', '077', '71996690578', 'cpf')
  RETURNING id
)
SELECT ins_vendor_115.id AS vendor_id, ins_bank_115.id AS bank_account_id
FROM ins_vendor_115, ins_bank_115;

-- #116: Mino Barros Reis
WITH ins_vendor_116 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Mino Barros Reis', 'pf', 'minoreis@gmail.com', '78399270504', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_116 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_116), true, 'Itau Unibanco', '341', '78399270504', 'cpf')
  RETURNING id
)
SELECT ins_vendor_116.id AS vendor_id, ins_bank_116.id AS bank_account_id
FROM ins_vendor_116, ins_bank_116;

-- #117: Maurício Lopes Fontour
WITH ins_vendor_117 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Maurício Lopes Fontour', 'pf', 'tempopratudo@gmail.com', '71999923104', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_117 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_117), true, 'PicPay', '380', '71999923104', 'cpf')
  RETURNING id
)
SELECT ins_vendor_117.id AS vendor_id, ins_bank_117.id AS bank_account_id
FROM ins_vendor_117, ins_bank_117;

-- #118: Yasmin Fonseca Santos
WITH ins_vendor_118 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Yasmin Fonseca Santos', 'pj', 'yasminfonseca02@gmail.com', NULL, '52431647000171', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_118 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_118), true, 'Nu Pagamentos', '260', '52431647000171', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_118.id AS vendor_id, ins_bank_118.id AS bank_account_id
FROM ins_vendor_118, ins_bank_118;

-- #119: Marta Estrela
WITH ins_vendor_119 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marta Estrela', 'pj', 'martaestrela24.04@gmail.com', NULL, '51873189000168', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_119 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_119), true, 'Nu Pagamentos', '260', '51873189000168', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_119.id AS vendor_id, ins_bank_119.id AS bank_account_id
FROM ins_vendor_119, ins_bank_119;

-- #120: Cristiane Carlos da Silva Oliveira
WITH ins_vendor_120 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cristiane Carlos da Silva Oliveira', 'pj', 'criscarlosdecor@gmail.com', NULL, '19984644000190', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_120 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_120), true, 'Nub', NULL, '19984644000190', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_120.id AS vendor_id, ins_bank_120.id AS bank_account_id
FROM ins_vendor_120, ins_bank_120;

-- #121: Alan Ferreira Santos
WITH ins_vendor_121 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Alan Ferreira Santos', 'pj', 'alansantos627@gmail.com', NULL, '30743119000115', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_121 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_121), true, 'Nu Pagamentos', '260', '30743119000115', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_121.id AS vendor_id, ins_bank_121.id AS bank_account_id
FROM ins_vendor_121, ins_bank_121;

-- #122: Lidia Nascimento Santos
WITH ins_vendor_122 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Lidia Nascimento Santos', 'pj', 'lliunascimento@gmail.com', NULL, '58408698000169', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_122 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_122), true, 'Nu Pagamentos', '260', '58408698000169', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_122.id AS vendor_id, ins_bank_122.id AS bank_account_id
FROM ins_vendor_122, ins_bank_122;

-- #123: Jorge Alberto Froelich Martins
WITH ins_vendor_123 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Jorge Alberto Froelich Martins', 'pf', 'jorgemartinns@yahoo.com.br', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_123 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_123), true, 'Bradesco', '237', NULL, NULL)
  RETURNING id
)
SELECT ins_vendor_123.id AS vendor_id, ins_bank_123.id AS bank_account_id
FROM ins_vendor_123, ins_bank_123;

-- #124: Thiago Tadeu Eva
WITH ins_vendor_124 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Thiago Tadeu Eva', 'pf', 'thiagoevafilms@gmail.com', '28529946820', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_124 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_124), true, 'Itau Unibanco', '341', '28529946820', 'cpf')
  RETURNING id
)
SELECT ins_vendor_124.id AS vendor_id, ins_bank_124.id AS bank_account_id
FROM ins_vendor_124, ins_bank_124;

-- #125: Bahia Grip Ltda
WITH ins_vendor_125 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Bahia Grip Ltda', 'pj', 'bahiagrip@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_125 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_125), true, 'Nu Pagamentos', '260', 'bahiagrip@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_125.id AS vendor_id, ins_bank_125.id AS bank_account_id
FROM ins_vendor_125, ins_bank_125;

-- #126: Daniele Chiquito
WITH ins_vendor_126 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Daniele Chiquito', 'pj', 'dchiquito.producao@gmail.com', NULL, '53873716000160', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_126 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_126), true, 'C6 Bank', '336', '53873716000160', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_126.id AS vendor_id, ins_bank_126.id AS bank_account_id
FROM ins_vendor_126, ins_bank_126;

-- #127: Rafaela Calado Bortoletto
WITH ins_vendor_127 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rafaela Calado Bortoletto', 'pf', 'rafaelacbortoletto@gmail.com', '19981795198', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_127 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_127), true, 'Itau Unibanco', '341', '19981795198', 'cpf')
  RETURNING id
)
SELECT ins_vendor_127.id AS vendor_id, ins_bank_127.id AS bank_account_id
FROM ins_vendor_127, ins_bank_127;

-- #128: Jeorge Costa Martins
WITH ins_vendor_128 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Jeorge Costa Martins', 'pf', 'georgecostabike@gmail.com', '71986461263', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_128 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_128), true, 'Nu Pagamentos', '260', '71986461263', 'cpf')
  RETURNING id
)
SELECT ins_vendor_128.id AS vendor_id, ins_bank_128.id AS bank_account_id
FROM ins_vendor_128, ins_bank_128;

-- #129: Moisés Augusto Nascimento Leite
WITH ins_vendor_129 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Moisés Augusto Nascimento Leite', 'pj', 'augustozang@gmail.com', NULL, '23976713000190', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_129 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_129), true, 'Nu Pagamentos', '260', '23976713000190', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_129.id AS vendor_id, ins_bank_129.id AS bank_account_id
FROM ins_vendor_129, ins_bank_129;

-- #130: João Vitor Leão de Romero
WITH ins_vendor_130 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'João Vitor Leão de Romero', 'pj', 'jvleaoromero9@gmail.com', NULL, '63438138000197', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_130 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_130), true, 'Nu Pagamentos', '260', '63438138000197', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_130.id AS vendor_id, ins_bank_130.id AS bank_account_id
FROM ins_vendor_130, ins_bank_130;

-- #131: Vanessa Akemi Máximo Shiguemoto
WITH ins_vendor_131 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Vanessa Akemi Máximo Shiguemoto', 'pj', 'vams.akemi@gmail.com', NULL, '30329176000152', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_131 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_131), true, 'Nu Pagamentos', '260', '30329176000152', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_131.id AS vendor_id, ins_bank_131.id AS bank_account_id
FROM ins_vendor_131, ins_bank_131;

-- #132: Carlos Eduardo Saraiva
WITH ins_vendor_132 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Carlos Eduardo Saraiva', 'pj', 'dudusaraivaproducao@gmail.com', NULL, '20379940000140', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_132 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_132), true, 'C6 Bank', '336', '20379940000140', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_132.id AS vendor_id, ins_bank_132.id AS bank_account_id
FROM ins_vendor_132, ins_bank_132;

-- #133: Gabriel Flores dos Santos
WITH ins_vendor_133 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gabriel Flores dos Santos', 'pf', 'gabrielflorez.arte@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_133 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_133), true, 'Itau Unibanco', '341', 'gabrielflorez.arte@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_133.id AS vendor_id, ins_bank_133.id AS bank_account_id
FROM ins_vendor_133, ins_bank_133;

-- #134: Tiago Bispo Santana
WITH ins_vendor_134 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Tiago Bispo Santana', 'pj', 'tiagobispo21@hotmail.com', NULL, '18554254000117', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_134 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_134), true, 'Caixa Economica Federal', '104', '18554254000117', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_134.id AS vendor_id, ins_bank_134.id AS bank_account_id
FROM ins_vendor_134, ins_bank_134;

-- #135: Sebastiao Nilo da Costa
WITH ins_vendor_135 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sebastiao Nilo da Costa', 'pf', 'newlinetransportes@terra.com.br', '11999936933', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_135 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_135), true, 'Itau Unibanco', '341', '11999936933', 'cpf')
  RETURNING id
)
SELECT ins_vendor_135.id AS vendor_id, ins_bank_135.id AS bank_account_id
FROM ins_vendor_135, ins_bank_135;

-- #136: Alberto Mariano de Oliveira
WITH ins_vendor_136 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Alberto Mariano de Oliveira', 'pj', 'betogerador@gmail.com', NULL, '20289874000118', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_136 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_136), true, 'Santander', '033', '20289874000118', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_136.id AS vendor_id, ins_bank_136.id AS bank_account_id
FROM ins_vendor_136, ins_bank_136;

-- #137: Lucas Eduardo de Oliveira
WITH ins_vendor_137 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Lucas Eduardo de Oliveira', 'pf', 'leliluminacoes@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_137 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_137), true, 'Banco Inter', '077', 'leliluminacoes1@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_137.id AS vendor_id, ins_bank_137.id AS bank_account_id
FROM ins_vendor_137, ins_bank_137;

-- #138: Willian Di Gianni Tucci
WITH ins_vendor_138 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Willian Di Gianni Tucci', 'pj', 'williantucci.producao@gmail.com', NULL, '31376691000156', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_138 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_138), true, 'Nu Pagamentos', '260', '31376691000156', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_138.id AS vendor_id, ins_bank_138.id AS bank_account_id
FROM ins_vendor_138, ins_bank_138;

-- #139: Vitorio Rodrigo Alves Nunes Abruzzeze
WITH ins_vendor_139 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Vitorio Rodrigo Alves Nunes Abruzzeze', 'pj', 'rodrigoabruzzezecinema@gmail.com', NULL, '60330526000161', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_139 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_139), true, 'Nu Pagamentos', '260', '60330526000161', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_139.id AS vendor_id, ins_bank_139.id AS bank_account_id
FROM ins_vendor_139, ins_bank_139;

-- #140: Pablo Castilho Cardoso
WITH ins_vendor_140 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Pablo Castilho Cardoso', 'pj', 'pablo.castilho@icloud.com', NULL, '22933502000108', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_140 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_140), true, 'Itau Unibanco', '341', '22933502000108', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_140.id AS vendor_id, ins_bank_140.id AS bank_account_id
FROM ins_vendor_140, ins_bank_140;

-- #141: Keyla Katty Araujo Calado
WITH ins_vendor_141 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Keyla Katty Araujo Calado', 'pf', 'keylaacalado@gmail.com', '11947124858', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_141 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_141), true, 'Banco do Brasil', '001', '11947124858', 'cpf')
  RETURNING id
)
SELECT ins_vendor_141.id AS vendor_id, ins_bank_141.id AS bank_account_id
FROM ins_vendor_141, ins_bank_141;

-- #142: Nicolás Presciutti
WITH ins_vendor_142 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Nicolás Presciutti', 'pf', 'nicolas.presciutti@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_142 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_142), true, 'Bradesco', '237', NULL, NULL)
  RETURNING id
)
SELECT ins_vendor_142.id AS vendor_id, ins_bank_142.id AS bank_account_id
FROM ins_vendor_142, ins_bank_142;

-- #143: Thiago Cordeiro Monteiro
WITH ins_vendor_143 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Thiago Cordeiro Monteiro', 'pj', 'thiago_cm19@hotmail.com', NULL, '46789926000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_143 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_143), true, 'Banco do Brasil', '001', '46789926000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_143.id AS vendor_id, ins_bank_143.id AS bank_account_id
FROM ins_vendor_143, ins_bank_143;

-- #144: Cláudio Ferreira
WITH ins_vendor_144 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cláudio Ferreira', 'pf', 'rafavicente472@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_144 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_144), true, 'Bradesco', '237', '6172392824', 'telefone')
  RETURNING id
)
SELECT ins_vendor_144.id AS vendor_id, ins_bank_144.id AS bank_account_id
FROM ins_vendor_144, ins_bank_144;

-- #145: Alisson Santos dos Santos
WITH ins_vendor_145 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Alisson Santos dos Santos', 'pf', 'alissonetamirisluiza@gmail.com', '11917402958', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_145 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_145), true, 'Nu Pagamentos', '260', '11917402958', 'cpf')
  RETURNING id
)
SELECT ins_vendor_145.id AS vendor_id, ins_bank_145.id AS bank_account_id
FROM ins_vendor_145, ins_bank_145;

-- #146: Thiago Zingano Cauduro
WITH ins_vendor_146 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Thiago Zingano Cauduro', 'pj', 'tatyfalco@gmail.com', NULL, '28740385000142', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_146 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_146), true, 'Nu Pagamentos', '260', '28740385000142', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_146.id AS vendor_id, ins_bank_146.id AS bank_account_id
FROM ins_vendor_146, ins_bank_146;

-- #147: Adriano Barreto Santos
WITH ins_vendor_147 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Adriano Barreto Santos', 'pj', 'adrianobarretomaquinaria@gmail.com', NULL, '42957562000178', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_147 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_147), true, 'Nu Pagamentos', '260', '42957562000178', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_147.id AS vendor_id, ins_bank_147.id AS bank_account_id
FROM ins_vendor_147, ins_bank_147;

-- #148: Rafael Tortorelli Canal
WITH ins_vendor_148 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rafael Tortorelli Canal', 'pj', 'rafael.canal@gmail.com', NULL, '24397043000110', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_148 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_148), true, 'Itau Unibanco', '341', '24397043000110', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_148.id AS vendor_id, ins_bank_148.id AS bank_account_id
FROM ins_vendor_148, ins_bank_148;

-- #149: Débora Baptistella Yazbek
WITH ins_vendor_149 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Débora Baptistella Yazbek', 'pf', 'debora.yazbek@gmail.com', '11984156989', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_149 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_149), true, 'Banco Inter', '077', '11984156989', 'cpf')
  RETURNING id
)
SELECT ins_vendor_149.id AS vendor_id, ins_bank_149.id AS bank_account_id
FROM ins_vendor_149, ins_bank_149;

-- #150: Fernanda Bastos Gunutzmam
WITH ins_vendor_150 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fernanda Bastos Gunutzmam', 'pf', 'araracriativa.acervo@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_150 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_150), true, 'Itau Unibanco', '341', 'araracriativa.acervo@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_150.id AS vendor_id, ins_bank_150.id AS bank_account_id
FROM ins_vendor_150, ins_bank_150;

-- #151: Gustavo Caetano Costa
WITH ins_vendor_151 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gustavo Caetano Costa', 'pj', 'gustavocaetanodop@gmail.com', NULL, '53649705000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_151 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_151), true, 'Nu Pagamentos', '260', '53649705000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_151.id AS vendor_id, ins_bank_151.id AS bank_account_id
FROM ins_vendor_151, ins_bank_151;

-- #152: Transkinderr Ltda
WITH ins_vendor_152 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Transkinderr Ltda', 'pj', 'paulokinderr@uol.com.br', NULL, '07163326000189', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_152 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_152), true, 'Bradesco', '237', '07163326000189', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_152.id AS vendor_id, ins_bank_152.id AS bank_account_id
FROM ins_vendor_152, ins_bank_152;

-- #153: Cristiano de Jesus de Andrade
WITH ins_vendor_153 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Cristiano de Jesus de Andrade', 'pj', 'cris_transporteturismo@hotmail.com.br', NULL, '19986574000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_153 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_153), true, 'Bradesco', '237', '19986574000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_153.id AS vendor_id, ins_bank_153.id AS bank_account_id
FROM ins_vendor_153, ins_bank_153;

-- #154: Luiz Gustavo Costa
WITH ins_vendor_154 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Luiz Gustavo Costa', 'pj', 'gu_pitta@yahoo.com.br', NULL, '29298297000103', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_154 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_154), true, 'Nu Pagamentos', '260', '29298297000103', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_154.id AS vendor_id, ins_bank_154.id AS bank_account_id
FROM ins_vendor_154, ins_bank_154;

-- #155: Ficcao Locacoes e Gravacoes de Videos Ltda
WITH ins_vendor_155 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ficcao Locacoes e Gravacoes de Videos Ltda', 'pj', 'atendimento@ficcao.art.br', NULL, '09342949000144', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_155 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_155), true, 'Bradesco', '237', '09342949000144', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_155.id AS vendor_id, ins_bank_155.id AS bank_account_id
FROM ins_vendor_155, ins_bank_155;

-- #156: Hanna Beatriz Queiroz Carli
WITH ins_vendor_156 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Hanna Beatriz Queiroz Carli', 'pj', 'hannaq98@gmail.com', NULL, '37624732000162', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_156 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_156), true, 'Nu Pagamentos', '260', '37624732000162', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_156.id AS vendor_id, ins_bank_156.id AS bank_account_id
FROM ins_vendor_156, ins_bank_156;

-- #157: Gabriela Clara da Fonseca
WITH ins_vendor_157 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gabriela Clara da Fonseca', 'pf', 'gabrielaclara87@gmail.com', '34111054889', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_157 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_157), true, 'Itau Unibanco', '341', '34111054889', 'cpf')
  RETURNING id
)
SELECT ins_vendor_157.id AS vendor_id, ins_bank_157.id AS bank_account_id
FROM ins_vendor_157, ins_bank_157;

-- #158: Ricardo Nunes da Costa
WITH ins_vendor_158 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ricardo Nunes da Costa', 'pj', 'ricardoedge.al@gmail.com', NULL, '46481465000102', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_158 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_158), true, 'Banco Inter', '077', '46481465000102', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_158.id AS vendor_id, ins_bank_158.id AS bank_account_id
FROM ins_vendor_158, ins_bank_158;

-- #159: Vitória Cristina de Carvalho Albernas
WITH ins_vendor_159 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Vitória Cristina de Carvalho Albernas', 'pj', 'vialbernas@gmail.com', NULL, '47777307000167', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_159 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_159), true, 'C6 Bank', '336', '47777307000167', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_159.id AS vendor_id, ins_bank_159.id AS bank_account_id
FROM ins_vendor_159, ins_bank_159;

-- #160: Francisco Mutarelli
WITH ins_vendor_160 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Francisco Mutarelli', 'pf', 'mutarellifrancisco@gmail.com', '23612046810', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_160 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_160), true, 'Nu Pagamentos', '260', '23612046810', 'cpf')
  RETURNING id
)
SELECT ins_vendor_160.id AS vendor_id, ins_bank_160.id AS bank_account_id
FROM ins_vendor_160, ins_bank_160;

-- #161: Jonathan Ritter Caitano Coelho
WITH ins_vendor_161 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Jonathan Ritter Caitano Coelho', 'pj', 'jonathanrittercaitano@gmail.com', NULL, '25033732000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_161 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_161), true, 'Banco Inter', '077', '25033732000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_161.id AS vendor_id, ins_bank_161.id AS bank_account_id
FROM ins_vendor_161, ins_bank_161;

-- #162: Sergio dos Santos Souza
WITH ins_vendor_162 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sergio dos Santos Souza', 'pj', 'ssouza.sergio93@gmail.com', NULL, '34980285000196', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_162 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_162), true, 'Banco Inter', '077', '34980285000196', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_162.id AS vendor_id, ins_bank_162.id AS bank_account_id
FROM ins_vendor_162, ins_bank_162;

-- #163: Claudia Batalha Moreno
WITH ins_vendor_163 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Claudia Batalha Moreno', 'pj', 'claudia_moreno2008@hotmail.com', NULL, '31917111000190', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_163 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_163), true, 'Banco do Brasil', '001', '31917111000190', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_163.id AS vendor_id, ins_bank_163.id AS bank_account_id
FROM ins_vendor_163, ins_bank_163;

-- #164: Michael William Caitano Coelho
WITH ins_vendor_164 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Michael William Caitano Coelho', 'pj', 'michael_mwc@hotmail.com', NULL, '54486779000126', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_164 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_164), true, 'Nu Pagamentos', '260', '54486779000126', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_164.id AS vendor_id, ins_bank_164.id AS bank_account_id
FROM ins_vendor_164, ins_bank_164;

-- #165: Kevin Derek Caitano
WITH ins_vendor_165 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Kevin Derek Caitano', 'pj', 'derekevin@outlook.com.br', NULL, '31749539000171', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_165 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_165), true, 'C6 Bank', '336', '31749539000171', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_165.id AS vendor_id, ins_bank_165.id AS bank_account_id
FROM ins_vendor_165, ins_bank_165;

-- #166: Alexandre Luiz da Silva
WITH ins_vendor_166 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Alexandre Luiz da Silva', 'pf', 'ale.gda92@gmail.com', '11989455749', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_166 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_166), true, 'Cora', '403', '11989455749', 'cpf')
  RETURNING id
)
SELECT ins_vendor_166.id AS vendor_id, ins_bank_166.id AS bank_account_id
FROM ins_vendor_166, ins_bank_166;

-- #167: Ivan Carlos Viana de Oliveira
WITH ins_vendor_167 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Ivan Carlos Viana de Oliveira', 'pf', 'ivancarlos.voliveira@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_167 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_167), true, 'Neon', '536', '9bbab0c5-2d48-44d1-9c01-57c3ca6e0bdb', 'aleatoria')
  RETURNING id
)
SELECT ins_vendor_167.id AS vendor_id, ins_bank_167.id AS bank_account_id
FROM ins_vendor_167, ins_bank_167;

-- #168: Rogério Engelhardt dos Santos
WITH ins_vendor_168 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rogério Engelhardt dos Santos', 'pj', 'rogerio.reds2@gmail.com', NULL, '40175024000104', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_168 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_168), true, 'C6 Bank', '336', '40175024000104', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_168.id AS vendor_id, ins_bank_168.id AS bank_account_id
FROM ins_vendor_168, ins_bank_168;

-- #169: Fernando Luiz de Souza Oliveira
WITH ins_vendor_169 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fernando Luiz de Souza Oliveira', 'pf', 'floliveira3210@gmail.com', '13215931800', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_169 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_169), true, 'Nu Pagamentos', '260', '13215931800', 'cpf')
  RETURNING id
)
SELECT ins_vendor_169.id AS vendor_id, ins_bank_169.id AS bank_account_id
FROM ins_vendor_169, ins_bank_169;

-- #170: Willian de Oliveira Alves
WITH ins_vendor_170 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Willian de Oliveira Alves', 'pj', 'wsfilmsbr@gmail.com', NULL, '61263819000136', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_170 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_170), true, 'C6 Bank', '336', '61263819000136', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_170.id AS vendor_id, ins_bank_170.id AS bank_account_id
FROM ins_vendor_170, ins_bank_170;

-- #171: Joelson Teodoro dos Santos
WITH ins_vendor_171 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Joelson Teodoro dos Santos', 'pj', 'joelsonsp_2006@hotmail.com', NULL, '55626259000134', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_171 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_171), true, 'Caixa Economica Federal', '104', '55626259000134', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_171.id AS vendor_id, ins_bank_171.id AS bank_account_id
FROM ins_vendor_171, ins_bank_171;

-- #172: Valdomiro Santos Lima
WITH ins_vendor_172 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Valdomiro Santos Lima', 'pj', 'valdomiro73@gmail.com', NULL, '53047644000100', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_172 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_172), true, 'Banco Inter', '077', '53047644000100', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_172.id AS vendor_id, ins_bank_172.id AS bank_account_id
FROM ins_vendor_172, ins_bank_172;

-- #173: Tiago Barbosa de Oliveira
WITH ins_vendor_173 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Tiago Barbosa de Oliveira', 'pj', 'tikobmx@hotmail.com', NULL, '47838445000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_173 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_173), true, 'Nu Pagamentos', '260', '47838445000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_173.id AS vendor_id, ins_bank_173.id AS bank_account_id
FROM ins_vendor_173, ins_bank_173;

-- #174: João Vitor Eltz
WITH ins_vendor_174 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'João Vitor Eltz', 'pf', 'joaovitoreltz@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_174 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_174), true, 'Nu Pagamentos', '260', 'joaovitoreltz@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_174.id AS vendor_id, ins_bank_174.id AS bank_account_id
FROM ins_vendor_174, ins_bank_174;

-- #175: José Warlen Alves Brito
WITH ins_vendor_175 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'José Warlen Alves Brito', 'pj', 'miajwb@icloud.com', NULL, '44773116000139', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_175 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_175), true, 'Itau Unibanco', '341', '44773116000139', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_175.id AS vendor_id, ins_bank_175.id AS bank_account_id
FROM ins_vendor_175, ins_bank_175;

-- #176: Rosivaldo Jesus de Almeida
WITH ins_vendor_176 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Rosivaldo Jesus de Almeida', 'pf', 'rosivaldo.almeida@hotmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_176 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_176), true, 'Itau Unibanco', '341', NULL, NULL)
  RETURNING id
)
SELECT ins_vendor_176.id AS vendor_id, ins_bank_176.id AS bank_account_id
FROM ins_vendor_176, ins_bank_176;

-- #177: Raul Martins Bittencourt
WITH ins_vendor_177 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Raul Martins Bittencourt', 'pj', 'raulmartinsbittencourt@gmail.com', NULL, '52621210000109', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_177 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_177), true, 'Banco 206', '206', '52621210000109', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_177.id AS vendor_id, ins_bank_177.id AS bank_account_id
FROM ins_vendor_177, ins_bank_177;

-- #178: Erika Souza
WITH ins_vendor_178 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Erika Souza', 'pj', 'casadoprodutor22@gmail.com', NULL, '28277865000119', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_178 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_178), true, 'Bradesco', '237', '28277865000119', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_178.id AS vendor_id, ins_bank_178.id AS bank_account_id
FROM ins_vendor_178, ins_bank_178;

-- #179: Gesiel Muniz de Carvalho
WITH ins_vendor_179 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Gesiel Muniz de Carvalho', 'pf', 'gesikombi@gmail.com', '11997110466', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_179 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_179), true, 'Itau Unibanco', '341', '11997110466', 'cpf')
  RETURNING id
)
SELECT ins_vendor_179.id AS vendor_id, ins_bank_179.id AS bank_account_id
FROM ins_vendor_179, ins_bank_179;

-- #180: Tatiane de Oliveira Gomes
WITH ins_vendor_180 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Tatiane de Oliveira Gomes', 'pj', 'oliver.transportesdoblo@gmail.com', NULL, '34315644000190', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_180 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_180), true, 'C6 Bank', '336', '34315644000190', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_180.id AS vendor_id, ins_bank_180.id AS bank_account_id
FROM ins_vendor_180, ins_bank_180;

-- #181: Diego Gaeta
WITH ins_vendor_181 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Diego Gaeta', 'pf', 'diego_gaeta@hotmail.com', '31483783855', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_181 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_181), true, 'Mercado Pago', '323', '31483783855', 'cpf')
  RETURNING id
)
SELECT ins_vendor_181.id AS vendor_id, ins_bank_181.id AS bank_account_id
FROM ins_vendor_181, ins_bank_181;

-- #182: Fullcine
WITH ins_vendor_182 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Fullcine', 'pj', 'financeiro@fullcine.com.br', NULL, '02513238000227', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_182 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_182), true, 'Itau Unibanco', '341', '02513238000227', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_182.id AS vendor_id, ins_bank_182.id AS bank_account_id
FROM ins_vendor_182, ins_bank_182;

-- #183: Heverton Edberg Souza Gil da Silva /hes Catering e Eventos
WITH ins_vendor_183 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Heverton Edberg Souza Gil da Silva /hes Catering e Eventos', 'pj', 'cafemaniakatiagil@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_183 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_183), true, 'Itau Unibanco', '341', 'cafemaniakatiagil@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_183.id AS vendor_id, ins_bank_183.id AS bank_account_id
FROM ins_vendor_183, ins_bank_183;

-- #184: Marcos Paulo Saraiva
WITH ins_vendor_184 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Marcos Paulo Saraiva', 'pf', 'produsete@yahoo.com.br', '11988266039', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_184 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_184), true, 'Santander', '033', '11988266039', 'cpf')
  RETURNING id
)
SELECT ins_vendor_184.id AS vendor_id, ins_bank_184.id AS bank_account_id
FROM ins_vendor_184, ins_bank_184;

-- #185: Edwilson Damião Guedes
WITH ins_vendor_185 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Edwilson Damião Guedes', 'pj', 'dinhoeletricapg@gmail.com', NULL, '31698454000101', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_185 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_185), true, 'Banco Inter', '077', '31698454000101', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_185.id AS vendor_id, ins_bank_185.id AS bank_account_id
FROM ins_vendor_185, ins_bank_185;

-- #186: Claudenice do Nascimento Vilas Boas
WITH ins_vendor_186 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Claudenice do Nascimento Vilas Boas', 'pf', 'mere.vilasboas72@gmail.com', '11999486014', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_186 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_186), true, 'Itau Unibanco', '341', '11999486014', 'cpf')
  RETURNING id
)
SELECT ins_vendor_186.id AS vendor_id, ins_bank_186.id AS bank_account_id
FROM ins_vendor_186, ins_bank_186;

-- #187: Maurício Lopes Fontoura
WITH ins_vendor_187 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Maurício Lopes Fontoura', 'pf', 'tempopratudo@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_187 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_187), true, 'PicPay', '380', 'ef06e630-416c-4ccd-957d-ad087e8e4861', 'aleatoria')
  RETURNING id
)
SELECT ins_vendor_187.id AS vendor_id, ins_bank_187.id AS bank_account_id
FROM ins_vendor_187, ins_bank_187;

-- #188: Miriam Reico Kano
WITH ins_vendor_188 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Miriam Reico Kano', 'pf', 'miriam.kanno13@gmail.com', NULL, NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_188 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_188), true, 'Bradesco', '237', 'miriam.kanno13@gmail.com', 'email')
  RETURNING id
)
SELECT ins_vendor_188.id AS vendor_id, ins_bank_188.id AS bank_account_id
FROM ins_vendor_188, ins_bank_188;

-- #189: Renata Scavuzzi Costa
WITH ins_vendor_189 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Renata Scavuzzi Costa', 'pj', 'renatascavuzzi@gmail.com', NULL, '24904825000107', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_189 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_189), true, 'C6 Bank', '336', '24904825000107', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_189.id AS vendor_id, ins_bank_189.id AS bank_account_id
FROM ins_vendor_189, ins_bank_189;

-- #190: Wellington Robson da Silva Paes de Souza
WITH ins_vendor_190 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Wellington Robson da Silva Paes de Souza', 'pj', 'welcineservices@gmail.com.br', NULL, '60344054000104', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_190 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_190), true, 'C6 Bank', '336', '60344054000104', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_190.id AS vendor_id, ins_bank_190.id AS bank_account_id
FROM ins_vendor_190, ins_bank_190;

-- #191: Emerson Pena
WITH ins_vendor_191 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Emerson Pena', 'pj', 'coptercam@me.com', NULL, '28757944000127', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_191 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_191), true, 'Itau Unibanco', '341', '28757944000127', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_191.id AS vendor_id, ins_bank_191.id AS bank_account_id
FROM ins_vendor_191, ins_bank_191;

-- #192: Daiane Miranda da Silva
WITH ins_vendor_192 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Daiane Miranda da Silva', 'pj', 'daiane_mdf@hotmail.com', NULL, '44749436000153', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_192 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_192), true, 'C6 Bank', '336', '44749436000153', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_192.id AS vendor_id, ins_bank_192.id AS bank_account_id
FROM ins_vendor_192, ins_bank_192;

-- #193: Sergio Glasberg
WITH ins_vendor_193 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Sergio Glasberg', 'pf', 'sergioglasberg@gmail.com', '11991164967', NULL, 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_193 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_193), true, 'Itau Unibanco', '341', '11991164967', 'cpf')
  RETURNING id
)
SELECT ins_vendor_193.id AS vendor_id, ins_bank_193.id AS bank_account_id
FROM ins_vendor_193, ins_bank_193;

-- #194: Paul Christian Carbone
WITH ins_vendor_194 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Paul Christian Carbone', 'pj', 'paulcbfilmes@gmail.com', NULL, '44229215000154', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_194 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_194), true, 'Nu Pagamentos', '260', '44229215000154', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_194.id AS vendor_id, ins_bank_194.id AS bank_account_id
FROM ins_vendor_194, ins_bank_194;

-- #195: Eduardo Lopes Fortes
WITH ins_vendor_195 AS (
  INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Eduardo Lopes Fortes', 'pj', 'lopes.fortes@gmail.com', NULL, '18597879000166', 'migration_equipe_20260227', true)
  RETURNING id
),
ins_bank_195 AS (
  INSERT INTO bank_accounts (tenant_id, vendor_id, is_primary, bank_name, bank_code, pix_key, pix_key_type)
  VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM ins_vendor_195), true, 'Nu Pagamentos', '260', '18597879000166', 'cnpj')
  RETURNING id
)
SELECT ins_vendor_195.id AS vendor_id, ins_bank_195.id AS bank_account_id
FROM ins_vendor_195, ins_bank_195;

COMMIT;

-- ============================================================
-- Verificacao pos-import
-- ============================================================
SELECT COUNT(*) AS total_vendors FROM vendors WHERE import_source = 'migration_equipe_20260227';

SELECT COUNT(*) AS total_bank_accounts FROM bank_accounts
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
    AND vendor_id IN (SELECT id FROM vendors WHERE import_source = 'migration_equipe_20260227');

-- Detalhamento por entity_type
SELECT entity_type, COUNT(*) FROM vendors WHERE import_source = 'migration_equipe_20260227' GROUP BY entity_type;

-- Detalhamento por pix_key_type
SELECT ba.pix_key_type, COUNT(*) FROM bank_accounts ba
  JOIN vendors v ON v.id = ba.vendor_id
  WHERE v.import_source = 'migration_equipe_20260227'
  GROUP BY ba.pix_key_type ORDER BY COUNT(*) DESC;