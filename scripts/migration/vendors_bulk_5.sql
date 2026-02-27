-- Vendors chunk 5 (4 vendors)
INSERT INTO vendors (tenant_id, full_name, entity_type, email, cpf, cnpj, import_source, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Rosivaldo  Jesus de Almeida', 'pf', 'Rosivaldo.almeida@hotmail.com', NULL, NULL, 'migration_equipe_20260227', true),
  ('11111111-1111-1111-1111-111111111111', 'Paul Christian Carbone', 'pj', 'paulcbfilmes@gmail.com', NULL, '44229215000154', 'migration_equipe_20260227', true),
  ('11111111-1111-1111-1111-111111111111', 'Eduardo Lopes Fortes', 'pj', 'lopes.fortes@gmail.com', NULL, '18597879000166', 'migration_equipe_20260227', true),
  ('11111111-1111-1111-1111-111111111111', 'Rayssa Vitória Cabral de Souza', 'pj', 'rayssavitoriac1301@gmail.com', NULL, '60344054000104', 'migration_equipe_20260227', true)
ON CONFLICT DO NOTHING;