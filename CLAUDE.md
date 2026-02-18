# ELLAHOS - Instruções do Projeto

## AMBIENTE: WINDOWS
Este projeto roda em Windows. Regras importantes:
- Para criar/editar arquivos de texto, markdown, código: use as ferramentas Write e Edit do Claude Code (mais confiável que bash)
- Para rodar Python: o comando é "python" (NÃO python3)
- Para rodar Node: funciona normalmente (node, npm, npx)
- NUNCA use heredoc (<<) para criar arquivos - não funciona bem no Windows
- Pode usar Python para scripts, automações, processamento de dados e lógica de negócio

## Supabase
- **Project ID:** etvapcxesaxhsvzgaane
- **URL:** https://etvapcxesaxhsvzgaane.supabase.co
- **Região:** sa-east-1 (São Paulo)

## Stack
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- Frontend: React/Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Automações: n8n (self-hosted)
- WhatsApp: Evolution API (self-hosted)
- AI: Claude API (Sonnet + Haiku)
- Assinatura digital: DocuSeal (self-hosted)
- Deploy: VPS Hetzner + Vercel

## Banco de Dados (Fase 1 - CONCLUIDA + AUDITADA)
Tabelas (14 total):
- **Base:** tenants, profiles, clients, agencies, contacts, people
- **Jobs:** jobs (~75 colunas), job_team, job_deliverables, job_history, job_budgets, job_files
- **Auxiliares:** job_shooting_dates, job_code_sequences
- **Seguranca:** RLS ativo em todas as tabelas, policies com (SELECT auth.uid()), search_path fixo
- **Triggers:** updated_at, health_score (consulta job_team), status_history, job_code atomico
- **Generated columns:** tax_value, gross_profit, margin_percentage

### Mapa de nomes (spec → real)
- job_team_members → job_team | fee → rate | is_lead_producer → is_responsible_producer
- job_attachments → job_files | job_code → code + job_aba
- previous_data/new_data → data_before/data_after
- job_type ENUM → project_type | job_priority → priority_level | segment_type → client_segment
- approval_type: interna/externa_cliente (portugues, nao ingles)
- sub_status → pos_sub_status (ENUM tipado, so pos-producao)

## Fases de Implementação
- [x] Fase 1: Schema + Migrations + RLS (CONCLUÍDA)
- [ ] Fase 2: Edge Functions - CRUD Básico
- [ ] Fase 3: Frontend - Listagem e Criação
- [ ] Fase 4: Frontend - Detalhes e Edição
- [ ] Fase 5: Features Avançadas
- [ ] Fase 6: Integrações (Drive, DocuSeal, n8n)

## Idioma
- Documentação e comentários: português brasileiro
- Código (variáveis, funções, classes): inglês
