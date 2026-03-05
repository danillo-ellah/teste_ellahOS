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