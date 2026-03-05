-- Migration: Adicionar match_method 'auto_subject_email' na constraint de nf_documents
-- O novo metodo e usado quando o fornecedor responde o email com o codigo do job no assunto
-- e o sistema vincula automaticamente ao cost_item correto.

ALTER TABLE nf_documents
  DROP CONSTRAINT IF EXISTS chk_nf_documents_match_method;

ALTER TABLE nf_documents
  ADD CONSTRAINT chk_nf_documents_match_method CHECK (
    match_method IS NULL
    OR match_method IN ('auto_value_supplier', 'auto_nf_number', 'auto_subject_email', 'manual', 'ocr_ai')
  );
