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