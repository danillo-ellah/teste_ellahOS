# Cronograma — Decisoes do Usuario (04/03/2026)

## P1 — Logo do cliente
**Decisao:** Upload no cadastro do CRM (client/agency)
- As vezes o cliente ou agencia manda o logo
- As vezes buscam na internet e limpam no GPT (fundo alpha) ou Photoshop
- Precisa: campo `logo_url` na tabela `clients` e `agencies` com upload
- No cronograma PDF: usa logo do client, ou da agency se nao tiver client logo
- Fallback: se nenhum logo, so mostra o nome

## P2 — Campo Complemento
**Decisao:** SIM
- Usado pra anotacoes como "Aprovacao 10hrs", "Reuniao as 14h"
- Campo texto livre por fase

## P3 — Sub-fases
**Decisao:** NAO (por enquanto)
- Fica poluido pro cliente
- Talvez no futuro: cronograma interno (so equipe) com sub-fases
- Cronograma do cliente = limpo, so fases principais

## P4 — PDF impresso ou digital
**Decisao:** DIGITAL (RGB)
- Tudo digital pra mandar pro cliente
- Excecao: licitacao precisa imprimir (CMYK) — fase futura
- NOTA: deixar mensurado pra nao esquecer licitacao

## P5 — QR Code no PDF
**Decisao:** AMOU a ideia
- QR Code e GRATUITO (gerado programaticamente, sem custo)
- Link pode ir pro job no ELLAHOS (pagina publica de status?)
- Ou link pro login do sistema
- Implementar como opt-in (toggle no export PDF)

## P6 — Cores das fases
**Decisao:** Configuraveis por TENANT
- Cada produtora pode ter suas cores
- Default: paleta padrao Ellah (amber, violet, blue, red, etc.)

## P7 — Template por tipo de job
**Decisao:** Template UNICO por enquanto
- Se precisar diferenciar (TV, Foto, Doc), faz no futuro
- Manter simples

## P8 — Progresso por fase
**Decisao:** O que for mais eficiente
- Recomendacao: status simples (nao iniciado / em andamento / concluido)
- Sem barra de % (complexo demais pra pouco ganho)
- Visual: icone ou cor diferente por status

## P9 — Dependencias entre fases
**Decisao:** SEM dependencias rigidas
- Cronograma e informacional pro cliente, nao controle rigido
- Datas livres — usuario ajusta manualmente
- Nao travar uma fase por causa de outra
- "Serve pra um norte, mas nao pode ser empecilho"

## P10 — Notificacoes
**Decisao:** SIM, mas com moderacao
- Avisar quando fase muda de data
- NAO ser chato/spam — notificacao inteligente
- Sugestao: notificar so mudancas significativas (>1 dia de diferenca)
- Ou: resumo diario em vez de notificacao por mudanca
