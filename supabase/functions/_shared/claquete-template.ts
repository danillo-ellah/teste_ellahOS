// Template HTML da claquete ANCINE — Full HD 1920x1080 para TV
// Usa assets reais extraidos do PPTX original da Ellah Filmes:
// - Fundo: colagem filmstrips rosa com caixa interna verde-claro, borda dupla escura
// - Logo: ELLAH FILMES tipografia estilizada preta com "FILMES" em rosa
//
// Referencia: docs/specs/claquete_exemplo/CLAQUETE.pptx

import { CLAQUETE_BG_BASE64, CLAQUETE_LOGO_BASE64 } from './claquete-assets.ts';

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
 * Gera campo da claquete: label normal + valor em bold
 * Replica exatamente o estilo do PPTX: 25pt, line-height 135%, dk1 color
 */
function field(label: string, value: string): string {
  return `<p style="font-size:25px;line-height:1.35;margin:0;color:#1a1a1a;">` +
    `${label} <b>${value}</b></p>`;
}

/**
 * Gera o HTML da claquete no formato ANCINE — Full HD 1920x1080.
 * Usa o background e logo reais do template PPTX da Ellah Filmes.
 */
export function buildClaqueteHtml(data: ClaqueteData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CLAQUETE \u2014 ${esc(data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      font-family: 'Arial', 'Helvetica Neue', 'Helvetica', sans-serif;
    }
    @page { size: 1920px 1080px; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Background: filmstrip border + inner green box (imagem real do PPTX) -->
  <div style="
    position: absolute; top: 0; left: 0; width: 1920px; height: 1080px;
    background: url('${CLAQUETE_BG_BASE64}') center/cover no-repeat;
  ">
    <!-- Campos posicionados sobre a area interna da imagem de fundo -->
    <!-- A caixa interna no background comeca aprox em 6% das bordas -->
    <div style="
      position: absolute;
      top: 56px; left: 120px; right: 120px; bottom: 56px;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    ">
      ${field('T\u00cdTULO:', esc(data.title))}
      ${field('DURA\u00c7\u00c3O:', esc(data.duration))}
      ${field('PRODUTO:', esc(data.product))}
      ${field('ANUNCIANTE:', esc(data.advertiser))}
      ${field('AG\u00caNCIA:', esc(data.agency))}
      ${field('DIRE\u00c7\u00c3O:', esc(data.director))}
      ${field('TIPO:', esc(data.type))}
      ${field('SEGMENTO:', esc(data.segment))}
      ${field('CRT:', esc(data.crt))}
      ${field('PRODUTORA:', esc(data.production_company))}
      ${field('CNPJ:', esc(data.cnpj))}
      ${field('PRODUTORA DE \u00c1UDIO:', esc(data.audio_company))}
      ${field('ANO DE PRODU\u00c7\u00c3O:', esc(String(data.production_year)))}
      ${field('CLOSED CAPTION:', boolToText(data.closed_caption))}
      ${field('TECLA SAP:', boolToText(data.sap_key))}
      ${field('LIBRAS:', boolToText(data.libras))}
      ${field('AUDIO DESCRI\u00c7AO:', boolToText(data.audio_description))}
    </div>

    <!-- Logo ELLAH FILMES (imagem real do PPTX) -->
    <img
      src="${CLAQUETE_LOGO_BASE64}"
      alt="ELLAH FILMES"
      style="
        position: absolute;
        bottom: 80px;
        right: 140px;
        width: 280px;
        height: auto;
      "
    />
  </div>
</body>
</html>`;
}

/**
 * Gera o HTML em formato A4 landscape para impressao/PDF.
 * Mesmos dados e identidade visual, layout adaptado para pagina A4.
 */
export function buildClaqueteHtmlA4(data: ClaqueteData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CLAQUETE \u2014 ${esc(data.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div style="
    background: url('${CLAQUETE_BG_BASE64}') center/cover no-repeat;
    min-height: 100vh;
    position: relative;
    padding: 0;
  ">
    <div style="
      position: absolute;
      top: 30px; left: 60px; right: 60px; bottom: 30px;
      padding: 24px 36px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    ">
      ${field('T\u00cdTULO:', esc(data.title))}
      ${field('DURA\u00c7\u00c3O:', esc(data.duration))}
      ${field('PRODUTO:', esc(data.product))}
      ${field('ANUNCIANTE:', esc(data.advertiser))}
      ${field('AG\u00caNCIA:', esc(data.agency))}
      ${field('DIRE\u00c7\u00c3O:', esc(data.director))}
      ${field('TIPO:', esc(data.type))}
      ${field('SEGMENTO:', esc(data.segment))}
      ${field('CRT:', esc(data.crt))}
      ${field('PRODUTORA:', esc(data.production_company))}
      ${field('CNPJ:', esc(data.cnpj))}
      ${field('PRODUTORA DE \u00c1UDIO:', esc(data.audio_company))}
      ${field('ANO DE PRODU\u00c7\u00c3O:', esc(String(data.production_year)))}
      ${field('CLOSED CAPTION:', boolToText(data.closed_caption))}
      ${field('TECLA SAP:', boolToText(data.sap_key))}
      ${field('LIBRAS:', boolToText(data.libras))}
      ${field('AUDIO DESCRI\u00c7AO:', boolToText(data.audio_description))}
    </div>

    <img
      src="${CLAQUETE_LOGO_BASE64}"
      alt="ELLAH FILMES"
      style="position: absolute; bottom: 20px; right: 50px; width: 180px; height: auto;"
    />
  </div>
</body>
</html>`;
}
