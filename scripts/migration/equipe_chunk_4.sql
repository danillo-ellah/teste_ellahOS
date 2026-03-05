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