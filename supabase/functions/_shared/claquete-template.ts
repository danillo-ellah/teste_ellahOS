// Template HTML da claquete ANCINE
// Replica o layout do documento oficial: fundo rosa/salmon com borda artistica,
// caixa interna com campos alinhados verticalmente, logo da produtora no canto inferior direito.
//
// Referencia visual: docs/specs/claquete_exemplo/CLAQUETE.jpg

// Dados necessarios para gerar a claquete
export interface ClaqueteData {
  title: string;
  duration: string;
  product: string;
  advertiser: string;
  agency: string;
  director: string;
  type: string;
  segment: string;
  crt: string;
  production_company: string;
  cnpj: string;
  audio_company: string;
  production_year: number | string;
  closed_caption: boolean;
  sap_key: boolean;
  libras: boolean;
  audio_description: boolean;
}

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function boolToText(val: boolean): string {
  return val ? 'SIM' : 'NAO';
}

/**
 * Gera o HTML da claquete no formato ANCINE.
 * O HTML tem dimensoes fixas de slide (1280x720 / 16:9) para exportar como PNG.
 * O estilo replica o template oficial com fundo rosa/salmon e borda artistica.
 */
export function buildClaqueteHtml(data: ClaqueteData): string {
  const fieldStyle = 'font-size: 22px; line-height: 1.6; color: #1a1a1a; font-weight: 500; margin: 0; padding: 0 0 0 0;';
  const labelStyle = 'font-weight: 700; color: #000000;';
  const valueStyle = 'font-weight: 700; color: #000000;';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CLAQUETE — ${esc(data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1280px;
      height: 720px;
      overflow: hidden;
      font-family: 'Arial', 'Helvetica', sans-serif;
      background-color: #e8b4b8;
    }
    @page { size: 1280px 720px; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Fundo decorativo (borda artistica rosa/salmon) -->
  <div style="
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #d4a0a7 0%, #e8b4b8 25%, #dba8ac 50%, #c99da1 75%, #e0b0b4 100%);
    padding: 30px;
  ">
    <!-- Caixa interna principal (fundo claro) -->
    <div style="
      background-color: #e8ddd4;
      border: 3px solid #2a2a2a;
      border-radius: 4px;
      width: 100%;
      height: 100%;
      padding: 36px 48px 36px 48px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
    ">
      <!-- Campos da claquete -->
      <p style="${fieldStyle}"><span style="${labelStyle}">TITULO:</span> <span style="${valueStyle}">${esc(data.title)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">DURACAO:</span> <span style="${valueStyle}">${esc(data.duration)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">PRODUTO:</span> <span style="${valueStyle}">${esc(data.product)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">ANUNCIANTE:</span> <span style="${valueStyle}">${esc(data.advertiser)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">AGENCIA:</span> <span style="${valueStyle}">${esc(data.agency)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">DIRECAO:</span> <span style="${valueStyle}">${esc(data.director)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">TIPO:</span> <span style="${valueStyle}">${esc(data.type)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">SEGMENTO:</span> <span style="${valueStyle}">${esc(data.segment)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">CRT:</span> <span style="${valueStyle}">${esc(data.crt)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">PRODUTORA:</span> <span style="${valueStyle}">${esc(data.production_company)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">CNPJ:</span> <span style="${valueStyle}">${esc(data.cnpj)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">PRODUTORA DE AUDIO:</span> <span style="${valueStyle}">${esc(data.audio_company)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">ANO DE PRODUCAO:</span> <span style="${valueStyle}">${esc(String(data.production_year))}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">CLOSED CAPTION:</span> <span style="${valueStyle}">${boolToText(data.closed_caption)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">TECLA SAP:</span> <span style="${valueStyle}">${boolToText(data.sap_key)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">LIBRAS:</span> <span style="${valueStyle}">${boolToText(data.libras)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">AUDIO DESCRICAO:</span> <span style="${valueStyle}">${boolToText(data.audio_description)}</span></p>

      <!-- Logo da produtora (canto inferior direito) -->
      <div style="
        position: absolute;
        bottom: 24px;
        right: 36px;
        text-align: right;
      ">
        <p style="
          font-size: 42px;
          font-weight: 900;
          letter-spacing: 8px;
          color: #1a1a1a;
          font-family: 'Arial Black', 'Arial', sans-serif;
          line-height: 1;
          margin: 0;
        ">ELLAH</p>
        <p style="
          font-size: 12px;
          letter-spacing: 12px;
          color: #1a1a1a;
          font-weight: 400;
          margin: 2px 0 0 0;
        ">F I L M E S</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera o HTML em formato A4 (retrato) para impressao/PDF.
 * Mesmos dados, layout adaptado para pagina A4.
 */
export function buildClaqueteHtmlA4(data: ClaqueteData): string {
  const fieldStyle = 'font-size: 14px; line-height: 2; color: #1a1a1a; font-weight: 500; margin: 0;';
  const labelStyle = 'font-weight: 700; color: #000000;';
  const valueStyle = 'font-weight: 700; color: #000000;';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CLAQUETE — ${esc(data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
    @page { size: A4 landscape; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div style="
    background: linear-gradient(135deg, #d4a0a7 0%, #e8b4b8 25%, #dba8ac 50%, #c99da1 75%, #e0b0b4 100%);
    padding: 24px;
    min-height: 100vh;
  ">
    <div style="
      background-color: #e8ddd4;
      border: 2px solid #2a2a2a;
      border-radius: 4px;
      padding: 32px 40px;
      position: relative;
      min-height: calc(100vh - 48px);
    ">
      <p style="${fieldStyle}"><span style="${labelStyle}">TITULO:</span> <span style="${valueStyle}">${esc(data.title)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">DURACAO:</span> <span style="${valueStyle}">${esc(data.duration)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">PRODUTO:</span> <span style="${valueStyle}">${esc(data.product)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">ANUNCIANTE:</span> <span style="${valueStyle}">${esc(data.advertiser)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">AGENCIA:</span> <span style="${valueStyle}">${esc(data.agency)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">DIRECAO:</span> <span style="${valueStyle}">${esc(data.director)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">TIPO:</span> <span style="${valueStyle}">${esc(data.type)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">SEGMENTO:</span> <span style="${valueStyle}">${esc(data.segment)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">CRT:</span> <span style="${valueStyle}">${esc(data.crt)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">PRODUTORA:</span> <span style="${valueStyle}">${esc(data.production_company)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">CNPJ:</span> <span style="${valueStyle}">${esc(data.cnpj)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">PRODUTORA DE AUDIO:</span> <span style="${valueStyle}">${esc(data.audio_company)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">ANO DE PRODUCAO:</span> <span style="${valueStyle}">${esc(String(data.production_year))}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">CLOSED CAPTION:</span> <span style="${valueStyle}">${boolToText(data.closed_caption)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">TECLA SAP:</span> <span style="${valueStyle}">${boolToText(data.sap_key)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">LIBRAS:</span> <span style="${valueStyle}">${boolToText(data.libras)}</span></p>
      <p style="${fieldStyle}"><span style="${labelStyle}">AUDIO DESCRICAO:</span> <span style="${valueStyle}">${boolToText(data.audio_description)}</span></p>

      <div style="position: absolute; bottom: 20px; right: 32px; text-align: right;">
        <p style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #1a1a1a; font-family: 'Arial Black', sans-serif; line-height: 1; margin: 0;">ELLAH</p>
        <p style="font-size: 10px; letter-spacing: 10px; color: #1a1a1a; margin: 2px 0 0 0;">F I L M E S</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
