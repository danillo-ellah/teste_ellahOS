-- drive_folders.created_by era NOT NULL mas buildDriveStructure nao incluia
-- esse campo no upsert, causando falha silenciosa ao salvar pastas no banco.
-- Pastas eram criadas no Drive mas nunca registradas no banco.
ALTER TABLE drive_folders ALTER COLUMN created_by DROP NOT NULL;
