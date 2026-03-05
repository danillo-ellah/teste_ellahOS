# ADR-025: Telegram Bot como Canal de Notificacao e Comandos

**Status:** Proposto
**Data:** 2026-03-04
**Autor:** Tech Lead

## Contexto

O ELLAHOS usa Z-API (WhatsApp) como canal de notificacoes, custando R$ 100/mes. O usuario precisa de um canal gratuito e bidirecional para comunicacao com o sistema, incluindo comandos interativos, aprovacoes inline e integracao com o copilot ELLA.

O Telegram Bot API e 100% gratuito, sem limites praticos de mensagens (30/s), suporta inline keyboards (botoes clicaveis), markdown/HTML rico, e webhooks nativos -- tudo compativel com Supabase Edge Functions.

## Decisao

Implementar integracao com Telegram Bot API como terceiro provider de mensageria, mantendo WhatsApp (Z-API) como canal principal para alcance no Brasil.

Detalhes:
1. **Bot unico compartilhado** entre tenants (chat_id vinculado ao tenant via `telegram_chats`)
2. **Webhook** recebido em Edge Function `telegram-bot` (nao polling)
3. **HTML** como parse_mode default (mais previsivel que MarkdownV2)
4. **Tabela `telegram_chats`** para vincular chat_id ao profile (via deep link + token temporario)
5. **Campo `notification_channel`** em profiles para escolha do usuario (whatsapp/telegram/both)
6. **Inline keyboards** para aprovacoes de NF, acoes rapidas
7. **Copilot ELLA** via texto livre no chat (reutiliza Groq API)

## Consequencias

**Positivas:**
- Canal gratuito de notificacoes (economia de R$ 100/mes se migrar 100% para Telegram)
- Aprovacoes inline sem sair do app de mensagens
- Copilot ELLA acessivel via Telegram (UX natural de chat)
- API estavel e bem documentada
- Sem dependencia de servico pago intermediario

**Negativas:**
- Nem todos os usuarios brasileiros tem Telegram (~30% vs ~99% WhatsApp)
- Mais um canal para manter (code, testes, monitoring)
- Vinculacao manual necessaria (deep link + /start)
- Rate limiter em memoria (reset no cold start) -- aceitavel para o volume esperado

## Alternativas Consideradas

1. **Substituir WhatsApp por Telegram completamente:** Descartado. WhatsApp tem 99% de adocao no Brasil. Telegram e complementar, nao substituto.

2. **Usar lib externa (grammy, telegraf):** Descartado. A API do Telegram e simples o suficiente para usar `fetch` diretamente, sem adicionar dependencias ao Deno runtime das Edge Functions.

3. **Bot por tenant:** Descartado. Complexidade desnecessaria. Bot unico com routing por `telegram_chats.tenant_id` e suficiente. Tenant que quiser bot proprio pode configurar token no futuro.

4. **Polling via VPS:** Descartado. Requer processo long-running. Webhook em Edge Function e serverless e zero custo.
