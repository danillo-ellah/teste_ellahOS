# Relatorio de Auditoria de Seguranca - ELLAHOS

**Data:** 2026-02-17  
**Auditor:** Security Engineer - ELLAHOS  
**Supabase Project:** etvapcxesaxhsvzgaane  
**Escopo:** Schema completo do banco de dados (Fase 1 - modulo Jobs)  
**Tabelas auditadas:** tenants, profiles, clients, agencies, contacts, people, jobs, job_team, job_deliverables, job_history, job_budgets, job_files

---

## RESUMO EXECUTIVO

O schema da Fase 1 do ELLAHOS apresenta uma base solida de multi-tenancy com RLS habilitado em todas as tabelas. Foram identificados **2 achados CRITICOS**, **4 ALTOS**, **6 MEDIOS** e **4 BAIXOS** que precisam ser corrigidos antes de entrar em producao ou avancar para a Fase 2.

O achado mais grave e uma policy RLS com bug de auto-referencia que concede acesso administrativo a qualquer usuario autenticado para gerenciar perfis de QUALQUER TENANT sem verificacao real de isolamento. O segundo critico e uma race condition na geracao de codigos de job que causa duplicacao de job_code em ambiente de producao com concorrencia.

---

## CRITICOS (corrigir ANTES de ir para Fase 2)

---

### [CRITICO-001] Policy "Admins manage profiles" com bug de auto-referencia - cross-tenant privilege escalation

**Tabela:** profiles  
**Policy:** "Admins manage profiles" (comando ALL)  
**Classificacao:** CRITICO  
**OWASP:** A01 - Broken Access Control  

**Descricao do problema:**

A policy atual para administracao de profiles e:



A expressao  compara  com ela mesma. Esta expressao e sempre  para qualquer linha nao-nula. Isso significa que a policy efetivamente se reduz a:



**Impacto real:**

Qualquer usuario cujo proprio profile tenha  ou  pode executar ALL (SELECT, INSERT, UPDATE, DELETE) em **TODOS os profiles de TODOS os tenants**, nao apenas do seu proprio tenant. Isso e uma violacao completa do isolamento multi-tenant.

Cenario de ataque:
1. Atacante cria conta no ELLAHOS em qualquer tenant
2. Atacante obtem role admin no proprio profile (via bug de onboarding, acesso direto ao Supabase Dashboard, ou exploracao de outra vulnerabilidade)
3. Atacante executa UPDATE em profiles de outros tenants, alterando roles, emails ou dados de acesso
4. Atacante escala privilegios em qualquer tenant do sistema, comprometendo isolamento completo

**Correcao necessaria:**



Esta versao correta: (a) verifica o role do usuario autenticado via auth.uid(); (b) garante que o admin so acessa profiles do SEU proprio tenant via ; (c) elimina o cross-tenant access completamente.

**Prioridade:** Corrigir imediatamente, antes de qualquer deploy em producao.

---

