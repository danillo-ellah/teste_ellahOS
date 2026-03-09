# Onboarding Wizard — Spec de Produto

**Data:** 2026-03-09
**Status:** RASCUNHO — aguardando validacao
**Autor:** PM (Claude Sonnet 4.6)
**Esforco estimado:** 3-4 dias
**Fontes:** Schema das tabelas tenants, profiles, tenant_invitations (migrations auditadas) + stack Next.js + Supabase + shadcn/ui

---

## 1. Objetivo

Guiar o dono ou admin de uma nova produtora pelos 5 passos minimos de configuracao inicial do EllaOS, de forma que ele saia do wizard com o sistema pronto para criar o primeiro job — sem depender de suporte tecnico.

O wizard e exibido uma unica vez: no primeiro login de um usuario com papel admin ou ceo cujo tenant ainda nao completou o onboarding (settings.onboarding_completed \!= true). Apos concluir o Passo 5, nunca mais aparece para nenhum usuario do tenant.

---

## 2. Personas

**P1: Dono da produtora / admin** (30-60 anos, variavel em tech)
Usuario que acabou de criar a conta. Pode ser o CEO operacional, um socio, ou o responsavel de TI da produtora. Nao necessariamente conhece o sistema. Precisa de orientacao clara em cada passo, sem jargao tecnico.

---

## 3. Fluxo: 5 Passos

| # | Nome | Dados coletados | Obrigatorio |
|---|------|-----------------|-------------|
| 1 | Sua empresa | name, cnpj, logo, city, state | Apenas name |
| 2 | Seu perfil | full_name, phone | Apenas full_name |
| 3 | Convidar equipe | email + role por membro | Totalmente opcional |
| 4 | Integracoes | acknowledgement de Drive e WhatsApp | Totalmente opcional |
| 5 | Tudo pronto | Resumo + atalhos de modulos | Sem coleta de dados |

Navegacao: botoes Anterior / Proximo. Barra de progresso no topo (Passo 2 de 5) com passos clicaveis. Botao Pular disponivel nos passos 3 e 4. Cada passo salva seus dados ao clicar Proximo (nao apenas no final).

---

## 4. User Stories

### MUST HAVE

**US-OB-01 — Redirecionar admin para o wizard no primeiro login**
Como sistema, quero redirecionar o admin para /onboarding no primeiro login, para que ele configure o tenant antes de usar o sistema.

Criterios de aceite:
- CA-01.1: proxy.ts verifica settings.onboarding_completed !== true para usuarios com role admin ou ceo; redireciona para /onboarding quando a condicao for verdadeira
- CA-01.2: Usuarios com outros roles (coordenador, freela, etc.) nao sao redirecionados, mesmo que o tenant nao esteja configurado
- CA-01.3: Apos settings.onboarding_completed = true, nenhum usuario do tenant e redirecionado novamente

**US-OB-02 — Passo 1: dados da empresa**
Como admin, quero informar os dados basicos da minha produtora, para que o sistema esteja identificado corretamente desde o inicio.

Criterios de aceite:
- CA-02.1: Campos: nome da produtora (obrigatorio, max 100 chars), CNPJ (opcional, mascara XX.XXX.XXX/XXXX-XX), cidade e estado (opcionais, texto livre), logo (opcional, upload de imagem)
- CA-02.2: Upload de logo aceita JPG/PNG/SVG ate 2MB; armazenado no bucket tenant-logos do Supabase Storage; URL salva em tenants.logo_url
- CA-02.3: Ao clicar Proximo, PATCH /onboarding/company salva: tenants.name, tenants.cnpj, tenants.logo_url, tenants.settings.address (city + state), tenants.settings.onboarding_step = 2
- CA-02.4: Se name ja estava preenchido na criacao do tenant, campo vem pre-preenchido
- CA-02.5: Erro de validacao inline (nao toast) se name estiver vazio ao clicar Proximo

**US-OB-03 — Passo 2: perfil do responsavel**
Como admin, quero preencher meu nome completo e telefone, para que meu perfil esteja correto no sistema.

Criterios de aceite:
- CA-03.1: Campos: nome completo (obrigatorio), telefone (opcional, mascara (XX) XXXXX-XXXX)
- CA-03.2: Campos pre-preenchidos com profiles.full_name e profiles.phone do usuario logado
- CA-03.3: PATCH /onboarding/profile salva profiles.full_name e profiles.phone do usuario logado; seta settings.onboarding_step = 3 no tenant
- CA-03.4: Nao e possivel avancar para o Passo 3 com nome completo vazio

**US-OB-04 — Passo 3: convidar equipe (opcional)**
Como admin, quero convidar os primeiros membros da minha equipe no setup inicial, para nao precisar fazer isso separadamente depois.

Criterios de aceite:
- CA-04.1: Formulario para adicionar convites: email + select de role (roles do ENUM user_role); botao Adicionar mais
- CA-04.2: Lista de convites pendentes exibida abaixo; cada item tem botao X para remover antes de enviar
- CA-04.3: Botao Enviar convites dispara POST /tenant-invitations (endpoint ja existente) para cada email adicionado
- CA-04.4: Botao Pular (ou clicar Proximo sem adicionar ninguem) avanca sem enviar nenhum convite; seta settings.onboarding_step = 4
- CA-04.5: Maximo de 10 convites no wizard; usuarios adicionais podem ser convidados depois em /settings/equipe
- CA-04.6: Email duplicado na lista gera erro inline antes de adicionar

**US-OB-05 — Passo 4: integracoes (opcional)**
Como admin, quero saber quais integracoes estao disponiveis e indicar interesse em configurar, para preparar o ambiente da minha producao.

Criterios de aceite:
- CA-05.1: Dois cards informativos: Google Drive (sincronizacao de pastas por job) e WhatsApp (notificacoes e comunicacao)
- CA-05.2: Cada card tem: icone, descricao de 1 linha, botao Configurar agora (link para /settings em nova aba) e checkbox Ja configurei
- CA-05.3: Estado dos checkboxes salvo em tenants.settings.integrations.drive_acknowledged e whatsapp_acknowledged (boolean); nao valida se a integracao realmente funciona
- CA-05.4: Botao Pular no rodape avanca sem marcar nada; seta settings.onboarding_step = 5
- CA-05.5: Nenhuma configuracao tecnica de integracao ocorre dentro do wizard; ele apenas informa e direciona para /settings

**US-OB-06 — Passo 5: conclusao e ativacao**
Como admin, quero ver um resumo do que configurei e atalhos para os modulos principais, para comecar a usar o sistema imediatamente.

Criterios de aceite:
- CA-06.1: Mensagem de parabenizacao com nome da produtora (ex: [Nome da Produtora] esta pronta!)
- CA-06.2: Resumo com icone verde (feito) ou cinza (pulado) para cada um dos 4 passos anteriores
- CA-06.3: Grid de 4 atalhos: Novo Job (/jobs/new), CRM (/crm), Financeiro (/financeiro), Equipe (/settings/equipe)
- CA-06.4: Botao Comecar faz PATCH /onboarding/complete (seta settings.onboarding_completed = true) e redireciona para /
- CA-06.5: Apos o redirecionamento, nenhum usuario do tenant e redirecionado para o wizard novamente

---

## 5. Modelo de Dados

Nenhuma tabela nova. Nenhuma coluna nova em tabelas existentes. Todas as mudancas usam campos JSONB ja existentes.

Chaves novas adicionadas a tenants.settings (JSONB, ja existe com DEFAULT '{}'):

Estrutura do objeto settings apos wizard concluido:
- onboarding_completed: true (boolean)
- onboarding_step: 5 (integer, removido ao completar)
- address.city: string
- address.state: string
- integrations.drive_acknowledged: boolean
- integrations.whatsapp_acknowledged: boolean

Campos existentes usados sem alteracao de schema:
- tenants.name (NOT NULL), tenants.cnpj (TEXT nullable), tenants.logo_url (TEXT nullable)
- profiles.full_name (NOT NULL), profiles.phone (TEXT nullable)
- tenant_invitations: tabela ja existente, reusada no Passo 3 (migration 20260307100000)

Migration necessaria antes do deploy: UPDATE tenants SET settings = settings || '{"onboarding_completed": true}' WHERE settings->>'onboarding_completed' IS NULL para nao redirecionar tenants existentes.

---

## 6. Endpoints

Edge Function: onboarding (nova)

| Metodo | Path | Descricao | Passo |
|--------|------|-----------|-------|
| GET | /onboarding/status | Retorna dados atuais do tenant + profile para pre-preencher o wizard | Todos |
| PATCH | /onboarding/company | Atualiza tenants: name, cnpj, logo_url, settings.address, settings.onboarding_step | 1 |
| PATCH | /onboarding/profile | Atualiza profiles: full_name, phone do usuario logado | 2 |
| POST | /tenant-invitations | Envia convites (endpoint ja existente, reusado sem alteracao) | 3 |
| PATCH | /onboarding/integrations | Atualiza settings.integrations (acknowledgements de Drive e WhatsApp) | 4 |
| PATCH | /onboarding/complete | Seta settings.onboarding_completed = true; limpa settings.onboarding_step | 5 |

Upload de logo: feito diretamente para Supabase Storage via SDK do cliente. A URL resultante e enviada no corpo do PATCH /onboarding/company. Todos os handlers da EF onboarding requerem JWT valido + role admin ou ceo.

---

## 7. Fora de Escopo

| Item | Motivo |
|------|--------|
| Configuracao tecnica real de Drive ou WhatsApp no wizard | Complexidade alta; wizard direciona para /settings |
| Wizard para usuarios nao-admin (coordenador, freela, etc.) | Configuracao de tenant e responsabilidade do admin |
| Tour interativo com tooltips sobre os modulos | Custo de implementacao alto para o MVP |
| Reexibir wizard quando integracao estiver pendente | Responsabilidade do Dashboard; wizard e one-time |
| Persistencia de rascunho entre sessoes sem salvar por passo | Cada passo ja salva imediatamente ao clicar Proximo |
| Selecao de plano ou billing durante onboarding | Fora do escopo do ELLAHOS (produto interno) |

---

## 8. Dependencias

| Dependencia | Status |
|-------------|--------|
| tenants.settings JSONB | Existente; apenas adiciona novas chaves |
| tenants.name, tenants.cnpj, tenants.logo_url | Existentes |
| profiles.full_name, profiles.phone | Existentes |
| tenant_invitations (tabela + endpoint POST) | Existente (migration 20260307100000) |
| Supabase Storage bucket tenant-logos | Criar se nao existir; RLS leitura publica, escrita por tenant |
| proxy.ts (middleware Next.js) | Existente; adicionar verificacao de onboarding_completed |
| RBAC: roles admin e ceo | Existente |

---

## 9. Criterio de Done

### Backend

- [ ] Migration: setar settings.onboarding_completed = true em todos os tenants existentes antes do deploy
- [ ] Bucket tenant-logos no Supabase Storage (RLS: leitura publica, escrita apenas pelo proprio tenant)
- [ ] Edge Function onboarding com 5 handlers: status (GET), company (PATCH), profile (PATCH), integrations (PATCH), complete (PATCH)
- [ ] Todos os handlers da EF validam role admin ou ceo via JWT
- [ ] proxy.ts: adicionar verificacao de onboarding_completed !== true com redirecionamento para /onboarding

### Frontend

- [ ] Rota /onboarding com layout proprio sem sidebar nem header do app
- [ ] Barra de progresso com 5 passos clicaveis
- [ ] Passo 1: formulario empresa com upload de logo e preview antes de salvar
- [ ] Passo 2: formulario perfil pre-preenchido com dados do profile atual
- [ ] Passo 3: lista de convites com adicionar/remover; botao Pular funcional sem enviar convites
- [ ] Passo 4: dois cards de integracao com checkbox e link para /settings em nova aba
- [ ] Passo 5: resumo com status de cada passo + grid de 4 atalhos + botao Comecar
- [ ] Dark mode funcionando em todas as telas do wizard
- [ ] Responsivo a partir de 768px (tablet)

### Testes de aceite ponta a ponta

- [ ] Novo tenant faz login como admin: redirecionado para /onboarding
- [ ] Admin deixa name vazio no Passo 1 e clica Proximo: erro inline, nao avanca
- [ ] Admin faz upload de logo com 3MB: mensagem de erro de tamanho exibida
- [ ] Admin faz upload de logo valida: preview exibido antes de salvar; logo visivel no header apos wizard
- [ ] Admin adiciona 1 convite no Passo 3 e clica Pular: nenhum convite enviado
- [ ] Admin clica Comecar no Passo 5: redirecionado para /; reload nao redireciona para wizard
- [ ] Usuario com role coordenador do mesmo tenant faz login: nao redirecionado para wizard
- [ ] Tenants existentes (criados antes do deploy): nenhum admin e redirecionado para wizard

---

## 10. Perguntas Abertas

**PA-01: O wizard deve aparecer para o segundo admin do tenant?**
A flag settings.onboarding_completed e por tenant, nao por usuario. Se um segundo usuario com role admin e convidado apos o wizard ser concluido, ele nao vera o wizard. Confirmar se esse e o comportamento desejado ou se o segundo admin deve ver uma versao resumida.

**PA-02: Qual o comportamento se o admin fechar o browser no meio do wizard?**
A proposta salva settings.onboarding_step a cada Proximo. Na proxima sessao, o sistema pode redirecionar para o passo onde parou. Confirmar se retomar do ultimo passo e o comportamento desejado, ou se sempre iniciar do Passo 1 e mais simples e aceitavel.

**PA-03: Tenants existentes precisam de migration de dados antes do deploy?**
Tenants criados antes desta feature tem settings.onboarding_completed = null (chave inexistente). A verificacao !== true redirecionaria todos os admins existentes (Ellah Filmes, Colorbar) para o wizard. E obrigatoria uma migration que sete onboarding_completed = true para os tenants existentes antes do deploy em producao. Confirmar a lista de tenants ativos no momento do deploy.

---

*Spec gerada em 2026-03-09. Campos e tabelas verificados nas migrations (20260217215856, 20260307100000) antes de escrever. Nenhum requisito foi inventado.*
