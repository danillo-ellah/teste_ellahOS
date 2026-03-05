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