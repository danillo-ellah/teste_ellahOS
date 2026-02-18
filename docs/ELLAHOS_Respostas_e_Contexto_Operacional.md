# ELLAHOS — Respostas das Perguntas Abertas + Contexto Operacional Real
## Documento para alimentar os agentes no Claude Code

---

## PARTE 1: RESPOSTAS DO CEO (Danillo)

### 1. Código do Job
- **Formato atual:** `NNN_NomeDoJob_Agência` (ex: `015_FilmeBBB_WMcCann`)
- INDEX é sequencial por produtora (001, 002, 003...)
- JOB_ABA = `{INDEX padded 3 dígitos}_{nomeJob}_{agencia}`
- **Decisão:** Único por tenant (cada produtora tem seu sequencial)
- **Customização:** Produtoras podem ter formato próprio no futuro

### 2. Status do Job
- Lista de 13 status do PM precisa de ajustes:
  - **Adicionar:** "Cronograma" e "Selecionamento de Diretor" como etapas
  - **Sub-status existem**, especialmente na Pós (Edição, Cor, Finalização)
- **Status revisados (sugestão):**
  1. Briefing Recebido
  2. Orçamento em Elaboração
  3. Orçamento Enviado
  4. Aguardando Aprovação Cliente
  5. Aprovado — Seleção de Diretor
  6. Cronograma/Planejamento
  7. Pré-Produção em Andamento
  8. Produção/Filmagem
  9. Pós-Produção (sub-status: Edição, Cor, Finalização, VFX)
  10. Aguardando Aprovação Final
  11. Entregue
  12. Finalizado (Financeiro Fechado)
  13. Cancelado
  14. Pausado
- **Produtoras podem customizar:** renomear e adicionar status

### 3. Sub-jobs
- Ellah trata como **1 job com vários entregáveis** (não sub-jobs separados)
- Mas pode haver mudança de prioridades e extras durante o projeto
- Sub-jobs com hierarquia são aceitos para campanhas muito grandes
- **Decisão:** Suportar 2 níveis (Job Pai → Sub-job → Sub-sub-job)

### 4. Conflitos de Agenda
- **ALERTAR** (não bloquear) quando diretor está em 2 jobs simultâneos
- Alerta vai para TODOS (PE, Coordenador, Diretor)
- Diretor NÃO trabalha meio período em 2 jobs — prejudica imagem da Ellah
- **Exceção:** Mesmo cliente pode ter 2 projetos simultâneos com mesmo diretor

### 5. Margem
- **Meta:** 30% de lucro
- **Atenção:** Margem caindo abaixo de 30% (amarelo)
- **Alerta vermelho:** Margem chegando em 15%
- Margem NÃO varia significativamente por tipo de projeto na Ellah
- Em conteúdo digital, Ellah às vezes tem margem até MAIOR

### 6. Cancelamento
- Nunca aconteceu na Ellah até hoje
- **Custos incorridos ficam registrados** (nunca zera)
- Cláusulas contratuais definem taxa de cancelamento por data
- Se chover no dia de gravar: custo extra pro cliente (contratual)
- Se cliente não aceita taxa: CEO/CCO/CFO decidem se assumem o risco
- **Decisão:** Manter custos, registrar taxa como receita de cancelamento

### 7. Orçamento
- Orçamento é **separado** do job (pasta própria no Drive)
- Maioria dos orçamentos NÃO é aprovada — criar pasta/subpastas pra cada é inviável
- Quando aprovado, orçamento VINCULA ao job
- **Versionamento:** Não fazem hoje, mas querem (v1, v2, v3)
- Carta Orçamento: documento Google Docs com template timbrado, preenchido automaticamente

### 8. Aprovações
- Hoje: WhatsApp ou ligação (informal)
- **Sistema terá dois caminhos:**
  - Interno: equipe marca como aprovado (quando cliente aprova por WhatsApp/ligação)
  - Externo: botão "Aprovar" pro cliente (opcional, quando cliente quer formalizar)
- Documento "Aprovação Interna": feito pelo Atendimento com todos os detalhes do fechamento

### 9. Entregáveis
- Hoje: Google Drive ou Dropbox (links de download)
- Frame.io: usado na pós para review/alterações (não para entrega final)
- **Controle de versão:** Sim, especialmente na pós (v1, v2 com correções)
- Atualmente controlam localmente

### 10. Notificações
- **TODOS** recebem notificação quando job é aprovado
- Canal principal: **WhatsApp** (muito usado no ramo audiovisual brasileiro)
- Documento "Aprovação Interna" detalha tudo: cliente, agência, quantos filmes, secundagens, elenco exclusivo, etc.
- **Decisão:** WhatsApp como canal primário + in-app como secundário

### 11. Histórico
- Manter jobs por **5 anos** visíveis
- Sim, job pode ser editado após finalização (ex: ajustar custo real)
- Edição pós-finalização pode gerar custo extra pro cliente

### 12. Duplicação
- **NÃO duplicam jobs** no sentido tradicional
- Usam Apps Script que copia estrutura de pastas + planilha template
- O script `copiarPastaBaseAdm` cria toda a estrutura do zero baseada em template

### 13. Exclusão
- **Sempre soft delete (arquivar)** — nunca excluir de verdade
- Histórico é importante para referência futura

### 14. Visualização Padrão
- Mostra **TODOS os jobs** (não apenas "meus jobs")
- Colunas essenciais da planilha master atual (em ordem):
  INDEX, NUMERO DO JOB, NOME DO JOB, AGENCIA, CLIENTE, VALOR FECHADO,
  PLANILHA PRODUCAO, JOB_ABA, EMAIL DO ATENDIMENTO, Valor Produção,
  Valor Imposto, Valor W, Valor Liquido, DIRETOR, PRODUTOR EXECUTIVO,
  DATA DE ENTREGA FINAL, CONTRATOS, DATA_PAGAMENTO, CATEGORIA DE JOB,
  NÍVEL DE COMPLEXIDADE, AUDIO, FASE, STATUS, TIPO DE PROJETO, TIPO DE MÍDIA
- Colunas de URL (links diretos para pastas/documentos no Drive)

### 15. Customização
- **Sim:** produtoras podem ter campos próprios
- **Sim:** podem renomear e adicionar status

### 16. Mobile
- Pode **CRIAR** jobs pelo celular
- Idealmente via WhatsApp (integração Z-API/Evolution API) OU pelo app/site
- Os dois canais são desejáveis

### 17. Volume
- **Atual:** 4 jobs simultâneos, 10-15 jobs/ano
- **Projeção:** até 15-20 simultâneos no futuro
- Performance para 500+ jobs não é prioridade agora, mas bom ter

### 18. Tempo Real
- **Decisão:** Implementar atualização automática (Supabase Realtime é grátis)
- Com 4-20 jobs, não é crítico, mas melhora a experiência

---

## PARTE 2: CONTEXTO OPERACIONAL (extraído dos Apps Scripts)

### Estrutura de Pastas por Job no Google Drive
Quando um job é fechado, o Apps Script cria automaticamente:
```
{INDEX}_{NomeJob}_{Agencia}/
├── 02_FINANCEIRO/
│   ├── 03_GASTOS GERAIS/        (planilha GG_ com custos reais)
│   └── 07_NOTAFISCAL_FINAL_PRODUCAO/
│       ├── 01_PRODUCAO/
│       ├── 02_ARTE/
│       └── 04_FIGURINO/
├── 05_CONTRATOS/
│   ├── 02_CONTRATOEQUIPE/       (planilha EQUIPE_DO_JOB + Forms cadastro)
│   └── 03_CONTRATODEELENCO/
│       ├── CADASTRO_ELENCO_{job}
│       └── 01_CONTRATOS_EM_PDF/
├── 06_FORNECEDORES/
│   ├── 02_ARTE_PRE/
│   └── 03_FIGURINO_PRE/
├── 08_POS_PRODUCAO/
│   └── 01_MATERIAL BRUTO/
├── 09_ATENDIMENTO/
│   ├── 01_PRE_PRODUCAO/
│   │   ├── 01_APROVACAO_INTERNA/
│   │   ├── 02_ROTEIRO/
│   │   └── 03_PPM/
│   └── 02_PRE_PRODUCAO/
│       └── 01_APROVACAO_INTERNA/
└── 10_VENDAS/PRODUTOR_EXECUTIVO/
    └── 01_INICIO_DO_PROJETO/
        ├── 02_DECUPADO/CARTAORCAMENTO/ (Carta_Orcamento_{job})
        └── 04_CRONOGRAMA/              (📊 CRONOGRAMA {job})
```

### Permissões Automáticas por Departamento
- **09_ATENDIMENTO:** Equipe de Atendimento + email do atendimento do job + Diretor
- **10_VENDAS:** Equipe Comercial + Produtor Executivo
- **02_FINANCEIRO:** Equipe Financeiro
- **PÓS PRODUÇÃO:** Equipe de Pós
- **PRODUÇÃO:** Equipe de Produção + Diretor
- **Demais:** Sócios

### Documentos Gerados Automaticamente
1. **Carta Orçamento** — Google Docs timbrado com {{CLIENTE}}, {{AGENCIA}}, {{NOME_DO_JOB}}, {{VALOR_TOTAL}}
2. **Planilha de Produção (GG_)** — Copiada do "Super Modelo", movida pra 03_GASTOS GERAIS
3. **Formulário de Cadastro de Equipe** — Google Forms publicado, vinculado à planilha de equipe
4. **Cadastro de Elenco** — Planilha com dados de elenco
5. **Aprovação Interna** — Documento do Atendimento com detalhes do fechamento

### Fórmulas Automáticas na Planilha Master
- **Coluna J (Valor Produção):** `=QUERY(IMPORTRANGE(planilha_GG; "CUSTOS_REAIS!E:I"); "select Col5 where Col1 = 'TOTAL'"; 0)`
- **Coluna K (Valor Imposto):** `=Valor_Fechado * 0,12` (12% de imposto)
- **Coluna M (Valor W):** `=Valor_Fechado - (Valor_Produção + Valor_Imposto + Valor_L)`

### Integrações Existentes
- **n8n:** Webhook callback quando job é criado (URL: ia.ellahfilmes.com)
- **Google Drive API:** Criação de pastas, cópia de templates, permissões
- **Google Forms API:** Criação e publicação de formulários de cadastro
- **Google Docs API:** Preenchimento de templates (carta orçamento, contratos)

### Sistema de Contratos de Elenco (Script Jurídico)
- Template de contrato no Google Docs com ~40 campos {{placeholder}}
- Dados do cliente/agência vindos de um Google Docs "fonte"
- Idempotência: job+CPF+email gera hash única (não duplica PDF)
- Gera PDF automaticamente e salva na pasta de contratos
- Retorna dados estruturados pro n8n (pra assinatura digital via DocuSeal)
- Campos incluem: nome, CPF, RG, DRT, endereço, valores (prestação, imagem, taxa agenciamento)

### Campos Financeiros Atuais
- **Valor Fechado:** Quanto o cliente vai pagar
- **Valor Produção:** Custo real (vem da planilha GG_ via IMPORTRANGE)
- **Valor Imposto:** 12% do valor fechado (fixo)
- **Valor W:** Diferença (lucro bruto)
- **Valor Líquido:** Lucro final

### Health Score (já implementado no Apps Script)
- +15 pts por URL preenchido (carta orçamento, cronograma, roteiro, PPM)
- +10 pts por data definida (entrega, pagamento)
- +10 pts por equipe definida (diretor, PE)
- Máximo: 100 pontos

---

## PARTE 3: DECISÕES PARA O ELLAHOS

### O que o ELLAHOS deve REPLICAR do sistema atual:
1. Estrutura de pastas no Drive (já automatizada)
2. Geração de carta orçamento a partir de template
3. Formulário de cadastro de equipe
4. Permissões por departamento
5. Cálculos financeiros automáticos (produção, imposto, lucro)
6. Integração com n8n
7. Health score do job
8. Geração de contratos de elenco com PDF

### O que o ELLAHOS deve MELHORAR:
1. Sair do Google Sheets como banco de dados → Supabase PostgreSQL
2. Interface web dedicada em vez de planilha
3. Versionamento de orçamentos (v1, v2, v3)
4. Notificações via WhatsApp automatizadas
5. Sub-status na pós-produção
6. Portal do cliente (aprovação digital opcional)
7. Controle de versão de entregáveis
8. Dashboard com métricas em tempo real
9. App mobile / PWA
10. Assinatura digital integrada (DocuSeal em vez de manual)

### O que o ELLAHOS deve PRESERVAR:
1. Integração profunda com Google Drive (pastas, docs, forms)
2. WhatsApp como canal principal de comunicação
3. Flexibilidade do fluxo (nem tudo é linear)
4. Simplicidade para quem está no set (mobile-first)
5. Nomenclatura familiar (JOB_ABA, GG_, Carta Orçamento, PPM, etc.)
