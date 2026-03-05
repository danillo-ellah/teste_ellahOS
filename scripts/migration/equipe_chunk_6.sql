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