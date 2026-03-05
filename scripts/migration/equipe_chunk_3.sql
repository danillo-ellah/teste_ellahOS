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