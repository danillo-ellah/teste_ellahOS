# ADR-010: Rate limiting no endpoint publico via contagem de logs

**Data:** 19/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 6 -- Endpoint publico de aprovacao

---

## Contexto

O endpoint `POST /approvals/public/:token/respond` e publico (sem autenticacao). Qualquer pessoa com o token pode enviar uma resposta. Precisamos de rate limiting para evitar abuse (spam, brute force, bots).

Opcoes de rate limiting:
1. Redis/Upstash (servico externo)
2. Cloudflare rate limiting (WAF)
3. In-memory counter na Edge Function (volatil)
4. Contagem de registros existentes no banco

O projeto roda em Supabase Edge Functions (Deno) sem Cloudflare na frente e sem Redis configurado.

---

## Decisao

Implementar rate limiting via contagem de registros em `approval_logs` na ultima hora.

Antes de processar a resposta, contar quantos logs existem para aquele `approval_request_id` com `created_at >= now() - 1 hora`. Se >= 10, retornar HTTP 429 (Too Many Requests).

```typescript
const { count } = await client
  .from('approval_logs')
  .select('id', { count: 'exact', head: true })
  .eq('approval_request_id', requestId)
  .gte('created_at', new Date(Date.now() - 3600000).toISOString());

if (count && count >= 10) {
  return error('RATE_LIMITED', 'Muitas tentativas. Tente novamente em 1 hora.', 429);
}
```

---

## Consequencias

### Positivas
- Zero dependencias externas (sem Redis, sem Upstash, sem Cloudflare)
- Reutiliza tabela que ja existe (`approval_logs`)
- Persiste entre cold starts (dados no banco, nao em memoria)
- Facil de ajustar limites (mudar o numero 10 ou o intervalo de 1 hora)

### Negativas
- Uma query adicional por request no endpoint publico (~2ms)
- Nao e rate limiting por IP (e por token) -- um atacante poderia usar diferentes tokens
- Nao protege contra DDoS volumetrico (mas UUID tokens sao praticamente impossiveis de adivinhar)

### Mitigacoes
- Token UUID v4 tem 2^122 combinacoes -- brute force e inviavel
- A aprovacao muda de status apos primeira resposta, tornando o token inutil para requests subsequentes
- Se precisar de rate limiting por IP no futuro, migrar para Upstash Redis (trivial)

---

## Alternativas Consideradas

### A1: Upstash Redis
**Rejeitada para v1.** Adiciona dependencia externa, custo mensal, configuracao de SDK. Over-engineering para o volume esperado (<100 aprovacoes por mes por tenant).

### A2: Cloudflare rate limiting
**Rejeitada.** As Edge Functions do Supabase nao passam por Cloudflare (o dominio supabase.co tem seu proprio CDN). Teriamos que configurar custom domain com Cloudflare proxy -- complexidade excessiva.

### A3: In-memory Map na Edge Function
**Rejeitada.** Edge Functions do Supabase tem cold start e podem ter multiplas instancias. Counter in-memory nao persiste entre cold starts e nao e compartilhado entre instancias.

### A4: Sem rate limiting
**Rejeitada.** Mesmo com baixo risco, e boa pratica ter alguma protecao. O custo de implementacao e minimo (5 linhas de codigo).

---

## Referencias

- docs/architecture/fase-6-equipe-aprovacoes.md (secao 3.2)
- docs/specs/fase-6-equipe-aprovacoes.md (secao 9.2, seguranca do endpoint publico)
