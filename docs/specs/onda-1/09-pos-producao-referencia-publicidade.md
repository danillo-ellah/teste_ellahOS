# Pos-Producao em Produtora de Publicidade Brasileira - Documento de Referencia

**Data:** 2026-03-09
**Autor:** Consultor Senior de Pos-Producao (Claude Opus)
**Objetivo:** Servir de base para a implementacao do modulo de Pos-Producao do ELLAHOS
**Fonte:** Pratica real de produtoras brasileiras de publicidade (Conspiracoes, Stink, Hungry Man, O2, Paranoid, Cine, Vetor Zero, Zola, Landia, etc.) + respostas do CEO da Ellah Filmes

---

## 1. Workflow Padrao — Etapas Reais de Pos-Producao em Publicidade

### 1.1. Mapa completo das etapas

O fluxo de pos-producao em publicidade brasileira tem uma caracteristica que sistemas genericos ignoram: ele se divide em dois grandes blocos — **Offline** (criativo, editorial) e **Online** (tecnico, finalizacao) — com ciclos de aprovacao distintos entre eles.

```
RECEBIMENTO DE MATERIAL
  |
  v
INGEST + ORGANIZACAO
  |
  v
MONTAGEM (Edicao Offline)
  |
  +---> TRILHA SONORA (paralelo)
  +---> SOUND DESIGN preliminar (paralelo)
  |
  v
APRESENTACAO OFFLINE (V1)
  |
  v
CICLO DE ALTERACOES OFFLINE (V2, V3... Vn)
  |
  v
APROVACAO OFFLINE (lock de corte)
  |
  |   A partir daqui, etapas podem ser paralelas:
  |
  +---> COLOR GRADING
  +---> VFX / MOTION GRAPHICS / 3D
  +---> COMPOSICAO / CONFORMACAO
  +---> SOUND DESIGN final + FOLEY
  +---> MIXAGEM DE AUDIO
  |
  v
FINALIZACAO (Online)
  |
  v
APRESENTACAO ONLINE (V1 Online)
  |
  v
CICLO DE ALTERACOES ONLINE (V2, V3... Vn)
  |
  v
APROVACAO ONLINE (lock final)
  |
  v
QC (Quality Control)
  |
  v
MASTER + COPIAS (desdobramentos por formato/janela)
  |
  v
ENTREGA
  |
  v
ARQUIVO + BACKUP
```

### 1.2. Descricao detalhada de cada etapa

#### ETAPA 0: Recebimento de Material (Ingest)

**O que e:** O material bruto filmado chega na pos-producao. Em produtora de publicidade brasileira, isso geralmente e via SSD fisico ou link de nuvem. O Logger (nao chamam de DIT no Brasil) ja fez copias no set.

**Entradas:**
- SSD(s) com bruto (RAW, ProRes, BRAW, etc.)
- Metadados de camera (XMLs, CSVs do DIT/Logger)
- Claquete / slate (referencia visual)
- Relatorio de som direto (boletim de som)
- LUT de referencia aplicada no set (se houver)
- Observacoes do diretor sobre takes preferidos (circled takes)

**Tarefas:**
- Conferir integridade dos arquivos (checksum MD5/XXH64)
- Criar copias de seguranca (regra 3-2-1: 3 copias, 2 midias diferentes, 1 off-site)
- Organizar por dia de filmagem, camera, cartao
- Sincronizar audio com video (quando som direto separado)
- Gerar proxies para edicao (quando material e RAW pesado)
- Importar no projeto de edicao (Premiere, DaVinci, Avid)

**Responsavel:** Assistente de edicao ou coordenador de pos

**Duracao tipica:** 1-3 dias (depende do volume de material)

**Gargalo comum:** Material chega incompleto, sem boletim de som, sem LUT, sem indicacao de takes bons. O editor perde 1-2 dias organizando o que deveria ter vindo pronto.

---

#### ETAPA 1: Montagem (Edicao Offline)

**O que e:** O editor monta o filme com base no roteiro aprovado, storyboard/animatic, e indicacoes do diretor. Em publicidade, o diretor geralmente acompanha a montagem presencialmente nos primeiros dias.

**Entradas:**
- Material organizado + proxies (da etapa anterior)
- Roteiro aprovado
- Storyboard / Animatic (se existir)
- Briefing da agencia / cliente
- Takes preferidos do diretor
- Trilha de referencia (quando agencia ja tem preferencia)

**Tarefas:**
- Primeira montagem (assembly / rough cut)
- Selecao de takes com diretor
- Montagem fina (fine cut) — ritmo, timing, storytelling
- Inclusao de trilha temporaria (temp music)
- Audio basico temporario (limpeza minima de som)
- Inclusao de GC temporario (grafismos placeholder)
- Inclusao de VFX placeholder (quando aplicavel)

**Responsavel:** Editor + Diretor (presencial ou remoto)

**Ferramentas comuns:** Adobe Premiere Pro (maioria), DaVinci Resolve (crescente), Avid Media Composer (cada vez mais raro em publicidade BR)

**Duracao tipica:**
- Filme 30" TVC: 3-7 dias uteis
- Filme 60": 5-10 dias uteis
- Conteudo digital (pack de pecas): 3-15 dias (depende do volume)
- Institucional longo (3-5 min): 7-15 dias uteis

**Gargalo comum:** Diretor indisponivel, agencia muda briefing apos filmagem, material insuficiente para cobrir roteiro (faltou plano, errou continuidade).

---

#### ETAPA 2: Trilha Sonora (paralela a montagem ou pos-montagem)

**O que e:** A trilha musical do filme. Em publicidade brasileira, ha 3 cenarios:

1. **Trilha original** — Produtora de audio compoe sob encomenda (mais comum em TVC grande)
2. **Trilha de banco/stock** — Busca em libraries (Artlist, Epidemic, Premium Beat)
3. **Trilha licenciada** — Musica existente de artista conhecido (mais raro, mais caro)

**Fluxo da trilha original:**
```
Briefing de trilha (editor/diretor > produtora de audio)
  |
  v
Composicao de opcoes (2-3 versoes)
  |
  v
Apresentacao para diretor + agencia
  |
  v
Aprovacao de trilha (agencia + cliente)
  |
  v
Producao final da trilha (master stems)
```

**Responsavel:** Produtora de audio (terceirizada na maioria dos casos)

**Produtoras de audio relevantes no BR:** A9 Audio, Jamute, Mugshot, Satelite, Lua Nova, Ritmika, Cafa, Panela, Cabaret

**Duracao tipica:** 5-10 dias uteis (composicao + aprovacao)

**Gargalo comum:** Trilha e a etapa com MAIS rounds de aprovacao. Agencia tem preferencia mas nao sabe descrever. Cliente veta trilha no ultimo minuto. Direitos autorais de trilha licenciada travam processo.

---

#### ETAPA 3: Apresentacao Offline (V1)

**O que e:** O primeiro corte "apresentavel" e enviado para aprovacao da agencia e/ou cliente. Em publicidade brasileira, o fluxo de aprovacao tem camadas:

```
Editor + Diretor montam
  |
  v
Produtora (PE/Coordenador de Pos) valida internamente
  |
  v
Envia para Agencia (Diretor de Criacao + RTVC)
  |
  v
Agencia valida e envia para Cliente (Gerente de Marketing + Jurídico)
```

**Como e feito o envio:**
- **Frame.io** (padrao de mercado para review com timecode) — maioria das produtoras grandes
- **Vimeo** (com senha) — muito usado, mais simples
- **Google Drive** — produtoras menores
- **WeTransfer / Filemail** — para arquivos pesados sem necessidade de review online
- **WhatsApp** — sim, acontece. Agencia pede "manda rapido pelo zap" para filmes curtos

**Specs do arquivo Offline:**
- Resolucao: 1920x1080 (Full HD) — nao precisa ser 4K nessa fase
- Codec: H.264 (MP4) — leve para streaming
- Bitrate: 10-20 Mbps
- Queima de TC (timecode burn-in): obrigatorio para facilitar feedback
- Marca d'agua "OFFLINE" ou "PARA APROVACAO" — protege contra vazamento
- Safe area / action safe quando o destino final e TV

**Duracao tipica do ciclo:** 1-3 dias para feedback (mas pode levar semanas se cliente demora)

**Gargalo comum:** Feedback chega fragmentado (uma pessoa manda por email, outra pelo WhatsApp, outra liga). Feedback contradiz entre agencia e cliente. Deadline de veiculacao aperta e ninguem aprova.

---

#### ETAPA 4: Ciclo de Alteracoes Offline

**O que e:** Rounds de alteracao baseados no feedback recebido. Em publicidade brasileira, NAO HA LIMITE FORMAL de rounds na maioria dos contratos (diferente de mercados mais maduros).

**Realidade brasileira:**
- **Rounds tipicos:** 2-4 (V1, V2, V3, V4)
- **Maximo que ja vi:** 13+ versoes (CEO da Ellah confirmou)
- **Motivo do excesso:** escopo mal definido, muitos stakeholders aprovando, cliente indeciso, agencia muda conceito no meio
- **Custo oculto:** cada round custa tempo de editor + diretor + coordenacao. A maioria dos orcamentos nao preve mais de 3 rounds

**Nomenclatura de versoes (padrao recomendado):**
```
{CLIENTE}_{TITULO}_{VERSAO}_{TIPO}_{DATA}
Exemplo: BRAHMA_Verao2026_V3_OfflineRef_20260315
```

Tipos comuns:
- `OfflineRef` — corte offline de referencia
- `OfflineApproval` — versao para aprovacao formal
- `ColorRef` — referencia de color
- `OnlineRef` — referencia online (com VFX/color)
- `OnlineApproval` — versao para aprovacao final
- `Master` — master final aprovado
- `AirCheck` — versao para veiculacao

**Gargalo comum:** Feedback chega em formatos diferentes (WA, email, telefone, Frame.io). Ninguem consolida. Editor recebe instrucoes contraditorias. PE/Coordenador de Pos gasta horas "traduzindo" feedback.

---

#### ETAPA 5: Aprovacao Offline (Lock de Corte)

**O que e:** O momento em que o corte editorial e formalmente aprovado. A partir daqui, alteracoes de montagem sao "extra" e podem gerar custo adicional.

**Quem aprova:**
1. Diretor do filme (criativo)
2. PE / Produtora (garantia de qualidade + viabilidade)
3. Diretor de Criacao da agencia (conceito + storytelling)
4. RTVC da agencia (tecnico + conformidade com briefing)
5. Cliente (aprovacao final — gerente de marketing, as vezes diretor de marca ou VP)
6. Juridico do cliente (quando ha claims, comparacoes, imagens de menores, etc.)

**O que deve estar registrado no lock:**
- Versao aprovada (numero + link + screenshot)
- Data da aprovacao
- Quem aprovou (nome + cargo + empresa)
- Observacoes / ressalvas ("aprovado com a ressalva de ajustar o GC final")
- Se aprovacao foi por email, WA, ou plataforma (evidencia)

**Importancia:** O lock de corte e um marco CRITICO. Ele libera as etapas paralelas de finalizacao (color, VFX, audio). Se o corte mudar depois do lock, toda a cadeia e afetada — conformacao precisa ser refeita, color precisa ser refeito, audio precisa ser re-sincronizado.

**Gargalo comum:** Cliente "aprova" verbalmente pelo WhatsApp, mas depois pede mudancas "pequenas" que alteram a montagem. Sem registro formal, nao ha como argumentar que e extra. O ELLAHOS pode resolver isso com aprovacao formal rastreavel.

---

#### ETAPA 6: Color Grading

**O que e:** Correcao de cor e tratamento de imagem. Em publicidade brasileira, o colorista e quase sempre um profissional especializado (nao e o editor).

**Fluxo:**
```
Lock de corte offline
  |
  v
Conformacao (relink do offline para material original RAW/hi-res)
  |
  v
Sessao de color grading (presencial ou remota)
  |
  v
Apresentacao de referencia de color (V1 Color)
  |
  v
Aprovacao de color (diretor + agencia)
  |
  v
Render do color grading finalizado
```

**Quem faz:**
- **Interno:** produtora com DaVinci Resolve e colorista fixo (raro)
- **Estudio parceiro:** O2 Pos, Psycho n'Look, Warriors, Clan VFX, Cora Pos, 300ml
- **Freela especializado:** colorista com suite propria

**Informacoes tecnicas necessarias:**
- Codec de captacao (ARRIRAW, R3D, BRAW, ProRes, etc.)
- Color space de captacao (ARRI LogC, REDWideGamutRGB, BMD Film Gen5, etc.)
- LUT de set (se aplicada)
- CDL / grade de referencia do DOP
- Aspect ratio final (16:9, 2.39:1, 4:5, 9:16, 1:1)
- Resolucao final de entrega
- Formato de output (DPX, EXR, ProRes 4444, ProRes HQ)
- Destino final (TV, cinema, digital) — afeta brilho, contraste, gamut

**Duracao tipica:** 1-3 dias (sessao) + 1-2 dias (aprovacao)

**Gargalo comum:** Conformacao errada (timeline offline nao bate com material original), falta de CDL/LUT do DOP, diretor quer um "look" que nao combina com o material captado, monitor do cliente nao esta calibrado e ele reclama de cor que esta correta.

---

#### ETAPA 7: VFX / Motion Graphics / 3D

**O que e:** Efeitos visuais, animacoes, grafismos, CGI. Em publicidade brasileira, e muito comum ter pelo menos motion graphics (pacotes, inserts de produto, GC — geracao de caracteres).

**Tipos comuns em publicidade BR:**

| Tipo | Descricao | Complexidade | Prazo tipico |
|------|-----------|-------------|-------------|
| GC (letterings) | Textos legais, packshots, logos | Baixa | 1-2 dias |
| Motion Graphics | Animacao 2D, infograficos, transicoes | Media | 3-7 dias |
| Compositing | Integracao de elementos filmados + CG | Media-Alta | 5-15 dias |
| Cleanup | Remocao de fios, marcas, objetos | Media | 2-5 dias |
| CGI / 3D | Produto 3D, cenarios virtuais, personagens | Alta | 10-30+ dias |
| VFX pesado | Explosoes, fluidos, destruicao | Muito Alta | 15-45+ dias |

**Responsaveis:**
- GC/Motion: pode ser o editor ou motion designer (interno ou freela)
- Compositing/VFX: estudio especializado (Clan VFX, Lobo, Vetor Zero, Sinlogo)
- 3D: estudio 3D (Zombie Studio, Lobo, Vetor Zero)

**Fluxo de aprovacao VFX:**
```
Briefing de VFX (storyboard + referencia)
  |
  v
Wireframe / Animatic 3D (se aplicavel)
  |
  v
Versao draft / previz
  |
  v
Feedback (diretor + agencia)
  |
  v
Versao refinada
  |
  v
Aprovacao
  |
  v
Render final em alta resolucao
  |
  v
Integracao com color grading e conformacao
```

**Gargalo comum:** VFX e frequentemente a etapa com MAIOR atraso em producao publicitaria. Motivos: briefing muda, complexidade subestimada no orcamento, render pesado, entregas parciais que travam a finalizacao.

---

#### ETAPA 8: Sound Design + Foley

**O que e:** Criacao e edicao de efeitos sonoros, ambientes, foley (sons de passos, roupas, objetos). Em publicidade brasileira, geralmente e feito pela mesma produtora de audio que faz a trilha.

**Elementos:**
- Ambientes (cidade, praia, escritorio, etc.)
- Efeitos (portas, carros, celulares, UI sounds)
- Foley (passos, roupas, manuseio de objetos)
- VO / Locutor (quando o filme tem locucao)
- Dublagem / ADR (quando som direto ficou ruim)

**Fluxo:**
```
Lock de corte + trilha aprovada
  |
  v
Sound design (criacao de efeitos + ambientes)
  |
  v
Foley session (quando necessario)
  |
  v
Gravacao de VO / locucao (quando aplicavel)
  |
  v
Edicao de dialogos (limpeza + nivelamento)
  |
  v
Pre-mix
  |
  v
Sessao de mixagem (presencial ou remota)
  |
  v
Aprovacao de audio (diretor + agencia)
  |
  v
Master de audio (WAV 48kHz 24bit + versoes para cada formato de entrega)
```

**Duracao tipica:** 3-7 dias uteis (design + mix)

**Gargalo comum:** VO precisa ser refeito (locutora nao agradou), sound design depende de VFX finalizado (nao pode sonorizar o que nao existe), mix muda quando color revela que uma cena foi cortada.

---

#### ETAPA 9: Mixagem de Audio

**O que e:** Equilíbrio final de todos os elementos sonoros (dialogos, trilha, efeitos, ambientes). Em publicidade brasileira, a mixagem e feita em estudio profissional com monitoracao calibrada.

**Especificacoes tecnicas criticas:**

| Destino | Loudness | Formato |
|---------|----------|---------|
| TV aberta (Globo, Band, SBT, Record) | -24 LUFS (ABNT NBR 15602) | Stereo + eventual 5.1 |
| TV paga (Globosat, Turner, Discovery) | -24 LUFS | Stereo |
| Digital / YouTube | -14 LUFS (recomendado) | Stereo |
| Digital / Instagram/TikTok | -14 LUFS | Stereo |
| Cinema | -27 LUFS (padrao cinema) | 5.1 ou 7.1 |

**NOTA IMPORTANTE — NORMA DE LOUDNESS BRASILEIRA:**
A ABNT NBR 15602 (e complementar 15604) define limites de loudness para TV aberta no Brasil. Emissoras rejeitam material fora da norma. Isso e uma das maiores causas de rejeicao de master no QC. O sistema DEVE ter campo para registrar o loudness target de cada entregavel.

**Gargalo comum:** Mix feito para um padrao (digital) e o material precisa ir para TV (loudness diferente). Resultado: remixagem de ultima hora. O ELLAHOS pode prevenir isso exigindo a definicao de destinos de veiculacao ANTES de comecar a pos.

---

#### ETAPA 10: Finalizacao / Conformacao (Online)

**O que e:** O processo de pegar o corte offline aprovado e "conformar" (religar) com o material original em alta resolucao, aplicar color, VFX, GC, e gerar o master.

**Fluxo tecnico:**
```
EDL / XML / AAF do offline
  |
  v
Relink com material original (RAW / hi-res)
  |
  v
Aplicacao do color grading (via EDL/LUT ou roundtrip DaVinci)
  |
  v
Integracao dos VFX renderizados
  |
  v
Insercao de GC / packshots / logos finais
  |
  v
Verificacao frame a frame (conformacao)
  |
  v
Audio master sync
  |
  v
Online V1 (primeira versao finalizada)
```

**Responsavel:** Finalizador / Online Editor (profissional especifico, nao e o editor de montagem)

**Duracao tipica:** 2-5 dias uteis

**Gargalo comum:** XML do Premiere nao traduz corretamente para DaVinci (problemas de retiming, multicam, nested sequences). Color grading precisa ser refeito parcialmente. VFX entrega com alpha mal recortado. GC com informacoes legais erradas (juridico do cliente muda texto no ultimo dia).

---

#### ETAPA 11: Apresentacao Online + Aprovacao Final

**O que e:** A versao finalizada (com color, VFX, audio, GC) e apresentada para aprovacao. Em publicidade brasileira, geralmente e uma sessao presencial em "sala de finalizacao" ou, cada vez mais, via link.

**Ciclo:**
```
Online V1 enviada para aprovacao
  |
  v
Feedback da agencia / cliente
  |
  v
Alteracoes online (V2, V3...)
  |
  v
APROVACAO FINAL (lock online)
```

**Rounds tipicos no Online:** 1-3 (menos que no Offline, porque o grosso criativo ja foi aprovado)

**O que muda no Online (alteracoes comuns):**
- Ajustes de cor pontuais ("esse plano ficou muito escuro")
- Posicao/tamanho de GC
- Timing de animacao de logo/packshot
- Ajuste de volume do VO vs trilha
- Correcao de informacao legal no lettering
- Raramente: troca de plano (quando acontece, gera re-conformacao completa)

**Gargalo comum:** Cliente quer mudar montagem no Online (deveria ter sido resolvido no Offline). Isso gera re-conformacao, re-color, re-VFX — custo e prazo extra que ninguem previu.

---

#### ETAPA 12: QC (Quality Control)

**O que e:** Verificacao tecnica do master antes da entrega. Em producao para TV aberta no Brasil, o QC e OBRIGATORIO — as emissoras rejeitam material que nao passa.

**Checklist de QC:**

| Item | Verificacao |
|------|------------|
| Resolucao | Conforme spec do destino |
| Codec / wrapper | Conforme spec (ProRes, XDCAM, H.264) |
| Bitrate | Dentro dos limites |
| Framerate | 29.97fps (TV BR) ou 23.976 (cinema) ou 25fps (TV europa) |
| Aspect ratio | Correto para o destino (16:9, 4:3 letterbox, etc.) |
| Safe area | Texto e elementos criticos dentro da safe area |
| Loudness | Conforme norma ABNT (-24 LUFS para TV) |
| True Peak | Max -1 dBTP |
| Barras de cor | SMPTE bars no inicio (quando exigido) |
| Slate | Informacoes do filme (titulo, duracao, versao, data) |
| Duracao | Exata (30"00f, 15"00f, etc.) — nao pode ter 1 frame a mais ou a menos |
| Blacks e whites | Sem crushed blacks, sem clipping |
| Aliasing / flickering | Sem artefatos visuais |
| Audio sync | Lip-sync perfeito |
| Audio channels | Corretos (L/R, 5.1 mapeado corretamente) |
| Legendas / CC | Quando aplicavel, verificar timing e ortografia |

**Quem faz:** Finalizador ou coordenador de pos (em produtoras grandes, ha QC dedicado)

**Gargalo comum:** QC descobre problema depois que tudo foi "aprovado". Retorna para correcao, perde 1-2 dias. O ELLAHOS pode criar um checklist de QC por tipo de entregavel para evitar esquecimentos.

---

#### ETAPA 13: Master + Copias (Desdobramentos)

**O que e:** Geracao do master final e todas as copias/versoes necessarias para cada canal de veiculacao.

**Desdobramentos comuns em publicidade BR:**

| Peca | Duracao | Janela | Destino |
|------|---------|--------|---------|
| TVC 30" | 30 segundos | 16:9 HD | TV aberta / paga |
| TVC 15" | 15 segundos | 16:9 HD | TV aberta / paga |
| Bumper 6" | 6 segundos | 16:9 HD | YouTube |
| Digital 30" | 30 segundos | 16:9 HD | YouTube, Facebook |
| Digital 15" | 15 segundos | 9:16 vertical | Instagram Stories, TikTok |
| Digital 15" | 15 segundos | 4:5 | Instagram Feed |
| Digital 15" | 15 segundos | 1:1 quadrado | Facebook Feed |
| Cinema 30" | 30 segundos | 2.39:1 ou DCI flat | Salas de cinema |
| OOH 15" | 15 segundos | 16:9 ou custom | Paineis DOOH |
| Banner | Variavel | 300x250, 728x90 | Midia programatica |

**NOTA SOBRE JANELAS (aspect ratios):**
Em publicidade brasileira, um unico job pode exigir 5-10+ versoes diferentes do mesmo filme. Cada versao pode ter reenquadramento (reframe), GC reposicionado, e as vezes corte diferente. Isso e um ENORME gerador de trabalho que raramente e adequadamente orcado.

O ELLAHOS precisa ter um campo de "janelas de entrega" por job, com status individual por janela.

**Gargalo comum:** Janelas sao pedidas depois do orcamento. Cliente pede "ah, tambem precisa de 9:16" quando o filme foi pensado e filmado em 16:9. Reenquadramento exige trabalho manual significativo.

---

#### ETAPA 14: Entrega

**O que e:** Envio dos masters finais para os destinos de veiculacao.

**Como funciona no Brasil:**

| Destino | Forma de entrega | Formato |
|---------|-----------------|---------|
| Globo (TV aberta) | Portal AdSend ou Unimidia | XDCAM HD 50Mbps (.mxf) |
| Band, SBT, Record | Portais proprios ou servidor FTP | XDCAM HD ou ProRes |
| Globosat (TV paga) | Portal interno | XDCAM HD 50Mbps |
| YouTube / Google | Upload via plataforma | H.264 MP4 (recomendado ProRes para melhor qualidade) |
| Meta (Facebook/Insta) | Upload via Business Manager | H.264 MP4, H.265 |
| Cinema (nacional) | Servidor/HD, as vezes DCP | DCP (JPEG2000 + MXF) ou ProRes |
| DOOH / OOH | Email ou portal do veiculo | H.264 MP4 ou WMV (depende do veiculo) |
| Agencia (arquivo) | Google Drive / WeTransfer | ProRes HQ ou ProRes 4444 |

**Gargalo comum:** Cada veiculo tem specs diferentes, portais diferentes, cadastros diferentes. Coordenador de pos gasta horas subindo material em 5 portais diferentes. Veiculo rejeita por spec errada. Deadline de veicula impossivel.

---

#### ETAPA 15: Arquivo + Backup

**O que e:** Armazenamento do material apos entrega. O CEO da Ellah indicou retencao minima de 5 anos.

**O que deve ser arquivado:**
- Projeto de edicao (com todas as versoes)
- Material bruto original (RAW/hi-res)
- Masters finais em todos os formatos
- GC / elementos graficos
- Trilha (stems separados)
- Audio final (stems + mix)
- VFX renders
- Color grading project (DaVinci Resolve project + stills + LUTs)
- Documentos (aprovacoes, feedbacks, briefing)

**Politica de storage:**
```
0-6 meses: Storage quente (SSD/NAS local, acesso rapido)
6-24 meses: Storage morno (NAS com redundancia, acesso em horas)
24-60 meses: Storage frio (nuvem glacier, acesso em 24-48h)
60+ meses: Avaliacao caso a caso (manter ou descartar)
```

**Volume tipico por job:**
- Filme publicitario 30" filmado em 4K: 500GB - 2TB de bruto
- Institucional 3-5 min: 1-5TB
- Pack de conteudo digital: 200GB - 1TB

---

### 1.3. Diagrama de dependencias e paralelismo

```
                    LOCK DE CORTE OFFLINE
                           |
            +--------------+--------------+
            |              |              |
       COLOR GRADING    VFX/MOTION    SOUND DESIGN
            |              |              |
            |              |         MIXAGEM AUDIO
            |              |              |
            +--------------+--------------+
                           |
                    CONFORMACAO / ONLINE
                           |
                    APRESENTACAO ONLINE
                           |
                      QC + MASTER
                           |
                      COPIAS/JANELAS
                           |
                        ENTREGA
```

**Regras de dependencia:**
- Color, VFX e Sound Design PODEM comecar em paralelo apos lock de corte
- Conformacao/Online DEPENDE de color + VFX finalizados
- Mixagem DEPENDE de sound design + VO finalizado
- QC DEPENDE de online finalizado + audio master
- Copias DEPENDEM de QC aprovado
- Entrega DEPENDE de copias em todos os formatos

---

## 2. Entregaveis Tipicos — Specs Tecnicas

### 2.1. Formatos de entrega por destino

#### TV Aberta (Brasil)

| Spec | Valor |
|------|-------|
| Resolucao | 1920x1080i (interlaced) ou 1920x1080p |
| Codec | XDCAM HD422 50 Mbps |
| Wrapper | MXF (OP1a) |
| Framerate | 29.97fps (drop frame) |
| Aspect ratio | 16:9 |
| Audio | PCM 48kHz 24bit, Stereo (Ch1: L, Ch2: R) |
| Loudness | -24 LUFS (ABNT NBR 15602), True Peak -1 dBTP |
| Barras | SMPTE Color Bars + Tone 1kHz -20dB (10 seg antes) |
| Slate | Titulo, duracao, data, versao (5 seg antes) |
| Duracao | EXATA (30"00f = 900 frames a 29.97fps) |

#### TV Paga (Brasil)

| Spec | Valor |
|------|-------|
| Resolucao | 1920x1080 |
| Codec | XDCAM HD422 50 Mbps ou ProRes 422 HQ |
| Wrapper | MXF ou MOV |
| Framerate | 29.97fps |
| Aspect ratio | 16:9 |
| Audio | PCM 48kHz 24bit, Stereo |
| Loudness | -24 LUFS |

#### Digital (YouTube, Facebook, Instagram)

| Spec | Valor |
|------|-------|
| Resolucao | 1920x1080 ou 3840x2160 (4K) |
| Codec | H.264 High Profile ou H.265/HEVC |
| Wrapper | MP4 |
| Framerate | 23.976, 24, 29.97, ou 30 fps |
| Bitrate | 20-50 Mbps (HD), 50-100 Mbps (4K) |
| Aspect ratio | 16:9, 9:16, 4:5, 1:1 (depende da plataforma) |
| Audio | AAC 48kHz, Stereo, 320 kbps |
| Loudness | -14 LUFS (recomendado YouTube/Meta) |

#### Cinema (Brasil)

| Spec | Valor |
|------|-------|
| Resolucao | 2048x858 (DCI Scope) ou 1998x1080 (DCI Flat) ou 3996x2160 (4K DCI) |
| Codec | JPEG2000 (DCP) ou ProRes 4444 |
| Wrapper | MXF (DCP package: ASSETMAP + CPL + PKL) |
| Framerate | 24fps |
| Audio | 5.1 ou 7.1 (WAV 48kHz 24bit) |
| Loudness | -27 LUFS (padrao cinema) |

#### OOH / DOOH (Digital Out-of-Home)

| Spec | Valor |
|------|-------|
| Resolucao | Varia por veiculo (1920x1080 mais comum) |
| Codec | H.264 Main Profile |
| Wrapper | MP4 ou WMV |
| Framerate | 25 ou 30 fps |
| Bitrate | 5-20 Mbps |
| Audio | Geralmente sem audio (mudo) |

### 2.2. Formatos de master / arquivo

| Formato | Uso | Qualidade | Tamanho |
|---------|-----|-----------|---------|
| ProRes 4444 XQ | Master maximo (com alpha) | Maximo | Muito grande |
| ProRes 4444 | Master com transparencia (VFX) | Excelente | Grande |
| ProRes 422 HQ | Master padrao de arquivo | Otima | Grande |
| ProRes 422 | Intermediario de qualidade | Boa | Medio |
| DNxHR HQX | Equivalente Avid ao ProRes HQ | Otima | Grande |
| DPX 10bit | Master frame-by-frame (cinema/VFX) | Maximo | Enorme |
| EXR 16bit | Master para VFX/compositing | Maximo | Enorme |
| XDCAM HD422 | Entrega TV | Boa | Medio |
| H.264 | Entrega digital / preview | Boa | Pequeno |
| H.265/HEVC | Entrega digital (mais eficiente) | Boa | Menor |

---

## 3. Fluxo de Aprovacao — Como Funciona na Pratica

### 3.1. Cadeia de aprovacao em publicidade

Em publicidade brasileira, a cadeia de aprovacao tem camadas rigidas. O ELLAHOS precisa refletir isso:

```
PRODUTORA (interna)
  |-- Editor propoe corte
  |-- Diretor valida
  |-- PE / Coordenador de Pos confere specs e qualidade
  |-- ENVIA para agencia
  |
AGENCIA
  |-- RTVC (RTV / Producao) confere conformidade com briefing
  |-- Diretor(a) de Criacao avalia conceito / storytelling
  |-- Planejamento (as vezes) valida mensagem / estrategia
  |-- Atendimento consolida feedback
  |-- ENVIA para cliente (ou retorna para produtora com alteracoes)
  |
CLIENTE
  |-- Gerente de Marketing avalia
  |-- Diretor de Marketing (jobs grandes) aprova
  |-- Juridico (quando aplicavel) valida claims e compliance
  |-- VP ou CMO (jobs institucionais / grandes) da aprovacao final
  |-- RETORNA com aprovacao ou alteracoes
```

### 3.2. O que cada stakeholder tipicamente avalia

| Quem | O que olha |
|------|-----------|
| Editor | Performance tecnica, ritmo, continuidade |
| Diretor | Storytelling, emocao, interpretacao, fotografia |
| PE / Coord. Pos | Prazo, specs, viabilidade, escopo |
| RTVC (agencia) | Conformidade com briefing, duracao, enquadramento |
| Dir. Criacao (agencia) | Conceito, idea criativa, impacto emocional |
| Gerente Mkt (cliente) | Mensagem, branding, call-to-action |
| Juridico (cliente) | Claims, asteriscos, direitos de imagem, regulatorio |
| VP / CMO | Alinhamento com estrategia de marca |

### 3.3. Aprovacao por etapa

| Etapa | Quem aprova | Tipo de aprovacao | Rounds tipicos |
|-------|-------------|-------------------|----------------|
| Corte Offline | Diretor + Agencia + Cliente | Criativa | 2-5 |
| Trilha sonora | Diretor + Agencia (+ Cliente se quiser) | Criativa | 2-4 |
| Color grading | Diretor + DOP + Agencia | Tecnica-criativa | 1-3 |
| VFX / Motion | Diretor + Agencia + Cliente | Tecnica-criativa | 2-4 |
| Sound Design | Diretor + Agencia | Criativa | 1-2 |
| Mix de audio | Diretor + Agencia | Tecnica | 1-2 |
| Online final | Agencia + Cliente | Final | 1-3 |
| GC / Textos legais | Agencia + Juridico cliente | Compliance | 1-3 |

### 3.4. Aprovacao de Color — Particularidades

A aprovacao de color merece destaque porque e a que mais gera frustracoes:

**Problemas reais:**
- Cliente assiste num laptop nao calibrado e reclama que "ta escuro"
- Agencia aprova na sala de color, cliente desaprova no celular
- Prints de tela nao representam a cor real
- Cada monitor mostra diferente

**Boas praticas que o ELLAHOS pode incentivar:**
- Registrar o tipo de monitoria em que a aprovacao foi feita
- Campo "ambiente de aprovacao" (sala calibrada / remoto / celular)
- Warning automatico: "aprovacao de cor feita em ambiente nao controlado"
- Link para video com color space correto (Rec.709 para TV, sRGB para digital)

### 3.5. Fluxo de feedback — Realidade brasileira

**Como o feedback REALMENTE chega (em ordem de frequencia):**
1. WhatsApp (mensagem de texto e audio) — 60%
2. Frame.io (comentarios com timecode) — 20%
3. Email (texto corrido, as vezes com screenshots) — 10%
4. Telefone / videoconferencia — 5%
5. Presencial — 5%

**O que o ELLAHOS pode fazer de unico:**
- Campo para registrar a FONTE do feedback (WA, Frame.io, email, presencial)
- Integracao com WA para capturar feedbacks automaticamente
- Consolidacao de feedbacks de multiplas fontes em uma unica lista por versao
- Campo "quem disse" + "quando disse" + "o que disse" + "foi atendido?"
- Alerta de feedback contraditorios ("agencia pediu X, cliente pediu o oposto de X")

---

## 4. Gestao de Versoes

### 4.1. Nomenclatura padrao recomendada

```
{CODIGO_JOB}_{TITULO_CURTO}_{DURACAO}_{JANELA}_{VERSAO}_{TIPO}_{DATA}
```

**Exemplos reais:**
```
ELH-2026-038_Brahma_30s_16x9_V1_OfflineRef_20260315.mp4
ELH-2026-038_Brahma_30s_16x9_V3_OfflineApproval_20260320.mp4
ELH-2026-038_Brahma_30s_16x9_V1_ColorRef_20260325.mp4
ELH-2026-038_Brahma_30s_16x9_V2_OnlineRef_20260328.mp4
ELH-2026-038_Brahma_30s_16x9_V1_OnlineApproval_20260401.mp4
ELH-2026-038_Brahma_30s_16x9_MASTER_20260403.mov
ELH-2026-038_Brahma_15s_9x16_MASTER_20260403.mp4
ELH-2026-038_Brahma_30s_16x9_AIRCHECK_Globo_20260403.mxf
```

**Componentes:**

| Campo | Descricao | Exemplos |
|-------|-----------|----------|
| CODIGO_JOB | Codigo unico do job no sistema | ELH-2026-038 |
| TITULO_CURTO | Nome curto do projeto (sem espacos) | Brahma, Senac, Nike |
| DURACAO | Duracao da peca | 30s, 15s, 60s, 6s, 3min |
| JANELA | Aspect ratio simplificado | 16x9, 9x16, 4x5, 1x1, Scope |
| VERSAO | Numero sequencial | V1, V2, V3... MASTER |
| TIPO | Fase/proposito da versao | OfflineRef, ColorRef, OnlineApproval, Master, AirCheck |
| DATA | Data de geracao (YYYYMMDD) | 20260315 |

### 4.2. Tipos de versao

| Tipo | Significado | Quando usar |
|------|-------------|------------|
| `OfflineRef` | Referencia de montagem offline | Primeiras versoes para feedback |
| `OfflineApproval` | Versao para aprovacao formal de corte | Quando se busca lock de corte |
| `ColorRef` | Referencia de color grading | Para aprovacao de cor |
| `VFXRef` | Referencia de VFX/motion | Para aprovacao de efeitos |
| `AudioRef` | Referencia de audio/mix | Para aprovacao de som |
| `OnlineRef` | Referencia online (tudo junto) | Versao quase final |
| `OnlineApproval` | Versao para aprovacao final | Quando se busca lock final |
| `Master` | Master final aprovado | Versao definitiva |
| `AirCheck` | Copia para veiculacao | Formatada para veiculo especifico |
| `ClientFile` | Arquivo para uso interno do cliente | Apresentacoes, eventos |

### 4.3. Metadados por versao

O sistema deve registrar para cada versao:

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| version_number | int | Sim | Numero sequencial (1, 2, 3...) |
| version_type | enum | Sim | OfflineRef, ColorRef, OnlineApproval, Master, etc. |
| file_name | text | Sim | Nome do arquivo (padronizado) |
| file_url | text | Sim | URL do arquivo (Drive, Frame.io, Vimeo, etc.) |
| file_size_mb | decimal | Nao | Tamanho em MB |
| resolution | text | Nao | Ex: 1920x1080 |
| codec | text | Nao | Ex: H.264, ProRes 422 HQ |
| duration_seconds | decimal | Nao | Duracao em segundos |
| framerate | text | Nao | Ex: 29.97, 23.976 |
| aspect_ratio | text | Nao | Ex: 16:9, 9:16 |
| has_timecode_burn | bool | Nao | Se tem TC queimado |
| has_watermark | bool | Nao | Se tem marca d'agua |
| created_by | uuid | Sim | Quem gerou a versao |
| created_at | timestamp | Sim | Quando foi criada |
| review_platform | text | Nao | Onde foi enviada para review (Frame.io, Vimeo, etc.) |
| review_url | text | Nao | URL de review (com comentarios) |
| approval_status | enum | Sim | pending, in_review, approved, rejected, superseded |
| approved_by | text | Nao | Nome(s) de quem aprovou |
| approved_at | timestamp | Nao | Quando foi aprovada |
| feedback_summary | text | Nao | Resumo do feedback recebido |
| changes_from_previous | text | Nao | O que mudou em relacao a versao anterior |
| notes | text | Nao | Observacoes livres |

### 4.4. Historico e rastreabilidade

O sistema deve manter uma timeline por entregavel:

```
TIMELINE DO FILME 30" 16:9:

15/03 - V1 OfflineRef criada por Editor (Carlos)
16/03 - V1 enviada para agencia via Frame.io
18/03 - Feedback recebido (agencia): "Encurtar cena 3, trocar take do plano 7"
18/03 - V2 OfflineRef criada por Editor (Carlos)
19/03 - V2 enviada para agencia + cliente
21/03 - Feedback recebido (cliente): "Aprovado com ressalva — ajustar GC"
21/03 - V3 OfflineApproval criada por Editor (Carlos)
22/03 - V3 APROVADA — Lock de corte (agencia: Maria, cliente: Joao)
25/03 - V1 ColorRef criada por Colorista (Ana) — sessao presencial
26/03 - V1 ColorRef APROVADA (diretor + agencia)
28/03 - V1 OnlineRef criada por Finalizador (Pedro)
29/03 - Feedback (agencia): "GC precisa subir 10px, logo menor"
30/03 - V2 OnlineRef criada por Finalizador (Pedro)
31/03 - V2 OnlineApproval APROVADA — Lock final
01/04 - Master gerado + QC OK
01/04 - Copias: 30s 16:9 Master, 15s 16:9 Master, 30s 9:16 Master
02/04 - Entrega: Globo (XDCAM), YouTube (H.264), Instagram (H.264 9:16)
```

---

## 5. Briefing Tecnico de Pos-Producao

### 5.1. Informacoes que o coordenador de pos PRECISA antes de comecar

Essas informacoes devem ser coletadas na pre-producao ou imediatamente apos a filmagem. Se nao forem coletadas, a pos-producao comecar "no escuro" e perde tempo.

#### Campos OBRIGATORIOS

| Campo | Tipo | Descricao | Exemplo |
|-------|------|-----------|---------|
| capture_codec | text | Codec de captacao | ARRIRAW, RED R3D, BRAW, ProRes HQ |
| capture_resolution | text | Resolucao de captacao | 4.6K, 6K, 8K, 4K UHD, HD |
| capture_framerate | text | FPS de captacao | 23.976, 25, 29.97, 47.952, 59.94 |
| capture_color_space | text | Espaco de cor | ARRI LogC3 AWG, REDWideGamutRGB Log3G10, BMD Film Gen5 |
| final_aspect_ratio | text | Aspect ratio principal | 16:9, 2.39:1, 1.85:1 |
| final_resolution | text | Resolucao de entrega | 1920x1080, 3840x2160 |
| delivery_formats | jsonb | Formatos/janelas de entrega | [{"duracao":"30s","janela":"16:9","destino":"TV"},{"duracao":"15s","janela":"9:16","destino":"Instagram"}] |
| has_vfx | bool | Se o job tem VFX | true/false |
| has_motion_graphics | bool | Se tem motion/GC | true/false |
| has_locucao | bool | Se tem VO/locucao | true/false |
| post_house | text | Estudio/pessoa que faz a pos | Nome do estudio ou "interno" |
| editor_name | text | Nome do editor | Vinculado ao job_team |
| post_deadline | date | Prazo final de entrega | Data |
| air_date | date | Data de veiculacao (quando aplicavel) | Data (CRITICO para TV) |

#### Campos RECOMENDADOS

| Campo | Tipo | Descricao | Exemplo |
|-------|------|-----------|---------|
| set_lut | text | LUT aplicada no set | "ARRI LogC to Rec709" |
| dop_cdl | text | CDL / grade de referencia do DOP | Arquivo .cdl ou descricao |
| camera_model | text | Camera(s) usada(s) | ARRI Alexa Mini, RED V-Raptor, Sony FX6 |
| lenses | text | Lentes usadas | Master Primes, Signature Primes, Cooke S4 |
| has_slow_motion | bool | Se tem high frame rate | true/false |
| slow_motion_fps | text | FPS das tomadas em slow | 96fps, 120fps, 240fps |
| has_drone | bool | Se tem aereo/drone | true/false |
| sound_format | text | Formato de som direto | WAV 48kHz 24bit, Poly WAV |
| sound_tc_sync | text | Metodo de sync | Timecode, Slate, Pluraleyes |
| offline_tool | text | Software de edicao | Premiere Pro, DaVinci Resolve, Avid |
| color_tool | text | Software de color | DaVinci Resolve, Baselight |
| total_shooting_days | int | Dias totais de filmagem | 2 |
| total_raw_storage_gb | int | Volume estimado de bruto (GB) | 800 |
| music_type | text | Tipo de trilha | original, stock, licenciada |
| music_house | text | Produtora de audio | A9 Audio, Jamute, etc. |
| gc_legal_text | text | Textos legais / asteriscos | "Imagens meramente ilustrativas..." |
| client_review_tool | text | Ferramenta de review do cliente | Frame.io, Vimeo, WhatsApp |

### 5.2. Briefing tecnico como formulario no ELLAHOS

O ideal e que esse briefing seja uma sub-tab dentro da aba de Pos-Producao do job, preenchido pelo coordenador de pos ou PE imediatamente apos a filmagem (ou antes, na pre-producao para campos ja conhecidos).

**Sugestao de UX:** dividir em 3 secoes:
1. **Material de Captacao** (codec, resolucao, fps, color space, camera, lentes)
2. **Entregaveis** (formatos, janelas, destinos, prazos, air date)
3. **Equipe e Ferramentas** (editor, colorista, estudio, produtora de audio, ferramentas)

---

## 6. KPIs e Metricas para Dashboard de Pos-Producao

### 6.1. Metricas operacionais (coordenador de pos)

| Metrica | Descricao | Calculo | Meta tipica |
|---------|-----------|---------|-------------|
| Jobs em pos | Quantos jobs estao em pos-producao agora | Count onde status = pos_producao | Visibilidade |
| Etapa atual por job | Em qual das 12+ etapas cada job esta | Ultimo step ativo | Visibilidade |
| Dias em pos por job | Quantos dias cada job esta em pos | hoje - post_start_date | <30 dias (TVC), <60 dias (longo) |
| Aprovacoes pendentes | Quantas versoes estao aguardando aprovacao | Count onde approval_status = in_review | <3 (ideal) |
| Dias para aprovacao | Tempo medio entre envio e aprovacao | avg(approved_at - sent_at) | <3 dias uteis |
| Rounds por job | Media de rounds de alteracao | avg(max version_number por fase) | <4 (offline), <2 (online) |
| Jobs atrasados | Jobs onde post_deadline < hoje e status != entregue | Count | 0 (ideal) |
| Taxa de rejeicao QC | % de masters rejeitados no QC | rejected / total | <5% |
| Janelas pendentes | Copias/formatos ainda nao gerados | Count por job | 0 no dia de entrega |
| Utilizacao editor | Quantos jobs cada editor esta tocando | Count por editor | 2-3 simultaneos (max) |

### 6.2. Metricas estrategicas (CEO / PE)

| Metrica | Descricao | Calculo | Por que importa |
|---------|-----------|---------|-----------------|
| Tempo medio de pos | Do ingest ate a entrega final | avg(delivery_date - post_start_date) | Benchmark para orcamento e prazo |
| Custo de pos por job | Soma de custos da fase pos | Sum cost_items onde fase = pos | Margem real |
| Custo de alteracoes extras | Custo de rounds alem do orcado | Sum custo rounds > orcado | Dinheiro "perdido" |
| Top 5 gargalos | Etapas que mais atrasam | avg dias por etapa, ordenado | Onde investir melhoria |
| Ocupacao da pos | % da capacidade utilizada | jobs_ativos / capacidade_max | Sazonalidade, contratacao |
| Satisfacao pos-entrega | NPS ou rating do cliente apos entrega | avg rating pos-entrega | Retencao de cliente |
| Custo retrabalhpo por mudanca de briefing | Custo quando feedback contradiz briefing original | Estimativa manual | Negociacao com agencia |

### 6.3. Dashboard visual recomendado

```
+--------------------------------------------------+
|  POS-PRODUCAO — VISAO GERAL           [Filtros]  |
+--------------------------------------------------+
|                                                   |
|  [12] Jobs em pos    [5] Pendentes    [2] Atrasados |
|                                                   |
+--------------------------------------------------+
|  PIPELINE (kanban horizontal)                     |
|                                                   |
|  Ingest | Montagem | Trilha | Offline | Color |  |
|  [2]    | [3]      | [2]    | [1]     | [2]   |  |
|                                                   |
|  VFX | Sound | Online | QC | Master | Entrega |  |
|  [1] | [2]   | [1]    | [0]| [0]    | [1]     |  |
|                                                   |
+--------------------------------------------------+
|  JOBS DETALHADOS (lista/tabela)                   |
|                                                   |
|  Job 038 - Brahma Verao | Etapa: Color | V3      |
|  [============================>----] 75% | -2d    |
|                                                   |
|  Job 041 - Senac EAD | Etapa: Montagem | V1      |
|  [======>--------------------------] 20% | +5d    |
|                                                   |
|  Job 039 - Nike Run | Etapa: Entrega | Master    |
|  [=================================>] 95% | 0d    |
|                                                   |
+--------------------------------------------------+
|  APROVACOES PENDENTES           ALERTAS           |
|                                                   |
|  * Job 038 V3 Offline          * Job 041 sem      |
|    Agencia: 2 dias             briefing tecnico   |
|    Frame.io: 3 comments        * Job 038 VFX      |
|                                 atrasado 3 dias   |
|  * Job 040 V1 Color            * Job 042 sem      |
|    Cliente: aguardando          editor alocado    |
|                                                   |
+--------------------------------------------------+
```

---

## 7. Pain Points Reais — O Que Doi de Verdade

### 7.1. As 10 maiores dores de um coordenador de pos em produtora de publicidade

**1. Feedback fragmentado e contraditorios**
- Feedback chega por WA, email, Frame.io, telefone — de pessoas diferentes
- Ninguem consolida. Editor recebe 3 versoes do "o que mudar"
- Agencia diz uma coisa, cliente diz outra
- **O que o ELLAHOS pode fazer:** Centralizar feedback por versao, com campo "fonte" e "quem disse". Alerta automatico de feedbacks contraditorios.

**2. Escopo que muda sem aviso (e sem custo adicional)**
- Cliente pede "mais uma versao 9:16" que nao estava no orcamento
- Agencia muda roteiro apos filmagem
- "Ajustezinhos" que viram re-edicao completa
- **O que o ELLAHOS pode fazer:** Comparar entregaveis orcados vs solicitados. Flag "EXTRA" com alerta ao CEO/PE. Registro de quem pediu e quando.

**3. Material bruto desorganizado**
- Bruto chega sem boletim de som, sem takes circled, sem LUT
- Editor perde 1-2 dias organizando
- Ninguem sabe em qual SSD esta o material de qual job
- **O que o ELLAHOS pode fazer:** Checklist de ingest (o que TEM que vir junto com o bruto). Campo de localizacao fisica do material (SSD #, prateleira, etc.). Alerta quando checklist esta incompleto.

**4. Falta de visibilidade para o CEO/PE**
- CEO pergunta "como ta o Job 38?" e ninguem sabe responder em 5 segundos
- Nao sabe em qual etapa cada job esta
- Descobre que ta atrasado quando ja era tarde
- **O que o ELLAHOS pode fazer:** Pipeline visual com status em tempo real. Alertas de atraso automaticos. Dashboard que o CEO abre e ve tudo.

**5. Prazos impossíveis de veiculacao**
- Emissora exige master 5 dias antes do ar. Agencia aprova 2 dias antes
- Acumulo no final do mes/trimestre (todo mundo quer veicular ao mesmo tempo)
- **O que o ELLAHOS pode fazer:** Calendario reverso automatico: a partir da data de veiculacao, calcular quando cada etapa precisa terminar. Alerta quando o prazo e matematicamente impossível.

**6. Conformacao que quebra**
- XML do Premiere nao traduz direito para DaVinci
- Retiming, multicam, e nested sequences causam problemas
- Editor usa plugin que o finalizador nao tem
- **O que o ELLAHOS pode fazer:** Checklist de pre-conformacao (verificar plugins, retiming, multicam). Campo para registrar problemas de conformacao por job. Historico para aprender quais configuracoes causam problemas.

**7. Versoes perdidas**
- "Qual era a versao que o cliente aprovou mesmo?"
- Arquivos sobrescritos, nomes inconsistentes
- Ninguem sabe se a versao no Drive e a final ou a penultima
- **O que o ELLAHOS pode fazer:** Nomenclatura padrao automatica. Historico de versoes com status. Campo "esta e a versao FINAL" com lock.

**8. QC reprovado de ultima hora**
- Master tem loudness errado, duracao errada, codec errado
- Emissora rejeita. Prazo ja estourou
- **O que o ELLAHOS pode fazer:** Checklist de QC por tipo de destino (TV aberta, TV paga, digital, cinema). Preenchimento obrigatorio antes de marcar como "entregue".

**9. Falta de dados para orcamento futuro**
- "Quanto tempo leva a pos de um TVC 30"?" — ninguem tem esse dado
- Orcamentos de pos sao baseados em "feeling"
- **O que o ELLAHOS pode fazer:** Registrar tempo real por etapa, por tipo de job. Gerar benchmark automatico. Sugerir prazos e custos baseados em historico.

**10. Comunicacao com fornecedores de pos (estudio, colorista, produtora de audio)**
- Tudo via WhatsApp, sem registro
- Briefing verbal, referencia por link que expira
- Prazo combinado que ninguem registrou
- **O que o ELLAHOS pode fazer:** Registro de fornecedores de pos por job, com briefing, prazo, entregaveis, e status. Futuro: portal do fornecedor para upload direto.

### 7.2. O que os sistemas existentes NAO resolvem

| Sistema | O que faz bem | O que NAO faz |
|---------|--------------|---------------|
| **Frame.io** | Review com timecode, aprovacao visual | Nao gerencia pipeline, nao tem financeiro, nao integra WA |
| **Shotgrid (Autodesk)** | Pipeline de VFX, tarefas por shot | Complexo demais para publicidade BR, caro, sem financeiro |
| **ftrack** | Pipeline de pos, review | Focado em VFX/animacao, fraco para publicidade, sem financeiro |
| **Monday/Asana** | Gestao de tarefas generica | Nao entende etapas de pos, sem versionamento, sem specs tecnicas |
| **Planilha Google** | Flexibilidade total | Sem automatizacao, sem historico, sem alertas, nao escala |
| **Filemail / WeTransfer** | Envio de arquivos pesados | So envia, nao gerencia, nao versiona, nao aprova |
| **Vimeo** | Hosting de video com privacidade | Review basico, sem pipeline, sem feedback estruturado |

### 7.3. O que o ELLAHOS pode fazer de UNICO

1. **Pipeline completo integrado ao Job:** Pos-producao nao e um sistema separado — e uma aba do Job. O CEO ve o job inteiro: orcamento, equipe, filmagem, pos, financeiro, tudo no mesmo lugar.

2. **Calendario reverso automatico:** Definiu a data de veiculacao? O sistema calcula: "a pos precisa comecar ate dia X, lock de corte ate dia Y, color ate dia Z". Se o prazo e impossível, avisa ANTES de aceitar o job.

3. **Feedback consolidado multi-fonte:** Mesmo que o feedback venha por WA, Frame.io, e email, o sistema registra tudo em um lugar, vinculado a versao especifica. Alerta de feedbacks contraditorios.

4. **Orcamento vs Realidade de pos:** O sistema sabe quanto foi orcado para pos e quanto esta sendo gasto. Alerta quando rounds extras estao gerando custo nao previsto.

5. **Benchmark de prazos e custos:** Depois de 10, 20, 50 jobs, o sistema tem dados reais de quanto tempo e quanto custa cada tipo de pos. Isso alimenta orcamentos futuros com dados, nao "feeling".

6. **Checklist de ingest e QC automatizados:** Templates por tipo de destino. Nao precisa lembrar — o sistema lembra.

7. **WhatsApp como canal de input:** O coordenador de pos pode atualizar status, registrar feedback, e receber alertas via WA. Nao precisa abrir o sistema para cada atualizacao.

8. **Gestao de janelas/desdobramentos:** Um job com 8 versoes (16:9, 9:16, 4:5, 1:1, 30", 15", 6") tem 8 entregaveis com status individual. Nenhum sistema de pos faz isso de forma nativa.

---

## 8. Recomendacoes para Implementacao no ELLAHOS

### 8.1. Estrutura de dados sugerida

O ENUM `pos_sub_status` atual e insuficiente:
```sql
-- ATUAL (6 valores)
pos_sub_status: edicao, cor, vfx, finalizacao, audio, revisao
```

**Recomendacao: Expandir ou criar modelo separado**

O ideal e NAO depender de um ENUM simples. Criar uma tabela `job_post_stages` que permita:
- Etapas configuraveis por job (nem todo job tem VFX, nem todo tem trilha original)
- Status individual por etapa
- Responsavel por etapa
- Datas previstas e reais
- Dependencias entre etapas

```
TABELA: job_post_stages
- id (UUID)
- job_id (FK jobs)
- tenant_id (FK tenants)
- stage_key (text) -- ingest, montagem, trilha, offline_review, color, vfx, sound_design, mix, online, qc, master, entrega
- stage_label (text) -- label legivel (pode ser customizado por tenant)
- sort_order (int) -- ordem de exibicao
- status (enum) -- pending, in_progress, in_review, approved, completed, skipped
- responsible_id (FK people/profiles) -- quem e responsavel
- vendor_name (text) -- estudio/fornecedor terceirizado
- start_date_planned (date)
- start_date_actual (date)
- end_date_planned (date)
- end_date_actual (date)
- notes (text)
- created_at, updated_at

TABELA: job_post_versions
- id (UUID)
- job_id (FK jobs)
- tenant_id (FK tenants)
- deliverable_id (FK job_deliverables, opcional) -- vinculado a qual entregavel
- stage_key (text) -- em qual etapa essa versao foi criada
- version_number (int)
- version_type (text) -- OfflineRef, ColorRef, OnlineApproval, Master, etc.
- file_name (text)
- file_url (text)
- file_size_mb (decimal)
- specs (jsonb) -- { resolution, codec, framerate, aspect_ratio, duration_seconds, loudness }
- review_platform (text) -- Frame.io, Vimeo, Drive, WA
- review_url (text)
- approval_status (enum) -- pending, in_review, changes_requested, approved, superseded
- approved_by (text)
- approved_at (timestamp)
- feedback_summary (text)
- changes_from_previous (text)
- created_by (FK profiles)
- created_at, updated_at

TABELA: job_post_feedback
- id (UUID)
- version_id (FK job_post_versions)
- job_id (FK jobs)
- tenant_id (FK tenants)
- source (text) -- whatsapp, frame_io, email, phone, in_person
- author_name (text)
- author_role (text) -- diretor, rtvc, cliente, etc.
- author_company (text) -- nome da agencia ou cliente
- content (text) -- o feedback em si
- timecode (text) -- quando aplicavel (Frame.io)
- is_addressed (bool) -- se foi atendido
- addressed_in_version (int) -- em qual versao foi resolvido
- created_at

TABELA: job_post_tech_brief
- id (UUID)
- job_id (FK jobs, UNIQUE)
- tenant_id (FK tenants)
- capture_codec (text)
- capture_resolution (text)
- capture_framerate (text)
- capture_color_space (text)
- camera_model (text)
- lenses (text)
- set_lut (text)
- dop_cdl (text)
- has_slow_motion (bool)
- slow_motion_fps (text)
- has_drone (bool)
- sound_format (text)
- sound_tc_sync (text)
- total_raw_storage_gb (int)
- raw_location (text) -- "SSD #3, prateleira A2"
- backup_location (text) -- "Google Drive pasta X"
- offline_tool (text)
- color_tool (text)
- final_aspect_ratio (text)
- final_resolution (text)
- music_type (text) -- original, stock, licenciada
- music_house (text)
- has_vfx (bool)
- has_motion_graphics (bool)
- has_locucao (bool)
- gc_legal_text (text)
- client_review_tool (text)
- air_date (date)
- notes (text)
- created_at, updated_at
```

### 8.2. Templates de etapas por tipo de job

Nem todo job tem todas as etapas. O sistema deve ter templates:

**Template: Filme Publicitario (TVC)**
```
1. Ingest + Organizacao
2. Montagem
3. Trilha Sonora
4. Aprovacao Offline
5. Color Grading
6. VFX / Motion
7. Sound Design + Foley
8. Mixagem
9. Conformacao / Online
10. Aprovacao Online
11. QC
12. Master + Copias
13. Entrega
```

**Template: Conteudo Digital**
```
1. Ingest + Organizacao
2. Montagem
3. GC / Motion Graphics
4. Aprovacao Corte
5. Color (simplificado)
6. Audio (simplificado)
7. Finalizacao
8. Copias / Janelas
9. Entrega
```

**Template: Motion Graphics / Animacao**
```
1. Storyboard / Animatic
2. Design de estilos (styleframes)
3. Animacao V1
4. Aprovacao
5. Animacao refinada
6. Sound Design
7. Finalizacao
8. Entrega
```

**Template: Fotografia**
```
1. Ingest + Selecao
2. Retoque
3. Aprovacao
4. Tratamento final
5. Entrega (alta + web)
```

**Template: Institucional Longo**
```
1. Ingest + Organizacao
2. Transcricao de entrevistas
3. Montagem V1
4. Trilha
5. Aprovacao V1
6. Alteracoes
7. Color
8. Sound Design + Mix
9. Conformacao
10. Aprovacao Final
11. Legendagem / CC (quando aplicavel)
12. Copias + Entrega
```

### 8.3. Prioridade de implementacao (MVP)

| Prioridade | Feature | Justificativa |
|-----------|---------|---------------|
| **P0 (MVP)** | Pipeline visual (kanban de etapas) | Resolve a dor #4 — visibilidade |
| **P0 (MVP)** | Versionamento com status | Resolve a dor #7 — versoes perdidas |
| **P0 (MVP)** | Briefing tecnico (formulario) | Resolve a dor #3 — material desorganizado |
| **P0 (MVP)** | Aprovacoes com registro | Resolve a dor #1 — feedback fragmentado |
| **P1** | Templates de etapas por tipo de job | Acelera setup de novos jobs |
| **P1** | Checklist de QC por destino | Resolve a dor #8 — QC reprovado |
| **P1** | Calendario reverso | Resolve a dor #5 — prazos impossiveis |
| **P1** | Janelas/desdobramentos com status | Resolve dor #2 — escopo que muda |
| **P2** | Dashboard de KPIs de pos | Metricas operacionais |
| **P2** | Integracao Frame.io (futuro) | Review com timecode |
| **P2** | Feedback multi-fonte | Consolidacao WA + Frame.io + email |
| **P3** | Benchmark automatico | Dados historicos para orcamento |
| **P3** | Alertas via WhatsApp | Notificacoes pro-ativas |

---

## 9. Glossario — Termos de Pos-Producao para o Time de Produto

| Termo | Significado | Contexto |
|-------|-------------|---------|
| **Offline** | Edicao criativa/editorial, geralmente com proxies (baixa resolucao) | Fase 1 da pos |
| **Online** | Edicao tecnica/finalizacao com material original (alta resolucao) | Fase 2 da pos |
| **Conformacao** | Processo de religar o corte offline com o material original | Transicao offline > online |
| **Color Grading** | Tratamento de cor e imagem | Etapa criativa-tecnica |
| **DI (Digital Intermediate)** | Processo completo de conformacao + color (termo cinema) | Menos usado em publicidade |
| **EDL** | Edit Decision List — lista de cortes exportada do NLE | Comunicacao entre softwares |
| **XML/AAF** | Formatos de intercambio de timeline entre NLEs | Premiere > DaVinci, etc. |
| **Proxy** | Versao leve do material para edicao | Quando bruto e RAW pesado |
| **LUT** | Look-Up Table — transformacao de cor pre-definida | Referencia de cor no set |
| **CDL** | Color Decision List — grade de referencia do DOP | Continuidade de cor |
| **GC** | Geracao de Caracteres — textos sobrepostos ao video | Letterings, assinaturas, legais |
| **Packshot** | Plano final do filme mostrando produto/logo | Obrigatorio em TVC |
| **VO / Locucao** | Narrador / voz sobreposta ao video | Muito comum em institucional |
| **Foley** | Gravacao de efeitos sonoros sincronizados com imagem | Passos, portas, objetos |
| **ADR** | Automated Dialog Replacement — dublagem/regravacao de dialogos | Quando som direto ficou ruim |
| **Stems** | Trilhas separadas de audio (dialogos, musica, efeitos, ambientes) | Para mixagem |
| **Mix** | Mixagem — equilíbrio final de todos os elementos sonoros | Etapa final de audio |
| **Loudness** | Medida de volume percebido | LUFS, norma ABNT |
| **True Peak** | Pico maximo real do sinal de audio | Limite tecnico |
| **DCP** | Digital Cinema Package — formato de entrega para cinema | JPEG2000 + MXF |
| **XDCAM** | Formato de entrega para TV | Padrao Globo |
| **Master** | Versao final, definitiva, em alta qualidade | Arquivo de referencia |
| **AirCheck** | Copia formatada para veiculacao em veiculo especifico | TV, cinema, digital |
| **QC** | Quality Control — verificacao tecnica do master | Antes da entrega |
| **Safe Area** | Area segura da tela onde texto/elementos criticos devem estar | TV corta bordas |
| **Slate** | Cartela de informacoes no inicio do arquivo | Titulo, duracao, versao |
| **TC / Timecode** | Codigo de tempo sincronizado com o video | HH:MM:SS:FF |
| **Burn-in** | Timecode "queimado" (visivel) na imagem | Para review/aprovacao |
| **Watermark** | Marca d'agua de protecao | "PARA APROVACAO" |
| **Render** | Processo de gerar o arquivo de video final | Pode demorar horas |
| **Round** | Ciclo de alteracao (envio > feedback > ajuste) | V1 > V2 = 1 round |
| **Lock** | Aprovacao formal que "trava" uma etapa | Lock de corte, lock final |
| **Reframe** | Reenquadrar o video para outra janela | 16:9 para 9:16 |

---

## 10. Consideracoes Finais

### O que torna a pos-producao em publicidade DIFERENTE de cinema, series, ou conteudo

1. **Prazos absurdamente curtos.** Um TVC pode ser filmado hoje e precisar estar no ar em 5 dias. Cinema tem meses.

2. **Muitos stakeholders.** Nao e so diretor + produtor. Tem agencia (RTVC, criacao, planejamento, atendimento) + cliente (marketing, juridico, VP). Cada um com poder de veto.

3. **Multiplas janelas.** Um unico filme gera 5-10 versoes (duracoes, aspect ratios, destinos diferentes). Cinema e 1 master.

4. **Escopo que muda.** Em cinema, o roteiro e o roteiro. Em publicidade, o cliente muda de ideia depois de filmado. O sistema precisa acomodar isso sem perder o controle.

5. **Sem limite formal de rounds.** O contrato brasileiro de publicidade tipicamente nao limita alteracoes (diferente de mercados mais maduros). O sistema precisa pelo menos REGISTRAR quantos rounds aconteceram para uso futuro em negociacoes.

6. **Normas tecnicas locais.** Loudness ABNT, XDCAM para Globo, framerate 29.97 para TV BR. Sao specs que um sistema gringo nao conhece.

7. **WhatsApp e o canal.** Em nenhum outro mercado do mundo o WhatsApp e tao central na comunicacao profissional quanto no Brasil. O sistema que ignorar isso vai ser ignorado pelo usuario.

### Resumo em uma frase

> **O modulo de pos-producao do ELLAHOS precisa ser simples o suficiente para um PE de 55 anos usar sem ajuda, mas robusto o suficiente para gerenciar um pipeline de 12 etapas, 8 janelas, 13 versoes, 5 stakeholders, e entrega em 3 formatos diferentes — tudo ao mesmo tempo, tudo pelo celular, tudo em portugues.**

---

*Documento de referencia elaborado em 2026-03-09. Base para spec tecnica e arquitetura do modulo de Pos-Producao do ELLAHOS (Onda 1.2).*
