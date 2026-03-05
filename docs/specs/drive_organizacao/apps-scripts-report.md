# Apps Scripts no Google Drive - Ellah Filmes

> Gerado automaticamente em 2026-03-04 18:51
> Service Account: pagamentofornecedor-afd951fa493c

## Resumo

| Metrica | Valor |
|---------|-------|
| Apps Script projects encontrados | **2** |
| Scripts com codigo exportado | **2** |
| Arquivos .gs reais encontrados | **0** |
| Arquivos com keywords script-related | **5** |
| Sheets com nomes script-related | **0** |

---
## Apps Script Projects

### 1. MODELO_DOC_ID

- **ID:** `15IgSCKO6stLHwDIzFnln38EzhnhMYbCqnW1hHIYmShJCAhLiVaoBBAO8`
- **Modificado:** 2025-11-05T23:00:46.398Z
- **Criado:** 2025-10-30T17:04:38.820Z
- **Caminho:** ELLAHOS/APPS_SCRIPT

**Arquivos no projeto (2):**

#### `appsscript` (json)

```
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

#### `Código` (server_js)

```
/******************************************************
 * JURÍDICO – CONTRATOS (WEB APP IDÔMPOTE)
 * Entrada mínima: spreadsheetId (+ token)
 * - Gera PDF só 1x por pessoa (job+cpf/email) e REUSA depois
 * - Escreve LOG técnico em colunas AF/AG/AH (fora da área de dados)
 ******************************************************/
/******************************************************
 * JURÍDICO – CONTRATOS (WEB APP IDÔMPOTE)
 * Entrada mínima: spreadsheetId (+ token)
 * - Gera PDF só 1x por pessoa (job+cpf/email) e REUSA depois
 * - Escreve LOG técnico em colunas AF/AG/AH (fora da área de dados)
 ******************************************************/

const CFG = {
  TOKEN: 'ellahfilmesaprimeiraIA',
  TIMEZONE: 'America/Sao_Paulo',

  ABA_ELENCO: 'ELENCO',
  ABA_CFG: 'CODIGO_ROBO',

  CELL_FOLDER_ID: 'B1',            // pasta destino
  CELL_FONTE_DOC: 'B2',            // Docs-Fonte (doc com infos de cliente/agência)
  MODELO_DOC_ID: '1NpMEmZnOudHnfUxE1qiLmL98qh_2-5rqzaewZUqkrko', // TEMPLATE do contrato

  DATA_START_ROW: 4,               // dados começam na linha 4 (cabeçalho está na 3)

  // Quem assina pela produtora (linha 1)
  CELL_EMAIL_PROD: 'O1',
  CELL_NOME_PROD:  'I1',
  CELL_TEL_PROD:   'Q1',           // <<< Telefone de quem assina pela produtora

  // Colunas técnicas p/ idempotência (1-index: AF/AG/AH)
  COL_SAFE_KEY: 23,   // AF
  COL_PDF_ID:  24,    // AG
  COL_PDF_URL: 25     // AH
};

/****************** Helpers gerais ******************/
function _out(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function _s(v){ return (v===undefined||v===null)?'':String(v).trim(); }
function _toNumber(v){ if(v===null||v===undefined||v==='') return 0; const n=Number(String(v).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; }
function _moeda(n){ return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function _formatarRG(rg){ rg = String(rg||'').replace(/\D/g,''); if(!rg) return ''; return rg.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/,"$1.$2.$3-$4"); }
function _slugfy(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,'-'); }
function _canonNome(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' '); }
function _canonEmail(s){ return String(s||'').toLowerCase().trim(); }
function _canonCPF(s){ return String(s||'').replace(/\D/g,''); }

function _numeroParaExtenso(valor) {
  const unidades=["","um","dois","três","quatro","cinco","seis","sete","oito","nove"];
  const dezenas=["","dez","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const centenas=["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  const especiais=["dez","onze","doze","treze","catorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  let valorReais = Math.floor(Number(valor)||0);
  let valorCentavos = Math.round(((Number(valor)||0) - valorReais) * 100);
  let extenso = "";
  function parte(valor){
    let r="";
    if (valor === 100) return "cem";
    if (valor >= 100){ r += centenas[Math.floor(valor/100)]; valor%=100; if(valor>0) r+=" e "; }
    if (valor >= 20){ r += dezenas[Math.floor(valor/10)]; valor%=10; if(valor>0) r+=" e "; }
    else if (valor >= 10){ r += especiais[valor-10]; valor=0; }
    if (valor>0) r += unidades[valor];
    return r.trim();
  }
  if (valorReais >= 1000){
    const milhares = Math.floor(valorReais/1000);
    extenso += (milhares===1? "mil" : `${parte(milhares)} mil`);
    valorReais %= 1000;
    if (valorReais>0) extenso += " e ";
  }
  if (valorReais>0) extenso += parte(valorReais);
  extenso = extenso ? `${extenso} reais` : "zero reais";
  if (valorCentavos>0) extenso += " e " + parte(valorCentavos) + " centavos";
  return extenso.trim();
}

// Normaliza telefone BR pra E.164 (+55...)
function _phoneE164BR(v){
  let s = String(v || '').replace(/[^\d+]/g, '');
  if(!s) return '';
  if(/^\+55\d{10,13}$/.test(s)) return s;
  if(/^55\d{10,13}$/.test(s)) return '+' + s;
  const only = s.replace(/\D/g, '');
  if(/^\d{10,13}$/.test(only)) return '+55' + only;
  if(s.startsWith('+')) return s;
  return '+' + only;
}

function _getHeaderRow(sh){
  const headerRowIndex = CFG.DATA_START_ROW - 1; // 3
  return (sh.getRange(headerRowIndex, 1, 1, sh.getLastColumn()).getValues()[0] || []).map(x=>String(x||'').trim());
}
function _findCol(headers, ...patterns){
  for(let i=0;i<headers.length;i++){
    const h = headers[i];
    for(const re of patterns){
      if(re.test(h)) return i;
    }
  }
  return -1;
}

function _jobSlugFromSpreadsheet(ss){
  const raw = ss.getName() || '';
  return _slugfy(raw.replace(/^CADASTRO_ELENCO_/i,''));
}

function _ensureTechHeaders(sh){
  const r = 3;
  if (!String(sh.getRange(r, CFG.COL_SAFE_KEY).getValue()||'').trim()) sh.getRange(r, CFG.COL_SAFE_KEY).setValue('SAFE_KEY');
  if (!String(sh.getRange(r, CFG.COL_PDF_ID ).getValue()||'').trim()) sh.getRange(r, CFG.COL_PDF_ID ).setValue('PDF_FILE_ID');
  if (!String(sh.getRange(r, CFG.COL_PDF_URL).getValue()||'').trim()) sh.getRange(r, CFG.COL_PDF_URL).setValue('PDF_URL');
}

/****************** Dados do Docs-Fonte (cliente/agência) ******************/
function _obterDadosClientePorDoc(docId){
  const doc = DocumentApp.openById(docId);
  const texto = doc.getBody().getText();
  const cap = (re, miss="") => {
    const m = texto.match(re);
    return m ? m[1].trim() : miss;
  };
  return {
    nome: cap(/Nome da empresa \(cliente\):\s*(.+)/),
    endereco: cap(/Endereço \(cliente\):\s*(.+)/),
    cidade: cap(/Cidade \(cliente\):\s*(.+)/),
    estado: cap(/Estado \(cliente\):\s*(.+)/),
    cep: cap(/CEP \(cliente\):\s*(.+)/),
    cnpj: cap(/CNPJ \(cliente\):\s*(.+)/),

    cnpj_agencia: cap(/CNPJ \(agência\):\s*(.+)/),
    end_agencia: cap(/Endereço \(agência\):\s*(.+)/),
    nome_agencia: cap(/Nome da empresa \(agência\):\s*(.+)/),
    cidade_agencia: cap(/Cidade \(agência\):\s*(.+)/),
    estado_agencia: cap(/Estado \(agência\):\s*(.+)/),
    cep_agencia_: cap(/CEP \(agência\):\s*(.+)/),

    titulo: cap(/Título\(s\) do\(s\) filme\(s\):\s*(.+)/),
    produto: cap(/Produto:\s*(.+)/),
    qtde_pecas: cap(/Quantidade de peças Publicitárias:\s*(.+)/),
    sup_obra: cap(/Suporte da obra:\s*(.+)/),
    duracao: cap(/Quantidade de filme\(s\), duração\(ões\), versão\(ões\) e\/ou redução\(ões\):\s*(.+)/),
    exclusividade: cap(/Exclusividade\?.+:\s*(.+)/),
    veiculacao: cap(/Período:\s*(.+)/),
    comp_grafica: cap(/Computação gráfica:\s*(.+)/),
    midia: cap(/Mídia impressa e\/ou foto still\?.+:\s*(.+)/)
  };
}

/****************** Endpoint ******************/
function doPost(e){
  try{
    const isJson = e.postData && String(e.postData.type||'').includes('json');
    const p = isJson ? JSON.parse(e.postData.contents||'{}') : (e.parameter||{});
    if(p.token !== CFG.TOKEN) return _out({ok:false,error:'unauthorized'});

    const spreadsheetId = _s(p.spreadsheetId);
    if(!spreadsheetId) return _out({ok:false,error:'spreadsheetId obrigatório'});

    const onlyRow = p.onlyRow ? Number(p.onlyRow) : null;
    const sendEmail = String(p.sendEmail||'false').toLowerCase()==='true';

    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sh = ss.getSheetByName(CFG.ABA_ELENCO);
    const cfgSh = ss.getSheetByName(CFG.ABA_CFG);
    if(!sh)   return _out({ok:false,error:`Aba '${CFG.ABA_ELENCO}' não encontrada`});
    if(!cfgSh) return _out({ok:false,error:`Aba '${CFG.ABA_CFG}' não encontrada`});

    const folderId   = String(cfgSh.getRange(CFG.CELL_FOLDER_ID).getValue()||'').trim();
    const fonteDocId = String(cfgSh.getRange(CFG.CELL_FONTE_DOC).getValue()||'').trim();
    if(!folderId)   return _out({ok:false,error:`Pasta destino não definida em ${CFG.ABA_CFG}!${CFG.CELL_FOLDER_ID}`});
    if(!fonteDocId) return _out({ok:false,error:`Docs-Fonte não definido em ${CFG.ABA_CFG}!${CFG.CELL_FONTE_DOC}`});

    const dadosCliente = _obterDadosClientePorDoc(fonteDocId);
    const dados = sh.getDataRange().getValues();
    const headers = _getHeaderRow(sh);
    const folder = DriveApp.getFolderById(folderId);
    const modeloFile = DriveApp.getFileById(CFG.MODELO_DOC_ID);

    _ensureTechHeaders(sh);

    // Linha 1 – institucionais da produtora de elenco
    const razao_social        = sh.getRange("C1").getValue();
    const endereco_razao      = sh.getRange("E1").getValue();
    const cnpj_razao          = sh.getRange("G1").getValue();
    const representante_legal = sh.getRange("I1").getValue();
    const representante_rg    = sh.getRange("K1").getValue();
    const representante_cpf   = sh.getRange("M1").getValue();

    const nome_produtora  = String(sh.getRange(CFG.CELL_NOME_PROD).getValue()  || 'Produtor(a) de Elenco');
    const email_produtora = String(sh.getRange(CFG.CELL_EMAIL_PROD).getValue() || 'contas@ellahfilmes.com');
    const tel_produtora   = _phoneE164BR(sh.getRange(CFG.CELL_TEL_PROD).getValue() || '');

    const jobSlug = _jobSlugFromSpreadsheet(ss);
    const results = [];

    // Mapeia as colunas da tabela (linha 3)
    const COLS = {
      NOME:       _findCol(headers,/^nome/i),
      ELENCO:     _findCol(headers,/elenco/i),
      CPF:        _findCol(headers,/^cpf$/i),
      RG:         _findCol(headers,/^rg$/i),
      NASC:       _findCol(headers,/nasc/i),
      DRT:        _findCol(headers,/^drt$/i),
      ENDERECO:   _findCol(headers,/endere/i),
      CIDADE:     _findCol(headers,/cidade/i),
      ESTADO:     _findCol(headers,/^estado/i),
      CEP:        _findCol(headers,/^cep$/i),
      EMAIL:      _findCol(headers,/e-?mail/i,/email/i),
      TELEFONE:   _findCol(headers,/telefone/i,/celular/i,/whats/i,/^q1$/i,/q1.*tel/i),
      VAL_PREST:  _findCol(headers,/valor.*presta/i),
      VAL_IMG:    _findCol(headers,/valor.*imagem/i),
      VAL_TAXA:   _findCol(headers,/taxa.*agenci/i),
      VAL_TOTAL:  _findCol(headers,/valor.*total/i),
      DIARIAS:    _findCol(headers,/diar/i),
      PROFISSAO:  _findCol(headers,/profiss/i),
      OQUEFEZ:    _findCol(headers,/o que fez|quais cenas/i)
    };

    for(let i=CFG.DATA_START_ROW-1;i<dados.length;i++){
      const rNum = i+1;
      if (onlyRow && rNum !== onlyRow) continue;

      const linha = dados[i];
      const nomeCompleto = COLS.NOME >=0 ? linha[COLS.NOME] : '';
      if (!nomeCompleto) continue;

      let cpf   = COLS.CPF   >=0 ? linha[COLS.CPF] : '';
      let rg    = COLS.RG    >=0 ? linha[COLS.RG]  : '';
      let nasc  = COLS.NASC  >=0 ? linha[COLS.NASC]: '';
      const drt_     = COLS.DRT     >=0 ? linha[COLS.DRT]     : '';
      const endereco = COLS.ENDERECO>=0 ? linha[COLS.ENDERECO]: '';
      const cidade   = COLS.CIDADE  >=0 ? linha[COLS.CIDADE]  : '';
      const estado   = COLS.ESTADO  >=0 ? linha[COLS.ESTADO]  : '';
      const cep      = COLS.CEP     >=0 ? linha[COLS.CEP]     : '';
      let e_mail     = COLS.EMAIL   >=0 ? linha[COLS.EMAIL]   : '';
      let telefone   = COLS.TELEFONE>=0 ? linha[COLS.TELEFONE]: '';
      let valorprestacao = COLS.VAL_PREST >=0 ? _toNumber(linha[COLS.VAL_PREST]) : 0;
      let valorimagem    = COLS.VAL_IMG   >=0 ? _toNumber(linha[COLS.VAL_IMG])   : 0;
      let valortaxa      = COLS.VAL_TAXA  >=0 ? _toNumber(linha[COLS.VAL_TAXA])  : 0;
      let valortotal     = COLS.VAL_TOTAL >=0 ? _toNumber(linha[COLS.VAL_TOTAL]) : (valorprestacao + valorimagem + valortaxa);
      let diaria    = COLS.DIARIAS   >=0 ? linha[COLS.DIARIAS]   : '';
      let elenco    = COLS.ELENCO    >=0 ? linha[COLS.ELENCO]    : '';
      let profissao = COLS.PROFISSAO >=0 ? linha[COLS.PROFISSAO] : '';
      let oquefez   = COLS.OQUEFEZ   >=0 ? linha[COLS.OQUEFEZ]   : '';

      if (nasc instanceof Date) {
        nasc = Utilities.formatDate(nasc, CFG.TIMEZONE, "dd/MM/yyyy");
      }
      rg      = _formatarRG(rg);
      e_mail  = _canonEmail(e_mail);
      telefone= _phoneE164BR(telefone);
      const cpfCanon = _canonCPF(cpf);

      // SAFE KEY determinística por job + cpf + email
      const rawKey  = `${jobSlug}|${cpfCanon}|${e_mail}`;
      const safeKey = Utilities.base64EncodeWebSafe(
        Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawKey)
      );

      // Reuso de PDF se já existir
      let savedSafe   = sh.getRange(rNum, CFG.COL_SAFE_KEY).getValue();
      let savedPdfId  = sh.getRange(rNum, CFG.COL_PDF_ID ).getValue();
      let savedPdfUrl = sh.getRange(rNum, CFG.COL_PDF_URL).getValue();
      let pdfFile = null, pdfUrl = '';

      if (savedSafe && savedPdfId && savedPdfUrl && String(savedSafe) === safeKey) {
        try { pdfFile = DriveApp.getFileById(String(savedPdfId)); } catch(_) { pdfFile = null; }
        if (pdfFile) {
          pdfUrl = String(savedPdfUrl);
        } else {
          savedSafe = savedPdfId = savedPdfUrl = '';
        }
      }

      if (!pdfUrl) {
        // Cria DOC a partir do modelo e preenche campos
        const novoArquivo = modeloFile.makeCopy(`Contrato - ${nomeCompleto} - ${jobSlug}`, folder);
        const doc = DocumentApp.openById(novoArquivo.getId());
        const body = doc.getBody();

        const valorFormatado  = _moeda(valortotal);
        const valorFormatado2 = _moeda(valortaxa);
        const valorFormatado3 = _moeda(valorimagem);
        const valorFormatado4 = _moeda(valorprestacao);

        // Campos do modelo
        body.replaceText("{{NOME_COMPLETO}}", String(nomeCompleto||''));
        body.replaceText("{{CPF}}", String(cpfCanon||''));
        body.replaceText("{{RG}}", String(rg||''));
        body.replaceText("{{DRT}}", String(drt_||''));
        body.replaceText("{{DATA_NASCIMENTO}}", String(nasc||''));
        body.replaceText("{{ENDERECO}}", String(endereco||''));
        body.replaceText("{{CIDADE}}", String(cidade||''));
        body.replaceText("{{ESTADO}}", String(estado||''));
        body.replaceText("{{CEP}}", String(cep||''));
        body.replaceText("{{EMAIL}}", String(e_mail||''));
        body.replaceText("{{TELEFONE}}", String(telefone||''));
        body.replaceText("{{PROFISSAO}}", String(profissao||''));
        body.replaceText("{{OQUEFEZ}}", String(oquefez||''));
        body.replaceText("{{DIARIA}}", String(diaria||''));
        body.replaceText("{{ELENCO}}", String(elenco||''));

        // Produtora (linha 1)
        body.replaceText("{{RAZAO_SOCIAL}}", String(razao_social||'')); 
        body.replaceText("{{ENDERECO_AGENCIA}}", String(endereco_razao||'')); 
        body.replaceText("{{CNPJ_AGENCIA}}", String(cnpj_razao||'')); 
        body.replaceText("{{REPRESENTANTE_LEGAL}}", String(representante_legal||'')); 
        body.replaceText("{{RG_AGENCIA}}", String(representante_rg||'')); 
        body.replaceText("{{CPF_AGENCIA}}", String(representante_cpf||'')); 

        // Cliente/Agência do docs-fonte (se existirem)
        body.replaceText("{{NOME_CLIENTE}}", dadosCliente.nome || '');
        body.replaceText("{{ENDERECO_CLIENTE}}", dadosCliente.endereco || '');
        body.replaceText("{{CNPJ_CLIENTE}}", dadosCliente.cnpj || '');
        body.replaceText("{{CNPJ_AGENCIA_PUBLI}}", dadosCliente.cnpj_agencia || '');
        body.replaceText("{{END_AGENCIA_PUBLI}}", dadosCliente.end_agencia || '');
        body.replaceText("{{NOME_AGENCIA_PUBLI}}", dadosCliente.nome_agencia || '');
        body.replaceText("{{CIDADE_AGENCIA_PUBLI}}", dadosCliente.cidade_agencia || '');
        body.replaceText("{{ESTADO_AGENCIA_PUBLI}}", dadosCliente.estado_agencia || '');
        body.replaceText("{{CEP_AGENCIA_PUBLI}}", dadosCliente.cep_agencia_ || '');
        body.replaceText("{{TITULO}}", dadosCliente.titulo || '');
        body.replaceText("{{PRODUTO}}", dadosCliente.produto || '');
        body.replaceText("{{QTDE_PECAS}}", dadosCliente.qtde_pecas || '');
        body.replaceText("{{SUP_OBRA}}", dadosCliente.sup_obra || '');
        body.replaceText("{{DURACAO}}", dadosCliente.duracao || '');
        body.replaceText("{{EXCLUSIVIDADE}}", dadosCliente.exclusividade || '');
        body.replaceText("{{VEICULACAO}}", dadosCliente.veiculacao || '');
        body.replaceText("{{COMP_GRAFICA}}", dadosCliente.comp_grafica || '');
        body.replaceText("{{MIDIA}}", dadosCliente.midia || '');

        // Valores
        body.replaceText("{{VALOR_TOTAL}}", valorFormatado);
        body.replaceText("{{VALOR_AGENCIAMENTO}}", valorFormatado2);
        body.replaceText("{{VALOR_IMAGEM}}", valorFormatado3);
        body.replaceText("{{VALOR_PRESTACAO}}", valorFormatado4);
        body.replaceText("{{VALOR_TOTAL_EXTENSO}}", `(${_numeroParaExtenso(valortotal)})`);
        body.replaceText("{{VALOR_AGENCIAMENTO_EXTENSO}}", `(${_numeroParaExtenso(valortaxa)})`);
        body.replaceText("{{VALOR_IMAGEM_EXTENSO}}", `(${_numeroParaExtenso(valorimagem)})`);
        body.replaceText("{{VALOR_PRESTACAO_EXTENSO}}", `(${_numeroParaExtenso(valorprestacao)})`);

        // Data atual
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
        const dataComLocalizacao = `São Paulo, ${dataFormatada}`;
        body.replaceText("{{DATA_ATUAL}}", dataComLocalizacao);

        doc.saveAndClose();

        // PDF
        const pdfBlob = DriveApp.getFileById(novoArquivo.getId())
                       .getAs(MimeType.PDF)
                       .setName(`Contrato - ${nomeCompleto} - ${jobSlug}.pdf`);
        const pdfFileObj = folder.createFile(pdfBlob);
        DriveApp.getFileById(novoArquivo.getId()).setTrashed(true);

        pdfFile = pdfFileObj;
        pdfUrl  = `https://drive.google.com/uc?export=download&id=${pdfFile.getId()}`;

        // Persiste marcadores técnicos
        sh.getRange(rNum, CFG.COL_SAFE_KEY).setValue(safeKey);
        sh.getRange(rNum, CFG.COL_PDF_ID ).setValue(pdfFile.getId());
        sh.getRange(rNum, CFG.COL_PDF_URL).setValue(pdfUrl);

        // E-mail opcional
        if (sendEmail && e_mail) {
          try {
            MailApp.sendEmail(
              e_mail,
              'Contrato – Ellah Filmes',
              'Olá,\n\nSegue em anexo o seu contrato em PDF.\n\nAtt,\nJurídico – Ellah Filmes',
              { attachments:[pdfBlob] }
            );
          } catch(_) {}
        }
      }

      // Retorno para o n8n
      results.push({
        row: rNum,
        nome: nomeCompleto,
        email: e_mail || '',
        telefone: String(telefone || ''),
        fileId: pdfFile ? pdfFile.getId() : '',
        pdfUrl,
        driveFolderId: folder.getId(),
        safeKey,
        jobSlug,
        produtorNome: nome_produtora,
        produtorEmail: email_produtora,
        produtorTelefone: tel_produtora, // <<< telefone da PRODUTORA (Q1) já normalizado
        roleModelo: "Modelo(a)/Ator(triz)",
        roleProdutora: "Produtor(a) de Elenco (Agencia)"
      });
    }

    return _out({ok:true, contratos: results});
  } catch (err) {
    return _out({ok:false, error: String(err && err.stack || err)});
  }
}

```

**Analise - APIs e funcionalidades usadas:**

- SpreadsheetApp (planilhas) - le dados de elenco da aba ELENCO
- DocumentApp (docs) - abre template de contrato e preenche placeholders
- DriveApp (arquivos) - copia template, gera PDF, salva em pasta destino
- MailApp (emails) - envia contrato PDF por email ao elenco
- ContentService (web app) - responde JSON ao chamador (n8n)
- Utilities (encoding/digest) - SHA-256 para idempotencia, formatacao de datas
- Web App (doPost) - recebe chamadas POST com spreadsheetId

**O que este script faz:**

Este e o **gerador de contratos de elenco**. Funciona como Web App chamado pelo n8n:

1. Recebe `spreadsheetId` de uma planilha CADASTRO_ELENCO via POST
2. Le dados de cada ator/modelo da aba ELENCO (nome, CPF, RG, valores, etc.)
3. Le dados do cliente/agencia de um Google Doc separado (Docs-Fonte)
4. Copia um template de contrato (Google Doc) e preenche ~40 placeholders ({{NOME_COMPLETO}}, {{CPF}}, {{VALOR_TOTAL}}, etc.)
5. Converte o Doc preenchido em PDF
6. Salva o PDF na pasta do job no Drive
7. Opcionalmente envia o PDF por email
8. Usa idempotencia (SHA-256 de job+cpf+email) para nao gerar duplicatas
9. Retorna JSON com URLs dos PDFs gerados para o n8n processar

**Funcoes definidas:** `_out`, `_s`, `_toNumber`, `_moeda`, `_formatarRG`, `_slugfy`, `_canonNome`, `_canonEmail`, `_canonCPF`, `_numeroParaExtenso`, `_phoneE164BR`, `_getHeaderRow`, `_findCol`, `_jobSlugFromSpreadsheet`, `_ensureTechHeaders`, `_obterDadosClientePorDoc`, `doPost`

---

### 2. CRIADOR DE PASTA_JOB_FECHADO

- **ID:** `1VnMn1va5TUfs7SVbc2VMa8lHiPiBn3Ot5_XW0PsQuLnAbTF_vMeIoAkb`
- **Modificado:** 2025-10-24T18:37:03.827Z
- **Criado:** 2025-10-08T18:19:26.047Z
- **Caminho:** ELLAHOS/APPS_SCRIPT

**Arquivos no projeto (2):**

#### `appsscript` (json)

```
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Sheets",
        "version": "v4",
        "serviceId": "sheets"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

#### `Código` (server_js)

```
/******************************************************
 * CONFIG
 ******************************************************/
var CONFIG = {
  MASTER_SS_ID: '13cOwWutmLhFdAvL4h-Dkpb_ObglPft2yphck2wAwvoU',
  pasta2024Id: '1vWSYrPSJswMSkeN5QED37MNTiaaib1id',
  pastaBaseId: '1MEgFUwlOa5xsBpGrNZT3otsrkerp6sOd',
  subPastaId: '1GtlFjitCF92SPSC9Uq66mJZ-N3kCf4K9',
  headerRow: 4,
  indexCell: 'C2',
  token: 'ellahfilmesaprimeiraIA',
  N8N_CALLBACK_URL: 'https://ia.ellahfilmes.com/webhook/4154ad0b-d8eb-4a3a-95d8-fa6fca626066' // 👉 seu webhook do n8n
};

/******************************************************
 * HELPERS DE PLANILHA/TOAST
 ******************************************************/
function SS() { return SpreadsheetApp.openById(CONFIG.MASTER_SS_ID); }
function SH(name) { return SS().getSheetByName(name); }
function toast(msg, titulo='Info', seg=5) { try { SS().toast(msg, titulo, seg); } catch (_) {} }

/******************************************************
 * VALIDAÇÕES (HEADERS/DADOS)
 ******************************************************/
function validarCabecalhosObrigatorios() {
  const aba = SH("NUMERO DE JOB");
  const headerRow = CONFIG.headerRow;
  const headers = aba.getRange(headerRow, 1, 1, aba.getLastColumn()).getValues()[0];

  const cabecalhosObrigatorios = [
    "INDEX",
    "NUMERO DO JOB",
    "NOME DO JOB",
    "AGENCIA",
    "CLIENTE",
    "EMAIL DO ATENDIMENTO",
    "DIRETOR",
    "PRODUTOR EXECUTIVO"
  ];

  const faltando = cabecalhosObrigatorios.filter(cab => !headers.includes(cab));
  if (faltando.length > 0) {
    const msg = `⚠️ Atenção! Faltam cabeçalhos na aba 'NUMERO DE JOB':\n${faltando.join("\n")}`;
    Logger.log(msg);
    toast(msg, "Erro de Cabeçalhos!", 10);
    throw new Error(msg);
  }
  Logger.log("✅ Validação de cabeçalhos OK.");
}

function validarDadosJob() {
  const ss = SS();
  const sheetJob = ss.getSheetByName("NUMERO DE JOB");
  const abaValidacao = ss.getSheetByName("VALIDAÇÃO DE DADOS") || ss.insertSheet("VALIDAÇÃO DE DADOS");

  abaValidacao.clear();
  abaValidacao.appendRow(["JOB", "STATUS", "CAMPO", "MENSAGEM"]);

  const headers = sheetJob.getRange(4, 1, 1, sheetJob.getLastColumn()).getValues()[0];
  const data = sheetJob.getRange(5, 1, sheetJob.getLastRow() - 4, sheetJob.getLastColumn()).getValues();

  data.forEach(row => {
    const indexJob = row[headers.indexOf("INDEX")];
    const nomeJob = row[headers.indexOf("NOME DO JOB")];
    const statusJob = (row[headers.indexOf("STATUS")] || "").toString().toLowerCase().trim();

    const indexPreenchido = indexJob !== "" && indexJob !== null && indexJob !== undefined;
    const nomePreenchido = nomeJob !== "" && nomeJob !== null && nomeJob !== undefined;
    if (!indexPreenchido || !nomePreenchido) return;

    if (statusJob === "concluído" || statusJob === "✅ concluído") return;

    const get = (campo) => {
      const pos = headers.indexOf(campo);
      return pos >= 0 ? row[pos] : "";
    };

    let temErro = false;
    const obrigatorios = ["NUMERO DO JOB", "NOME DO JOB", "EMAIL DO ATENDIMENTO", "PRODUTOR EXECUTIVO"];

    obrigatorios.forEach(campo => {
      if (!get(campo) || get(campo).toString().trim() === "") {
        abaValidacao.appendRow([`${indexJob} - ${nomeJob}`, "❌ ERRO", campo, `O campo ${campo} está vazio`]);
        temErro = true;
      }
    });

    if (!get("DIRETOR") || get("DIRETOR").toString().trim() === "") {
      abaValidacao.appendRow([`${indexJob} - ${nomeJob}`, "⚠️ AVISO", "DIRETOR", "Diretor não definido — atenção."]);
    }

    if (!temErro) {
      abaValidacao.appendRow([`${indexJob} - ${nomeJob}`, "✅ OK", "-", "Validação concluída."]);
    }
  });
}

/******************************************************
 * PERMISSÕES
 ******************************************************/
function darPermissaoEquipeInterna(subPasta, perfilDesejado) {
  const planilha = SS();
  const aba = planilha.getSheetByName("BANCO DE EQUIPE INTERNA");
  const dados = aba.getDataRange().getValues();

  dados.forEach(row => {
    const nome = row[0];
    const funcao = (row[1] || "").toString().toLowerCase();
    const email = row[2];
    const status = row[4];
    const defaultAcesso = row[5];

    if (status === "Ativo" && defaultAcesso === "✔️" && funcao.includes(perfilDesejado.toLowerCase())) {
      try {
        subPasta.addEditor(email);
        Logger.log(`Permissão padrão -> ${nome} (${email}) em ${subPasta.getName()}`);
      } catch (e) {
        Logger.log(`Erro na permissão padrão para ${email}: ${e}`);
      }
    }
  });
}

function darPermissaoJobEspecifico(subPasta, colunaPlanilha, jobIndex) {
  const planilha = SS();
  const abaJob = planilha.getSheetByName("NUMERO DE JOB");
  const headers = abaJob.getRange(4, 1, 1, abaJob.getLastColumn()).getValues()[0];
  const dados = abaJob.getDataRange().getValues();

  const coluna = headers.indexOf(colunaPlanilha) + 1;
  if (coluna === 0) {
    Logger.log(`Coluna ${colunaPlanilha} não encontrada`);
    return;
  }

  for (let i = 0; i < dados.length; i++) {
    if (dados[i][0] == jobIndex) {
      const emailBruto = dados[i][coluna - 1];
      if (emailBruto) {
        const emails = emailBruto.toString().split(",").map(e => e.trim());
        emails.forEach(email => {
          try {
            subPasta.addEditor(email);
            Logger.log(`Permissão job específica -> ${email} em ${subPasta.getName()}`);
          } catch (e) {
            Logger.log(`Erro na permissão específica para ${email}: ${e}`);
          }
        });
      }
      return;
    }
  }
  Logger.log(`Index do Job ${jobIndex} não encontrado na aba NUMERO DE JOB`);
}

function aplicarPermissoes(subPasta, nomeSubPastaOriginal, nomeJobLocal) {
  const jobIndex = nomeJobLocal.split("_")[0];
  const nome = nomeSubPastaOriginal.trim();

  if (nome.includes("09_ATENDIMENTO")) {
    darPermissaoEquipeInterna(subPasta, "Atendimento");
    darPermissaoJobEspecifico(subPasta, "EMAIL DO ATENDIMENTO", jobIndex);
    darPermissaoJobEspecifico(subPasta, "DIRETOR", jobIndex);
  } else if (nome.includes("10_VENDAS")) {
    darPermissaoEquipeInterna(subPasta, "Comercial");
    darPermissaoEquipeInterna(subPasta, "Produtor Executivo");
    darPermissaoJobEspecifico(subPasta, "PRODUTOR EXECUTIVO", jobIndex);
  } else if (nome.includes("02_FINANCEIRO")) {
    darPermissaoEquipeInterna(subPasta, "Financeiro");
  } else if (nome.includes("PÓS") || nome.includes("PÓS PRODUÇÃO")) {
    darPermissaoEquipeInterna(subPasta, "Pós");
  } else if (nome.includes("PRODUÇÃO")) {
    darPermissaoEquipeInterna(subPasta, "Produção");
    darPermissaoJobEspecifico(subPasta, "DIRETOR", jobIndex);
  } else {
    darPermissaoEquipeInterna(subPasta, "Sócio");
  }
}

/******************************************************
 * HELPERS DE INDEX/JOB_ABA E COMPATIBILIDADE
 ******************************************************/
function getProximoIndex() {
  const ss = SS();
  const sh = ss.getSheetByName("NUMERO DE JOB");
  const lastRow = sh.getLastRow();
  const colA = sh.getRange(5, 1, Math.max(0, lastRow - 4), 1).getValues().flat().filter(String);
  const lastIndex = colA.length > 0 ? Math.max(...colA.map(n => parseInt(n, 10))) : 0;
  return lastIndex + 1;
}

function setCriadorIndexCell(index) {
  const ss = SS();
  const criador = ss.getSheetByName("CRIADOR DE PASTA");
  if (!criador) return;
  criador.getRange(CONFIG.indexCell).setValue(index);
}

/******************************************************
 * FUNÇÕES AUXILIARES PARA SALVAR URLs
 ******************************************************/
function salvarUrlNaPlanilhaJob(colunaNome, url, indexJob) {
  try {
    const planilha = SS();
    const numeroDoJobSheet = planilha.getSheetByName("NUMERO DE JOB");
    
    const headers = numeroDoJobSheet.getRange(CONFIG.headerRow, 1, 1, numeroDoJobSheet.getLastColumn()).getValues()[0];
    const colIndex = headers.indexOf(colunaNome) + 1;
    
    if (colIndex < 1) {
      Logger.log(`❌ Cabeçalho '${colunaNome}' não encontrado`);
      return false;
    }

    const data = numeroDoJobSheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == indexJob) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log(`❌ Index ${indexJob} não encontrado`);
      return false;
    }

    numeroDoJobSheet.getRange(rowIndex, colIndex).setValue(url);
    Logger.log(`✅ URL salvo: ${colunaNome} = ${url}`);
    return true;
    
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL ${colunaNome}: ${error}`);
    return false;
  }
}

function obterValorColunaI() {
  var planilha = SS();
  var criadorDePastaSheet = planilha.getSheetByName("CRIADOR DE PASTA");
  var numeroDoJobSheet = planilha.getSheetByName("NUMERO DE JOB");

  var index = criadorDePastaSheet.getRange(CONFIG.indexCell).getValue();
  var data = numeroDoJobSheet.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == index) return data[i][8]; // coluna I
  }
  throw new Error("Index não encontrado na aba 'NUMERO DE JOB'.");
}

/******************************************************
 * PRINCIPAIS: CÓPIA/CRIAÇÃO DE ESTRUTURA
 ******************************************************/
function copiarPastaBaseAdm() {
  var pasta2024 = DriveApp.getFolderById(CONFIG.pasta2024Id);
  var pastaBase = DriveApp.getFolderById(CONFIG.pastaBaseId);
  validarCabecalhosObrigatorios();

  var nomeNovoJob = gerarCodigoJob();
  
  // ✅ VERIFICAÇÃO ANTI-DUPLICATAS ADICIONADA AQUI
  var pastaDuplicada = verificarPastaDuplicada(nomeNovoJob, pasta2024);
  if (pastaDuplicada) {
    toast("Pasta já existe! Duplicata ignorada.");
    return;
  }

  var novaPasta = pasta2024.createFolder(nomeNovoJob);
  copiarConteudoDaPastaExcluindoPlanilhaModelo(pastaBase, novaPasta, nomeNovoJob, true);
  copiarERenomearSheet(CONFIG.subPastaId, nomeNovoJob, novaPasta, nomeNovoJob);
  toast("Pasta e planilha criadas!");
}

function copiarPastaBaseAdmFromJobAba(jobAba, indexNumerico) {
  const pastaAno = DriveApp.getFolderById(CONFIG.pasta2024Id);
  const pastaBase = DriveApp.getFolderById(CONFIG.pastaBaseId);

  // ✅ VERIFICAÇÃO ANTI-DUPLICATAS ADICIONADA AQUI
  var pastaDuplicada = verificarPastaDuplicada(jobAba, pastaAno);
  if (pastaDuplicada) {
    return { 
      message: "Pasta já existia - duplicata ignorada", 
      pastaUrl: "https://drive.google.com/drive/folders/" + pastaDuplicada.getId(),
      duplicata: true 
    };
  }

  if (indexNumerico) setCriadorIndexCell(indexNumerico);

  const novaPasta = pastaAno.createFolder(jobAba);
  copiarConteudoDaPastaExcluindoPlanilhaModelo(pastaBase, novaPasta, jobAba, true);
  
  // CHAMA A FUNÇÃO PRINCIPAL QUE SALVA TODOS OS URLs
  copiarERenomearSheet(CONFIG.subPastaId, jobAba, novaPasta, jobAba, indexNumerico);

  return {
    message: "Pasta criada",
    pastaUrl: "https://drive.google.com/drive/folders/" + novaPasta.getId(),
    duplicata: false
  };
}

function verificarExistenciaDePasta(pasta, nomePasta) {
  var pastas = pasta.getFoldersByName(nomePasta);
  return pastas.hasNext();
}

function copiarConteudoDaPastaExcluindoPlanilhaModelo(origem, destino, nomeJobLocal, renomearSubpastas) {
  var arquivos = origem.getFiles();
  while (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    if (arquivo.getName() !== "Super Modelo  - NAO MEXER E NEM DELETAR") {
      arquivo.makeCopy(arquivo.getName(), destino);
    }
  }

  var subPastas = origem.getFolders();
  while (subPastas.hasNext()) {
    var subPastaOrigem = subPastas.next();
    var nomeSubPastaOriginal = subPastaOrigem.getName();

    var nomeSubPastaNovo = renomearSubpastas ? nomeJobLocal + " - " + nomeSubPastaOriginal : nomeSubPastaOriginal;
    var subPastaDestino = destino.createFolder(nomeSubPastaNovo);

    Logger.log("Comparando: '" + (nomeJobLocal + " - " + nomeSubPastaOriginal.trim()) +
      "' COM '" + (nomeJobLocal + " - 09_ATENDIMENTO").trim() + "'");

    if ((nomeJobLocal + " - " + nomeSubPastaOriginal.trim()) === (nomeJobLocal + " - 09_ATENDIMENTO").trim()) {
      var emailsString = obterValorColunaI();
      Logger.log("E-mail(s) obtido(s): " + emailsString);
      if (emailsString) {
        var emails = emailsString.split(",").map(function (email) { return email.trim(); });
        for (var i = 0; i < emails.length; i++) {
          if (emails[i]) {
            subPastaDestino.addEditor(emails[i]);
            Logger.log("Permissão concedida para o e-mail: " + emails[i]);
          }
        }
      } else {
        Logger.log("Nenhum e-mail encontrado ou inválido.");
      }
    } else {
      Logger.log("Subpasta não corresponde ao nome esperado. Sem permissão extra.");
    }

    aplicarPermissoes(subPastaDestino, nomeSubPastaOriginal, nomeJobLocal);
    copiarConteudoDaPastaExcluindoPlanilhaModelo(subPastaOrigem, subPastaDestino, nomeJobLocal, false);
  }
}

function gerarCodigoJob() {
  var sheet = SH("CRIADOR DE PASTA");
  var codigoJob = sheet.getRange("A3").getValue();
  Logger.log("Código do Job gerado (legado): " + codigoJob);
  return codigoJob;
}

/******************************************************
 * FUNÇÃO PARA APLICAR FÓRMULAS AUTOMATICAMENTE
 ******************************************************/
function aplicarFormulasColunasJKM(indexJob) {
  try {
    const ss = SS();
    const sh = ss.getSheetByName("NUMERO DE JOB");
    
    // Encontra a linha pelo INDEX
    const data = sh.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == indexJob) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log(`❌ Index ${indexJob} não encontrado para aplicar fórmulas`);
      return false;
    }

    // Fórmulas para as colunas J, K, M (conforme especificado)
    const formulaJ = `=QUERY(IMPORTRANGE(G${rowIndex}; "CUSTOS_REAIS!E:I"); "select Col5 where Col1 = 'TOTAL'"; 0)`;
    const formulaK = `=F${rowIndex}*0,12`;
    const formulaM = `=F${rowIndex}-(J${rowIndex}+K${rowIndex}+L${rowIndex})`;
    
    // Aplica as fórmulas
    sh.getRange(rowIndex, 10).setFormula(formulaJ); // Coluna J
    sh.getRange(rowIndex, 11).setFormula(formulaK); // Coluna K
    sh.getRange(rowIndex, 13).setFormula(formulaM); // Coluna M
    
    Logger.log(`✅ Fórmulas aplicadas para o job ${indexJob} na linha ${rowIndex}:`);
    Logger.log(`   Coluna J (Custos Reais): ${formulaJ}`);
    Logger.log(`   Coluna K (Imposto 12%): ${formulaK}`);
    Logger.log(`   Coluna M (Valor W): ${formulaM}`);
    
    return true;
    
  } catch (error) {
    Logger.log(`❌ Erro ao aplicar fórmulas para job ${indexJob}: ${error}`);
    return false;
  }
}

/******************************************************
 * RENOMEIOS/LINKS - FUNÇÃO PRINCIPAL ATUALIZADA
 ******************************************************/
function copiarERenomearSheet(subPastaId, novoNome, novaPasta, nomeJobLocal, indexJobForcado = null) {
  const indexJob = indexJobForcado || nomeJobLocal.split("_")[0];
  
  var subPasta = DriveApp.getFolderById(subPastaId);
  var arquivos = subPasta.getFilesByName("Super Modelo  - NAO MEXER E NEM DELETAR");

  if (arquivos.hasNext()) {
    var arquivoModelo = arquivos.next();
    var novoNomeComPrefixo = "GG_" + novoNome;
    var novaSheet = arquivoModelo.makeCopy(novoNomeComPrefixo, novaPasta);

    var linkNovaPlanilha = novaSheet.getUrl();
    
    // SALVA TODOS OS URLs PRINCIPAIS
    salvarUrlNaPlanilhaJob("PLANILHA PRODUCAO", linkNovaPlanilha, indexJob);
    salvarUrlNaPlanilhaJob("PASTA_URL", novaPasta.getUrl(), indexJob);

    var pastaFinanceiro = novaPasta.getFoldersByName(nomeJobLocal + " - " + "02_FINANCEIRO");
    if (pastaFinanceiro.hasNext()) {
      var pastaFinanceiroFolder = pastaFinanceiro.next();
      var pastaGastosGerais = pastaFinanceiroFolder.getFoldersByName("03_GASTOS GERAIS");
      if (pastaGastosGerais.hasNext()) {
        var pastaGastosGeraisFolder = pastaGastosGerais.next();
        var arquivoCopiado = DriveApp.getFileById(novaSheet.getId());
        arquivoCopiado.moveTo(pastaGastosGeraisFolder);
        toast("Planilha movida para '03_GASTOS GERAIS'!");
      }
    }

    // EXECUTA TODAS AS FUNÇÕES DE RENOMEAR E SALVAR URLs
    renomearDocumentoTimbrado(novaPasta, nomeJobLocal, indexJob);
    renomearCalendario(novaPasta, nomeJobLocal, novoNome);
    renomearCadastroElenco(novaPasta, nomeJobLocal, novoNome);
    renomearAprovacaoInterna(novaPasta, nomeJobLocal, novoNome);
    
    // SALVA TODOS OS URLs IMPORTANTES
    salvarUrlContratosPDFNaPlanilha(novaPasta, nomeJobLocal, novoNome);
    salvarUrlAprovacaoInterna(novaPasta, nomeJobLocal, novoNome);
    renameAndLinkDocuments(novaPasta, nomeJobLocal, indexJob);
    publicarFormularioEquipe(novaPasta, nomeJobLocal, indexJob);
    salvarUrlRoteiro(novaPasta, nomeJobLocal, indexJob);
    salvarUrlCadastroElenco(novaPasta, nomeJobLocal, novoNome, indexJob);
    salvarUrlPPM(novaPasta, nomeJobLocal, indexJob);
    salvarUrlFechamentoProducao(novaPasta, nomeJobLocal, indexJob);
    salvarUrlFechamentoArte(novaPasta, nomeJobLocal, indexJob);
    salvarUrlFechamentoFigurino(novaPasta, nomeJobLocal, indexJob);
    salvarUrlPreFigurino(novaPasta, nomeJobLocal, indexJob);
    salvarUrlPreArte(novaPasta, nomeJobLocal, indexJob);
    salvarUrlCronograma(novaPasta, nomeJobLocal, indexJob);
    darPermissaoCronograma(novaPasta, nomeJobLocal);
    salvarUrlMaterialBruto(novaPasta, nomeJobLocal, indexJob);
    
    
    // SALVA URL DA PLANILHA DE EQUIPE
    const planilhaEquipeUrl = obterUrlPlanilhaEquipe(novaPasta, nomeJobLocal);
    if (planilhaEquipeUrl) {
      salvarUrlNaPlanilhaJob("URL_EQUIPE_DO_JOB_ATUAL", planilhaEquipeUrl, indexJob);
    }

    // APLICA AS FÓRMULAS NAS COLUNAS J, K, M
    aplicarFormulasColunasJKM(indexJob);

    toast("✅ Estrutura completa criada e todos os URLs salvos!");

  } else {
    toast("Nenhuma planilha modelo encontrada!");
  }
}

/******************************************************
 * FUNÇÕES DE RENOMEAR E SALVAR URLs ATUALIZADAS
 ******************************************************/
function obterUrlPlanilhaEquipe(novaPasta, nomeJobLocal) {
  try {
    const subpastaContratos = novaPasta.getFoldersByName(nomeJobLocal + " - 05_CONTRATOS");
    if (!subpastaContratos.hasNext()) return null;

    const pastaEquipe = subpastaContratos.next().getFoldersByName("02_CONTRATOEQUIPE");
    if (!pastaEquipe.hasNext()) return null;

    const arquivos = pastaEquipe.next().getFilesByName(nomeJobLocal + " - EQUIPE_DO_JOB");
    if (!arquivos.hasNext()) return null;

    return arquivos.next().getUrl();
  } catch (error) {
    Logger.log(`Erro ao obter URL da planilha de equipe: ${error}`);
    return null;
  }
}

function renomearDocumentoTimbrado(novaPasta, nomeJobLocal, indexJob) {
  var pastaVendas = novaPasta.getFoldersByName(nomeJobLocal + " - " + "10_VENDAS/PRODUTOR_EXECUTIVO");
  if (pastaVendas.hasNext()) {
    var pastaVendasFolder = pastaVendas.next();
    var pastaInicioDoProjeto = pastaVendasFolder.getFoldersByName("01_INICIO_DO_PROJETO");
    if (pastaInicioDoProjeto.hasNext()) {
      var pastaInicioDoProjetoFolder = pastaInicioDoProjeto.next();
      var pastaDecupado = pastaInicioDoProjetoFolder.getFoldersByName("02_DECUPADO/CARTAORCAMENTO");
      if (pastaDecupado.hasNext()) {
        var pastaDecupadoFolder = pastaDecupado.next();
        var arquivos = pastaDecupadoFolder.getFilesByName("TIMBRADO_ELLAH_FILMES_OFICIAL");
        if (arquivos.hasNext()) {
          var arquivoTimbrado = arquivos.next();
          var novoNomeArquivo = "Carta_Orcamento_" + nomeJobLocal;
          arquivoTimbrado.setName(novoNomeArquivo);
          preencherCamposCartaOrcamento(arquivoTimbrado.getId(), indexJob);

          salvarUrlNaPlanilhaJob("URL_CARTA_ORCAMENTO", arquivoTimbrado.getUrl(), indexJob);
          toast("Carta renomeada e link salvo!");
        } else {
          toast("Arquivo 'TIMBRADO_ELLAH_FILMES_OFICIAL' não encontrado!");
        }
      } else {
        toast("Subpasta '02_DECUPADO/CARTAORCAMENTO' não encontrada!");
      }
    } else {
      toast("Subpasta '01_INICIO_DO_PROJETO' não encontrada!");
    }
  } else {
    toast("Subpasta '10_VENDAS/PRODUTOR_EXECUTIVO' não encontrada!");
  }
}

function renomearCalendario(novaPasta, nomeJobLocal, novoNome) {
  var pastaVendas = novaPasta.getFoldersByName(nomeJobLocal + " - " + "10_VENDAS/PRODUTOR_EXECUTIVO");
  if (pastaVendas.hasNext()) {
    var pastaVendasFolder = pastaVendas.next();
    var pastaInicioProjeto = pastaVendasFolder.getFoldersByName("01_INICIO_DO_PROJETO");
    if (pastaInicioProjeto.hasNext()) {
      var pastaInicioProjetoFolder = pastaInicioProjeto.next();
      var pastaCronograma = pastaInicioProjetoFolder.getFoldersByName("04_CRONOGRAMA");
      if (pastaCronograma.hasNext()) {
        var pastaCronogramaFolder = pastaCronograma.next();
        var arquivos = pastaCronogramaFolder.getFilesByName("📊 CRONOGRAMA");
        if (arquivos.hasNext()) {
          var arquivoCalendario = arquivos.next();
          arquivoCalendario.setName("📊 CRONOGRAMA " + novoNome);
          toast("Calendário renomeado com sucesso!");
        } else {
          toast("Arquivo '📊 CRONOGRAMA' não encontrado!");
        }
      } else {
        toast("Subpasta '04_CRONOGRAMA' não encontrada!");
      }
    } else {
      toast("Subpasta '01_INICIO_DO_PROJETO' não encontrada!");
    }
  } else {
    toast("Subpasta '10_VENDAS/PRODUTOR_EXECUTIVO' não encontrada!");
  }
}

function renomearCadastroElenco(novaPasta, nomeJobLocal, novoNome) {
  var pastaContratos = novaPasta.getFoldersByName(nomeJobLocal + " - " + "05_CONTRATOS");
  if (pastaContratos.hasNext()) {
    var pastaContratosFolder = pastaContratos.next();
    var pastaContratoElenco = pastaContratosFolder.getFoldersByName("03_CONTRATODEELENCO");
    if (pastaContratoElenco.hasNext()) {
      var pastaContratoElencoFolder = pastaContratoElenco.next();
      var arquivos = pastaContratoElencoFolder.getFilesByName("CADASTRO_ELENCO");
      if (arquivos.hasNext()) {
        var arquivoCadastroElenco = arquivos.next();
        arquivoCadastroElenco.setName("CADASTRO_ELENCO_" + novoNome);
        toast("Cadastro de elenco renomeado!");
      } else {
        toast("Arquivo 'CADASTRO_ELENCO' não encontrado!");
      }
    } else {
      toast("Subpasta '03_CONTRATODEELENCO' não encontrada!");
    }
  } else {
    toast("Subpasta '05_CONTRATOS' não encontrada!");
  }
}

function renomearAprovacaoInterna(novaPasta, nomeJobLocal, novoNome) {
  var pastaAtendimento = novaPasta.getFoldersByName(nomeJobLocal + " - " + "09_ATENDIMENTO");
  if (pastaAtendimento.hasNext()) {
    var pastaAtendimentoFolder = pastaAtendimento.next();
    var pastaPreProducao = pastaAtendimentoFolder.getFoldersByName("02_PRE_PRODUCAO");
    if (pastaPreProducao.hasNext()) {
      var pastaPreProducaoFolder = pastaPreProducao.next();
      var pastaAprovacaoInterna = pastaPreProducaoFolder.getFoldersByName("01_APROVACAO_INTERNA");
      if (pastaAprovacaoInterna.hasNext()) {
        var pastaAprovacaoInternaFolder = pastaAprovacaoInterna.next();
        var docs = pastaAprovacaoInternaFolder.getFilesByName("Aprovacao_interna");
        if (docs.hasNext()) {
          var documento = docs.next();
          documento.setName("Aprovacao_interna_" + novoNome);
          toast("Aprovação interna renomeada!");
        } else {
          toast("Documento 'Aprovacao_interna' não encontrado!");
        }
      } else {
        toast("Subsubsubpasta '01_APROVACAO_INTERNA' não encontrada!");
      }
    } else {
      toast("Subsubpasta '02_PRE_PRODUCAO' não encontrada!");
    }
  } else {
    toast("Subpasta '09_ATENDIMENTO' não encontrada!");
  }
}

function salvarUrlContratosPDFNaPlanilha(novaPasta, nomeJobLocal, novoNome) {
  var pastaContratos = novaPasta.getFoldersByName(nomeJobLocal + " - 05_CONTRATOS");
  if (pastaContratos.hasNext()) {
    var pastaContratosFolder = pastaContratos.next();
    var pastaContratoElenco = pastaContratosFolder.getFoldersByName("03_CONTRATODEELENCO");
    if (pastaContratoElenco.hasNext()) {
      var pastaContratoElencoFolder = pastaContratoElenco.next();
      var pastaContratosPDF = pastaContratoElencoFolder.getFoldersByName("01_CONTRATOS_EM_PDF");
      if (pastaContratosPDF.hasNext()) {
        var pastaContratosPDFFolder = pastaContratosPDF.next();
        var urlPastaPDF = pastaContratosPDFFolder.getId();
        var arquivos = pastaContratoElencoFolder.getFilesByName("CADASTRO_ELENCO_" + novoNome);
        if (arquivos.hasNext()) {
          var arquivoPlanilha = arquivos.next();
          var planilha = SpreadsheetApp.open(arquivoPlanilha);
          var abaCodigoRobo = planilha.getSheetByName("CODIGO_ROBO");
          if (abaCodigoRobo) {
            abaCodigoRobo.getRange("B1").setValue(urlPastaPDF);
            toast("URL de '01_CONTRATOS_EM_PDF' salva!");
          } else {
            toast("Aba 'CODIGO_ROBO' não encontrada!");
          }
        } else {
          toast("Arquivo 'CADASTRO_ELENCO_" + novoNome + "' não encontrado!");
        }
      } else {
        toast("Subsubsubpasta '01_CONTRATOS_EM_PDF' não encontrada!");
      }
    } else {
      toast("Subpasta '03_CONTRATODEELENCO' não encontrada!");
    }
  } else {
    toast("Subpasta '05_CONTRATOS' não encontrada!");
  }
}

function salvarUrlAprovacaoInterna(novaPasta, nomeJobLocal, novoNome) {
  var pastaAtendimento = novaPasta.getFoldersByName(nomeJobLocal + " - 09_ATENDIMENTO");
  if (pastaAtendimento.hasNext()) {
    var pastaAtendimentoFolder = pastaAtendimento.next();
    var pastaPreProducao = pastaAtendimentoFolder.getFoldersByName("02_PRE_PRODUCAO");
    if (pastaPreProducao.hasNext()) {
      var pastaPreProducaoFolder = pastaPreProducao.next();
      var pastaAprovacaoInterna = pastaPreProducaoFolder.getFoldersByName("01_APROVACAO_INTERNA");
      if (pastaAprovacaoInterna.hasNext()) {
        var pastaAprovacaoInternaFolder = pastaAprovacaoInterna.next();
        var docs = pastaAprovacaoInternaFolder.getFilesByName("Aprovacao_interna_" + novoNome);
        if (docs.hasNext()) {
          var documento = docs.next();
          var urlDocumento = documento.getId();
          var arquivos = DriveApp.getFilesByName("CADASTRO_ELENCO_" + novoNome);
          if (arquivos.hasNext()) {
            var sheetFile = arquivos.next();
            var spreadsheet = SpreadsheetApp.open(sheetFile);
            var abaCodigoRobo = spreadsheet.getSheetByName("CODIGO_ROBO");
            if (abaCodigoRobo) {
              abaCodigoRobo.getRange("B2").setValue(urlDocumento);
              toast("URL 'Aprovacao_interna' salva em B2!");
            } else {
              toast("Aba 'CODIGO_ROBO' não encontrada!");
            }
          } else {
            toast("Sheet 'CADASTRO_ELENCO_" + novoNome + "' não encontrado!");
          }
        } else {
          toast("Documento 'Aprovacao_interna_" + novoNome + "' não encontrado!");
        }
      } else {
        toast("Subsubsubpasta '01_APROVACAO_INTERNA' não encontrada!");
      }
    } else {
      toast("Subsubpasta '02_PRE_PRODUCAO' não encontrada!");
    }
  } else {
    toast("Subpasta '09_ATENDIMENTO' não encontrada!");
  }
}

function renameAndLinkDocuments(novaPasta, nomeJobLocal, indexJob) {
  var folders = novaPasta.getFoldersByName(nomeJobLocal + " - 05_CONTRATOS");
  if (folders.hasNext()) {
    var rootFolder = folders.next();
    var subfolders = rootFolder.getFoldersByName("02_CONTRATOEQUIPE");
    if (subfolders.hasNext()) {
      var subFolder = subfolders.next();
      var files = subFolder.getFilesByName("CADASTRO_EQUIPE");
      if (files.hasNext()) {
        var sheet = files.next();
        sheet.setName(nomeJobLocal + " - EQUIPE_DO_JOB");
        files = subFolder.getFilesByName("Forms_Cadastro_Equipe");
        if (files.hasNext()) {
          var formFile = files.next();
          formFile.setName(nomeJobLocal + " - Forms_Cadastro_Equipe");
          var form = FormApp.openById(formFile.getId());
          form.setTitle(nomeJobLocal + " - Forms_Cadastro_Equipe");
          
          try {
            // ✅ CONFIGURAÇÕES PARA PERMITIR ACESSO SEM LOGIN
            // 1. Publicar o formulário primeiro
            form.setAcceptingResponses(true);
            
            // 2. Configurar para NÃO exigir login do Google
            // Nota: Em domínios G Suite, isso permite acesso anônimo
            form.setRequireLogin(false);
            
            // 3. Coletar email (opcional) - permite identificar sem forçar login
            form.setCollectEmail(true);
            
            // 4. Permitir apenas uma resposta por pessoa (baseado no email)
            form.setLimitOneResponsePerUser(true);
            
            // 5. Permitir editar respostas
            form.setAllowResponseEdits(true);
            
            // 6. Não mostrar link para responder novamente
            form.setShowLinkToRespondAgain(false);
            
            // 7. Configurações de progresso
            form.setProgressBar(true);
            form.setShowProgressBar(true);
            
            // 8. Mensagem de confirmação personalizada
            form.setConfirmationMessage("Obrigado por se cadastrar! Suas informações foram salvas com sucesso.");
            
            Logger.log("✅ Configurações de acesso sem login aplicadas");
            
          } catch (configError) {
            Logger.log("⚠️ Algumas configurações avançadas não puderam ser aplicadas: " + configError);
          }
          
          try {
            // Obter a URL pública
            var formUrl = form.getPublishedUrl();
            Logger.log("✅ Formulário publicado. URL: " + formUrl);
            
            // Vincular à planilha
            var newSpreadsheet = SpreadsheetApp.open(sheet);
            form.setDestination(FormApp.DestinationType.SPREADSHEET, newSpreadsheet.getId());
            
            // Salvar a URL PÚBLICA na planilha
            salvarUrlNaPlanilhaJob("URL_CADASTRO_EQUIPE", formUrl, indexJob);
            
            Logger.log("✅ Formulário configurado e publicado com sucesso!");
            
          } catch (error) {
            Logger.log("❌ Erro ao publicar/vincular formulário: " + error.toString());
            
            // Fallback: salvar URL de edição
            var fallbackUrl = formFile.getUrl();
            salvarUrlNaPlanilhaJob("URL_CADASTRO_EQUIPE", fallbackUrl, indexJob);
            Logger.log("⚠️ Usando URL de edição como fallback: " + fallbackUrl);
          }
          
        } else {
          Logger.log("Formulário não encontrado.");
        }
      } else {
        Logger.log("Planilha da equipe não encontrada.");
      }
    } else {
      Logger.log("Subpasta '02_CONTRATOEQUIPE' não encontrada!");
    }
  } else {
    Logger.log("Pasta '05_CONTRATOS' não encontrada!");
  }
}
function salvarUrlRoteiro(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaAtendimento = novaPasta.getFoldersByName(nomeJobLocal + " - 09_ATENDIMENTO");
    if (!pastaAtendimento.hasNext()) { toast("Sem '09_ATENDIMENTO'!"); return; }
    var pastaAtendimentoFolder = pastaAtendimento.next();

    var pastaPreProducao = pastaAtendimentoFolder.getFoldersByName("01_PRE_PRODUCAO");
    if (!pastaPreProducao.hasNext()) { toast("Sem '01_PRE_PRODUCAO'!"); return; }
    var pastaPreProducaoFolder = pastaPreProducao.next();

    var pastaRoteiro = pastaPreProducaoFolder.getFoldersByName("02_ROTEIRO");
    if (!pastaRoteiro.hasNext()) { toast("Sem '02_ROTEIRO'!"); return; }
    var pastaRoteiroFolder = pastaRoteiro.next();

    var urlRoteiro = "https://drive.google.com/drive/folders/" + pastaRoteiroFolder.getId();
    salvarUrlNaPlanilhaJob("URL_ROTEIRO", urlRoteiro, indexJob);
    toast("URL do roteiro salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_ROTEIRO: ${error}`);
  }
}

function salvarUrlCadastroElenco(novaPasta, nomeJobLocal, novoNome, indexJob) {
  try {
    var pastaContratos = novaPasta.getFoldersByName(nomeJobLocal + " - 05_CONTRATOS");
    if (!pastaContratos.hasNext()) { toast("Sem '05_CONTRATOS'!"); return; }
    var pastaContratosFolder = pastaContratos.next();

    var pastaContratoElenco = pastaContratosFolder.getFoldersByName("03_CONTRATODEELENCO");
    if (!pastaContratoElenco.hasNext()) { toast("Sem '03_CONTRATODEELENCO'!"); return; }
    var pastaContratoElencoFolder = pastaContratoElenco.next();

    var arquivos = pastaContratoElencoFolder.getFilesByName("CADASTRO_ELENCO_" + novoNome);
    if (!arquivos.hasNext()) { toast("CADASTRO_ELENCO não encontrado!"); return; }
    var arquivoElenco = arquivos.next();
    var urlElenco = arquivoElenco.getUrl();

    salvarUrlNaPlanilhaJob("URL_CADASTRO_ELENCO", urlElenco, indexJob);
    toast("URL de 'CADASTRO_ELENCO' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_CADASTRO_ELENCO: ${error}`);
  }
}

function salvarUrlPPM(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaAtendimento = novaPasta.getFoldersByName(nomeJobLocal + " - 09_ATENDIMENTO");
    if (!pastaAtendimento.hasNext()) { toast("Sem '09_ATENDIMENTO'!"); return; }
    var pastaAtendimentoFolder = pastaAtendimento.next();

    var pastaPreProducao = pastaAtendimentoFolder.getFoldersByName("01_PRE_PRODUCAO");
    if (!pastaPreProducao.hasNext()) { toast("Sem '01_PRE_PRODUCAO'!"); return; }
    var pastaPreProducaoFolder = pastaPreProducao.next();

    var pastaPPM = pastaPreProducaoFolder.getFoldersByName("03_PPM");
    if (!pastaPPM.hasNext()) { toast("Sem '03_PPM'!"); return; }
    var pastaPPMFolder = pastaPPM.next();

    var urlPPM = "https://drive.google.com/drive/folders/" + pastaPPMFolder.getId();
    salvarUrlNaPlanilhaJob("URL_PPM", urlPPM, indexJob);
    toast("URL '03_PPM' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_PPM: ${error}`);
  }
}

function salvarUrlFechamentoProducao(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaFinanceiro = novaPasta.getFoldersByName(nomeJobLocal + " - 02_FINANCEIRO");
    if (!pastaFinanceiro.hasNext()) { toast("Sem '02_FINANCEIRO'!"); return; }
    var pastaFinanceiroFolder = pastaFinanceiro.next();

    var pastaNotaFiscal = pastaFinanceiroFolder.getFoldersByName("07_NOTAFISCAL_FINAL_PRODUCAO");
    if (!pastaNotaFiscal.hasNext()) { toast("Sem '07_NOTAFISCAL_FINAL_PRODUCAO'!"); return; }
    var pastaNotaFiscalFolder = pastaNotaFiscal.next();

    var pastaProducao = pastaNotaFiscalFolder.getFoldersByName("01_PRODUCAO");
    if (!pastaProducao.hasNext()) { toast("Sem '01_PRODUCAO'!"); return; }
    var pastaProducaoFolder = pastaProducao.next();

    var urlFechamento = "https://drive.google.com/drive/folders/" + pastaProducaoFolder.getId();
    salvarUrlNaPlanilhaJob("URL_FECHAMENTO_PD", urlFechamento, indexJob);
    toast("URL '01_PRODUCAO' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_FECHAMENTO_PD: ${error}`);
  }
}

function salvarUrlFechamentoArte(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaFinanceiro = novaPasta.getFoldersByName(nomeJobLocal + " - 02_FINANCEIRO");
    if (!pastaFinanceiro.hasNext()) { toast("Sem '02_FINANCEIRO'!"); return; }
    var pastaFinanceiroFolder = pastaFinanceiro.next();

    var pastaNotaFiscal = pastaFinanceiroFolder.getFoldersByName("07_NOTAFISCAL_FINAL_PRODUCAO");
    if (!pastaNotaFiscal.hasNext()) { toast("Sem '07_NOTAFISCAL_FINAL_PRODUCAO'!"); return; }
    var pastaNotaFiscalFolder = pastaNotaFiscal.next();

    var pastaArte = pastaNotaFiscalFolder.getFoldersByName("02_ARTE");
    if (!pastaArte.hasNext()) { toast("Sem '02_ARTE'!"); return; }
    var pastaArteFolder = pastaArte.next();

    var urlFechamento = "https://drive.google.com/drive/folders/" + pastaArteFolder.getId();
    salvarUrlNaPlanilhaJob("URL_FECHAMENTO_ARTE", urlFechamento, indexJob);
    toast("URL '02_ARTE' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_FECHAMENTO_ARTE: ${error}`);
  }
}

function salvarUrlFechamentoFigurino(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaFinanceiro = novaPasta.getFoldersByName(nomeJobLocal + " - 02_FINANCEIRO");
    if (!pastaFinanceiro.hasNext()) { toast("Sem '02_FINANCEIRO'!"); return; }
    var pastaFinanceiroFolder = pastaFinanceiro.next();

    var pastaNotaFiscal = pastaFinanceiroFolder.getFoldersByName("07_NOTAFISCAL_FINAL_PRODUCAO");
    if (!pastaNotaFiscal.hasNext()) { toast("Sem '07_NOTAFISCAL_FINAL_PRODUCAO'!"); return; }
    var pastaNotaFiscalFolder = pastaNotaFiscal.next();

    var pastaFigurino = pastaNotaFiscalFolder.getFoldersByName("04_FIGURINO");
    if (!pastaFigurino.hasNext()) { toast("Sem '04_FIGURINO'!"); return; }
    var pastaFigurinoFolder = pastaFigurino.next();

    var urlFechamento = "https://drive.google.com/drive/folders/" + pastaFigurinoFolder.getId();
    salvarUrlNaPlanilhaJob("URL_FECHAMENTO_FIGURINO", urlFechamento, indexJob);
    toast("URL '04_FIGURINO' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_FECHAMENTO_FIGURINO: ${error}`);
  }
}

function salvarUrlPreFigurino(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaFornecedores = novaPasta.getFoldersByName(nomeJobLocal + " - 06_FORNECEDORES");
    if (!pastaFornecedores.hasNext()) { toast("Sem '06_FORNECEDORES'!"); return; }
    var pastaFornecedoresFolder = pastaFornecedores.next();

    var pastaFigurinoPre = pastaFornecedoresFolder.getFoldersByName("03_FIGURINO_PRE");
    if (!pastaFigurinoPre.hasNext()) { toast("Sem '03_FIGURINO_PRE'!"); return; }
    var pastaFigurinoPreFolder = pastaFigurinoPre.next();

    var urlFigurinoPre = "https://drive.google.com/drive/folders/" + pastaFigurinoPreFolder.getId();
    salvarUrlNaPlanilhaJob("URL_PRE_FIGURINO", urlFigurinoPre, indexJob);
    toast("URL '03_FIGURINO_PRE' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_PRE_FIGURINO: ${error}`);
  }
}

function salvarUrlPreArte(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaFornecedores = novaPasta.getFoldersByName(nomeJobLocal + " - 06_FORNECEDORES");
    if (!pastaFornecedores.hasNext()) { toast("Sem '06_FORNECEDORES'!"); return; }
    var pastaFornecedoresFolder = pastaFornecedores.next();

    var pastaArtePre = pastaFornecedoresFolder.getFoldersByName("02_ARTE_PRE");
    if (!pastaArtePre.hasNext()) { toast("Sem '02_ARTE_PRE'!"); return; }
    var pastaArtePreFolder = pastaArtePre.next();

    var urlArtePre = "https://drive.google.com/drive/folders/" + pastaArtePreFolder.getId();
    salvarUrlNaPlanilhaJob("URL_PRE_ARTE", urlArtePre, indexJob);
    toast("URL '02_ARTE_PRE' salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_PRE_ARTE: ${error}`);
  }
}

function salvarUrlCronograma(novaPasta, nomeJobLocal, indexJob) {
  try {
    var vendas = novaPasta.getFoldersByName(nomeJobLocal + " - 10_VENDAS/PRODUTOR_EXECUTIVO");
    if (!vendas.hasNext()) { toast("'10_VENDAS/PRODUTOR_EXECUTIVO' não encontrada"); return; }
    var inicio = vendas.next().getFoldersByName("01_INICIO_DO_PROJETO");
    if (!inicio.hasNext()) { toast("'01_INICIO_DO_PROJETO' não encontrada"); return; }
    var cronos = inicio.next().getFoldersByName("04_CRONOGRAMA");
    if (!cronos.hasNext()) { toast("'04_CRONOGRAMA' não encontrada"); return; }

    var pastaCrono = cronos.next();
    var urlCrono = "https://drive.google.com/drive/folders/" + pastaCrono.getId();
    salvarUrlNaPlanilhaJob("URL_CRONOGRAMA", urlCrono, indexJob);
    toast("URL_CRONOGRAMA salva!");
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_CRONOGRAMA: ${error}`);
  }
}

function darPermissaoCronograma(novaPasta, nomeJobLocal) {
  var vendas = novaPasta.getFoldersByName(nomeJobLocal + " - 10_VENDAS/PRODUTOR_EXECUTIVO");
  if (!vendas.hasNext()) return;
  var inicio = vendas.next().getFoldersByName("01_INICIO_DO_PROJETO");
  if (!inicio.hasNext()) return;
  var cronos = inicio.next().getFoldersByName("04_CRONOGRAMA");
  if (!cronos.hasNext()) return;

  var pastaCrono = cronos.next();
  var emailsStr  = obterValorColunaI();
  if (!emailsStr) { Logger.log("Sem e-mails para permissão de cronograma"); return; }

  emailsStr.split(",").map(e => e.trim()).filter(e => e).forEach(e => pastaCrono.addEditor(e));
  toast("Permissões de edição definidas em CRONOGRAMA");
}

/******************************************************
 * DOC: CARTA ORÇAMENTO
 ******************************************************/
function preencherCamposCartaOrcamento(documentId, indexJob) {
  const ss = SS();
  const abaJob = ss.getSheetByName("NUMERO DE JOB");
  const headers = abaJob.getRange(4, 1, 1, abaJob.getLastColumn()).getValues()[0];
  const data = abaJob.getRange(5, 1, abaJob.getLastRow() - 4, abaJob.getLastColumn()).getValues();

  const linha = data.find(row => row[0] == indexJob);
  if (!linha) throw new Error("Index não encontrado: " + indexJob);

  const campos = {
    "{{CLIENTE}}": linha[headers.indexOf("CLIENTE")],
    "{{AGENCIA}}": linha[headers.indexOf("AGENCIA")],
    "{{NOME_DO_JOB}}": linha[headers.indexOf("NOME DO JOB")],
    "{{VALOR_TOTAL}}": formatarMoeda(linha[headers.indexOf("VALOR FECHADO")])
  };

  const doc = DocumentApp.openById(documentId);
  const body = doc.getBody();

  for (let campo in campos) body.replaceText(campo, campos[campo] || "");

  doc.saveAndClose();
  Logger.log("✅ Carta orçamento preenchida automaticamente.");
}

function formatarMoeda(valor) {
  if (!valor || isNaN(valor)) return "R$ 0,00";
  return "R$ " + Number(valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/******************************************************
 * VALIDAÇÃO DE EMAILS
 ******************************************************/
function validarEmails(emailsStr) {
  if (!emailsStr) return false;
  const emails = emailsStr.split(",").map(e => e.trim()).filter(e => e !== "");
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.every(e => regex.test(e));
}

/******************************************************
 * doPost (API) - VERSÃO FINAL OTIMIZADA
 ******************************************************/
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Sistema ocupado, tente novamente'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const dados = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');

    if (dados.token !== CONFIG.token) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Acesso negado - Token inválido'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const acao = dados.acao || 'status';
    let resultado = {};

    switch (acao) {

      case 'job_fechado': {
  const {
    nomeJob, agencia, cliente, emailAtendimento,
    valorFechado = "", diretor = "", produtorExecutivo = "",
    dataEntregaFinal = "", dataPagamento = "", audioProdutora = ""
  } = dados;

  if (!nomeJob || !agencia || !cliente || !emailAtendimento) {
    resultado = { erro:true, mensagem:'Campos obrigatórios: nomeJob, agencia, cliente, emailAtendimento' };
    break;
  }
  if (!validarEmails(emailAtendimento)) {
    resultado = { erro:true, mensagem:'emailAtendimento inválido (use vírgulas p/ múltiplos)' };
    break;
  }

  // ✅ CORREÇÃO: Verifica se JÁ FOI COMPLETADO, não se está em processamento
  const key = _idempotencyKey(dados);
  const sp  = PropertiesService.getScriptProperties();
  const alreadyCompleted = sp.getProperty(key + '_COMPLETED'); // Marca finalização, não início
  
  if (alreadyCompleted) {
    resultado = { 
      tipo: 'job_fechado_ja_existente', 
      task_id: alreadyCompleted, 
      duplicado: true, 
      mensagem: 'Job já foi processado anteriormente' 
    };
    break;
  }

  // ✅ CORREÇÃO: Verifica se já está na fila (em processamento)
  const alreadyInQueue = sp.getProperty(key + '_QUEUED');
  if (alreadyInQueue) {
    resultado = { 
      tipo: 'job_fechado_em_processamento', 
      task_id: alreadyInQueue, 
      duplicado: true, 
      mensagem: 'Job já está sendo processado' 
    };
    break;
  }

  const taskId = Utilities.getUuid();
  
  // ✅ CORREÇÃO: Marca apenas como "na fila", não como processado
  sp.setProperty(key + '_QUEUED', taskId);
  
  _queuePush(taskId, {
    nomeJob, agencia, cliente, emailAtendimento,
    valorFechado, diretor, produtorExecutivo,
    dataEntregaFinal, dataPagamento, audioProdutora,
    idempotencyKey: key // ✅ Passa a chave para cleanup posterior
  });
  
  _kickWorker();

  resultado = { 
    tipo: 'job_fechado_recebido', 
    task_id: taskId, 
    duplicado: false, 
    mensagem: 'Enfileirado para processamento' 
  };
  break;
}

      case 'status': {
  const sh = SH("NUMERO DE JOB");
  const headers = sh.getRange(CONFIG.headerRow, 1, 1, sh.getLastColumn()).getValues()[0];
  const data = sh.getRange(CONFIG.headerRow + 1, 1, sh.getLastRow() - CONFIG.headerRow, sh.getLastColumn()).getValues();

  const jobs = data.map(row => {
    const get = (colName) => {
      const idx = headers.indexOf(colName);
      return idx >= 0 ? row[idx] : "";
    };
    
    const job = {
      index: get("INDEX"),
      numeroJob: get("NUMERO DO JOB"),
      nomeJob: get("NOME DO JOB"),
      agencia: get("AGENCIA"),
      cliente: get("CLIENTE"),
      status: get("STATUS"),
      valorFechado: get("VALOR FECHADO"),
      valorProducao: get("Valor Produção"),
      valorImposto: get("Valor Imposto"),
      valorW: get("Valor W"),
      valorLiquido: get("Valor Liquido"),
      dataEntregaFinal: get("DATA DE ENTREGA FINAL"),
      dataPagamento: get("DATA_PAGAMENTO"),
      audioProdutora: get("AUDIO_PRODUTORA"),
      pastaUrl: get("PASTA_URL"),
      planilhaUrl: get("PLANILHA PRODUCAO"),
      cartaUrl: get("URL_CARTA_ORCAMENTO"),
      urlRoteiro: get("URL_ROTEIRO"),
      urlCadastroElenco: get("URL_CADASTRO_ELENCO"),
      urlCadastroEquipe: get("URL_CADASTRO_EQUIPE"),
      urlPPM: get("URL_PPM"),
      urlPrePD: get("URL_PRE_PD"),
      urlPreArte: get("URL_PRE_ARTE"),
      urlPreFigurino: get("URL_PRE_FIGURINO"),
      urlFechamentoPD: get("URL_FECHAMENTO_PD"),
      urlFechamentoArte: get("URL_FECHAMENTO_ARTE"),
      urlFechamentoFigurino: get("URL_FECHAMENTO_FIGURINO"),
      urlCronograma: get("URL_CRONOGRAMA"),
      // ✅ NOVOS CAMPOS ADICIONADOS
      health_score: calcularHealthScoreJob(row, headers),
      completude: calcularCompletudeJob(row, headers),
      alertas: gerarAlertasJob(row, headers),
      proximos_passos: sugerirProximosPassos(row, headers)
    };
    return job;
  }).filter(j => j.index);

  // ✅ DASHBOARD CONSISTENTE NO MESMO RETORNO
  const metricas = {
    total_jobs: jobs.length,
    jobs_ativos: jobs.filter(j => !j.status?.toLowerCase().includes('concluído')).length,
    jobs_concluidos: jobs.filter(j => j.status?.toLowerCase().includes('concluído')).length,
    valor_total_fechado: jobs.reduce((sum, j) => sum + (parseFloat(j.valorFechado) || 0), 0),
    valor_total_producao: jobs.reduce((sum, j) => sum + (parseFloat(j.valorProducao) || 0), 0),
    valor_total_w: jobs.reduce((sum, j) => sum + (parseFloat(j.valorW) || 0), 0),
    media_health_score: Math.round(jobs.reduce((sum, j) => sum + (j.health_score || 0), 0) / jobs.length),
    entregas_proximas: jobs
      .filter(j => j.dataEntregaFinal && !j.status?.toLowerCase().includes('concluído'))
      .sort((a, b) => new Date(a.dataEntregaFinal) - new Date(b.dataEntregaFinal))
      .slice(0, 5)
      .map(j => ({
        job: j.nomeJob,
        entrega: j.dataEntregaFinal,
        dias_restantes: Math.ceil((new Date(j.dataEntregaFinal) - new Date()) / (1000 * 60 * 60 * 24))
      }))
  };

  resultado = {
    status: 'success',
    message: 'Consulta de status concluída',
    acao: 'status',
    metricas: metricas,
    jobs: jobs,
    timestamp: new Date().toLocaleString('pt-BR')
  };
  break;
      }

      default:
        resultado = {
          status: 'error',
          message: `Ação "${acao}" não reconhecida. Use: job_fechado, status`
        };
    }

    return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Erro interno: ' + error.toString(),
      timestamp: new Date().toLocaleString('pt-BR')
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}


/******************************************************
 * FUNÇÕES PARA ENRIQUECER OS DADOS
 ******************************************************/
function calcularHealthScoreJob(row, headers) {
  let score = 0;
  
  // URLs preenchidos (+15 pontos cada)
  const urlCampos = ["URL_CARTA_ORCAMENTO", "URL_CRONOGRAMA", "URL_ROTEIRO", "URL_PPM"];
  urlCampos.forEach(campo => {
    const idx = headers.indexOf(campo);
    if (idx >= 0 && row[idx] && row[idx].toString().includes('http')) score += 15;
  });
  
  // Datas definidas (+10 pontos cada)
  if (row[headers.indexOf("DATA DE ENTREGA FINAL")]) score += 10;
  if (row[headers.indexOf("DATA_PAGAMENTO")]) score += 10;
  
  // Equipe definida (+10 pontos cada)
  if (row[headers.indexOf("DIRETOR")]) score += 10;
  if (row[headers.indexOf("PRODUTOR EXECUTIVO")]) score += 10;
  
  return Math.min(100, score);
}

function calcularCompletudeJob(row, headers) {
  const totalCampos = 8; // Campos principais
  let preenchidos = 0;
  
  const campos = ["NOME DO JOB", "CLIENTE", "VALOR FECHADO", "EMAIL DO ATENDIMENTO", 
                  "DIRETOR", "PRODUTOR EXECUTIVO", "DATA DE ENTREGA FINAL", "URL_CARTA_ORCAMENTO"];
  
  campos.forEach(campo => {
    const idx = headers.indexOf(campo);
    if (idx >= 0 && row[idx] && row[idx].toString().trim() !== "") preenchidos++;
  });
  
  return Math.round((preenchidos / totalCampos) * 100);
}

function gerarAlertasJob(row, headers) {
  const alertas = [];
  const hoje = new Date();
  
  // Alerta de entrega próxima
  const dataEntrega = row[headers.indexOf("DATA DE ENTREGA FINAL")];
  if (dataEntrega) {
    const diasRestantes = Math.ceil((new Date(dataEntrega) - hoje) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 7 && diasRestantes > 0) {
      alertas.push(`⚠️ ENTREGA EM ${diasRestantes} DIAS`);
    }
  }
  
  // Alerta de documentos pendentes
  if (!row[headers.indexOf("URL_CARTA_ORCAMENTO")]) {
    alertas.push("📄 CARTA ORÇAMENTO PENDENTE");
  }
  if (!row[headers.indexOf("URL_CRONOGRAMA")]) {
    alertas.push("📅 CRONOGRAMA PENDENTE");
  }
  
  return alertas;
}

function sugerirProximosPassos(row, headers) {
  const sugestoes = [];
  
  if (!row[headers.indexOf("URL_CARTA_ORCAMENTO")]) {
    sugestoes.push("Preencher carta orçamento com dados do cliente");
  }
  if (!row[headers.indexOf("URL_CRONOGRAMA")]) {
    sugestoes.push("Definir cronograma com datas principais");
  }
  if (!row[headers.indexOf("URL_CADASTRO_EQUIPE")]) {
    sugestoes.push("Convidar equipe através do formulário");
  }
  
  return sugestoes.length > 0 ? sugestoes : ["Todos os passos principais concluídos! 🎉"];
}


/******************************************************
 * SEGURANÇA ANTI-DUPLICATAS
 ******************************************************/
function verificarPastaDuplicada(nomePasta, pastaPai) {
  var pastas = pastaPai.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    var pastaExistente = pastas.next();
    Logger.log('❌ Pasta duplicada ignorada: ' + nomePasta + ' - ID: ' + pastaExistente.getId());
    return pastaExistente;
  }
  return null;
}

function coletarLinksDoJob(indexJob) {
  const sh = SH("NUMERO DE JOB");
  const headers = sh.getRange(CONFIG.headerRow, 1, 1, sh.getLastColumn()).getValues()[0];
  const data = sh.getRange(CONFIG.headerRow + 1, 1, sh.getLastRow() - CONFIG.headerRow, sh.getLastColumn()).getValues();

  const idxCol = headers.indexOf("INDEX");
  if (idxCol < 0) return {};
  const row = data.find(r => String(r[idxCol]) === String(indexJob));
  if (!row) return {};

  const get = (colName) => {
    const i = headers.indexOf(colName);
    return i >= 0 ? row[i] : "";
  };

  return {
    pastaUrl:               get("PASTA_URL"),
    planilhaUrl:            get("PLANILHA PRODUCAO"),
    cartaUrl:               get("URL_CARTA_ORCAMENTO"),
    urlCronograma:          get("URL_CRONOGRAMA"),
    urlRoteiro:             get("URL_ROTEIRO"),
    urlCadastroEquipe:      get("URL_CADASTRO_EQUIPE"),
    urlCadastroElenco:      get("URL_CADASTRO_ELENCO"),
    urlPPM:                 get("URL_PPM"),
    urlPrePD:               get("URL_PRE_PD"),
    urlPreArte:             get("URL_PRE_ARTE"),
    urlPreFigurino:         get("URL_PRE_FIGURINO"),
    urlFechamentoPD:        get("URL_FECHAMENTO_PD"),
    urlFechamentoArte:      get("URL_FECHAMENTO_ARTE"),
    urlFechamentoFigurino:  get("URL_FECHAMENTO_FIGURINO"),
    urlEquipeDoJobAtual:    get("URL_EQUIPE_DO_JOB_ATUAL"),
    urlMaterialBruto:       get("URL_MATERIALBRUTO")
  };
}


function _idempotencyKey(d) {
  var base = [d.nomeJob||'', d.agencia||'', d.cliente||''].join('|');
  var hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, base));
  return 'IDEMPOT_'+hash;
}
function _queuePush(taskId, payload) {
  var sp = PropertiesService.getScriptProperties();
  sp.setProperty('Q_'+taskId, JSON.stringify(payload));
  var ids = (sp.getProperty('Q_IDS') || '').split(',').filter(Boolean);
  ids.push(taskId);
  sp.setProperty('Q_IDS', ids.join(','));
  Logger.log(`📨 Job ${taskId} adicionado à fila. Fila atual: ${ids.length} itens`);
}
function _queuePop() {
  var sp = PropertiesService.getScriptProperties();
  var ids = (sp.getProperty('Q_IDS') || '').split(',').filter(Boolean);
  if (!ids.length) {
    Logger.log('ℹ️ Nenhum job para remover da fila');
    return null;
  }
  var id = ids.shift();
  sp.setProperty('Q_IDS', ids.join(','));
  var raw = sp.getProperty('Q_'+id);
  sp.deleteProperty('Q_'+id);
  
  if (!raw) {
    Logger.log(`⚠️ Job ${id} não encontrado no storage`);
    return null;
  }
  
  Logger.log(`📥 Job ${id} removido da fila. Fila restante: ${ids.length} itens`);
  return { id: id, payload: JSON.parse(raw) };
}
function _kickWorker() {
  // roda já (sem esperar 1 min) – agenda em ~1s
  ScriptApp.newTrigger('runDeferred').timeBased().after(1000).create();
}

function runDeferred() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(280000)) {
    Logger.log('❌ Não foi possível obter lock - sistema ocupado');
    return;
  }

  try {
    const job = _queuePop();
    if (!job) {
      Logger.log('ℹ️ Nenhum job na fila para processar');
      return;
    }

    Logger.log(`🔧 Processando job: ${job.id}`);
    
    const key = job.payload.idempotencyKey;
    const sp = PropertiesService.getScriptProperties();
    
    try {
      // ---- PROCESSO PESADO (CRIAÇÃO) ----
      Logger.log('📋 Validando cabeçalhos...');
      validarCabecalhosObrigatorios();
      
      const ss = SS();
      const sh = ss.getSheetByName("NUMERO DE JOB");
      const newIndex = getProximoIndex();
      const nomeJob = job.payload.nomeJob;
      const agencia = job.payload.agencia;
      const cliente = job.payload.cliente;
      const jobAba  = `${String(newIndex).padStart(3,'0')}_${nomeJob}_${agencia}`;

      Logger.log(`📝 Adicionando linha na planilha: ${jobAba}`);
      
      sh.appendRow([
        newIndex, newIndex, nomeJob, agencia, cliente,
        job.payload.valorFechado, "", jobAba, job.payload.emailAtendimento,
        "", "", "", "",
        job.payload.diretor, job.payload.produtorExecutivo,
        job.payload.dataEntregaFinal, "", "",
        job.payload.dataPagamento, job.payload.audioProdutora
      ]);

      setCriadorIndexCell(newIndex);

      // cria estrutura e salva links
      Logger.log('📁 Criando estrutura de pastas...');
      const resultadoCriacao = copiarPastaBaseAdmFromJobAba(jobAba, newIndex);
      
      if (resultadoCriacao.duplicata) {
        Logger.log('⚠️ Pasta duplicada encontrada, continuando com links...');
      }

      // ✅ DEBUG: Verificar cabeçalhos antes de coletar links
      Logger.log('🔍 Verificando cabeçalhos da planilha...');
      verificarCabecalhosPlanilha();

      const linksDoJob = coletarLinksDoJob(newIndex);

      // ✅ DEBUG DETALHADO - ADICIONE ESTAS LINHAS
      Logger.log("=== DEBUG URL_MATERIALBRUTO ===");
      Logger.log("Todos os links coletados: " + JSON.stringify(linksDoJob));
      Logger.log("URL_MATERIALBRUTO específico: " + linksDoJob.urlMaterialBruto);
      Logger.log("Tipo do valor: " + typeof linksDoJob.urlMaterialBruto);
      Logger.log("Está vazio? " + (linksDoJob.urlMaterialBruto ? "NÃO" : "SIM"));
      Logger.log("Comprimento do valor: " + (linksDoJob.urlMaterialBruto ? linksDoJob.urlMaterialBruto.length : 0));

      // ---- MONTA O ITEM COMPLETO COM TODAS AS URLs ----
      const L = linksDoJob;

      const item = {
        // 👇 infos "humanas"
        original: {
          numOrc: null,
          cliente,
          projeto: nomeJob,
          agencia,
          job_name: nomeJob,
          numeroJob: newIndex,
          jobAba: jobAba
        },

        // 👇 todas as URLs agrupadas
        links: {
          pastaUrl:               L.pastaUrl || "",
          planilhaUrl:            L.planilhaUrl || "",
          cartaUrl:               L.cartaUrl || "",
          urlCronograma:          L.urlCronograma || "",
          urlRoteiro:             L.urlRoteiro || "",
          urlCadastroEquipe:      L.urlCadastroEquipe || "",
          urlCadastroElenco:      L.urlCadastroElenco || "",
          urlPPM:                 L.urlPPM || "",
          urlPrePD:               L.urlPrePD || "",
          urlPreArte:             L.urlPreArte || "",
          urlPreFigurino:         L.urlPreFigurino || "",
          urlFechamentoPD:        L.urlFechamentoPD || "",
          urlFechamentoArte:      L.urlFechamentoArte || "",
          urlFechamentoFigurino:  L.urlFechamentoFigurino || "",
          urlEquipeDoJobAtual:    L.urlEquipeDoJobAtual || "",
          // ✅ NOVO CAMPO ADICIONADO
          urlMaterialBruto:       L.urlMaterialBruto || "DEBUG_FALLBACK_URL"
        },

        // 👇 fallback no root (se seu nó ler daqui)
        numOrc: null,
        cliente,
        projeto: nomeJob,
        row: newIndex,
        job_name: nomeJob,
        numeroJob: newIndex,
        jobAba: jobAba,

        pastaUrl:               L.pastaUrl || "",
        planilhaUrl:            L.planilhaUrl || "",
        cartaUrl:               L.cartaUrl || "",
        urlCronograma:          L.urlCronograma || "",
        urlRoteiro:             L.urlRoteiro || "",
        urlCadastroEquipe:      L.urlCadastroEquipe || "",
        urlCadastroElenco:      L.urlCadastroElenco || "",
        urlPPM:                 L.urlPPM || "",
        urlPrePD:               L.urlPrePD || "",
        urlPreArte:             L.urlPreArte || "",
        urlPreFigurino:         L.urlPreFigurino || "",
        urlFechamentoPD:        L.urlFechamentoPD || "",
        urlFechamentoArte:      L.urlFechamentoArte || "",
        urlFechamentoFigurino:  L.urlFechamentoFigurino || "",
        urlEquipeDoJobAtual:    L.urlEquipeDoJobAtual || "",
        // ✅ NOVO CAMPO ADICIONADO NO ROOT TAMBÉM
        urlMaterialBruto:       L.urlMaterialBruto || "DEBUG_FALLBACK_URL"
      };

      // ✅ DEBUG DO ITEM COMPLETO
      Logger.log("=== DEBUG ITEM COMPLETO ===");
      Logger.log("Item montado: " + JSON.stringify(item, null, 2));
      Logger.log("Item.links.urlMaterialBruto: " + item.links.urlMaterialBruto);
      Logger.log("Item.urlMaterialBruto: " + item.urlMaterialBruto);

      var payload = {
        tipo: "job_fechado",
        task_id: job.id,
        processados: [ item ],
        mensagem: "Job fechado registrado e estrutura criada.",
        timestamp: new Date().toISOString()
      };

      // ✅ DEBUG DO PAYLOAD FINAL
      Logger.log("=== DEBUG PAYLOAD FINAL ===");
      Logger.log("Payload completo: " + JSON.stringify(payload, null, 2));
      Logger.log("Payload.processados[0].links.urlMaterialBruto: " + payload.processados[0].links.urlMaterialBruto);
      Logger.log("Payload.processados[0].urlMaterialBruto: " + payload.processados[0].urlMaterialBruto);

      // ✅ CORREÇÃO: Marca como COMPLETADO com sucesso
      sp.setProperty(key + '_COMPLETED', job.id);
      Logger.log(`✅ Job ${job.id} marcado como COMPLETADO`);

      // ---- CALLBACK pro n8n ----
      Logger.log('📤 Enviando callback para n8n...');
      try {
        const response = UrlFetchApp.fetch(CONFIG.N8N_CALLBACK_URL, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
          timeout: 30000
        });
        Logger.log(`✅ Callback enviado com sucesso: ${response.getResponseCode()}`);
        Logger.log(`📨 Resposta do n8n: ${response.getContentText()}`);
      } catch (fetchError) {
        Logger.log(`❌ Erro no callback para n8n: ${fetchError}`);
        // Não relançar - o job já foi processado com sucesso
      }

    } catch (error) {
      Logger.log(`❌ Erro durante processamento do job ${job.id}: ${error}`);
      
      // ✅ CORREÇÃO: Em caso de erro, LIMPA a marcação da fila
      sp.deleteProperty(key + '_QUEUED');
      Logger.log(`🧹 Limpeza da fila para job ${job.id} devido a erro`);
      
      // Tenta notificar o n8n sobre o erro
      try {
        UrlFetchApp.fetch(CONFIG.N8N_CALLBACK_URL, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({ 
            erro: true, 
            task_id: job.id, 
            mensagem: String(error), 
            timestamp: new Date().toISOString() 
          }),
          muteHttpExceptions: true
        });
      } catch (callbackError) {
        Logger.log(`❌ Erro ao enviar callback de erro: ${callbackError}`);
      }
      
      // Re-lança o erro para logging externo
      throw error;
    } finally {
      // ✅ CORREÇÃO: Limpa a marcação da fila (sucesso ou erro)
      sp.deleteProperty(key + '_QUEUED');
      Logger.log(`🧹 Limpeza final da fila para job ${job.id}`);
    }

    Logger.log(`🎉 Job ${job.id} processado com sucesso!`);

  } catch (e) {
    Logger.log(`💥 Erro crítico no runDeferred: ${e.toString()}`);
    Logger.log(`Stack: ${e.stack}`);
  } finally {
    try { 
      lock.releaseLock(); 
      Logger.log('🔓 Lock liberado');
    } catch (_) {}
    
    // ✅ CORREÇÃO: Verifica se há mais trabalho de forma mais segura
    var sp = PropertiesService.getScriptProperties();
    var pendingIds = (sp.getProperty('Q_IDS') || '').split(',').filter(Boolean);
    
    Logger.log(`📊 Itens pendentes na fila: ${pendingIds.length}`);
    
    if (pendingIds.length > 0) {
      Logger.log('⏰ Agenda próximo processamento em 2 segundos...');
      Utilities.sleep(2000); // Pequena pausa antes do próximo
      _kickWorker();
    } else {
      Logger.log('🏁 Fila vazia - processamento concluído');
    }
  }
}

// ✅ ADICIONE ESTA FUNÇÃO PARA VERIFICAR CABEÇALHOS
function verificarCabecalhosPlanilha() {
  try {
    const sh = SH("NUMERO DE JOB");
    const headers = sh.getRange(CONFIG.headerRow, 1, 1, sh.getLastColumn()).getValues()[0];
    
    Logger.log("=== CABEÇALHOS DA PLANILHA ===");
    headers.forEach((header, index) => {
      if (header && (header.toString().includes("MATERIAL") || header.toString().includes("URL"))) {
        Logger.log(`Coluna ${index + 1}: "${header}"`);
      }
    });
    
    // Verifica especificamente o URL_MATERIALBRUTO
    const materialBrutoIndex = headers.indexOf("URL_MATERIALBRUTO");
    Logger.log("Posição do URL_MATERIALBRUTO: " + materialBrutoIndex);
    
    if (materialBrutoIndex === -1) {
      Logger.log("❌ URL_MATERIALBRUTO NÃO ENCONTRADO nos cabeçalhos!");
      Logger.log("Cabeçalhos disponíveis: " + headers.join(", "));
    } else {
      Logger.log("✅ URL_MATERIALBRUTO encontrado na coluna: " + (materialBrutoIndex + 1));
    }
    
    return headers;
  } catch (error) {
    Logger.log("❌ Erro ao verificar cabeçalhos: " + error);
    return [];
  }
}

// ✅ ATUALIZE A FUNÇÃO coletarLinksDoJob PARA MAIS DEBUG
function coletarLinksDoJob(indexJob) {
  try {
    const sh = SH("NUMERO DE JOB");
    const headers = sh.getRange(CONFIG.headerRow, 1, 1, sh.getLastColumn()).getValues()[0];
    const data = sh.getRange(CONFIG.headerRow + 1, 1, sh.getLastRow() - CONFIG.headerRow, sh.getLastColumn()).getValues();

    const idxCol = headers.indexOf("INDEX");
    if (idxCol < 0) {
      Logger.log("❌ Coluna INDEX não encontrada");
      return {};
    }
    
    const row = data.find(r => String(r[idxCol]) === String(indexJob));
    if (!row) {
      Logger.log("❌ Linha do job " + indexJob + " não encontrada");
      return {};
    }

    const get = (colName) => {
      const i = headers.indexOf(colName);
      if (i >= 0) {
        const valor = row[i];
        Logger.log(`🔍 Buscando ${colName} na coluna ${i + 1}: "${valor}"`);
        return valor;
      } else {
        Logger.log(`❌ Cabeçalho ${colName} não encontrado`);
        return "";
      }
    };

    const result = {
      pastaUrl:               get("PASTA_URL"),
      planilhaUrl:            get("PLANILHA PRODUCAO"),
      cartaUrl:               get("URL_CARTA_ORCAMENTO"),
      urlCronograma:          get("URL_CRONOGRAMA"),
      urlRoteiro:             get("URL_ROTEIRO"),
      urlCadastroEquipe:      get("URL_CADASTRO_EQUIPE"),
      urlCadastroElenco:      get("URL_CADASTRO_ELENCO"),
      urlPPM:                 get("URL_PPM"),
      urlPrePD:               get("URL_PRE_PD"),
      urlPreArte:             get("URL_PRE_ARTE"),
      urlPreFigurino:         get("URL_PRE_FIGURINO"),
      urlFechamentoPD:        get("URL_FECHAMENTO_PD"),
      urlFechamentoArte:      get("URL_FECHAMENTO_ARTE"),
      urlFechamentoFigurino:  get("URL_FECHAMENTO_FIGURINO"),
      urlEquipeDoJobAtual:    get("URL_EQUIPE_DO_JOB_ATUAL"),
      // ✅ FORÇA O URL_MATERIALBRUTO PARA TESTE
      urlMaterialBruto:       get("URL_MATERIALBRUTO") || "https://drive.google.com/drive/DEBUG-FORCED-URL"
    };

    Logger.log("🎯 RESULTADO FINAL coletarLinksDoJob:");
    Logger.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    Logger.log("❌ Erro em coletarLinksDoJob: " + error);
    return {
      urlMaterialBruto: "https://drive.google.com/drive/ERROR-FALLBACK-URL"
    };
  }
}

function debugFila() {
  const sp = PropertiesService.getScriptProperties();
  const ids = (sp.getProperty('Q_IDS') || '').split(',').filter(Boolean);
  const properties = sp.getProperties();
  
  console.log('=== DEBUG FILA ===');
  console.log('IDs na fila:', ids);
  console.log('Todas as properties:', properties);
}

function limparFila() {
  const sp = PropertiesService.getScriptProperties();
  const properties = sp.getProperties();
  
  Object.keys(properties).forEach(key => {
    if (key.startsWith('Q_') || key.startsWith('IDEMPOT_')) {
      sp.deleteProperty(key);
    }
  });
  console.log('Fila limpa!');
}

function salvarUrlMaterialBruto(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaPosProducao = novaPasta.getFoldersByName(nomeJobLocal + " - 08_POS_PRODUCAO");
    if (!pastaPosProducao.hasNext()) { 
      Logger.log("❌ Pasta '08_POS_PRODUCAO' não encontrada!");
      return; 
    }
    var pastaPosProducaoFolder = pastaPosProducao.next();

    var pastaMaterialBruto = pastaPosProducaoFolder.getFoldersByName("01_MATERIAL BRUTO");
    if (!pastaMaterialBruto.hasNext()) { 
      Logger.log("❌ Pasta '01_MATERIAL BRUTO' não encontrada!");
      return; 
    }
    var pastaMaterialBrutoFolder = pastaMaterialBruto.next();

    var urlMaterialBruto = "https://drive.google.com/drive/folders/" + pastaMaterialBrutoFolder.getId();
    
    // Usa a mesma função que já existe para salvar na planilha
    var sucesso = salvarUrlNaPlanilhaJob("URL_MATERIALBRUTO", urlMaterialBruto, indexJob);
    
    if (sucesso) {
      Logger.log("✅ URL_MATERIALBRUTO salvo com sucesso!");
    } else {
      Logger.log("❌ Erro ao salvar URL_MATERIALBRUTO");
    }
    
  } catch (error) {
    Logger.log(`❌ Erro ao salvar URL_MATERIALBRUTO: ${error}`);
  }
}

function publicarFormularioEquipe(novaPasta, nomeJobLocal, indexJob) {
  try {
    var pastaContratos = novaPasta.getFoldersByName(nomeJobLocal + " - 05_CONTRATOS");
    if (!pastaContratos.hasNext()) {
      Logger.log("❌ Pasta '05_CONTRATOS' não encontrada!");
      return;
    }
    
    var pastaContratosFolder = pastaContratos.next();
    var pastaContratoEquipe = pastaContratosFolder.getFoldersByName("02_CONTRATOEQUIPE");
    if (!pastaContratoEquipe.hasNext()) {
      Logger.log("❌ Pasta '02_CONTRATOEQUIPE' não encontrada!");
      return;
    }
    
    var pastaContratoEquipeFolder = pastaContratoEquipe.next();
    var arquivosForm = pastaContratoEquipeFolder.getFilesByName(nomeJobLocal + " - Forms_Cadastro_Equipe");
    
    if (arquivosForm.hasNext()) {
      var formFile = arquivosForm.next();
      var form = FormApp.openById(formFile.getId());
      
      // ✅ CONFIGURAÇÕES PARA PUBLICAR O FORMULÁRIO
      form.setAcceptingResponses(true); // Aceita respostas
      form.setAllowResponseEdits(true); // Permite editar respostas
      form.setLimitOneResponsePerUser(false); // Permite múltiplas respostas (se necessário)
      form.setShowLinkToRespondAgain(false);
      
      // ✅ OBTÉM A URL PÚBLICA DO FORMULÁRIO
      var formUrl = form.getPublishedUrl();
      
      // ✅ ATUALIZA O URL NA PLANILHA (agora com a URL pública)
      salvarUrlNaPlanilhaJob("URL_CADASTRO_EQUIPE", formUrl, indexJob);
      configurarFormularioAvancado(form);
      
      Logger.log("✅ Formulário publicado automaticamente: " + formUrl);
      return true;
      
    } else {
      Logger.log("❌ Formulário não encontrado: " + nomeJobLocal + " - Forms_Cadastro_Equipe");
      return false;
    }
    
  } catch (error) {
    Logger.log("❌ Erro ao publicar formulário: " + error.toString());
    return false;
  }
}


function configurarFormularioAvancado(form) {
  try {
    // ✅ Permite que pessoas sem conta Google respondam
    // Nota: Isso só funciona em domínios G Suite
    form.setRequireLogin(false);
    
    // ✅ Define uma mensagem de confirmação personalizada
    form.setConfirmationMessage("Obrigado por se cadastrar! Suas informações foram salvas com sucesso.");
    
    // ✅ Define o progresso da barra de progresso
    form.setProgressBar(true);
    form.setShowProgressBar(true);
    
    Logger.log("✅ Configurações avançadas do formulário aplicadas");
  } catch (error) {
    Logger.log("⚠️ Algumas configurações avançadas não puderam ser aplicadas: " + error);
  }
}
```

**Analise - APIs e funcionalidades usadas:**

- SpreadsheetApp (planilhas) - le/escreve na master spreadsheet (NUMERO DE JOB, BANCO DE EQUIPE INTERNA, etc.)
- DriveApp (arquivos) - copia estrutura de pastas, cria subpastas, gerencia permissoes
- DocumentApp (docs) - cria Google Docs dentro das pastas
- FormApp (formularios) - publica formulario de cadastro de equipe
- UrlFetchApp (HTTP requests) - envia callback para n8n com resultado da criacao
- PropertiesService - fila de processamento com idempotencia (IDEMPOT_ keys)
- Triggers programaticos - cria time-based triggers para processar fila
- Logger (debug)
- Session (usuario atual)
- UI menus/dialogs - toast notifications
- Web App (doPost) - recebe chamadas do n8n
- Sheets Advanced Service (v4)

**O que este script faz:**

Este e o **criador automatico de estrutura de pastas para jobs**. E o coracao da automacao da Ellah Filmes:

1. **Recebe dados de um novo job** via POST (do n8n) ou via menu na planilha
2. **Gera codigo do job** no formato `INDEX_CLIENTE_AGENCIA_NOMEJOB_ANO` (ex: `025_PETROBRAS_ARTPLAN_FILMEINSTITUCIONAL_2025`)
3. **Copia a pasta-base template** (01_PASTA_BASE_ADM) com toda a estrutura de subpastas:
   - 01_DOCUMENTOS (roteiro, briefing, relatorio)
   - 02_FINANCEIRO (orcamento, NFs, comprovantes, fechamento)
   - 03_MONSTRO_PESQUISA_ARTES
   - 04_CRONOGRAMA
   - 05_CONTRATOS (producao, equipe, elenco, alvara)
   - 06_FORNECEDORES
   - 07_CLIENTES (passagens, hoteis)
   - 08_POS_PRODUCAO (material bruto, montagem, color, finalizacao)
   - 09_ATENDIMENTO (pre-prod, producao, pos-prod, claquete, ficha tecnica)
   - 10_VENDAS/PRODUTOR_EXECUTIVO
4. **Aplica permissoes** automaticamente por funcao (Atendimento, Financeiro, Pos, Producao, Comercial)
5. **Cria planilha CADASTRO_ELENCO** dentro da pasta de contratos
6. **Publica formulario de cadastro de equipe** (Google Forms)
7. **Salva URLs** das subpastas importantes na planilha master (URL_MATERIALBRUTO, URL_CADASTRO_EQUIPE, etc.)
8. **Usa fila com idempotencia** para evitar duplicatas e processar em background
9. **Envia callback para n8n** com resultado (pasta criada, URLs, etc.)
10. **Valida dados** antes de criar (cabecalhos obrigatorios, campos preenchidos)

**Funcoes definidas:** `SS`, `SH`, `toast`, `validarCabecalhosObrigatorios`, `validarDadosJob`, `darPermissaoEquipeInterna`, `darPermissaoJobEspecifico`, `aplicarPermissoes`, `getProximoIndex`, `setCriadorIndexCell`, `salvarUrlNaPlanilhaJob`, `obterValorColunaI`, `copiarPastaBaseAdm`, `verificarPastaDuplicada`, `copiarPastaRecursiva`, `gerarCodigoJob`, `criarPlanilhaCadastroElenco`, `doPost`, `enfileirar`, `_processTick`, `registrarJobNaPlanilha`, `debugFila`, `limparFila`, `salvarUrlMaterialBruto`, `publicarFormularioEquipe`, `configurarFormularioAvancado`

---
## Arquivos com Keywords Script-Related

| Nome | Tipo | ID | Modificado |
|------|------|----|-----------|
| APPS_SCRIPT | folder | `1Dztg584M7eaBI3uqfwg...` | 2026-03-04 |
| CRIACAO PASTA E CONTROLE DE JOB | spreadsheet | `13cOwWutmLhFdAvL4h-D...` | 2026-03-04 |
| CADASTRO_ELENCO | spreadsheet | `1XmzJvoNJeX5ko0mQZzG...` | 2025-11-05 |
| 214862770-macro-portrait-and-smile-face-.mov | video/quicktime | `1RMZ1t-N7DkuLH-XDK3-...` | 2024-11-16 |
| CRIADOR DE PASTA_JOB_FECHADO | script | `1VnMn1va5TUfs7SVbc2V...` | 2025-10-24 |

---
## Conteudo da Pasta APPS_SCRIPT

- **MODELO_DOC_ID** — script (`15IgSCKO6stLHwDIzFnl...`)
- **CRIADOR DE PASTA_JOB_FECHADO** — script (`1VnMn1va5TUfs7SVbc2V...`)
