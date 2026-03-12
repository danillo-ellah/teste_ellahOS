# Onda 2.6 -- Auto-Sugestao de Fornecedor no GG

**Modulo:** Financeiro -- Custos do Job (GG) + Equipe/Freelancers
**Data:** 2026-03-12
**Status:** RASCUNHO
**Esforco estimado:** 6-8 dias
**Dependencia:** Onda 2.5 concluida (GG Template + Edicao Inline)

---

## 1. Visao Geral

Quando um freelancer se cadastra para participar de um job (via formulario), o sistema SUGERE o match com a linha de custo correspondente no GG. A producao aprova ou rejeita — nunca vincula automaticamente.

### Problema atual
- Freelancer preenche Google Forms externo para cada job
- Producao preenche GG manualmente, re-digitando nome, funcao, cache
- Se freelancer ja trabalhou antes, tem que re-cadastrar dados basicos
- Zero integracao entre o cadastro do freelancer e o GG

### Solucao
- Formulario nativo no EllahOS (substitui Google Forms)
- Match automatico funcao-do-formulario -> linha-do-GG
- Sugestao visual no GG com dados pre-preenchidos
- Producao aceita/rejeita/edita antes de vincular

---

## 2. Personas e Jornadas

### Freelancer (preenche formulario)
- Recebe link do job por WhatsApp/email
- Se ja trabalhou antes: so confirma participacao + funcao + cache
- Se e novo: cadastro completo (CPF, RG, endereco, dados bancarios)
- Recebe comprovante de participacao

### Produtor Executivo / Dir. Producao (aprova match)
- Abre GG do job
- Ve badges "1 fornecedor sugerido" nas linhas relevantes
- Clica, revisa dados, aceita/rejeita/edita
- Aceitar preenche vendor + unit_value + quantity automaticamente

---

## 3. User Stories

### US-01: Formulario de cadastro por job (veterano)
**Como** freelancer que ja trabalhou com a produtora,
**quero** me cadastrar para um job sem repetir meus dados,
**para** confirmar participacao rapidamente.

**Criterios de aceite:**
- [ ] Identificacao por email: se email existe em `vendors`, mostra formulario reduzido
- [ ] Formulario reduzido: nome (pre-preenchido), funcao (dropdown), diarias, cache por diaria
- [ ] Dados bancarios ja cadastrados nao sao pedidos novamente
- [ ] Gera comprovante de participacao (PDF ou tela de confirmacao)

### US-02: Formulario de cadastro por job (novo)
**Como** freelancer novo,
**quero** me cadastrar com todos os meus dados,
**para** participar do job e ficar cadastrado para futuros jobs.

**Criterios de aceite:**
- [ ] Formulario completo: nome, CPF, RG, nascimento, endereco, telefone, email
- [ ] Dados bancarios: banco, agencia, conta, tipo, PIX
- [ ] Funcao no job (dropdown), diarias, cache por diaria
- [ ] Cria registro em `vendors` + `bank_accounts`
- [ ] Gera comprovante de participacao

### US-03: Sugestao de match no GG
**Como** produtor executivo,
**quero** ver sugestoes de fornecedores nas linhas do GG,
**para** preencher o GG sem digitar manualmente.

**Criterios de aceite:**
- [ ] Badge visual na linha do GG: "1 sugestao" (amarelo)
- [ ] Clicar no badge abre popover com dados do freelancer
- [ ] Popover mostra: nome, funcao, cache/diaria, qtd diarias, email
- [ ] Botao "Aceitar": preenche vendor_id, unit_value, quantity na linha
- [ ] Botao "Rejeitar": descarta sugestao (nao aparece mais)
- [ ] Botao "Editar": permite ajustar valores antes de aceitar
- [ ] NUNCA vincula automaticamente — producao sempre da o OK

### US-04: Listagem de cadastros pendentes
**Como** produtor executivo,
**quero** ver todos os freelancers cadastrados no job,
**para** saber quem ja preencheu e quem falta.

**Criterios de aceite:**
- [ ] Tela/secao com lista de freelancers cadastrados no job
- [ ] Status: pendente (cadastrou mas nao foi vinculado no GG), vinculado, rejeitado
- [ ] Filtro por funcao
- [ ] Acao rapida: vincular ao GG direto da lista

### US-05: Substituicao de freelancer mid-job
**Como** diretor de producao,
**quero** substituir um freelancer durante o job,
**para** manter o GG atualizado quando ha trocas.

**Criterios de aceite:**
- [ ] Na linha do GG, opcao "Substituir fornecedor"
- [ ] Mostra lista de freelancers cadastrados no job (mesma funcao)
- [ ] Ou permite buscar fornecedor existente (autocomplete atual)
- [ ] Historico: registra quem foi substituido e quando

---

## 4. Regras de Negocio

### RN-01: Match por funcao
- O match e feito pela FUNCAO informada no formulario
- Cada funcao do formulario mapeia para uma ou mais linhas do template GG
- Se ha ambiguidade (funcao mapeia para 2+ linhas), o sistema sugere em todas
- Producao escolhe em qual linha vincular

### RN-02: Sugestao, nunca vinculo automatico
- O sistema SUGERE o match
- A producao ACEITA, REJEITA ou EDITA
- Nunca preenche automaticamente sem aprovacao humana

### RN-03: Veterano vs Novo
- Veterano: email ja existe em `vendors` -> formulario reduzido
- Novo: cadastro completo -> cria vendor + bank_account
- Apos primeiro cadastro, vira veterano em todos os jobs futuros

### RN-04: Cache e diarias
- Formulario coleta: cache POR DIARIA + numero de diarias
- No GG: unit_value = cache/diaria, quantity = diarias
- total_value = unit_value * quantity (calculado pelo banco)

### RN-05: Um freelancer por linha
- Cada linha do GG tem no maximo 1 fornecedor vinculado
- Se 2 freelancers se cadastram para a mesma funcao, ambos aparecem como sugestao
- Producao escolhe qual vincular (ou vincula em linhas diferentes)

---

## 5. Mapeamento Funcao -> Linha do GG

O formulario atual tem ~60 funcoes. O template GG tem ~140 linhas em 16 categorias.
Mapeamento parcial (exemplos):

| Funcao no Forms | Categoria GG | Linha GG |
|-----------------|-------------|----------|
| Diretor de Cena | 05 - Dir. Cena/Foto/Som | Diretor de Cena |
| 1o Assistente de Direcao | 05 - Dir. Cena/Foto/Som | 1o Assistente de Direcao |
| Diretor de Fotografia | 05 - Dir. Cena/Foto/Som | Diretor de Fotografia |
| Operador de Camera | 05 - Dir. Cena/Foto/Som | Operador de Camera |
| Tecnico de Som | 05 - Dir. Cena/Foto/Som | Tecnico de Som Direto |
| Eletricista Chefe | 09 - Camera/Luz/Infra | Chefe Eletricista |
| Maquinista | 09 - Camera/Luz/Infra | Maquinista |
| Diretor de Arte | 04 - Dir. Arte/Figurino | Diretor de Arte |
| Produtor Executivo | 06 - Producao | Produtor Executivo |
| Coordenador de Producao | 06 - Producao | Coordenador |
| Maquiador | 04 - Dir. Arte/Figurino | Maquiador(a) |
| Figurinista | 04 - Dir. Arte/Figurino | Figurinista |
| Editor / Montador | 13 - Pos Producao | Montador |
| Motorista | 07 - Veiculos | Motorista |
| Fotografo Still | 12 - Still/Bastidores | Fotografo Still |

**Nota:** O mapeamento completo sera mantido em tabela no banco (`job_role_gg_mapping`) para ser configuravel por tenant.

---

## 6. Wireframes Textuais

### 6.1 Formulario de cadastro (veterano)
```
+------------------------------------------+
|  Cadastro no Job: 038 Quer Fazer Senac   |
|                                          |
|  Bem-vindo de volta, Joao Silva!         |
|  Seus dados ja estao cadastrados.        |
|                                          |
|  Funcao neste job:  [Operador Camera v]  |
|  Diarias:           [3              ]    |
|  Cache por diaria:  [R$ 1.500,00   ]    |
|                                          |
|  [ ] Atualizar dados bancarios           |
|                                          |
|  [Confirmar Participacao]                |
+------------------------------------------+
```

### 6.2 Badge de sugestao no GG
```
| # | Descricao          | Fornecedor       | Valor Unit. | Qtd |
|---|-------------------|------------------|-------------|-----|
| 5.3 | Operador Camera | [!1 sugestao]    | -           | -   |
| 5.4 | Assist. Camera  | Maria Silva      | R$ 800      | 3   |
```

### 6.3 Popover de sugestao
```
+------------------------------------------+
|  Sugestao de fornecedor                  |
|                                          |
|  Joao Silva                              |
|  Funcao: Operador de Camera              |
|  Cache: R$ 1.500,00 / diaria            |
|  Diarias: 3                              |
|  Email: joao@email.com                   |
|  PIX: joao@email.com                     |
|                                          |
|  [Rejeitar]  [Editar]  [Aceitar]        |
+------------------------------------------+
```

---

## 7. Modelo de Dados

### Nova tabela: job_crew_registrations
Armazena os cadastros de freelancers por job (vindos do formulario).

```sql
CREATE TABLE job_crew_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  vendor_id UUID REFERENCES vendors(id),
  -- Dados do formulario
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_role TEXT NOT NULL,
  daily_rate NUMERIC(12,2) NOT NULL,
  num_days INTEGER NOT NULL DEFAULT 1,
  -- Match com GG
  matched_cost_item_id UUID REFERENCES cost_items(id),
  match_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (match_status IN ('pending', 'accepted', 'rejected')),
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES profiles(id),
  -- Metadata
  is_veteran BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Nova tabela: job_role_gg_mapping
Mapeamento configuravel de funcao -> linha do template GG.

```sql
CREATE TABLE job_role_gg_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role_name TEXT NOT NULL,
  gg_item_number INTEGER NOT NULL,
  gg_sub_item_number INTEGER NOT NULL,
  gg_service_description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, role_name, gg_item_number, gg_sub_item_number)
);
```

---

## 8. Fora de Escopo (Onda 2.6)

- Notificacao por WhatsApp quando freelancer se cadastra (Onda 3)
- Assinatura digital do comprovante via DocuSeal (Onda 3)
- Portal do freelancer com historico de jobs (Onda 3)
- Importacao automatica de respostas do Google Forms existente (migrar depois)
- Gestao de contratos/termos de uso de imagem

---

## 9. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Freelancer nao preenche formulario | GG fica sem sugestoes | Manter autocomplete manual como fallback |
| Funcao nao mapeia para nenhuma linha | Sugestao fica orfã | Mostrar em secao "Sem match" para producao alocar |
| 2 freelancers mesma funcao | Ambiguidade | Mostrar ambos como sugestao, producao escolhe |
| Formulario publico sem auth | Spam/abuso | Rate limit + validacao CPF/email |

---

## 10. Definicao de Pronto (DoD)

- [ ] Formulario nativo funcional (veterano + novo)
- [ ] Dados salvos em job_crew_registrations
- [ ] Badge de sugestao visivel no GG
- [ ] Aceitar/Rejeitar funcional
- [ ] Aceitar preenche vendor + unit_value + quantity
- [ ] Mapeamento funcao->GG configuravel por tenant
- [ ] Testes E2E cobrindo fluxo completo

---

## 11. Fases de Entrega

### Sprint 1: Backend + Formulario (3-4 dias)
- Migration: job_crew_registrations + job_role_gg_mapping
- EF: formulario de cadastro (POST publico com rate limit)
- EF: listar registros por job
- Frontend: formulario publico (link compartilhavel)
- Seed: mapeamento funcao->GG padrao

### Sprint 2: Match + GG Integration (3-4 dias)
- EF: sugerir matches (query registrations x mapping x cost_items)
- Frontend: badge de sugestao no GG (CostItemsTable)
- Frontend: popover aceitar/rejeitar/editar
- Frontend: tela de cadastros pendentes
- Teste E2E completo

---

## 12. Perguntas Abertas

1. O formulario deve ser 100% publico (link aberto) ou exigir algum token/codigo do job?
2. Manter Google Forms como fallback durante transicao, ou migrar de vez?
3. O comprovante de participacao deve ser PDF ou tela de confirmacao?
4. Permitir que freelancer edite seus dados apos cadastro (ate X horas antes da filmagem)?
