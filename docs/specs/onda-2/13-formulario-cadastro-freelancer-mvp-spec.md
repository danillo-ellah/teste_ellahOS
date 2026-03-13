# Onda 2.6 Sprint 1 -- Formulario de Cadastro de Freelancer por Job (MVP)

**Modulo:** Equipe do Job -- Gestao de Freelancers e Fornecedores
**Substitui:** Google Forms externo
**Data:** 2026-03-13
**Status:** AGUARDANDO VALIDACAO
**Autor:** PM (Claude Sonnet 4.6)
**Esforco estimado:** 3-4 dias
**Dependencias:** nenhuma (infra de vendor_invite_tokens ja implementada)
**Proximo passo:** Onda 2.6 Sprint 2 -- Auto-sugestao de fornecedor no GG (11-vendor-match-gg-spec.md)

---

## Indice

1. Visao Geral
2. Estado atual (ler antes de implementar)
3. Personas
4. User Stories
5. Fluxos Principais
6. Campos do Formulario
7. Regras de Negocio
8. Alteracoes no Modelo de Dados
9. Funcoes disponiveis no MVP
10. Wireframes Textuais
11. Fora de Escopo
12. Dependencias
13. Perguntas Abertas

---
## 1. Visao Geral

### 1.1 Problema

Para cada job, a producao envia um link do Google Forms para que freelancers se cadastrem. O Forms tem logica condicional: quem ja trabalhou antes responde menos campos; quem e novo preenche dados completos.

O problema e a desconexao total com o ELLAHOS: a producao precisa abrir o Google Sheets de respostas, copiar nome, funcao e cache para o GG do job manualmente. O retrabalho acontece em todo job, para toda a equipe tecnica -- podendo ser 20 a 40 pessoas por filmagem.

| Gap | Impacto |
|-----|--------|
| Formulario externo (Google Forms) | Zero integracao com o banco de dados de vendors |
| Retrabalho de digitacao | Producao copia nome, funcao e cache do Sheets para o GG manualmente |
| Re-cadastro de veteranos | Freelancer que trabalhou 10 vezes repete CPF e endereco toda vez |
| Sem rastreabilidade | Impossivel saber, dentro do job, quem confirmou participacao e quem falta |

### 1.2 Solucao

Substituir o Google Forms por formulario nativo no ELLAHOS usando a infraestrutura de vendor_invite_tokens ja implementada. A producao gera um link por freelancer dentro do job, o freelancer preenche, e os dados entram direto no banco.

O formulario detecta automaticamente se o freelancer e veterano pelo email: se o email ja existe em vendors, exibe formulario reduzido (so funcao, diarias e cache). Se e novo, exibe cadastro completo.

Esta spec cobre apenas o Sprint 1: o formulario substituto do Google Forms. A integracao com o GG e escopo do Sprint 2 (spec em 11-vendor-match-gg-spec.md).

---

## 2. Estado atual (ler antes de implementar)

A infraestrutura de convite ja existe. Esta feature NAO parte do zero.

| Artefato | Status | Observacao |
|----------|--------|----------|
| Tabela vendor_invite_tokens | EXISTE | migration 20260302160000; campos: token, job_id, vendor_id, email, name, expires_at, used_at |
| EF vendor-portal/create-invite | EXISTE | Cria convite; aceita vendor_id, job_id, email, name, expires_days |
| EF vendor-portal/list-invites | EXISTE | Lista convites por job, vendor, status (pending/used/expired) |
| EF vendor-portal/public/:token GET | EXISTE | Retorna dados do convite + dados pre-existentes do vendor e bank_accounts |
| EF vendor-portal/public/:token POST | EXISTE | Salva dados do vendor (cria se novo, atualiza se vendor_id preenchido) |
| Pagina /vendor/[token] | EXISTE | Formulario publico com tipo PF/PJ, dados pessoais, CEP lookup (ViaCEP), dados bancarios |
| Logica de veterano (backend) | PARCIAL | Se invite.vendor_id \!= null, atualiza vendor existente; senao cria novo |
| Logica de veterano (frontend) | INCOMPLETA | Dados pre-preenchidos via useEffect, mas sem banner nem formulario reduzido explicito |

**O que FALTA para substituir o Google Forms:**

| Gap | Onde resolver |
|-----|-------------|
| Campos funcao no job, diarias, cache por diaria | Formulario publico + EF update-by-token + migration |
| Campos DRT e CTPS | Formulario publico + EF update-by-token + migration vendors |
| Lookup de email em create-invite (auto-preenche vendor_id) | EF create-invite |
| Campo suggested_role em vendor_invite_tokens | Migration (ALTER TABLE) |
| Tabela job_crew_registrations | Migration nova |
| UI do produtor para gerar e gerenciar links dentro do job | Frontend job detail |
| Banner de veterano e formulario reduzido | Pagina /vendor/[token] |
| Tela de confirmacao com dados da participacao | Pagina /vendor/[token] |

---

## 3. Personas

### 3.1 Carol -- Diretora de Producao

Gerencia 2 a 4 jobs simultaneos. Para cada filmagem garante que 15 a 35 pessoas da equipe tecnica estejam cadastradas para pagamento. Hoje envia link do Google Forms por WhatsApp e passa horas verificando quem preencheu e transcrevendo dados para o GG.

**Depois do MVP:** gera links dentro do job, ve em tempo real quem preencheu e quem falta, sem sair do ELLAHOS.

### 3.2 Joao Silva -- Freelancer veterano

Trabalha com a producao ha 3 anos. Tem CPF, endereco e dados bancarios cadastrados. Toda vez que aparece um novo job precisa preencher o Google Forms inteiro novamente.

**Depois do MVP:** abre o link, ve "Bem-vindo de volta, Joao!", confirma funcao e cache em 30 segundos.

### 3.3 Maria Oliveira -- Freelancer nova

Primeira vez trabalhando com a producao. Precisa preencher todos os dados para ser paga. Depois deste job nunca mais repete CPF, endereco e dados bancarios em jobs futuros.

---

## 4. User Stories

### US-01 -- Gerar link de cadastro dentro do job

**Como** Carol (Diretora de Producao), **quero** gerar um link de cadastro para um freelancer diretamente no job no ELLAHOS, **para** substituir o Google Forms e ter rastreabilidade de quem confirmou participacao.

**Criterios de Aceite:**

- [ ] CA-01: Na aba Equipe do job detail existe o botao "Convidar Freelancer"
- [ ] CA-02: Modal de convite tem campos: email (opcional), nome (opcional), funcao sugerida (dropdown), validade (padrao 30 dias)
- [ ] CA-03: Ao digitar o email, o sistema verifica em tempo real se esse email existe em vendors (lookup assíncrono)
- [ ] CA-04: Se email encontrado, exibe badge "Cadastrado -- dados serao pre-preenchidos" e preenche nome automaticamente
- [ ] CA-05: Botao "Copiar link" disponivel imediatamente apos geracao
- [ ] CA-06: Lista de convites do job exibe: nome, email, funcao sugerida, status (pendente/preenchido/expirado), data de criacao e data de preenchimento
- [ ] CA-07: Roles com permissao: admin, ceo, producer, coordinator
- [ ] CA-08: Convite pode ser revogado (soft delete) ate ser utilizado

**Validacao manual:**
1. Abrir job, acessar aba Equipe, clicar "Convidar Freelancer"
2. Digitar email de vendor existente -- aguardar badge "Cadastrado"
3. Gerar link, copiar, abrir em aba anonima -- verificar formulario de veterano pre-preenchido
4. Gerar segundo link sem email -- verificar formulario completo de novo cadastro

---

### US-02 -- Freelancer veterano confirma participacao

**Como** Joao Silva (freelancer que ja trabalhou antes), **quero** abrir o link e confirmar participacao informando apenas funcao, diarias e cache, **para** nao perder tempo com dados que a producao ja tem.

**Criterios de Aceite:**

- [ ] CA-01: Formulario exibe banner "Bem-vindo de volta, [Nome]! Seus dados estao cadastrados."
- [ ] CA-02: Secao "Participacao neste job" aparece aberta com funcao (dropdown), diarias (inteiro) e cache por diaria (moeda) -- todos obrigatorios
- [ ] CA-03: A funcao sugerida pelo produtor ao gerar o link esta pre-selecionada no dropdown (editavel)
- [ ] CA-04: Secao "Seus dados" aparece colapsada com label "Conferir ou atualizar meus dados"
- [ ] CA-05: Submit salva em job_crew_registrations: funcao, diarias, cache, vendor_id, job_id, is_veteran=true
- [ ] CA-06: Se freelancer alterar qualquer campo em "Seus dados", o vendor e atualizado no banco
- [ ] CA-07: Tela de confirmacao exibe: nome, funcao, diarias, cache por diaria, valor total (diarias x cache)
- [ ] CA-08: Token marcado como used_at apos submit -- link desativado

**Validacao manual:**
1. Criar convite com vendor_id (ou email existente em vendors)
2. Abrir /vendor/[token] -- verificar banner, funcao pre-selecionada, secao "Seus dados" colapsada
3. Preencher diarias e cache, enviar
4. Verificar registro em job_crew_registrations com is_veteran=true
5. Tentar abrir o mesmo link -- deve exibir "Formulario ja preenchido"

---

### US-03 -- Freelancer novo preenche cadastro completo

**Como** Maria Oliveira (primeira vez), **quero** preencher todos os meus dados num unico formulario, **para** participar do job e ficar cadastrada para jobs futuros sem repetir.

**Criterios de Aceite:**

- [ ] CA-01: Formulario exibe secao "Participacao neste job" no topo (funcao, diarias, cache -- obrigatorios)
- [ ] CA-02: Secao "Dados Pessoais" aberta: nome, tipo PF/PJ, CPF (validacao mod11), RG, data de nascimento, DRT, CTPS, email, telefone
- [ ] CA-03: Secao "Endereco" com CEP lookup automatico via ViaCEP (ja implementado na pagina atual)
- [ ] CA-04: Secao "Dados Bancarios" colapsavel (ja implementada na pagina atual)
- [ ] CA-05: Submit cria vendor em vendors com import_source = vendor_portal
- [ ] CA-06: Submit cria bank_account principal se dados bancarios foram fornecidos
- [ ] CA-07: Submit cria job_crew_registration com is_veteran=false
- [ ] CA-08: Tela de confirmacao identica ao US-02 CA-07
- [ ] CA-09: Em jobs futuros, sera detectada como veterana se o email coincidir

**Validacao manual:**
1. Criar convite sem vendor_id e sem email
2. Abrir /vendor/[token] -- verificar formulario completo sem banner
3. Preencher todos os campos incluindo funcao, diarias, cache, DRT
4. Verificar criacao do vendor, bank_account e job_crew_registration com is_veteran=false
5. Criar convite para o mesmo email em outro job -- verificar deteccao como veterana

---

## 5. Fluxos Principais

### 5.1 Produtor gera link (com email -- caso principal)

    Carol abre job em producao
      |
      v
    Aba Equipe -> botao "Convidar Freelancer"
      |
      v
    Modal: Carol digita email do freelancer
      |
      v
    Lookup: SELECT id, full_name FROM vendors
            WHERE LOWER(email) = LOWER(input) AND tenant_id = tenant LIMIT 1
      |
      +-- [encontrado] -> badge "Cadastrado", nome pre-preenchido,
      |                   vendor_id linkado ao convite na criacao
      |
      +-- [nao encontrado] -> convite gerado sem vendor_id
      |                       (form completo ao preencher)
      |
      v
    Carol seleciona funcao sugerida (opcional) e validade
      |
      v
    POST /vendor-portal/invite -> token gerado
    Carol copia link, envia por WhatsApp
    Lista de convites atualiza (status: pendente)

### 5.2 Freelancer veterano preenche (invite com vendor_id)

    Freelancer abre /vendor/[token]
      |
      v
    GET /vendor-portal/public/:token
    invite.vendor_id existe -> retorna dados do vendor + bank_accounts
      |
      v
    Formulario exibe:
      Banner "Bem-vindo de volta, [Nome]\!"
      Secao "Participacao" aberta: funcao pre-selecionada, diarias e cache vazios
      Secao "Seus dados" colapsada (todos pre-preenchidos)
      Secao "Dados bancarios" OCULTA (ver RN-05)
      |
      v
    Freelancer preenche funcao, diarias, cache
    Opcionalmente expande "Seus dados" para conferir ou atualizar
      |
      v
    POST /vendor-portal/public/:token
      Atualiza vendor se houver mudancas em "Seus dados"
      Cria job_crew_registration (funcao, diarias, cache, is_veteran=true)
      Marca token como used_at
      |
      v
    Tela de confirmacao:
      "Participacao confirmada\!"
      Nome | Funcao | Diarias | Cache/dia | Total (diarias x cache)

    Edge case -- token ja utilizado:
      "Este formulario ja foi preenchido. Obrigado\!"

    Edge case -- token expirado:
      "Este link expirou. Entre em contato com a producao."

### 5.3 Freelancer novo preenche (invite sem vendor_id)

    Freelancer abre /vendor/[token]
      |
      v
    GET /vendor-portal/public/:token
    invite.vendor_id = null -> retorna convite sem dados de vendor
    Email pre-preenchido se produtor informou ao criar o convite
      |
      v
    Formulario exibe:
      Sem banner de bem-vindo
      Secao "Participacao" aberta (funcao, diarias, cache)
      Secao "Dados Pessoais" aberta (incluindo DRT e CTPS)
      Secao "Endereco" aberta
      Secao "Dados Bancarios" colapsada
      |
      v
    POST /vendor-portal/public/:token
      Cria vendor com import_source = vendor_portal
      Cria bank_account principal (se preenchido)
      Cria job_crew_registration (is_veteran=false)
      Atualiza convite com novo vendor_id
      Marca token como used_at
      |
      v
    Tela de confirmacao (identica ao fluxo veterano)

---

## 6. Campos do Formulario

| Campo | Grupo | Obrigatorio | Veterano | Novo | Salvo em |
|-------|-------|-------------|---------|------|----------|
| Funcao no job | Participacao | SIM | Aberto | Aberto | job_crew_registrations.job_role |
| Diarias | Participacao | SIM | Aberto | Aberto | job_crew_registrations.num_days |
| Cache por diaria | Participacao | SIM | Aberto | Aberto | job_crew_registrations.daily_rate |
| Nome completo | Dados pessoais | SIM | Colapsado | Aberto | vendors.full_name |
| Tipo PF/PJ | Dados pessoais | SIM | Colapsado | Aberto | vendors.entity_type |
| CPF | Dados pessoais | Nao | Colapsado | Aberto | vendors.cpf |
| CNPJ (se PJ) | Dados pessoais | Nao | Colapsado | Aberto | vendors.cnpj |
| Razao social (se PJ) | Dados pessoais | Nao | Colapsado | Aberto | vendors.razao_social |
| RG | Dados pessoais | Nao | Colapsado | Aberto | vendors.rg |
| Data de nascimento | Dados pessoais | Nao | Colapsado | Aberto | vendors.birth_date |
| DRT | Dados pessoais | Ver PA-06 | Colapsado | Aberto | vendors.drt (campo novo) |
| CTPS | Dados pessoais | Ver PA-06 | Colapsado | Aberto | vendors.ctps (campo novo) |
| Email | Dados pessoais | SIM | Colapsado | Aberto | vendors.email |
| Telefone | Dados pessoais | Nao | Colapsado | Aberto | vendors.phone |
| CEP | Endereco | Nao | Colapsado | Aberto | vendors.zip_code |
| Rua | Endereco | Nao | Colapsado | Aberto | vendors.address_street |
| Numero | Endereco | Nao | Colapsado | Aberto | vendors.address_number |
| Complemento | Endereco | Nao | Colapsado | Aberto | vendors.address_complement |
| Bairro | Endereco | Nao | Colapsado | Aberto | vendors.address_district |
| Cidade | Endereco | Nao | Colapsado | Aberto | vendors.address_city |
| UF | Endereco | Nao | Colapsado | Aberto | vendors.address_state |
| Banco | Dados bancarios | Nao | Oculto (RN-05) | Colapsado | bank_accounts.bank_name |
| Agencia | Dados bancarios | Nao | Oculto | Colapsado | bank_accounts.agency |
| Conta | Dados bancarios | Nao | Oculto | Colapsado | bank_accounts.account_number |
| Tipo conta | Dados bancarios | Nao | Oculto | Colapsado | bank_accounts.account_type |
| Tipo chave PIX | Dados bancarios | Nao | Oculto | Colapsado | bank_accounts.pix_key_type |
| Chave PIX | Dados bancarios | Nao | Oculto | Colapsado | bank_accounts.pix_key |

---

## 7. Regras de Negocio

### RN-01: Deteccao de veterano pelo sistema, nao autodeclarada

O formulario nao pergunta "ja trabalhou com a gente?". O sistema detecta automaticamente: se o email informado ao gerar o convite ja existe em vendors do tenant, o convite e criado com vendor_id preenchido. O formulario renderiza o modo veterano com base na presenca de vendor_id.

**Rationale:** Elimina a pergunta que pode ser respondida erroneamente. O sistema tem informacao objetiva.

### RN-02: Funcao, diarias e cache sao sempre obrigatorios

Esses tres campos sao o proposito central do formulario. Backend rejeita o submit com HTTP 422 se qualquer um estiver ausente ou invalido.

- job_role: deve ser valor da lista de funcoes permitidas (lista fixa no MVP)
- num_days: inteiro positivo, minimo 1, maximo 30
- daily_rate: numero positivo, minimo 0.01

### RN-03: Dados de participacao vao para job_crew_registrations, nao para vendors

Funcao no job, diarias e cache sao dados de contexto do job -- um freelancer pode ter funcoes diferentes em jobs diferentes. Os dados globais do profissional (CPF, endereco, banco) ficam em vendors. Os dados de participacao ficam em job_crew_registrations.

**Consequencia:** o GG do job (Sprint 2) consultara job_crew_registrations, nao vendors, para pre-preencher funcao e cache nas linhas de custo.

### RN-04: DRT e CTPS vao para vendors (dados permanentes)

O numero de DRT e o numero de CTPS nao mudam de job para job. Sao salvos em vendors e reutilizados automaticamente em jobs futuros.

### RN-05: Dados bancarios de veterano nao sao exibidos por padrao

Por seguranca, o formulario de veterano nao exibe banco, agencia, conta ou chave PIX pre-preenchidos. O freelancer ve apenas "Dados bancarios cadastrados". Um botao "Atualizar dados bancarios" exibe a secao bancaria vazia para nova entrada se necessario.

**Rationale:** Evitar exposicao de dados bancarios em formulario publico sem autenticacao.

### RN-06: Token de uso unico

Apos submit bem-sucedido, token marcado como used_at. Qualquer acesso subsequente exibe "Formulario ja preenchido". O vendor_id e atualizado no convite se novo vendor foi criado.

### RN-07: Vendor nao e duplicado se veterano atualiza dados

Se o formulario de veterano e submetido com alteracoes nos dados pessoais, o vendor existente e atualizado (UPDATE). Nenhum vendor novo e criado. Deduplicacao garantida pelo vendor_id presente no convite.

### RN-08: Lookup de email e case-insensitive

Ao criar o convite com email informado, a EF executa:
SELECT id, full_name FROM vendors WHERE LOWER(email) = LOWER() AND tenant_id =  LIMIT 1.
Se encontrar match, auto-preenche vendor_id no convite.

Limitacao conhecida: se o mesmo freelancer usa emails diferentes em jobs diferentes, o sistema nao detectara como veterano. Aceitavel no MVP -- o produtor pode resolver informando o vendor_id diretamente se necessario.

---

## 8. Alteracoes no Modelo de Dados

### 8.1 vendor_invite_tokens -- ALTER TABLE

Adicionar campo para funcao sugerida pelo produtor:

    ALTER TABLE vendor_invite_tokens
      ADD COLUMN IF NOT EXISTS suggested_role TEXT;

    COMMENT ON COLUMN vendor_invite_tokens.suggested_role IS
      'Funcao sugerida pelo produtor ao gerar o convite. Pre-seleciona o dropdown no formulario.';

Nota: num_days e daily_rate NAO vao para vendor_invite_tokens -- os dados de participacao vao para job_crew_registrations ao ser submetido.

### 8.2 vendors -- ALTER TABLE

Adicionar campos de identificacao profissional:

    ALTER TABLE vendors
      ADD COLUMN IF NOT EXISTS drt  TEXT,
      ADD COLUMN IF NOT EXISTS ctps TEXT;

    COMMENT ON COLUMN vendors.drt  IS
      'Registro DRT (Delegacia Regional do Trabalho). Dado permanente do profissional.';
    COMMENT ON COLUMN vendors.ctps IS
      'Numero da Carteira de Trabalho e Previdencia Social. Dado permanente.';

Nota: rg, birth_date, zip_code e campos de endereco ja foram adicionados em vendors pela migration 20260302160000_add_vendor_invites.sql.

### 8.3 Nova tabela: job_crew_registrations

Armazena os dados de participacao por job. E a fonte de dados para o auto-match GG no Sprint 2.

    CREATE TABLE IF NOT EXISTS job_crew_registrations (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      invite_token_id UUID        REFERENCES vendor_invite_tokens(id) ON DELETE SET NULL,
      vendor_id       UUID        REFERENCES vendors(id) ON DELETE SET NULL,

      -- Dados de participacao (especificos deste job)
      full_name       TEXT        NOT NULL,
      email           TEXT,
      job_role        TEXT        NOT NULL,
      num_days        SMALLINT    NOT NULL CHECK (num_days > 0),
      daily_rate      NUMERIC(12,2) NOT NULL CHECK (daily_rate > 0),

      -- Snapshots de identificacao no momento do cadastro
      drt             TEXT,
      ctps            TEXT,

      -- Metadados
      is_veteran      BOOLEAN     NOT NULL DEFAULT false,
      notes           TEXT,

      -- Reservado para Sprint 2 (auto-match GG)
      match_status         TEXT NOT NULL DEFAULT 'pending'
        CHECK (match_status IN ('pending', 'accepted', 'rejected')),
      matched_cost_item_id UUID REFERENCES cost_items(id) ON DELETE SET NULL,
      matched_at           TIMESTAMPTZ,
      matched_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,

      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_job_crew_job
      ON job_crew_registrations(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_crew_vendor
      ON job_crew_registrations(vendor_id) WHERE vendor_id IS NOT NULL;

    ALTER TABLE job_crew_registrations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "job_crew_registrations_select"
      ON job_crew_registrations FOR SELECT
      USING (tenant_id = (SELECT get_tenant_id()));

---
## 9. Funcoes disponiveis no formulario (MVP)

Lista parcial confirmada. A lista completa depende da resposta a PA-01.

| Funcao | Categoria |
|--------|-----------|
| Diretor de Cena | Direcao |
| 1o Assistente de Direcao | Direcao |
| Diretor de Fotografia | Camera / Som |
| Operador de Camera | Camera / Som |
| Steadicam Operator | Camera / Som |
| Tecnico de Som Direto | Camera / Som |
| Fotografo Still | Camera / Som |
| Diretor de Arte | Arte / Figurino |
| Assistente de Arte | Arte / Figurino |
| Ajudante de Arte | Arte / Figurino |
| Figurinista | Arte / Figurino |
| Maquiador | Arte / Figurino |
| Produtor Executivo | Producao |
| Coordenador de Producao | Producao |
| Assistente de Producao | Producao |
| Gaffer / Chefe Eletricista | Camera / Luz |
| Maquinista | Camera / Luz |
| Motorista | Veiculos |
| Editor / Montador | Pos-Producao |
| Colorista | Pos-Producao |
| Advogado | Servicos |

No MVP a lista e implementada como constante no frontend e validada como enum no backend.
Configuravel por tenant e escopo futuro.

---
## 10. Wireframes Textuais

### 10.1 Modal Convidar Freelancer (UI do produtor)

    +-- Convidar Freelancer para o Job ----------------------------+
    |  Job: 042 -- Campanha Verao Marca ABC                        |
    |                                                               |
    |  Email do freelancer (opcional)                              |
    |  [joao.silva@email.com                                  ]    |
    |  [check] Joao Silva -- cadastrado no sistema                  |
    |                                                               |
    |  Nome (opcional)                                             |
    |  [Joao Silva (pre-preenchido)                            ]    |
    |                                                               |
    |  Funcao sugerida (opcional)                                  |
    |  [Operador de Camera                                    v]    |
    |                                                               |
    |  Validade do link                                            |
    |  [30 dias                                               v]    |
    |                                                               |
    |  [Cancelar]                         [Gerar Link]             |
    +---------------------------------------------------------------+

    Apos clicar Gerar Link:
    +-- Link gerado -----------------------------------------------+
    |  https://app.ellahos.com.br/vendor/[token]                   |
    |  [Copiar Link]   Expira em 13/04/2026                        |
    |  [Fechar]                       [Gerar outro link]            |
    +---------------------------------------------------------------+

### 10.2 Formulario publico -- veterano

    +-- ELLAHOS ---------------------------------------------------+
    |  Job: 042 -- Campanha Verao Marca ABC                        |
    |                                                               |
    |  [check] Bem-vindo de volta, Joao Silva\!                     |
    |  Seus dados estao cadastrados. Preencha apenas os dados       |
    |  de participacao neste job.                                   |
    |                                                               |
    |  ---- Participacao neste job -------------------------        |
    |  Funcao *                                                     |
    |  [Operador de Camera                                    v]    |
    |  Numero de diarias *   Cache por diaria (R$) *               |
    |  [3                ]   [1.500,00                        ]     |
    |                                                               |
    |  ---- Seus dados (pre-cadastrados) -------------------        |
    |  [v] Conferir ou atualizar meus dados                        |
    |      (campos expandidos ao clicar -- todos pre-preenchidos)  |
    |      [Atualizar dados bancarios]                              |
    |                                                               |
    |  [ Confirmar participacao ]                                   |
    |  Este link expira em 13/04/2026                              |
    +---------------------------------------------------------------+

### 10.3 Formulario publico -- novo cadastro

    +-- ELLAHOS ---------------------------------------------------+
    |  Job: 042 -- Campanha Verao Marca ABC                        |
    |  Preencha seus dados para participar deste job.              |
    |                                                               |
    |  ---- Participacao neste job -------------------------        |
    |  Funcao * | Numero de diarias * | Cache por diaria *         |
    |                                                               |
    |  ---- Dados Pessoais ---------------------------------        |
    |  Tipo: (PF) (PJ)                                             |
    |  Nome * | CPF | RG | Data de nascimento                      |
    |  DRT | CTPS | Email * | Telefone / WhatsApp                  |
    |                                                               |
    |  ---- Endereco ----------------------------------------       |
    |  CEP (lookup automatico via ViaCEP)                          |
    |  Rua | Numero | Complemento | Bairro | Cidade | UF           |
    |                                                               |
    |  ---- Dados Bancarios (opcional) ---------------------        |
    |  [v] Informar dados bancarios                                |
    |                                                               |
    |  [ Salvar e confirmar participacao ]                          |
    +---------------------------------------------------------------+

### 10.4 Tela de confirmacao (ambos os fluxos)

    +-- ELLAHOS ---------------------------------------------------+
    |  [check verde grande]                                         |
    |  Participacao confirmada\!                                    |
    |  Obrigado, Joao Silva.                                        |
    |                                                               |
    |  Job: Campanha Verao Marca ABC                               |
    |  Funcao: Operador de Camera                                  |
    |  Diarias: 3                                                  |
    |  Cache por diaria: R$ 1.500,00                               |
    |  Total: R$ 4.500,00                                          |
    |                                                               |
    |  A producao sera notificada.                                 |
    +---------------------------------------------------------------+

### 10.5 Lista de convites no job (aba Equipe)

    +-- Convites de Cadastro -----------------------------------+
    |  [+ Convidar Freelancer]                                   |
    |                                                            |
    |  Nome              Funcao         Status      Preenchido   |
    |  Joao Silva        Op. Camera     preenchido  13/03 09h   |
    |  Maria Oliveira    Assist. Camera  pendente   --           |
    |  Carlos Santos     Tecnico Som    expirado    --           |
    |                                                            |
    |  (acoes por linha: Copiar link | Revogar)                  |
    +------------------------------------------------------------+

---
## 11. Fora de Escopo (MVP)

| # | Item | Escopo |
|---|------|--------|
| 1 | Auto-sugestao de fornecedor no GG | Sprint 2 -- spec em 11-vendor-match-gg-spec.md |
| 2 | Badge de sugestao nas linhas de custo do GG | Sprint 2 -- depende tambem do GG Template (Onda 2.5) |
| 3 | Substituicao de freelancer mid-job | Onda futura -- workflow especifico necessario |
| 4 | Notificacao WhatsApp quando freelancer preenche | Onda 3 -- integracao n8n |
| 5 | PDF do comprovante de participacao | Tela de confirmacao atende no MVP; PDF e Onda 3 |
| 6 | Freelancer editar dados apos submit | Onda 3 -- requer nova logica de token |
| 7 | Portal do freelancer com historico de jobs | Onda 3 -- feature separada |
| 8 | Importacao de respostas do Google Forms existente | Migracao pontual, nao e feature de produto |
| 9 | Lista de funcoes configuravel por tenant | MVP usa lista fixa; configuravel e Onda 3 |
| 10 | Mapeamento funcao -> linha do GG | Sprint 2 -- tabela job_role_gg_mapping (ver spec 11) |

---

## 12. Dependencias

**Para implementar este MVP:**
- Nenhuma dependencia de Ondas nao concluidas
- Onda 2.5 (GG Template) NAO e pre-requisito -- o formulario funciona de forma independente
- Toda a infra de vendor_invite_tokens ja esta implementada e funcional

**Dependem deste MVP:**
- Onda 2.6 Sprint 2 (auto-sugestao GG) requer a tabela job_crew_registrations implementada
- Qualquer integracao de notificacao requer job_crew_registrations como fonte de dados

---

## 13. Perguntas Abertas

### PA-01: Lista completa de funcoes do Google Forms
O formulario atual tem aproximadamente 60 funcoes. A spec lista apenas 21 confirmadas. Para implementar o dropdown corretamente precisamos da lista exata. E possivel exportar as opcoes do Google Forms ou enviar captura de tela da lista completa?

### PA-02: Link generico por job (sem email pre-preenchido)
O produtor deve conseguir gerar um link unico para o job inteiro (sem vincular a email especifico), que qualquer freelancer pode usar? Neste caso o formulario pediria o email primeiro e faria lookup dinamico de veterano. Ou todos os links devem ser nominais (um por pessoa)?

### PA-03: Substituicao do Google Forms: imediata ou gradual?
Ao lancar este MVP, o Google Forms deve ser descontinuado imediatamente ou mantido como fallback por periodo de transicao? Se mantido, por quanto tempo?

### PA-04: PDF do comprovante e necessario no MVP?
A tela de confirmacao com dados da participacao (wireframe 10.4) atende o caso de uso imediato, ou o freelancer precisa de PDF para guardar? Se sim, PDF gerado client-side (padrao do projeto) ou enviado por email?

### PA-05: Freelancer pode corrigir dados apos submit?
Se o freelancer errou um dado (ex: cache errado), ele pode corrigir? O produtor precisa revogar o token e gerar um novo, ou existe janela de edicao automatica?

### PA-06: DRT e CTPS sao obrigatorios?
No Google Forms atual, DRT e CTPS sao campos obrigatorios ou opcionais? Para quais tipos de freelancer (tecnico de set, ator, motorista)? A spec os define como opcionais no MVP, mas precisa de confirmacao com o processo operacional real.

### PA-07: A aba Equipe no job detail ja existe?
O job detail ja tem uma aba ou secao Equipe exibindo job_team com UI completa? Se sim, o botao Convidar Freelancer sera adicionado nessa aba existente. Se nao, a aba precisa ser criada do zero. Isso impacta o esforco estimado em 1-2 dias adicionais.

### PA-08: Deteccao de veterano quando link nao tem email
Se o produtor gera link sem email e o freelancer digita um email que ja existe em vendors, o sistema deve: (A) detectar como veterano e exibir formulario reduzido, ou (B) sempre exibir formulario completo quando o link foi gerado sem email? Opcao A e melhor UX mas requer endpoint adicional de lookup sem auth.

### PA-09: Validade default do link
30 dias e o padrao correto para o ciclo de producao da Ellah? Um prazo mais curto (7 ou 14 dias) seria mais adequado para garantir dados frescos antes da filmagem?
