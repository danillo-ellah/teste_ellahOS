# Resumo Executivo - Leitura Completa do Drive

**Data:** 2026-03-05
**Metodo:** JWT RS256 via Service Account + Sheets API + Drive export API

## Arquivos Lidos

### Planilhas GG (Gastos Gerais) - 5 arquivos
- **GG_038_Quer Fazer? Senac!_SENAC SP** (GG_038_Senac): 8 abas, 704 linhas
- **GG_040_PURA_UNUM** (GG_040_PURA_UNUM): 8 abas, 700 linhas
- **GG_033_ILHAPURA_ORNARE_UNUM** (GG_033_ILHAPURA): 8 abas, 744 linhas
- **GG_037_BAHIA_REGIONAIS_PAC_POSICIONAMENTO_PROPEG** (GG_037_BAHIA): 8 abas, 701 linhas
- **GG_036_Simulacao de emergencia_Mene Portella** (GG_036_Simulacao): 8 abas, 700 linhas

### Planilha Master - 1 arquivo
- **CRIACAO PASTA E CONTROLE DE JOB**: 13 abas, 420 linhas

### Cadastros de Elenco - 3 arquivos
- **CADASTRO_ELENCO_038_Quer Fazer? Senac!_SENAC SP** (ELENCO_038): 4 abas, 439 linhas
- **CADASTRO_ELENCO_040_PURA_UNUM** (ELENCO_040): 3 abas, 385 linhas
- **CADASTRO_ELENCO_037_BAHIA_REGIONAIS_POSICIONAMENTO_PROPEG** (ELENCO_037): 4 abas, 385 linhas

### Cronogramas - 3 arquivos
- **CRONOGRAMA 037_BAHIA_REGIONAIS_POSICIONAMENTO_PROPEG** (CRONO_037): 3 abas, 91 linhas
- **CRONOGRAMA 039_FIM DE ANO | LINHA SIMPATIA_DEBRITO** (CRONO_039): 3 abas, 60 linhas
- **CRONOGRAMA 036_Simulacao de emergencia_Mene Portella** (CRONO_036): 3 abas, 61 linhas

### Google Docs - 5 arquivos (via Drive export text/plain)
- **1 - MODELO PRINCIPAL** (MODELO_PRINCIPAL): 23.425 chars - Contrato completo com placeholders ({{NOME_AGENCIA_PUBLI}}, etc)
- **CONTRATO_DE_PRODUCAO_ELLAH_FILMES_OFICIAL** (CONTRATO_PRODUCAO_OFICIAL): 4.323 chars - Template de contrato de producao
- **Aprovacao_interna** (Aprovacao_interna): 3.493 chars - Formulario de aprovacao interna
- **Pedido de Ancine** (Pedido_de_Ancine): 1.268 chars - Template para pedido Ancine
- **Carta_Orcamento_040_PURA_UNUM** (Carta_Orcamento_040): 882 chars - Carta orcamento do job 040

## Totais
- **Planilhas lidas:** 12
- **Total abas:** 73
- **Total linhas de dados:** 5.390
- **Docs lidos:** 5
- **Total chars em docs:** 33.391
- **Erros:** 0

## Nota Tecnica
A Google Docs API nao esta habilitada no projeto 402381134781. Os docs foram lidos com sucesso via
endpoint alternativo `drive/v3/files/{id}/export?mimeType=text/plain` (Drive API).
Para habilitar a Docs API no futuro: https://console.developers.google.com/apis/api/docs.googleapis.com/overview?project=402381134781

## Gaps e Oportunidades Identificados

### Estrutura das GGs (abas encontradas)
Todas as 5 GGs possuem a mesma estrutura padronizada com 8 abas:
- **OC** - Orcamento (categorias, valores orcados)
- **CUSTOS_REAIS** - Despesas reais executadas
- **EQUIPE** - Equipe alocada no job
- **PRODUCAO** - Dados de producao
- **DEPOSITOS** - Controle de depositos/pagamentos
- **PEDIDO EMISSAO NF** - Notas fiscais
- **CALENDARIO** - Datas de filmagem e entregas
- **DASHBOARD** - Resumo financeiro com metricas

### Estrutura dos Cronogramas (3 abas padrao)
- **Calendario** - Visao mensal com marcos
- **Processo** - Etapas detalhadas com datas inicio/fim
- **DE_PARA** - Mapeamento de status/categorias

### Estrutura dos Cadastros de Elenco (3-4 abas)
- **ELENCO** - Cadastro principal (~382 linhas)
- **CODIGO_ROBO** - Automacao de codigos
- **DOCUSEAL_LOG** - Log de contratos DocuSeal
- **Pagina5/6** - Dados auxiliares (presente em 2 de 3)

### Planilha Master (13 abas)
- **CRIADOR DE PASTA** - Automacao de criacao de pasta no Drive
- **NUMERO DE JOB** - Controle sequencial de IDs
- **ORCAMENTOS** - Controle de orcamentos em andamento
- **BANCO DE EQUIPE INTERNA** - Cadastro de equipe
- **VALIDACAO DE DADOS** - Regras de validacao
- **CHECKLIST_JOB_TIPO** - Checklists por tipo de job
- **REGRAS_CONDICIONAIS_JOB** - Regras de negocio por tipo
- **STATUS_JOB_ETAPA** - Maquina de estados
- **THREAD_ID** - IDs de threads (integracao)
- **MAPA_DE_PERMISSOES_POR_FUNCAO** - RBAC
- **ACESSO_POR_JOB** - Permissoes por job (233 linhas!)
- **Fluxo de Caixa** - Controle de caixa

### Google Docs - Templates Identificados
- O **MODELO PRINCIPAL** e o contrato mais completo, com 23K chars e muitos placeholders ({{...}})
  que podem ser mapeados diretamente para campos do DocuSeal
- O **CONTRATO DE PRODUCAO** e um template mais enxuto para producao
- **Aprovacao interna** pode ser implementada como workflow no EllahOS
- **Pedido de Ancine** e template regulatorio (pode virar checklist)

## Proximos Passos Sugeridos

### Alta Prioridade
1. **Mapear colunas OC/CUSTOS_REAIS** das GGs para schema `job_budgets` — as 5 GGs tem estrutura identica, facilitando a automacao
2. **Extrair categorias de despesa** recorrentes (CUSTOS_REAIS) para ENUM types no banco
3. **Migrar ACESSO_POR_JOB** (233 linhas) para RLS/permissoes do EllahOS
4. **Cruzar EQUIPE** das GGs com `job_team` no Supabase

### Media Prioridade
5. **Mapear placeholders do MODELO PRINCIPAL** para campos DocuSeal
6. **Analisar cronogramas** para validar modelo de timeline/milestones (aba Processo tem etapas detalhadas)
7. **Usar DASHBOARD das GGs** como referencia para o dashboard financeiro (G-02)
8. **Cruzar NUMERO DE JOB** da Master com `job_code_sequences` no banco

### Baixa Prioridade
9. **Habilitar Google Docs API** no projeto para leitura estruturada (com formatacao)
10. **Automatizar import** de dados dos Sheets para Supabase via Edge Function ou n8n

## Arquivos Gerados
- `sheets-gastos-gerais.md` - 5 planilhas GG completas (461 KB)
- `sheets-master.md` - Planilha Master completa (63 KB)
- `sheets-elenco.md` - 3 cadastros de elenco (190 KB)
- `sheets-cronogramas.md` - 3 cronogramas (16 KB)
- `docs-contratos.md` - 5 documentos Google Docs (34 KB)
- `00-executive-summary.md` - Este resumo
