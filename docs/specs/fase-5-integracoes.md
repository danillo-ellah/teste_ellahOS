# Fase 5: Integracoes Core — Spec Completa

**Data:** 18/02/2026
**Status:** PLANEJADA (aprovada, aguardando refinamento)
**Validada por:** PM, Tech Lead, Integrations Engineer (3 agentes especializados)

---

## Objetivo

Automatizar o que hoje e feito manualmente ou via Apps Scripts — criar pastas no Drive ao aprovar job, notificar equipe via WhatsApp, alertas automaticos.

## Criterio de Done

Aprovar um job no ELLAHOS → pastas Drive criadas automaticamente → equipe notificada via WhatsApp e in-app → links aparecem no job → falhas logadas e visiveis.

---

## Contexto da Ellah Filmes

### Ecossistema Google atual (EXTENSO)
- **Google Drive:** Pastas por job com estrutura padronizada (14+ subpastas)
- **Google Sheets:** Planilhas de controle (GG_ prefixo), banco de dados da equipe
- **Google Docs:** Templates de documentos (carta orcamento, contratos, PPM)
- **Google Forms:** Cadastro de equipe por projeto — pessoa puxa cadastro existente, so atualiza cache e funcao. Se mudou dados bancarios, atualiza no form
- **Apps Scripts:** Automatizacoes que copiam pasta base, criam estrutura, integram com planilhas
- O Apps Script `copiarPastaBaseAdm` e o coracao da operacao atual

### Infraestrutura ja rodando
- **Supabase:** Free plan, 19 tabelas, 6 Edge Functions
- **n8n:** Self-hosted na VPS Hetzner (ia.ellahfilmes.com)
- **Evolution API:** Self-hosted na VPS Hetzner (WhatsApp)
- **Google Cloud:** Service Account configurada, acesso ao Drive

---

## Decisoes Arquiteturais (ADR-003 a ADR-006)

### ADR-003: Dispatch no Application Layer (NAO pg_net em triggers)
- pg_net dentro de triggers PL/pgSQL tem zero observabilidade, sem retry, sem como injetar service_role_key
- Dispatch acontece na Edge Function (ex: approve.ts)
- Edge Function insere em `integration_events` (fila)
- pg_cron processa a fila a cada minuto com retry e backoff
- Operacao principal (aprovar job) NUNCA e bloqueada por integracao

### ADR-004: Vault para Secrets, tenant.settings para Config
| Dado | Storage | Motivo |
|------|---------|--------|
| Google Service Account JSON | Vault | Chave privada RSA |
| Evolution API token | Vault | Secret |
| n8n webhook URLs | tenant.settings | Config, nao secret |
| Drive root folder ID | tenant.settings | Config |
| enabled/disabled flags | tenant.settings | Config |

### ADR-005: Supabase Realtime para Notificacoes
- Tabela `notifications` no supabase_realtime publication
- Frontend subscribe filtrado por user_id
- Badge atualiza sem refresh da pagina

### ADR-006: n8n como Orquestrador
- Edge Functions = API layer (CRUD, validacao, dispatch)
- n8n = workflows complexos (Drive + WhatsApp + email em sequencia)
- Cada integracao e opcional por tenant
- Se servico externo falha, operacao principal sempre completa

---

## 6 Sub-fases

### 5.1 — Infrastructure Foundation

**Banco de dados:**
- 5 novas tabelas: notifications, notification_preferences, drive_folders, whatsapp_messages, integration_events
- 3 ENUMs: notification_type (7 valores), notification_priority (4), notification_channel (3)
- Habilitar pg_net + pg_cron
- pg_cron job: processa fila a cada minuto
- Realtime: notifications no supabase_realtime publication

**Shared modules (3 novos):**
- `_shared/vault.ts` — ler/escrever secrets do Supabase Vault
- `_shared/integration-client.ts` — enfileirar eventos, logar integracoes
- `_shared/notification-helper.ts` — criar notificacoes, notificar equipe do job

### 5.2 — Notificacoes In-App

**Edge Function `notifications`:**
- GET /notifications — lista paginada (filtros: type, unread_only)
- GET /notifications/unread-count
- PATCH /notifications/:id/read
- POST /notifications/mark-all-read
- GET /notifications/preferences
- PATCH /notifications/preferences

**Modificar jobs-status:**
- Apos mudar status → notifyJobTeam() cria notificacao para cada membro
- Apos aprovar → notifyJobTeam() + enfileirar eventos de integracao

**Frontend:**
- Icone de sino (bell) no Topbar com badge de nao-lidas
- Dropdown com ultimas notificacoes
- Pagina /notifications com filtros e paginacao
- Supabase Realtime: badge atualiza sem refresh
- Clicar notificacao → navega para o job

### 5.3 — Settings + Vault

**Edge Function `tenant-settings`:**
- GET /tenant-settings/integrations — config (sem secrets raw)
- PATCH /tenant-settings/integrations/:integration — atualiza config + secrets no Vault
- POST /tenant-settings/integrations/:integration/test — testa conexao
- GET /tenant-settings/integration-logs — logs paginados
- Seguranca: apenas admin/ceo

**Frontend /settings/integrations:**
- Card por integracao (Google Drive, WhatsApp, n8n) com status badge
- Formularios: upload service account JSON, URL + token Evolution API, webhook URLs n8n
- Botao "Testar Conexao" com feedback visual
- Secrets mascarados (nunca expostos raw)
- Habilitar "Configuracoes" na sidebar

### 5.4 — Google Drive Integration

**_shared/google-drive-client.ts:**
- JWT RS256 via WebCrypto nativo do Deno
- Service Account JSON → JWT assinado → access_token (1h)
- IMPORTANTE: private_key.replace(/\\n/g, '\n') antes de importar

**Edge Function `drive-integration`:**
- POST /drive-integration/:jobId/create-structure — cria arvore de pastas
- POST /drive-integration/:jobId/sync-urls — callback do n8n
- GET /drive-integration/:jobId/folders — lista pastas

**Edge Function `integration-processor`:**
- Processa fila de integration_events
- Roteia para handler correto (Drive, WhatsApp, n8n)
- Retry com exponential backoff

**Fluxo:** aprovar job → enfileira evento → processor cria pastas → salva em drive_folders → atualiza jobs.drive_folder_url

**Estrutura de pastas default (configuravel por tenant):**
```
{JOB_CODE} - {TITULO}/
  01_Briefing/
  02_Orcamento/
  03_Roteiro/
  04_PPM/
  05_Producao/
  06_Pos_Producao/
  07_Entrega_Final/
  08_Financeiro/
  09_Contratos/
```

**Frontend:** secao "Google Drive" no TabGeral do job com links + botao manual

### 5.5 — WhatsApp + n8n Workflows

**_shared/whatsapp-client.ts:**
- Wrapper Evolution API (sendText, sendDocument, getStatus)
- POST /message/sendText/{instanceName} com apikey header
- GET /instance/connectionState/{instanceName}
- Rate limit: 1msg/s por numero, delay 3-5s entre broadcasts

**Edge Function `whatsapp`:**
- POST /whatsapp/send — enviar mensagem
- POST /whatsapp/webhook — callback da Evolution API
- GET /whatsapp/messages?job_id=... — lista por job

**3 triggers automaticos:**
1. Job aprovado → WhatsApp para PE + Diretor
2. Margem < 15% → WhatsApp para PE + Financeiro
3. Status mudou → WhatsApp para equipe do job

**Template de mensagem (job aprovado):**
```
*Job Aprovado* ✅
ELH-042 - Filme Institucional Marca X
Valor: R$ 85.000,00
Aprovado em: 18/02/2026

Acesse: https://app.ellahos.com/jobs/uuid
```

**n8n:** 4 workflows documentados
1. wf-job-approved — webhook → Drive folders → WhatsApp → callback
2. wf-margin-alert — webhook → buscar PE/Financeiro → WhatsApp
3. wf-status-change — webhook → buscar equipe → WhatsApp por membro
4. wf-budget-sent — webhook → (futuro: gerar carta orcamento)

**Frontend:** historico de mensagens WhatsApp no job detail (read-only)

### 5.6 — Polish + End-to-End

- Preferencias de notificacao simples (toggle WhatsApp on/off)
- Badges de status de integracao no job detail
- Empty states em todas as paginas novas
- Teste end-to-end do flow completo
- Atualizar roadmap + MEMORY.md

---

## O que NAO esta no scope (DEFERIDO)

| Item | Motivo | Fase futura |
|------|--------|-------------|
| DocuSeal (assinatura digital) | Depende de templates manuais criados no painel | Fase 6 |
| Receber mensagens WhatsApp | Requer parser de intencao, complexo | Fase 8 |
| Criar job via WhatsApp | Feature de IA | Fase 8 |
| Preferencias granulares (por tipo de notificacao) | Toggle simples basta para 4-20 jobs | Futura |
| Integration logs viewer (tela frontend) | Supabase Table Editor basta por ora | Futura |
| Copia de templates Google Docs/Sheets/Forms | Apps Script atual faz isso, escopo grande | Fase 6+ |
| Geração de contratos de elenco | 40 campos, hash CPF+email, DocuSeal | Fase 6 |

---

## Ideias para Agregar (a discutir)

### Google Ecosystem (alto valor, replica Apps Scripts)
1. **Copiar templates de Sheets/Docs** junto com as pastas (replica `copiarPastaBaseAdm`)
2. **Cadastro de equipe via Form integrado** — pessoa puxa cadastro do ELLAHOS, atualiza cache/funcao/bancarios, sem precisar do Google Forms separado
3. **Sincronizar planilha GG_** com dados do job no ELLAHOS (bidirecional ou unidirecional)
4. **Gerar carta orcamento** a partir de template Google Docs preenchido com dados do job

### Alertas automaticos (alto valor, pouco esforco)
5. **Alerta de prazo** — deadline approaching → notificacao X dias antes (configuravel)
6. **Alerta de diarias proximas** — shooting_date em 3 dias → WhatsApp para equipe
7. **Alerta de entregavel atrasado** — delivery_date passou → notificacao
8. **Resumo semanal** via WhatsApp — jobs ativos, pendencias, prazos proximos

### UX / Operacional
9. **Botao "Recriar pastas"** no job detail — se algo deu errado, recriar sem precisar re-aprovar
10. **Status da instancia WhatsApp** visivel no Settings — conectado/desconectado com botao reconectar
11. **Log de integracoes** acessivel no job detail — "Drive: criado em 18/02, WhatsApp: 3 enviados"
12. **Notificacao quando alguem e adicionado a equipe do job** — "Voce foi adicionado ao job X como Diretor"

### Seguranca / Operacional
13. **Rotacao de secrets** — botao para gerar nova API key sem downtime
14. **Health check automatico** — pg_cron verifica conexao Drive/WhatsApp/n8n a cada hora, alerta se caiu

---

## Notas Tecnicas Importantes

1. **Google Drive private_key:** Sempre fazer `.replace(/\\n/g, '\n')` antes de importar via WebCrypto
2. **Evolution API rate limit:** 1 msg/s por numero, delay 3-5s entre broadcasts, campo `delay` no payload
3. **Shared Drive vs My Drive:** Confirmar tipo de Drive da Ellah (param `supportsAllDrives` necessario para Shared Drive)
4. **n8n HTTPS obrigatorio:** pg_net pode rejeitar HTTP puro. n8n deve ter SSL via Caddy/nginx + Let's Encrypt
5. **QR Code persistence:** Volume Docker da Evolution API deve persistir sessions entre restarts
6. **Supabase Free:** pg_net e pg_cron disponiveis, Vault funciona, Realtime limite 200 conexoes simultaneas

---

## Numeros

- **5 tabelas novas** (24 total)
- **5 Edge Functions novas** (11 total)
- **3 shared modules novos** (13 total)
- **~15 componentes React novos**
- **3 paginas novas** (/notifications, /settings, /settings/integrations)
- **4 workflows n8n** documentados

---

## Ordem de Execucao

```
5.1 Infrastructure (migrations + shared modules + pg_cron)
 |
 +---> 5.2 Notifications (Edge Function + frontend bell/page + Realtime)
 |
 +---> 5.3 Settings + Vault (Edge Function + frontend /settings)
        |
        +---> 5.4 Google Drive (Edge Function + folder creation + job detail)
        |
        +---> 5.5 WhatsApp + n8n (Edge Function + Evolution API + workflows)
               |
               +---> 5.6 Polish + E2E (preferences, empty states, test flow)
```

5.2 e 5.3 podem rodar em paralelo apos 5.1.
5.4 e 5.5 podem rodar em paralelo apos 5.3.
5.6 requer tudo anterior.

---

## Anexos e Materiais de Referencia (a adicionar)

> **Nota para Danillo:** Adicione aqui screenshots, exports de Apps Scripts, estrutura real de pastas do Drive, templates de documentos, configuracoes do n8n/Evolution API — qualquer material que ajude a refinar o plano.

### TODO: Materiais para coletar
- [ ] Screenshot da estrutura real de pastas no Drive (14+ subpastas)
- [ ] Export do Apps Script `copiarPastaBaseAdm` (logica de copia)
- [ ] Template da carta orcamento (Google Docs)
- [ ] Template do form de cadastro de equipe (Google Forms)
- [ ] Screenshot dos workflows atuais no n8n
- [ ] Configuracao da instancia Evolution API (nome, numero)
- [ ] Lista de quem recebe cada tipo de notificacao (PE, Coord, Diretor, etc.)
- [ ] Mapeamento: email Google ↔ role no ELLAHOS (para permissoes no Drive)
- [ ] Estrutura real da planilha GG_ (colunas, formulas)

---

*Documento vivo — atualizar conforme materiais forem adicionados e decisoes refinadas.*
