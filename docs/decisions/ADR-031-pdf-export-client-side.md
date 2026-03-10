# ADR-031: Export PDF client-side com jsPDF (sem html-to-image)

**Data:** 10/03/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Feature "Exportar PDF" para 3 documentos: Orcamento Comercial, Callsheet, Relatorio de Set

---

## Contexto

O ELLAHOS precisa gerar 3 tipos de documento PDF para envio externo (clientes, equipe):

1. **Orcamento Comercial** -- resumo do job com tabela de custos agrupada por categoria, totais e margem
2. **Callsheet** -- ficha de diaria de filmagem com equipe, locacao, horarios, contatos
3. **Relatorio de Set** -- resumo diario com cenas, ocorrencias, presenca, fotos

Dependencias ja instaladas: `jspdf@4.2.0` e `html-to-image@1.11.13`.

Abordagens possiveis:
- **A) jsPDF direto** -- monta o PDF programaticamente com coordenadas, tabelas, textos
- **B) html-to-image + jsPDF** -- renderiza HTML em imagem, cola no PDF como bitmap
- **C) Server-side** -- Edge Function gera PDF (Deno nao tem lib madura para isso)
- **D) jsPDF + jspdf-autotable** -- plugin especializado para tabelas no jsPDF

---

## Decisao

Usar **jsPDF programatico (Abordagem A)** com helper de tabela manual (sem plugin jspdf-autotable).

Justificativa:
- Os PDFs sao **estruturados e tabulares**, nao documentos visuais complexos
- html-to-image gera bitmaps (rasterizado), o que resulta em PDFs pesados, sem texto selecionavel, e com qualidade variavel entre devices
- jsPDF programatico gera PDF vetorial, leve (~50-100KB), com texto selecionavel e zoom infinito
- Nao precisa de plugin externo (autotable) -- uma funcao helper de ~80 linhas resolve as tabelas simples que precisamos
- Os dados ja estao carregados na pagina (hooks existentes), entao nao precisa de chamada API extra
- Client-side evita carga no servidor e funciona offline

Estrutura de arquivos:

```
frontend/src/lib/pdf/
  pdf-core.ts        -- helpers compartilhados (header, footer, tabela, formatacao)
  budget-pdf.ts      -- gerador: Orcamento Comercial
  callsheet-pdf.ts   -- gerador: Callsheet de Diaria
  set-report-pdf.ts  -- gerador: Relatorio de Set
```

---

## Consequencias

### Positivas
- PDF vetorial, leve, texto selecionavel
- Zero dependencia nova (jsPDF ja instalado, html-to-image NAO sera usado)
- Funciona offline (dados ja carregados)
- Formatacao consistente entre navegadores e dispositivos
- Facil de customizar layout por tenant no futuro (logo, cores)
- Testavel: funcoes puras que recebem dados e retornam blob

### Negativas
- Layout programatico e mais trabalhoso que HTML (coordenadas X/Y manuais)
- Fontes customizadas requerem embedding (usaremos Helvetica built-in por ora)
- Imagens (logo, fotos do relatorio) precisam ser convertidas para base64

### Mitigacoes
- Helper `drawTable()` abstrai a complexidade de posicionamento de tabelas
- Helper `addWrappedText()` abstrai quebra de linha automatica
- Logo pode ser SVG embutido ou base64 string hardcoded
- Fotos do relatorio de set: incluir apenas thumbnails (tamanho reduzido)

---

## Alternativas Consideradas

### A2: html-to-image + jsPDF
**Rejeitada.** Gera PDF rasterizado (bitmap). Problemas: arquivo grande (500KB-2MB), texto nao selecionavel, qualidade variavel por resolucao de tela, nao funciona bem com dark mode. Para documentos estruturados/tabulares, PDF vetorial e superior.

### A3: Server-side (Edge Function)
**Rejeitada.** Deno nao tem lib madura para geracao de PDF. Teria que usar puppeteer/chromium (pesado, 200MB+) ou lib experimental. Os dados ja estao no frontend -- nao faz sentido enviar para o servidor gerar e devolver.

### A4: jspdf-autotable (plugin)
**Rejeitada.** Adiciona dependencia extra (~40KB gzip). Nossas tabelas sao simples o suficiente para um helper manual de ~80 linhas. Autotable e overkill e traz complexidade de configuracao/estilo que nao precisamos.

### A5: React-pdf (@react-pdf/renderer)
**Rejeitada.** Adiciona ~120KB ao bundle. Usa componentes React para layout, o que e elegante mas overhead significativo para 3 documentos simples. Mais indicado para apps que geram muitos tipos de documento.

---

## Referencias

- ADR-011: CSV export server-side (decisao diferente porque CSV e texto puro e leve no servidor)
- jsPDF docs: https://github.com/parallax/jsPDF
- Tipos existentes: `CostItem`, `JobDetail`, `DiaryEntry`, `JobShootingDate`, `JobTeamMember`
