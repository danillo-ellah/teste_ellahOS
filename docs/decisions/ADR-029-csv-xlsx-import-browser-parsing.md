# ADR-029: Importacao CSV/XLSX com Parsing no Browser

**Data:** 2026-03-10
**Status:** Proposto
**Autor:** Tech Lead (Claude Opus 4.6)
**Contexto:** Onda Enterprise -- Feature de importacao em massa de clientes, contatos e jobs

---

## Contexto

O ELLAHOS precisa de uma feature de importacao em massa de dados via CSV/XLSX para permitir que novos tenants migrem dados de planilhas externas para o sistema. As entidades importaveis sao: clientes, contatos e jobs.

O principal dilema arquitetural e **onde executar o parsing do arquivo**: no browser (frontend) ou na Edge Function (backend). Supabase Edge Functions tem limite de 150 MB RAM e 60s timeout no free tier. Arquivos XLSX com 500 linhas podem consumir 20-50 MB de RAM durante o parsing via SheetJS.

Decisoes adicionais incluem: estrategia de deduplicacao, tratamento de erros parciais, e se o mapeamento de colunas deve ser persistido para reuso.

---

## Decisao

### Parsing no browser, insercao na Edge Function

O arquivo CSV/XLSX e parseado inteiramente no browser usando SheetJS (xlsx@0.18.5 via npm). O frontend converte o arquivo em array de objetos JSON, aplica mapeamento de colunas definido pelo usuario via wizard, valida com Zod client-side, e envia para a EF em batches de 50 linhas como JSON puro.

A Edge Function `data-import` recebe JSON (nunca arquivo binario), valida novamente com Zod, faz deduplicacao por nome (clientes), email (contatos) ou titulo+cliente (jobs), e insere em batch no PostgreSQL usando o Supabase client com RLS do usuario.

Erros parciais sao tolerados: linhas validas sao inseridas, linhas invalidas ou duplicadas sao retornadas ao frontend com detalhes por linha.

O mapeamento de colunas e descartavel (estado local do wizard React), sem persistencia no banco.

---

## Consequencias

### Positivas
- Zero risco de timeout na EF (parsing e a operacao mais pesada e acontece no browser)
- Zero upload de arquivo binario (economia de bandwidth, sem path traversal)
- Preview instantaneo dos dados no browser (UX superior)
- EF leve: recebe JSON, valida, insere (~50ms por batch de 50 linhas)
- Validacao dupla (browser + EF) segue defense-in-depth
- Arquivo nunca sai do browser do usuario (privacy, LGPD)
- SheetJS suporta CSV, XLSX, XLS, XLSB, ODS -- praticamente qualquer planilha

### Negativas
- Dependencia de SheetJS no frontend (~250 KB gzipped) -- mitigado com dynamic import
- Parsing de arquivos grandes (>2 MB) pode congelar a UI brevemente -- mitigado com Web Worker futuro se necessario
- Mapeamento descartavel exige que o usuario refaca o mapeamento a cada importacao
- Deduplicacao por nome e imprecisa ("Senac SP" vs "SENAC SP" vs "Senac") -- mitigado com case-insensitive + trim

### Riscos
- SheetJS pode nao interpretar formatos exoticos de XLSX (raro, fallback: salvar como CSV)
- Trigger `generate_job_code` em batch INSERT de 50 jobs precisa ser testado em staging
- Se o tenant tem milhares de clientes existentes, a query de dedup pode ser lenta -- mitigado com indice em `lower(name)`

---

## Alternativas Consideradas

### A1: Parsing na Edge Function (upload binario)
**Rejeitada.** Upload de binario via base64 infla payload 33%. SheetJS no Deno consome 20-50 MB de RAM para XLSX com 500 linhas, proximo do limite do free tier. Timeout de 60s e arriscado para arquivos grandes. Nenhum preview para o usuario antes do envio.

### A2: Upload para Supabase Storage + processamento async via CRON/n8n
**Rejeitada.** Complexidade desnecessaria para o volume esperado (max 500 linhas). Adiciona latencia (usuario precisa esperar processamento async). Requer infra adicional (Storage bucket, n8n workflow ou CRON job). Polling de status degrada UX.

### A3: Parsing no frontend via Web Worker
**Adiada.** Web Workers isolam o parsing do main thread, evitando freeze da UI. Porem, para arquivos de ate 500 linhas/5 MB, o parsing leva <1s no main thread. Se surgir demanda por arquivos maiores, migrar para Worker e trivial (mover `parseFile()` para worker).

### A4: Persistir templates de mapeamento
**Rejeitada neste momento.** Importacao e operacao rara (migracao ou carga pontual). Persistir templates adiciona tabela, EF CRUD e UI de gerenciamento. Se houver demanda futura (ex: tenants que importam mensalmente), e trivial adicionar tabela `import_templates` com JSONB de mappings.

### A5: Merge/upsert de dados existentes (update se ja existe)
**Rejeitada.** Risco alto de sobrescrever dados que foram refinados manualmente apos importacao anterior. "Skip" (pular duplicados) e mais seguro. Se o usuario quer atualizar dados, deve usar o CRUD normal do sistema.

---

## Referencias

- docs/specs/onda-enterprise/02-importacao-arquitetura.md (documento completo)
- ADR-001: Arquitetura das Edge Functions (pattern de router + handlers)
- ADR-011: CSV Export Server-Side (feature complementar de exportacao)
- SheetJS docs: https://docs.sheetjs.com/
- Supabase EF limits: https://supabase.com/docs/guides/functions/limits
