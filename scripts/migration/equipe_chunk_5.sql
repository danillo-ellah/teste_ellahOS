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