# Onda 2.5 -- GG Producao: Template + Importar de Job + Edicao Inline

**Modulo:** Financeiro -- Custos do Job (GG)
**Data:** 2026-03-12
**Status:** RASCUNHO -- aguardando validacao
**Autor:** PM (Claude Sonnet 4.6)
**Onda:** 2 -- Escala do Atendimento (1 pessoa = 5+ jobs)
**Esforco estimado:** 5-7 dias

---

## Indice

1. Visao Geral
2. Personas e Jornadas
3. User Stories
4. Regras de Negocio
5. Wireframes Textuais
6. Fora de Escopo
7. Riscos e Mitigacoes
8. Definicao de Pronto (DoD)
9. Fases de Entrega
10. Perguntas Abertas

---
## 1. Visao Geral

### 1.1 Problema

O GG (Gastos Gerais) e a planilha central de um job audiovisual. No GG_038 (Senac, job real de referencia), sao 140 linhas distribuidas em 16 categorias, com total de R5.890,95 e dados de 60+ fornecedores. E o documento que o Diretor de Producao usa durante semanas: criando itens, preenchendo valores, registrando fornecedores, acompanhando pagamentos.

Hoje no ELLAHOS existem tres problemas criticos nesse fluxo:

**Problema 1 -- Sem esqueleto inicial**
Ao criar um job, o financeiro fica vazio. O Diretor de Producao precisa adicionar item por item manualmente. No Google Sheets, quando se replica um GG de um job anterior, ja se tem o esqueleto completo com todas as ~140 linhas das 16 categorias padrao. A estrutura vazia e o ponto de partida, nao o formulario.

**Problema 2 -- Sem reaproveitamento entre jobs**
Jobs similares tem estruturas de custo quase identicas. Um job de 3 dias de filmagem com equipe completa repete as mesmas 100-120 linhas de outro job parecido. Hoje nao ha como copiar a estrutura de um job existente. O Diretor de Producao refaz tudo do zero.

**Problema 3 -- Edicao via drawer e lenta**
Para alterar o valor unitario de um item, o fluxo atual e: clicar no icone de editar, esperar o drawer de 1303 linhas abrir, rolar ate o campo correto, digitar o valor, clicar em Salvar, fechar o drawer. Para preencher um GG do zero com 80 valores, esse fluxo e inviavel na pratica. O Diretor de Producao volta para o Google Sheets.

### 1.2 Solucao

Esta onda entrega tres sub-features complementares:

| Sub-feature | O que faz | Quando usar |
|-------------|-----------|------------|
| Template GG Padrao | Cria ~140 linhas com categorias e descricoes padrao em um clique | Job novo, sem nenhum item |
| Importar de Job | Copia estrutura de custo (categorias + descricoes, sem valores) de um job existente | Job similar a um anterior |
| Edicao Inline | Clica na celula, digita, Tab pro proximo campo, salva no blur | Preencher valores, descricoes e fornecedores rapidamente |

As tres sub-features sao independentes mas se complementam: o usuario aplica o template (ou importa de um job), e depois preenche os valores usando edicao inline.

### 1.3 Estado atual do backend (o que ja existe)

| Artefato | Status | Observacao |
|----------|--------|-----------|
| useBatchCreateCostItems() | EXISTE | POST /cost-items/batch com array de itens |
| useApplyTemplate() | EXISTE | POST /cost-items/apply-template/{jobId} |
| useCopyCostItem() | EXISTE | POST /cost-items/{id}/copy-to-job -- copia item individual |
| Tabela cost_items | EXISTE | Todos os campos necessarios presentes |
| useUpdateCostItem() | EXISTE | PATCH /cost-items/{id} -- atualiza item individual |

O que NAO existe:
- Handler de importacao de job completo (copiar todos os itens de um job para outro, sem valores)
- UI de template integrada ao fluxo principal de custos (ApplyTemplateSection.tsx existe em orcamento/, nao em custos/)
- UI de importacao de job
- Edicao inline na tabela de custos

### 1.4 Categorias do Template GG Padrao

Extraidas do GG_038 (Senac, job real). 16 categorias com 140 linhas totais.

| # | Categoria | Qtd itens |
|---|-----------|-----------|
| 01 | DESEMBOLSOS DE VERBAS A VISTA | 8 |
| 02 | ESTUDIO | 1 |
| 03 | LOCACAO | 2 |
| 04 | DIRECAO DE ARTE / FIGURINO / EFEITOS | 17 |
| 05 | DIRECAO DE CENA / FOTOGRAFIA / SOM | 23 |
| 06 | PRODUCAO | 12 |
| 07 | VEICULOS | 3 |
| 08 | PASSAGEM / HOSPEDAGEM / ALIMENTACAO | 4 |
| 09 | CAMERA / LUZ / MAQUINARIA / GERADOR / INFRA | 11 |
| 10 | PRODUCAO DE CASTING | 4 |
| 11 | OBJETOS DE CENA | 1 |
| 12 | STILL / BASTIDORES | 2 |
| 13 | POS PRODUCAO / TRILHA / CONDECINE | 13 |
| 14 | ADMINISTRATIVO / FINANCEIRO | 4 |
| 15 | MONSTRO | 1 |
| 99 | MAO DE OBRA INTERNA | 1 |

**Detalhamento dos itens do template** (descricoes reais do GG_038):

**01 -- DESEMBOLSOS DE VERBAS A VISTA (8 itens)**
Uber equipe, Verba de Producao, Verba de Arte, Verba de Figurino, Reembolso Equipe, Compras Emergenciais de Set, Impressoes/Autorizacoes, Verba de visita de locacao

**03 -- LOCACAO (2 itens)**
Diretor de Locacao, Locacao

**04 -- DIRECAO DE ARTE / FIGURINO / EFEITOS (17 itens)**
Diretor(a) de arte, Assistente de Arte, Pesquisa e Layouts, Produtor de Objetos, Assistente de Objetos, Contra Regra, Assistente Contra Regra, Ajudante Arte I, Ajudante Arte II, Ajudante Arte III, Ajudante Arte IV, Retirada de arte, Devolucao de arte, Produtor(a) de Figurino, Assistente de figurino I, Assistente de figurino II, Camareira, Make/hair, Assistente de Make

**05 -- DIRECAO DE CENA / FOTOGRAFIA / SOM (23 itens)**
Shooting Board, Diretor de cena, Assistente de Direcao I, Assistente de Direcao II, Logger/Script, Diretor de Fotografia, Operador de Camera, Assistente de Camera I, Assistente de Camera II, DIT, Video Assist/Playback, Making Off, Chefe de Eletrica, Assistente de Eletrica I, Assistente de Eletrica II, Assistente de Eletrica III, Assistente de Eletrica IV, Chefe de Maquinaria, Assistente de Maquinaria I, Assistente de Maquinaria II, Assistente de Maquinaria III, Carga e Dev Eletrica, Carga e Dev Maquinaria, Operador de Drone, Operador Ronin/Steadicam, Tecnico de Som Direto, Microfonista, Assistente de Som

**06 -- PRODUCAO (12 itens)**
Produtor Executivo, Diretor de Producao, Coordenador de Producao, Produtor, Ajudante de Producao I, Ajudante de Producao II, Ajudante de Producao III, Ajudante de Producao IV, Carga e Dev Producao, Efeitista, Seguranca de Set, Seguro, Bombeiro/Socorrista, Taxa Administrativa, Previsao do Tempo

**07 -- VEICULOS (3 itens)**
Pacote veiculos, Transporte Robo, Transporte Cliente

**08 -- PASSAGEM / HOSPEDAGEM / ALIMENTACAO (4 itens)**
Alimentacao equipe, Transporte catering, Hotel, Passagens

**09 -- CAMERA / LUZ / MAQUINARIA / GERADOR / INFRA (11 itens)**
Camera/Acessorio/Lente, Luz e Maquinaria, Kambo, Radios, Consumiveis e Rat Pack, Adaptadores e Dimmer, Infraestrutura de Producao, HD externo, Gerador, SteadyCam, Drone

**10 -- PRODUCAO DE CASTING (4 itens)**
Produtor de casting, Elenco variados, Elenco agencia + Reembolso, Reembolso elenco

**11 -- OBJETOS DE CENA (1 item)**
Itens Cenograficos

**12 -- STILL / BASTIDORES (2 itens)**
Fotografo Still, Assistente de Fotografo

**13 -- POS PRODUCAO / TRILHA / CONDECINE (13 itens)**
Coordenador de Pos, Montador, Finalizador/VFX, Motion Design, Designer Grafico, Tecnico de Audio, Mixador, Compositor Musical/Trilha, Roteirista, Locutor, Condecine, Responsavel por Condecine

**14 -- ADMINISTRATIVO / FINANCEIRO (4 itens)**
Atendimento, Assistente de Atendimento, Seguro Equipe, Advogado

**15 -- MONSTRO (1 item)**
Monstro para o Job

**99 -- MAO DE OBRA INTERNA (1 item)**
Equipe Fixa (produtora, escritorio, etc.)

---
## 2. Personas e Jornadas

### 2.1 Marcello -- Diretor de Producao (usuario principal)

**Perfil:** Freela senior, contratado job a job. Coordena set, negocia fornecedores, controla verba. Preenche o GG do zero ao receber um novo job. Usa laptop na PPM e no escritorio, celular em campo.

**Antes desta onda:**
Marcello recebe o novo job no ELLAHOS, abre a aba de custos, ve uma tabela vazia. Abre o GG do ultimo job similar no Google Sheets, deixa na tela ao lado, e comeca a criar item por item no drawer. Cada item: abre drawer, preenche categoria, numero, descricao, fecha. 140 itens equivale a 140 aberturas de drawer, entre 2 a 3 horas so para montar o esqueleto.

**Depois desta onda:**
Marcello abre a aba de custos do novo job. Clica em Aplicar Template. Em menos de 30 segundos, 140 linhas aparecem com todas as categorias e descricoes padrao. Agora so precisa preencher valores e fornecedores: clicar em cada celula de valor, digitar, Tab para o proximo. Em 30 minutos o GG esta com os valores do orcamento.

**Jornada critica -- job novo (template):**
1. Abre custos do novo job (vazio).
2. Clica em Aplicar Template GG Padrao.
3. Dialogo mostra as 16 categorias e 140 itens que serao criados.
4. Confirma.
5. 140 linhas aparecem com categorias e descricoes, sem valores.
6. Clica na celula de Valor Unit. do primeiro item com valor.
7. Digita valor, Tab, proximo campo.

**Jornada critica -- job similar a um anterior:**
1. Abre custos do novo job (vazio).
2. Clica em Importar de Job.
3. Busca e seleciona o job anterior (ex: GG-038 Senac).
4. Visualiza preview das categorias que serao importadas.
5. Confirma importacao.
6. 140 linhas aparecem com categorias e descricoes, sem valores nem fornecedores.
7. Preenche valores inline.

**Jornada critica -- preencher valores rapidamente:**
1. GG ja tem o esqueleto (via template ou importacao).
2. Clica na celula Valor Unit. do item 05.02 (Diretor de cena).
3. Campo vira input. Digita 50000.
4. Tab -- cursor vai para Qtde do mesmo item.
5. Digita 1. Tab -- cursor vai para Fornecedor.
6. Digita nome do fornecedor. Tab -- proximo item.
7. Blur salva automaticamente via PATCH /cost-items/{id}.

### 2.2 Danillo -- Produtor Executivo / CEO

**Perfil:** Dono e PE da produtora. Valida orcamentos, envia vale-cache, aprova pagamentos. Nao preenche o GG do zero, mas acompanha o progresso.

**Necessidade desta onda:** Ver o GG populado rapidamente para validar se o orcamento esta dentro do esperado. Com o template e edicao inline, o Diretor de Producao entrega um GG preenchido muito mais rapido -- o CEO pode aprovar antes de iniciar a producao.

### 2.3 Financeiro

**Perfil:** Controla pagamentos, NFs, fluxo de caixa. Nao cria itens, mas acompanha status de pagamento e NF de cada linha.

**Necessidade desta onda:** Nao e afetado diretamente pela criacao do template ou importacao. A edicao inline deve preservar as restricoes existentes: campos de pagamento e NF continuam sendo editados apenas pelo drawer para evitar alteracoes acidentais.

### Tabela de permissoes para as novas acoes

| Acao | ceo | produtor_executivo | diretor_producao | coordenador_producao | financeiro | atendimento | visualizador |
|------|-----|-------------------|-----------------|---------------------|-----------|-------------|-------------|
| Aplicar Template | Sim | Sim | Sim | Sim | Nao | Nao | Nao |
| Importar de Job | Sim | Sim | Sim | Sim | Nao | Nao | Nao |
| Edicao Inline | Sim | Sim | Sim | Sim | Nao | Nao | Nao |

---
## 3. User Stories

### Sub-feature A: Template GG Padrao

#### US-GG-01 -- Aplicar template padrao em job vazio

**Como** Diretor de Producao, **quero** aplicar o template padrao de GG com um clique, **para** ter o esqueleto completo das 16 categorias sem criar item por item.

**Criterios de Aceite:**

- [ ] CA-01: O botao Aplicar Template GG Padrao aparece apenas quando o job nao tem nenhum item de custo cadastrado.
- [ ] CA-02: Ao clicar, um dialogo de confirmacao abre listando as 16 categorias com a quantidade de itens de cada uma.
- [ ] CA-03: O dialogo exibe o total de itens que serao criados e aviso que valores e fornecedores NAO serao preenchidos.
- [ ] CA-04: Ao confirmar, os itens sao criados via batch. O dialogo exibe progress indicator enquanto processa.
- [ ] CA-05: A criacao de 140 itens e concluida em no maximo 5 segundos.
- [ ] CA-06: Apos a criacao, a tabela exibe os 16 grupos de categoria com todos os itens e valores zerados.
- [ ] CA-07: Um toast de sucesso confirma o numero de itens criados.
- [ ] CA-08: Se o job ja tem itens, o botao de template NAO aparece.

---

#### US-GG-02 -- Template nao sobreescreve GG existente

**Como** Diretor de Producao, **quero** ter certeza de que o template nao apaga itens que ja criei, **para** nao perder trabalho feito anteriormente.

**Criterios de Aceite:**

- [ ] CA-01: O botao Aplicar Template e renderizado apenas quando o job nao tem itens de custo.
- [ ] CA-02: O endpoint apply-template rejeita com erro 409 se o job ja tiver itens, como segunda camada de protecao.
- [ ] CA-03: O frontend exibe mensagem de erro clara se o backend retornar 409.

---
### Sub-feature B: Importar de Outro Job

#### US-GG-03 -- Abrir dialogo de importacao

**Como** Diretor de Producao, **quero** importar a estrutura de custos de um job existente, **para** reaproveitar categorias e descricoes sem criar tudo do zero.

**Criterios de Aceite:**

- [ ] CA-01: O botao Importar de Job aparece sempre na aba de custos (ao lado de Adicionar item).
- [ ] CA-02: Ao clicar, um dialogo abre com campo de busca de jobs por codigo ou titulo.
- [ ] CA-03: A busca retorna apenas jobs do mesmo tenant.
- [ ] CA-04: Cada resultado exibe: codigo do job, titulo, cliente, data de start e quantidade de itens de custo.
- [ ] CA-05: Jobs sem itens exibem indicador Sem itens cadastrados e tem o botao de selecionar desabilitado.

---

#### US-GG-04 -- Preview antes de importar

**Como** Diretor de Producao, **quero** ver um preview das categorias antes de confirmar a importacao, **para** confirmar que estou importando do job certo.

**Criterios de Aceite:**

- [ ] CA-01: Ao selecionar um job da lista, o dialogo exibe preview com as categorias do job de origem.
- [ ] CA-02: O preview mostra: numero da categoria, nome e quantidade de itens por categoria.
- [ ] CA-03: O total de itens que serao importados e exibido.
- [ ] CA-04: Um aviso destacado informa: Valores e fornecedores NAO serao copiados. Apenas categorias e descricoes.
- [ ] CA-05: Se o job de destino ja tem itens, aparece aviso com as opcoes: Adicionar aos existentes ou Substituir todos.

---

#### US-GG-05 -- Confirmar importacao

**Como** Diretor de Producao, **quero** confirmar a importacao com clareza sobre o que sera criado ou excluido, **para** nao cometer erros irreversiveis.

**Criterios de Aceite:**

- [ ] CA-01: Modo Adicionar: os itens do job de origem sao criados sem excluir os existentes. Toast informa quantos foram adicionados.
- [ ] CA-02: Modo Substituir todos: um segundo dialogo de confirmacao aparece antes de excluir.
- [ ] CA-03: Ao confirmar Substituir, os itens existentes sao excluidos em batch e os novos sao criados. Toast informa contagens.
- [ ] CA-04: A importacao copia apenas: item_number, sub_item_number, service_description, is_category_header.
- [ ] CA-05: Campos financeiros ficam em valores padrao: unit_value nulo, quantity nulo, vendor_id nulo, payment_status pendente.

---

#### US-GG-06 -- Nao copiar dados financeiros de outro job

**Como** Financeiro, **quero** ter certeza de que valores e fornecedores de outros jobs nao aparecem no job importado, **para** manter confidencialidade financeira.

**Criterios de Aceite:**

- [ ] CA-01: unit_value, quantity, total_value, actual_paid_value sao sempre nulos nos itens criados por importacao.
- [ ] CA-02: vendor_id, vendor_name_snapshot, vendor_email_snapshot, vendor_pix_snapshot sao nulos.
- [ ] CA-03: payment_condition e payment_due_date sao nulos.
- [ ] CA-04: Nenhum dado financeiro do job de origem e visivel no job de destino.

---
### Sub-feature C: Edicao Inline

#### US-GG-07 -- Ativar modo de edicao clicando na celula

**Como** Diretor de Producao, **quero** clicar em uma celula da tabela para editar o valor, **para** preencher o GG sem abrir o drawer para cada item.

**Criterios de Aceite:**

- [ ] CA-01: Clicar em celula editavel (Descricao, Valor Unit., Qtde ou Fornecedor) ativa modo de edicao nessa celula.
- [ ] CA-02: A celula em edicao exibe input em foco com o valor atual pre-selecionado.
- [ ] CA-03: A linha do item em edicao recebe fundo de destaque leve.
- [ ] CA-04: Tab move foco para a proxima celula editavel na ordem: Descricao > Valor Unit. > Qtde > Fornecedor.
- [ ] CA-05: Da ultima celula da linha, Tab move para a primeira celula editavel da proxima linha.
- [ ] CA-06: Escape cancela a edicao, restaura o valor original. Nenhuma chamada de API.
- [ ] CA-07: Enter confirma a edicao (equivalente ao blur) e fecha o modo de edicao da celula.

---

#### US-GG-08 -- Auto-save ao sair da celula

**Como** Diretor de Producao, **quero** que o valor seja salvo automaticamente ao sair da celula, **para** nao precisar clicar em botao de salvar.

**Criterios de Aceite:**

- [ ] CA-01: Ao sair da celula com valor alterado, chamada PATCH /cost-items/{id} e feita com o campo alterado.
- [ ] CA-02: Durante o save, a celula exibe indicador de carregamento.
- [ ] CA-03: Apos save bem-sucedido, a celula volta ao modo de exibicao com o novo valor.
- [ ] CA-04: Nenhum toast de sucesso para nao interromper o fluxo de edicao.
- [ ] CA-05: Se o valor nao foi alterado, nenhuma chamada de API e feita.
- [ ] CA-06: Se o save falhar, a celula exibe o valor ORIGINAL (rollback visual) e um toast de erro aparece.
- [ ] CA-07: Apos falha, o item pode ser editado novamente.

---

#### US-GG-09 -- Campos editaveis inline definidos

**Como** Diretor de Producao, **quero** saber quais campos sao editaveis inline, **para** usar o fluxo correto para cada tipo de dado.

**Criterios de Aceite:**

- [ ] CA-01: Campos editaveis inline: service_description (texto), unit_value (numero BR), quantity (inteiro), fornecedor (texto com autocomplete).
- [ ] CA-02: Campos NAO editaveis inline: payment_condition, payment_due_date, payment_status, nf_request_status, notes, item_number, sub_item_number.
- [ ] CA-03: Para cabecalhos de categoria, apenas service_description e editavel inline.
- [ ] CA-04: Cabecalhos nao exibem cursor de edicao em celulas de valor, qtde ou fornecedor.

---

#### US-GG-10 -- Calculo de total em tempo real

**Como** Diretor de Producao, **quero** ver o total da linha atualizar ao digitar, **para** ter feedback instantaneo.

**Criterios de Aceite:**

- [ ] CA-01: Ao editar unit_value ou quantity, o campo Total da linha atualiza em tempo real.
- [ ] CA-02: O subtotal da categoria no cabecalho atualiza em tempo real durante a edicao.
- [ ] CA-03: O total geral no rodape da tabela atualiza em tempo real durante a edicao.
- [ ] CA-04: Calculo: total = unit_value * quantity. Se qualquer um for nulo, exibe traco em vez de zero.
- [ ] CA-05: O total durante edicao e provisorio (client-side). O valor no banco e calculado pelo backend no PATCH.

---

#### US-GG-11 -- Autocomplete de fornecedor inline

**Como** Diretor de Producao, **quero** ver sugestoes de fornecedores ao digitar no campo inline, **para** vincular fornecedores conhecidos sem abrir o drawer.

**Criterios de Aceite:**

- [ ] CA-01: Ao digitar 2+ caracteres no campo Fornecedor, um dropdown com sugestoes de vendors do tenant aparece.
- [ ] CA-02: Cada sugestao exibe nome e chave PIX ou email (se disponivel).
- [ ] CA-03: A busca e case-insensitive e busca por qualquer parte do nome.
- [ ] CA-04: Selecionar um vendor preenche o campo e, ao salvar, vincula vendor_id ao item.
- [ ] CA-05: Texto livre (sem selecao da lista) e salvo como vendor_name_snapshot com vendor_id nulo. Sem erro.

---

#### US-GG-12 -- Bloquear edicao inline em casos especificos

**Como** Financeiro, **quero** que itens pagos e cancelados nao sejam editaveis inline, **para** manter integridade dos dados de pagamento.

**Criterios de Aceite:**

- [ ] CA-01: Itens com payment_status = pago nao ativam edicao inline. Tooltip: Item pago. Use o drawer para editar.
- [ ] CA-02: Itens com item_status = cancelado nao ativam edicao inline. Tooltip: Item cancelado.
- [ ] CA-03: Usuarios sem permissao de escrita (financeiro, atendimento, visualizador) nao ativam edicao inline.
- [ ] CA-04: O botao de editar pelo drawer continua disponivel para itens pagos.

---
## 4. Regras de Negocio

### RN-01: Template apenas em GG vazio

O botao Aplicar Template GG Padrao so aparece quando o job nao tem nenhum item de custo cadastrado (COUNT cost_items WHERE job_id = X = 0).

**Rationale:** Aplicar template sobre itens existentes criaria duplicatas. Se o GG ja foi iniciado manualmente ou importado de outro job, o template nao faz sentido. O usuario pode adicionar itens avulsos pelo drawer como sempre.

### RN-02: Importacao nunca copia valores financeiros

A importacao copia apenas: item_number, sub_item_number, service_description, is_category_header. Todos os campos financeiros (unit_value, quantity, vendor_id, snapshots de vendor, payment_condition, payment_due_date, payment_status, nf_request_status, actual_paid_value) ficam em seus valores padrao no item criado.

**Rationale:** Privacidade entre jobs e gestao financeira correta. Os custos de um job nao devem contaminar outro job, mesmo que a estrutura seja similar. O Diretor de Producao negocia cada job individualmente.

### RN-03: Importacao de job do mesmo tenant

A importacao so e permitida entre jobs do mesmo tenant. Nao ha importacao cross-tenant.

**Rationale:** Seguranca e confidencialidade. Cada tenant e uma empresa diferente.

### RN-04: Edicao inline bloqueada para itens pagos e cancelados

Itens com payment_status = pago ou item_status = cancelado nao podem ser editados inline. Qualquer edicao nesses itens deve ser feita pelo drawer, que tem validacoes extras e trilha de auditoria.

**Rationale:** Itens pagos tem comprovante e valor real registrado. Alterar valores inline sem passar pelo drawer poderia criar inconsistencias com o historico de pagamento.

### RN-05: Auto-save com rollback em falha

Se o PATCH falhar (erro de rede, validacao ou servidor), a celula exibe o valor original automaticamente. O usuario nao perde o contexto de edicao e pode tentar novamente clicando na celula.

**Rationale:** O auto-save sem confirmacao cria uma expectativa de que o valor ja foi salvo. Se a falha nao for tratada com rollback visual, o usuario pode continuar editando outros campos sem perceber que um save falhou.

### RN-06: Tab navegacao segue ordem de preenchimento GG

A ordem de Tab dentro de uma linha e: Descricao > Valor Unit. > Qtde > Fornecedor. Esta e a ordem natural de preenchimento do GG (primeiro se sabe o que e, depois quanto custa, depois quem fornece).

**Rationale:** Ordem baseada no fluxo real de trabalho do Diretor de Producao, validada com o GG_038.

### RN-07: Calculo de total e client-side durante edicao

O calculo total = unit_value * quantity e feito no frontend em tempo real durante a digitacao. O valor persistido no banco e o calculado no backend no momento do save (para garantir consistencia).

**Rationale:** Feedback imediato ao usuario sem latencia de rede durante a digitacao.

### RN-08: Restricao de roles para edicao

Apenas os roles ceo, produtor_executivo, diretor_producao, coordenador_producao podem editar itens inline. Roles financeiro, atendimento, e visualizador sao somente leitura na tabela de custos inline.

**Rationale:** Consistente com as permissoes existentes do modulo financeiro.

---
## 5. Wireframes Textuais

### 5.1 Estado vazio -- botoes de acoes primarias

    +-- Custos do Job -- GG-038 Senac -----------------------+
    |                                                         |
    |  Nenhum item de custo cadastrado                        |
    |                                                         |
    |  Comece pelo esqueleto completo:                        |
    |                                                         |
    |  [Wand icon] [Aplicar Template GG Padrao]               |
    |  Cria ~140 linhas com categorias padrao audiovisual     |
    |                                                         |
    |  ou                                                     |
    |                                                         |
    |  [Copy icon] [Importar de Job Existente]                |
    |  Copia estrutura de outro job sem valores               |
    |                                                         |
    |  [Plus icon] [Adicionar item manualmente]               |
    |                                                         |
    +---------------------------------------------------------+

### 5.2 Dialogo de confirmacao do template

    +-- Aplicar Template GG Padrao ---------------------------+
    |  Template: Producao Audiovisual Publicitaria            |
    |  Baseado no padrao GG da Ellah Filmes                   |
    |                                                         |
    |  Categorias que serao criadas (16 grupos, 140 itens):   |
    |  01 Desembolsos de Verbas a Vista         8 itens       |
    |  02 Estudio                               1 item        |
    |  03 Locacao                               2 itens       |
    |  04 Direcao de Arte / Figurino / Efeitos  17 itens      |
    |  05 Direcao de Cena / Fotografia / Som    23 itens      |
    |  06 Producao                              12 itens      |
    |  07 Veiculos                              3 itens       |
    |  08 Passagem / Hospedagem / Alimentacao   4 itens       |
    |  09 Camera / Luz / Maquinaria / Infra     11 itens      |
    |  10 Producao de Casting                   4 itens       |
    |  11 Objetos de Cena                       1 item        |
    |  12 Still / Bastidores                    2 itens       |
    |  13 Pos Producao / Trilha / Condecine     13 itens      |
    |  14 Administrativo / Financeiro           4 itens       |
    |  15 Monstro                               1 item        |
    |  99 Mao de Obra Interna                   1 item        |
    |                                                         |
    |  Total: 140 itens em 16 categorias                      |
    |  Valores e fornecedores: NAO preenchidos                |
    |                                                         |
    |  [Cancelar]                [Aplicar Template]           |
    +---------------------------------------------------------+

### 5.3 Dialogo de importacao de job

    +-- Importar Estrutura de Outro Job ----------------------+
    |  Buscar job: [___Senac_________________________]        |
    |                                                         |
    |  Resultados:                                            |
    |  GG-038  Quer Fazer? Senac    Senac    140 itens  [>]   |
    |  GG-033  ORNARE               Ilha P.  161 itens  [>]   |
    |  GG-041  Campanha Natal        Bradesco   0 itens  [-]  |
    |                                                         |
    |  GG-038 selecionado -- preview:                         |
    |  01 Desembolsos de Verbas a Vista   8 itens             |
    |  02 Estudio                         1 item              |
    |  03 Locacao                         2 itens             |
    |  ... (mais 13 categorias)                               |
    |                                                         |
    |  [\!] Valores e fornecedores NAO serao copiados.         |
    |      Apenas categorias e descricoes.                    |
    |                                                         |
    |  [Cancelar]      [Importar 140 itens do GG-038]         |
    +---------------------------------------------------------+

### 5.4 Tabela com edicao inline ativa

    Modo normal (nenhuma celula em edicao):
    [x]  05.02  Diretor de cena    -     -    1    R$ 0,00  ...

    Celula Valor Unit. em edicao (clique):
    [x]  05.02  Diretor de cena  [_50.000_]   1   R$ 50.000   ...
                                 ^ input ativo, borda azul, linha destacada

    Apos Tab (foco em Qtde):
    [x]  05.02  Diretor de cena  R$ 50.000  [_1_]  R$ 50.000   ...

    Apos Tab (foco em Fornecedor com autocomplete):
    [x]  05.02  Diretor de cena  R$ 50.000   1   R$ 50.000  [_Kiko_____]
                                                             | Kiko Lomba  kiko@me |
                                                             | Kiko PPM    ppm@..  |

    Celula de item pago (nao editavel, cursor normal):
    [x]  05.40  Assistente AD I  R$ 15.000   1   R$ 15.000   Ana Laforga
                                 ^ tooltip ao hover: Item pago. Use o drawer.

### 5.5 GG com template aplicado (esqueleto vazio)

    +-- Custos -- GG-038 Senac ---------- Total: R$ 0,00 -----+
    | v 01 DESEMBOLSOS DE VERBAS A VISTA              R$ 0,00  |
    |    .01  Uber equipe                  -    -      R$ 0    |
    |    .02  Verba de Producao            -    -      R$ 0    |
    |    .03  Verba de Arte                -    -      R$ 0    |
    |    ... (5 mais itens)                                    |
    | v 02 ESTUDIO                                    R$ 0,00  |
    |    .01  Estudio                      -    -      R$ 0    |
    | v 03 LOCACAO                                    R$ 0,00  |
    |    .01  Diretor de Locacao           -    -      R$ 0    |
    |    .02  Locacao                      -    -      R$ 0    |
    | ... (13 mais categorias)                                  |
    | TOTAL GERAL                                     R$ 0,00  |
    +----------------------------------------------------------+
    Hint (primeira vez): Clique em qualquer celula para comecar a preencher

---
## 6. Fora de Escopo

| # | Item | Justificativa |
|---|------|--------------|
| 1 | Edicao inline de payment_condition | Enum com opcoes especificas. Requer dropdown, nao input. Baixo ganho de velocidade. Continua no drawer. |
| 2 | Edicao inline de payment_due_date | Requer datepicker. Complexidade de UX em celula de tabela. Continua no drawer. |
| 3 | Edicao inline de notes/observacoes | Campo longo, requer area de texto grande. Nao cabe em celula de tabela. Continua no drawer. |
| 4 | Reordenacao de itens via drag and drop | item_number e sub_item_number sao fixos no padrao GG. Reordenar criaria inconsistencia com o padrao de mercado. |
| 5 | Templates por tipo de producao | Nesta onda, apenas um template unico (padrao audiovisual completo). Templates por tipo sao Onda 3. |
| 6 | Importacao cross-tenant | Seguranca. Cada tenant e uma empresa separada. |
| 7 | Edicao em massa de multiplas celulas | Complexidade de UX. Edicao inline e item a item. Selecao em lote cobre o caso de pagamento em massa. |
| 8 | Desfazer edicao inline (Ctrl+Z) | Escape cancela a edicao em andamento. Historico de alteracoes e coberto pela tabela job_history existente. |
| 9 | Edicao inline no mobile | Tabelas densas em mobile tem UX ruim. Edicao inline e para desktop. No mobile, continua usando o drawer. |
| 10 | Template configuravel pelo admin | Nesta onda, template e fixo. Configuracao de template e Onda 3. |

---

## 7. Riscos e Mitigacoes

### R-01: Auto-save com alta frequencia pode sobrecarregar a API

**Risco:** Se o usuario navegar rapidamente por muitas celulas com Tab, pode disparar 50 chamadas PATCH simultaneas.

**Probabilidade:** Media. Um Diretor de Producao experiente preenche o GG de forma rapida.

**Impacto:** Lentidao ou erros 429 (rate limit).

**Mitigacao:** Implementar debounce de 300ms no auto-save: se o usuario sair de uma celula e entrar em outra dentro de 300ms, o save da celula anterior e agrupado ou cancelado. Decisao tecnica do Tech Lead.

---

### R-02: Importacao de job grande pode ser lenta

**Risco:** Um job com 200+ itens pode demorar mais de 5 segundos para ser importado via batch.

**Probabilidade:** Baixa. O GG_038 mais completo tem 140 itens. 200+ seria incomum.

**Impacto:** Usuario percebe lentidao, pode pensar que a acao travou.

**Mitigacao:** Mostrar progress indicator (spinner + mensagem Aguarde, criando X itens...) no dialogo enquanto a operacao ocorre.

---

### R-03: Conflito entre edicao inline e abertura do drawer

**Risco:** O usuario pode clicar no icone de editar (abre o drawer) enquanto uma celula ainda esta em modo de edicao inline.

**Probabilidade:** Media. Fluxo de trabalho hibrido e natural.

**Impacto:** Perda de valor digitado ou estado inconsistente.

**Mitigacao:** Ao clicar no botao de editar (drawer) com uma celula ativa, executar o blur da celula ativa primeiro (o que dispara o save), e so entao abrir o drawer. Comportamento: save inline > abre drawer.

---

### R-04: Template pode nao ser adequado para todos os tipos de job

**Risco:** O template padrao foi extraido do GG_038 (producao publicitaria de 3 dias). Um job de fotografia still ou de pos-producao pura tem categorias completamente diferentes.

**Probabilidade:** Alta. A Ellah Filmes faz tipos variados de producao.

**Impacto:** O Diretor de Producao aplica o template e precisa deletar 60% dos itens que nao se aplicam.

**Mitigacao (nesta onda):** O template e um ponto de partida. O usuario pode deletar categorias inteiras. O aviso no dialogo de confirmacao esclarece: Template completo para producao publicitaria. Delete as categorias que nao se aplicam.

**Mitigacao (Onda 3):** Templates por tipo de producao configurados pelo admin do tenant.

---

### R-05: Perda de dados ao usar Substituir todos na importacao

**Risco:** O usuario clica em Substituir todos sem perceber que vai perder itens com valores ja preenchidos.

**Probabilidade:** Media. O warning existe mas pode ser ignorado.

**Impacto:** Perda de trabalho realizado.

**Mitigacao:** O dialogo de Substituir todos deve exibir um segundo dialogo de confirmacao explicito: Voce esta prestes a EXCLUIR X itens. Esta acao NAO pode ser desfeita. Confirmar exclusao? com botao vermelho. Double-confirm para acoes destrutivas.

---
## 8. Definicao de Pronto (DoD)

A feature e considerada pronta quando todos os criterios abaixo estiverem satisfeitos:

### 8.1 Funcional

- [ ] Template GG Padrao: botao aparece apenas em job vazio, dialogo exibe 16 categorias com contagens, confirmacao cria os ~140 itens via batch, toast de sucesso.
- [ ] Template: job com itens existentes NAO exibe o botao de template.
- [ ] Importar de Job: dialogo abre, busca retorna jobs do tenant, preview exibe categorias e contagem de itens, confirmacao cria itens sem valores financeiros.
- [ ] Importar: opcao Substituir todos funciona com double-confirm e exclui itens anteriores antes de criar novos.
- [ ] Importar: itens importados tem unit_value, vendor_id e todos os campos financeiros nulos/padrao.
- [ ] Edicao Inline: clicar em celula editavel (Descricao, Valor Unit., Qtde, Fornecedor) entra em modo de edicao.
- [ ] Edicao Inline: Tab navega para proxima celula editavel na ordem correta.
- [ ] Edicao Inline: Escape cancela e restaura valor original sem chamada de API.
- [ ] Edicao Inline: blur dispara PATCH com o campo alterado.
- [ ] Edicao Inline: falha no save exibe rollback visual e toast de erro.
- [ ] Edicao Inline: campo de fornecedor tem autocomplete com vendors do tenant.
- [ ] Edicao Inline: itens pagos e cancelados nao permitem edicao inline.
- [ ] Edicao Inline: calculo de total atualiza em tempo real durante digitacao.
- [ ] Permissoes: roles sem permissao de escrita nao ativam modo de edicao inline.

### 8.2 Qualidade

- [ ] Sem regressao em funcionalidades existentes: drawer continua funcionando para todos os campos.
- [ ] Sem regressao em selecao em lote e pagamento em lote.
- [ ] Edicao inline nao conflita com dropdown de acoes (icone MoreHorizontal).
- [ ] Performance: aplicar template (140 itens) em menos de 5 segundos.
- [ ] Performance: importar job (140 itens) em menos de 5 segundos.

### 8.3 UX

- [ ] Wireframes aprovados pelo usuario antes de iniciar implementacao.
- [ ] Hint visual na primeira vez que ve o GG vazio apos template (Clique em celula para editar).
- [ ] Tooltip em celulas bloqueadas (itens pagos/cancelados) explicando o motivo.

---

## 9. Fases de Entrega

### Sprint 1 -- Template GG Padrao (estimativa: 2 dias)

**Objetivo:** Usuario consegue sair de GG vazio para GG com 140 linhas em um clique.

**Entregaveis:**
- Verificar e completar o endpoint POST /cost-items/apply-template/{jobId} (pode ja existir parcialmente)
- Dados do template embutidos no backend (16 categorias, 140 descricoes baseadas no GG_038)
- UI: botao Aplicar Template na pagina de custos quando lista esta vazia
- UI: dialogo de confirmacao com listagem das 16 categorias e contagens
- Tabela atualiza apos criacao (invalidate query)

**Criterio de saida do sprint:** Diretor de Producao consegue ir de GG vazio para 140 linhas em 2 cliques e menos de 30 segundos.

**Dependencias:** Nenhuma (backend apply-template ja existe).

---

### Sprint 2 -- Importar de Job Existente (estimativa: 2 dias)

**Objetivo:** Usuario consegue copiar estrutura de um job anterior sem valores.

**Entregaveis:**
- Endpoint novo: POST /cost-items/import-from-job com body { source_job_id, target_job_id, mode: add | replace }
- Handler de busca de jobs para o dialogo (pode reusar endpoint existente de jobs/list)
- UI: botao Importar de Job sempre visivel na pagina de custos (junto ao botao Adicionar)
- UI: dialogo com busca, selecao de job, preview de categorias
- UI: opcao Adicionar aos existentes vs Substituir todos com double-confirm para replace
- Toast de resultado com contagem de itens criados/excluidos

**Criterio de saida do sprint:** Diretor de Producao consegue importar 140 itens de um job anterior em menos de 3 cliques e sem valores copiados.

**Dependencias:** Sprint 1 completo (para testar sobre GG ja preenchido).

---

### Sprint 3 -- Edicao Inline (estimativa: 3 dias)

**Objetivo:** Usuario consegue preencher valores e fornecedores sem abrir o drawer.

**Entregaveis:**
- Componente InlineCell (wrapper para celulas editaveis) com logica de blur/save/rollback
- Integracao com useUpdateCostItem() existente
- Calculo client-side de total em tempo real
- Navegacao por Tab entre celulas editaveis
- Autocomplete de fornecedores (reusar useVendorSuggest() existente)
- Bloqueio de edicao para itens pagos/cancelados com tooltip
- Bloqueio baseado em role do usuario

**Criterio de saida do sprint:** Diretor de Producao consegue preencher os valores de 20 itens consecutivos usando apenas Tab e Enter, sem abrir nenhum drawer.

**Dependencias:** Sprint 1 e Sprint 2 completos (para testar sobre GG preenchido via template ou importacao).

---

### Validacao Final (estimativa: 0.5 dia)

- Teste do fluxo completo: template > preencher inline > verificar totais
- Teste do fluxo completo: importar de job > preencher inline > verificar que valores do job de origem nao aparecem
- Verificar que drawer continua funcionando para todos os campos excluidos do inline
- Verificar permissoes em todos os roles

---
## 10. Perguntas Abertas

### PA-01: Estado atual do endpoint apply-template

O hook useApplyTemplate() existe e chama apply-template/{jobId}. O componente ApplyTemplateSection.tsx existe em /jobs/{id}/financeiro/orcamento/_components/. Porem o contexto desta spec e a pagina de custos (/jobs/{id}/financeiro/custos/), nao de orcamento.

**Pergunta ao Tech Lead:** O endpoint apply-template ja retorna os 140 itens com o template completo baseado no GG_038? Ou retorna apenas as 16 categorias sem subitens? Qual e o estado atual do conteudo do template? Precisa ser verificado antes do Sprint 1.

---

### PA-02: Endpoint de importacao de job completo existe?

O hook useCopyCostItem() copia um item individual. Nao existe endpoint para copiar todos os itens de um job de uma vez.

**Pergunta ao Tech Lead:** O endpoint /cost-items/import-from-job precisa ser criado do zero no Sprint 2, ou existe algo similar que possa ser reaproveitado?

---

### PA-03: Campos adicionais de risco para edicao inline

A spec define os campos editaveis e nao editaveis inline. Porem o Financeiro pode ter restricoeses adicionais nao mapeadas aqui.

**Pergunta ao usuario do papel Financeiro:** Ha algum campo alem dos listados em US-GG-09 (payment_condition, payment_due_date, etc.) que considera de alto risco para edicao inline? Validar com o Financeiro antes do Sprint 3.

---

### PA-04: Hint de Clique para editar -- persistente ou uma vez

**Opcoes:**
- (A) Sempre que o GG tiver itens sem valores preenchidos -- mais simples mas pode ser redundante para usuarios avancados.
- (B) Apenas na primeira vez que o usuario ve o GG apos aplicar o template, com controle via localStorage -- mais elegante mas requer estado por usuario.
- (C) Nunca -- usuario descobre por tentativa e erro.

**Pergunta ao Danillo:** Qual opcao prefere? Recomendacao do PM: opcao B (localStorage por usuario, desaparece apos primeira interacao).

---

### PA-05: Template unico vs template com ajuste por numero de diarias

O GG_038 tem 3 diarias. Um job de 1 diaria tem estrutura mais enxuta (menos ajudantes, menos ADs, sem hotel, sem passagens). O template atual e o completo do GG_038.

**Pergunta ao Danillo:** O template deve ser unico (completo, o usuario deleta o que nao usa) ou deve perguntar o numero de diarias antes de aplicar e ajustar as quantidades?

Recomendacao do PM para esta onda: template unico com nota no dialogo (Template completo para producao publicitaria. Delete as categorias que nao se aplicam). Templates com ajuste por diarias sao Onda 3.

---

*Spec gerada em 2026-03-12. Para questoes tecnicas, ver arquivo de arquitetura a ser criado (10-gg-template-inline-edit-arquitetura.md).*

*Baseada nos dados reais do GG_038 (Quer Fazer? Senac -- 140 itens, R65.890,95) e no estado atual do codebase (CostItemsTable.tsx 742 linhas, CostItemDrawer.tsx 1303 linhas).*
