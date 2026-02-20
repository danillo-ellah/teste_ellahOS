# ADR-013: Portal do cliente como entidade separada das aprovacoes

**Data:** 20/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 7 -- Portal do cliente para acompanhamento de jobs

---

## Contexto

A Fase 6 implementou um sistema de aprovacoes com acesso publico via token UUID:
- Tabela `approval_requests` com campo `token` (UUID)
- Pagina publica `/approve/[token]` (CSR, sem auth)
- Endpoint publico `GET /approvals/public/:token`
- Cada token e de uso unico (uma aprovacao especifica) com validade de 30 dias

A Fase 7 precisa de um portal do cliente para acompanhamento de jobs com:
- Timeline de eventos do job
- Documentos compartilhados
- Aprovacoes pendentes
- Mensagens bidirecionais
- Acesso persistente (nao de uso unico)
- Permissoes granulares (timeline, documentos, aprovacoes, mensagens)

A questao: reutilizar `approval_requests` como mecanismo de acesso ao portal ou criar entidade separada?

---

## Decisao

Criar tabela separada `client_portal_sessions` para gerenciar acesso ao portal. O portal REUTILIZA:
- O **pattern visual** da pagina publica (PublicLayout, CSR, sem auth)
- Os **helpers de API** publica (apiPublicGet, apiPublicMutate)
- Os **links de aprovacao** existentes (portal exibe links para /approve/[token] quando ha aprovacoes pendentes)

O portal NAO reutiliza:
- A **tabela** approval_requests (semanticas diferentes)
- O **endpoint** /approvals/public/:token (scopo diferente)
- A **logica de expiracao** (portal pode nao expirar)

---

## Consequencias

### Positivas
- **Separacao de responsabilidades:** Aprovacao e uma acao pontual (aprovar/rejeitar). Portal e uma sessao de acompanhamento contínuo. Tabelas separadas refletem semanticas separadas.
- **Permissoes granulares:** `client_portal_sessions.permissions` permite controlar o que o cliente ve (timeline sim, documentos nao, etc). Impossivel em approval_requests sem adicionar colunas que nao fazem sentido para aprovacoes.
- **Mensagens:** O portal tem canal bidirecional de mensagens (tabela client_portal_messages). Isso nao existe no fluxo de aprovacao e nao faria sentido adicioná-lo.
- **Persistencia:** Portal pode ter sessao sem data de expiracao. Approval requests TEM que expirar (seguranca).
- **Tracking:** `last_accessed_at` permite saber quando o cliente acessou o portal pela ultima vez. Irrelevante para aprovacoes.
- **Escalabilidade:** No futuro, o portal pode evoluir para incluir upload de arquivos, formularios de feedback, etc. -- coisas que nao tem nada a ver com aprovacao.

### Negativas
- **Mais uma tabela:** Adiciona 2 tabelas (sessions + messages) ao schema (total: 32 tabelas)
- **Mais uma Edge Function:** `client-portal` com 8 handlers e uma funcao nova a manter
- **Dois sistemas de token publico:** approval_requests.token E client_portal_sessions.token (potencial confusao)
- **Dois endpoints publicos:** /approvals/public/:token E /client-portal/public/:token

### Mitigacoes
- Documentacao clara distinguindo os dois sistemas
- Frontend usa rotas diferentes (/approve/[token] vs /portal/[token]) -- sem ambiguidade
- No portal, as aprovacoes pendentes exibem link para /approve/[token] -- integracao natural

---

## Alternativas Consideradas

### A1: Reutilizar approval_requests como token de acesso ao portal
**Rejeitada.** Teriamos que:
- Adicionar colunas de permissoes em approval_requests (nao fazem sentido para aprovacoes)
- Remover a logica de "uso unico" (aprovacao muda de status apos resposta, mas portal precisa continuar ativo)
- Adicionar tabela de mensagens com FK para approval_requests (semanticamente incorreto)
- Criar approval_request "fantasma" (sem aprovacao real, apenas para gerar token) -- hack
- Alterar RPC get_portal_timeline para funcionar com approval_request_id

Isso contaminaria a tabela de aprovacoes com dados que nao sao aprovacoes.

### A2: Tabela generica "public_tokens" para ambos os sistemas
**Rejeitada.** Uma tabela generica com type='approval' | type='portal' perderia as constraints e validacoes especificas de cada dominio. CHECK constraints, required fields e RLS ficariam complexos demais com condicionais por type.

### A3: Portal como extensao da tabela contacts
**Rejeitada.** Associar o acesso ao contato em vez do job nao faz sentido. O portal e por job (o cliente acompanha um job especifico). Um mesmo contato pode ter acesso a multiplos jobs com permissoes diferentes.

---

## Referencias

- docs/architecture/fase-7-architecture.md (secao 7.3)
- docs/architecture/fase-6-equipe-aprovacoes.md (sistema de aprovacoes existente)
- docs/decisions/ADR-009-public-approval-page-csr.md (pattern de pagina publica)
- docs/decisions/ADR-010-public-endpoint-rate-limiting.md (pattern de rate limiting)
