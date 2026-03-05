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