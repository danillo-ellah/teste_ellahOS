# ADR-011: Export CSV server-side na Edge Function

**Data:** 20/02/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 7 -- Relatorios com export

---

## Contexto

Os relatorios da Fase 7 precisam de export para CSV. Duas abordagens possiveis:

1. **Client-side:** Frontend busca dados via API (JSON), converte para CSV no browser, gera download
2. **Server-side:** Edge Function gera o CSV e retorna como blob com Content-Type text/csv

O volume de dados de um relatorio pode variar de 50 a 5.000+ linhas (ex: todas as transacoes financeiras de 12 meses).

---

## Decisao

Gerar CSV na Edge Function (server-side) e retornar como blob.

O endpoint `POST /reports/export` recebe os parametros do relatorio (tipo, periodo, filtros) e retorna o CSV pronto com headers:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="relatorio-financeiro-2026-02.csv"
```

O frontend faz o download via `fetch()` + `URL.createObjectURL(blob)`.

---

## Consequencias

### Positivas
- **Formato consistente:** O servidor controla a formatacao (separador, encoding, BOM UTF-8)
- **Performance:** Nao precisa transferir JSON grande para o frontend e converter (double payload evitado)
- **Extensivel:** Facil adicionar novos formatos no futuro (XLSX via lib Deno)
- **Sem dependencia no frontend:** Nao precisa instalar lib de CSV no bundle do Next.js
- **Dados vem direto do banco:** A Edge Function acessa os dados via RPC, sem round-trip extra

### Negativas
- Edge Function precisa gerar string CSV (complexidade adicional no backend)
- Response nao e JSON padrao (foge do pattern { data, meta, error })
- Timeout da Edge Function (max 60s) limita o tamanho do CSV

### Mitigacoes
- Helper `generateCSV(rows, columns)` compartilhado na Edge Function
- Limite de periodo de 24 meses previne queries excessivas
- Se precisar de XLSX, considerar gerar no futuro via lib Deno (ex: sheetjs)

---

## Alternativas Consideradas

### A1: Client-side com papaparse ou similar
**Rejeitada.** Adiciona dependencia no bundle do frontend. Para relatorios grandes (> 2000 rows), primeiro temos que transferir um JSON grande e depois converter -- double payload. Alem disso, o frontend dependeria de ter todos os dados carregados (paginacao complicaria).

### A2: Upload do CSV para Supabase Storage e retornar URL
**Rejeitada.** Over-engineering. Adiciona complexidade de gerenciamento de arquivos temporarios, cleanup, e um round-trip adicional. Para CSVs < 5MB, retornar inline e suficiente.

### A3: Google Sheets direto
**Rejeitada para v1.** Interessante para o futuro, mas requer integracao Google Sheets API adicional que nao existe. CSV e o formato universal e suficiente.

---

## Referencias

- docs/architecture/fase-7-architecture.md (secao 3.2)
