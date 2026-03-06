# Onda 1.4 — Automacao NF via n8n

**Status:** OPERACIONAL (em producao desde 2026-02-26)
**Autor:** Claude (PM + Tech Lead)
**Data:** 2026-03-06

---

## Resumo

Pipeline automatizado que monitora o Gmail financeiro, extrai PDFs de notas fiscais,
faz upload ao Google Drive, e registra no EllaOS com tentativa de vinculacao automatica
a cost_items existentes.

## Componentes

### 1. n8n Workflow: `wf-nf-processor`
- **ID:** VLgQcxR0fyR5Ptfy
- **Status:** Ativo, rodando a cada 5 minutos
- **URL:** https://ia.ellahfilmes.com/

**Fluxo de nodes (14 nodes):**
```
Schedule (5min) -> Gmail (unread PDFs) -> Get Full Message -> Extract PDF Parts
  -> Has PDFs? -> Download Attachment -> Mark as Read -> Hash + Prepare Binary
  -> Check Duplicate (RPC) -> Is New? -> Not Duplicate? -> Upload to Drive
  -> POST Ingest to ELLAHOS -> [sucesso]
  -> Log Error [em caso de falha em qualquer etapa]
```

**Gmail query:** `has:attachment filename:pdf is:unread label:inbox`
**Drive folder:** `16ETBO-yyqvaAI1wd1YswrCmvXxmEUBOs` (NFs_Inbox)

### 2. Edge Function: `nf-processor/ingest`
- **Auth:** X-Cron-Secret (timing-safe comparison)
- **Payload:** 11 campos (tenant_id, gmail_message_id, sender_email, sender_name, subject, received_at, file_name, file_hash, file_size_bytes, drive_file_id, drive_url)

**Smart Auto-Match (2 etapas):**
- **Etapa 1:** Extrai codigo do job do subject (regex `/^\d{1,4}\b/`), busca cost_item por `job.code + vendor_email`. Se 1 match -> auto-link (confidence 0.95)
- **Etapa 2:** Busca por vendor_email apenas -> candidatos para revisao manual

### 3. RPC: `check_nf_duplicate`
- Verifica duplicidade por `file_hash` antes do upload
- Evita reprocessamento de mesma NF

### 4. Tabela: `nf_documents`
- Armazena todas as NFs recebidas com metadata
- Status: `pending_review`, `auto_matched`, `confirmed`, `rejected`

## Metricas em Producao (2026-03-06)

| Metrica | Valor |
|---------|-------|
| Total NFs processadas | 22 |
| Pending review | 17 |
| Confirmadas (manual) | 4 |
| Rejeitadas | 1 |
| Auto-matched | 0 |

**Por que auto-match nao disparou:**
- 65 de 218 cost_items tem `vendor_email_snapshot` preenchido (~30%)
- Fornecedores nao incluem codigo do job no subject do email consistentemente
- Sistema funciona como esperado — NFs sem match claro vao para revisao manual

## Workflow Complementar: `wf-nf-request`
- **ID:** OWpQfJCqjr35hzZl
- **Status:** Ativo
- **Funcao:** Envia pedido de NF por email ao fornecedor (webhook trigger)

## Melhorias Futuras (Backlog)

1. **Mais vendor emails:** Incentivar cadastro de email em cost_items para aumentar taxa de auto-match
2. **Label NF no Gmail:** Criar filtro Gmail `label:NF` para PDFs de NF (atualmente pega todos PDFs do inbox)
3. **OCR:** Handler `ocr-analyze` ja previsto para extrair dados do PDF automaticamente
4. **Upload manual:** Handler `upload` existe para NFs recebidas fora do email (WhatsApp, portal)
5. **Notificacoes:** Alertar financeiro quando NF chega e nao tem match

## Arquivos Relacionados

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/nf-processor/handlers/ingest.ts` | Handler de ingestao |
| `docs/n8n/wf-nf-processor-import.json` | JSON do workflow (importavel) |
| `docs/n8n/wf-nf-request-import.json` | JSON do workflow de pedido de NF |
| `docs/n8n/fase-9-2-wf-nf-processor.md` | Spec detalhado do workflow |
| `docs/decisions/ADR-019-nf-processing-pipeline.md` | ADR da arquitetura |
