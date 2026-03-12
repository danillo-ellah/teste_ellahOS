# ADR-033: Codigo ORC com tabela de sequencia dedicada

**Data:** 11/03/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Onda 2.4 -- Orcamentos pre-Job

## Contexto

Orcamentos pre-job precisam de codigo unico no formato ORC-YYYY-XXXX (ex: ORC-2026-0001). O codigo e referenciado em emails, conversas com clientes e documentos externos. Deve ser atomico (sem race conditions), imutavel apos geracao e reiniciar por ano.

O sistema ja possui `job_code_sequences` com INSERT ON CONFLICT para gerar codigos de job atomicamente.

## Decisao

Criar tabela dedicada `orc_code_sequences` com chave UNIQUE (tenant_id, year) e INSERT ON CONFLICT para incremento atomico. Gerar codigo via RPC `upsert_orc_code_sequence(p_tenant_id, p_year)`. O codigo e armazenado em dois locais:
- `opportunity_budget_versions.orc_code` -- source of truth, gerado na v1
- `opportunities.orc_code` -- copia para consulta rapida no Kanban (evita JOIN)

## Consequencias

### Positivas

- Zero race conditions (INSERT ON CONFLICT e atomico)
- Sequencia reinicia por ano conforme formato ORC-YYYY-XXXX
- Padrao comprovado (identico ao job_code_sequences)
- Multi-tenant ready (particionado por tenant_id + year)

### Negativas

- Mais uma tabela auxiliar (baixo impacto)
- Duplicacao do orc_code (versao + oportunidade), mitigada pela imutabilidade

## Alternativas consideradas

**Sequence PostgreSQL nativa (CREATE SEQUENCE):**
- NAO suporta particionamento por tenant + ano
- NAO funciona com multi-tenant

**UUID como codigo:**
- Nao legivel para humanos
- Impossivel referenciar em comunicacao verbal/email

**Codigo baseado em timestamp:**
- Colisoes possiveis em requests simultaneos
- NAO sequencial (impossivel saber a ordem)
