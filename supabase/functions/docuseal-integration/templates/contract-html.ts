// ========================================================
// contract-html.ts — Gerador de HTML do contrato de prestacao de servicos
// O HTML e enviado ao DocuSeal via POST /api/submissions/html e renderizado como PDF
// Inclui tags DocuSeal para campos de assinatura, texto e data
// ========================================================

import { numberToWordsBR, formatValueBR } from '../../_shared/number-to-words-br.ts';

// ========================================================
// Interface de dados de entrada
// ========================================================

export interface ContractData {
  // Contratante (produtora)
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_city: string; // para foro

  // Contratado (profissional)
  person_name: string;
  person_cpf: string | null;
  person_rg: string | null;
  person_address: string | null;
  person_city: string | null;
  person_state: string | null;
  person_phone: string | null;
  person_email: string;
  person_profession: string | null;
  person_bank_info: {
    bank_name?: string;
    pix_key?: string;
    pix_key_type?: string;
  } | null;

  // Projeto
  job_title: string;
  job_code: string;
  client_name: string | null;
  agency_name: string | null;

  // Funcao e valor
  role: string;
  rate: number | null;

  // Datas
  shooting_dates: string[]; // array de datas DD/MM/YYYY

  // Pagamento
  is_public_client: boolean; // true = governo/publico (60-70 dias), false = privado (45 dias)

  // Metadata
  contract_date: string; // data do contrato DD/MM/YYYY
}

// ========================================================
// Helpers de renderizacao
// ========================================================

// Escapa caracteres HTML para evitar injecao no template
function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Renderiza campo de texto DocuSeal para preenchimento pelo signatario
function textField(name: string, role: string, width = 200, height = 20): string {
  return `<text-field name="${esc(name)}" role="${esc(role)}" style="width: ${width}px; height: ${height}px; display: inline-block; border-bottom: 1px solid #333; vertical-align: bottom;" />`;
}

// Renderiza campo de data DocuSeal
function dateField(name: string, role: string, width = 150): string {
  return `<date-field name="${esc(name)}" role="${esc(role)}" style="width: ${width}px; height: 20px; display: inline-block; border-bottom: 1px solid #333; vertical-align: bottom;" />`;
}

// Renderiza campo de assinatura DocuSeal
function signatureField(name: string, role: string): string {
  return `<signature-field name="${esc(name)}" role="${esc(role)}" style="width: 300px; height: 60px; display: inline-block;" />`;
}

// Renderiza campo de checkbox DocuSeal
function checkboxField(name: string, role: string): string {
  return `<checkbox-field name="${esc(name)}" role="${esc(role)}" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;" />`;
}

// Renderiza valor monetario formatado como "R$ 1.500,00 (mil e quinhentos reais)"
function formatRateDisplay(rate: number): string {
  const formatted = `R$ ${formatValueBR(rate)}`;
  const extenso = numberToWordsBR(rate);
  return `${esc(formatted)} (${esc(extenso)})`;
}

// ========================================================
// Secoes do contrato
// ========================================================

function buildHeader(): string {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
        Contrato de Prestação de Serviços
      </h1>
      <h2 style="font-size: 12pt; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">
        Produção Audiovisual Publicitária
      </h2>
      <hr style="margin: 16px 0; border: none; border-top: 2px solid #333;" />
    </div>
  `;
}

function buildParties(data: ContractData): string {
  // Contratante — dados sempre presentes
  const contratante = `
    <div style="margin-bottom: 16px;">
      <p style="font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase; font-size: 10pt; letter-spacing: 0.5px;">
        Contratante
      </p>
      <p style="margin: 0; text-align: justify;">
        <strong>${esc(data.company_name)}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ
        nº <strong>${esc(data.company_cnpj)}</strong>, com sede em ${esc(data.company_address)},
        doravante denominada <strong>PRODUTORA</strong>.
      </p>
    </div>
  `;

  // Profissao — campo ou text-field
  const profissaoDisplay = data.person_profession
    ? esc(data.person_profession)
    : textField('Profissão', 'Contratado', 160, 20);

  // CPF — campo ou text-field
  const cpfDisplay = data.person_cpf
    ? `CPF nº <strong>${esc(data.person_cpf)}</strong>`
    : `CPF nº ${textField('CPF', 'Contratado', 130, 20)}`;

  // RG — campo ou text-field
  const rgDisplay = data.person_rg
    ? `RG nº <strong>${esc(data.person_rg)}</strong>`
    : `RG nº ${textField('RG', 'Contratado', 130, 20)}`;

  // Endereco — campo ou text-field
  const enderecoDisplay = data.person_address
    ? `residente em ${esc(data.person_address)}${data.person_city ? `, ${esc(data.person_city)}` : ''}${data.person_state ? `/${esc(data.person_state)}` : ''}`
    : `residente em ${textField('Endereço Completo', 'Contratado', 350, 20)}`;

  const contratado = `
    <div style="margin-bottom: 24px;">
      <p style="font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase; font-size: 10pt; letter-spacing: 0.5px;">
        Contratado
      </p>
      <p style="margin: 0; text-align: justify;">
        <strong>${esc(data.person_name)}</strong>, ${profissaoDisplay},
        portador do ${cpfDisplay} e ${rgDisplay},
        ${enderecoDisplay},
        doravante denominado <strong>PROFISSIONAL</strong>.
      </p>
    </div>
  `;

  const intro = `
    <p style="text-align: justify; margin-bottom: 24px;">
      As partes resolvem firmar o presente Contrato de Prestação de Serviços Audiovisuais,
      que será regido pelas cláusulas abaixo.
    </p>
  `;

  return contratante + contratado + intro;
}

function buildClauses(data: ContractData): string {
  // Datas de filmagem
  const shootingDatesDisplay = data.shooting_dates.length > 0
    ? data.shooting_dates.map(esc).join(', ')
    : textField('Datas de Filmagem', 'Contratado', 300, 20);

  // Valor
  const rateDisplay = data.rate != null
    ? formatRateDisplay(data.rate)
    : `${textField('Valor Total (R$)', 'Contratado', 120, 20)} (${textField('Valor por Extenso', 'Contratado', 300, 20)})`;

  // Cliente e agencia
  const clienteDisplay = data.client_name ? esc(data.client_name) : '—';
  const agenciaDisplay = data.agency_name ? esc(data.agency_name) : '—';

  const clauses = [
    {
      titulo: 'CLÁUSULA 1 — OBJETO',
      corpo: `
        O presente contrato tem por objeto a prestação de serviços profissionais pelo PROFISSIONAL
        na produção audiovisual publicitária:<br /><br />
        <strong>Projeto:</strong> ${esc(data.job_title)} (${esc(data.job_code)})<br />
        <strong>Cliente:</strong> ${clienteDisplay}<br />
        <strong>Agência:</strong> ${agenciaDisplay}<br />
        <strong>Função exercida:</strong> ${esc(data.role)}<br /><br />
        Os serviços poderão ocorrer nas seguintes etapas da produção:
        pré-produção, produção (filmagem), pós-produção.
      `,
    },
    {
      titulo: 'CLÁUSULA 2 — PERÍODO DE PRESTAÇÃO DOS SERVIÇOS',
      corpo: `
        O PROFISSIONAL prestará serviços nas seguintes datas previstas:<br /><br />
        <strong>Datas de trabalho:</strong> ${shootingDatesDisplay}<br /><br />
        <strong>Parágrafo único:</strong> As datas e horários poderão ser ajustados pela PRODUÇÃO conforme
        necessidades operacionais, condições climáticas, logística ou decisões criativas da produção.
      `,
    },
    {
      titulo: 'CLÁUSULA 3 — REMUNERAÇÃO',
      corpo: `
        Pelos serviços prestados, o PROFISSIONAL receberá o valor total de:<br /><br />
        ${rateDisplay}<br /><br />
        Este valor inclui todos os serviços prestados no âmbito do presente projeto.
      `,
    },
    {
      titulo: 'CLÁUSULA 4 — CONDIÇÕES DE PAGAMENTO',
      corpo: data.is_public_client
        ? `
        O pagamento será realizado por meio de PIX, transferência bancária ou outro meio acordado
        entre as partes, em até <strong>60 (sessenta) a 70 (setenta) dias corridos</strong> após a
        conclusão dos serviços, considerando que o presente projeto envolve cliente público, cujo
        cronograma de repasse está sujeito a prazos administrativos específicos.<br /><br />
        <strong>§1º</strong> O pagamento será realizado conforme cronograma financeiro interno da
        produtora, condicionado ao recebimento do cliente final.<br />
        <strong>§2º</strong> A data programada poderá variar conforme: fluxo financeiro da produção,
        recebimento do cliente, prazos de licitação ou empenho, organização administrativa da
        produtora, cronograma financeiro do projeto.<br />
        <strong>§3º</strong> A data de pagamento poderá ser comunicada ao PROFISSIONAL por e-mail,
        mensagem formal da produção ou sistema de gestão da produtora.<br />
        <strong>§4º</strong> Eventuais ajustes na programação financeira poderão ocorrer por razões
        operacionais da produção.
      `
        : `
        O pagamento será realizado por meio de PIX, transferência bancária ou outro meio acordado
        entre as partes, em até <strong>45 (quarenta e cinco) dias corridos</strong> após a conclusão
        dos serviços.<br /><br />
        <strong>§1º</strong> O pagamento será realizado conforme cronograma financeiro interno da
        produtora.<br />
        <strong>§2º</strong> A data programada poderá variar conforme: fluxo financeiro da produção,
        recebimento do cliente, organização administrativa da produtora, cronograma financeiro do
        projeto.<br />
        <strong>§3º</strong> A data de pagamento poderá ser comunicada ao PROFISSIONAL por e-mail,
        mensagem formal da produção ou sistema de gestão da produtora.<br />
        <strong>§4º</strong> Eventuais ajustes na programação financeira poderão ocorrer por razões
        operacionais da produção.
      `,
    },
    {
      titulo: 'CLÁUSULA 5 — EMISSÃO DE NOTA FISCAL (SE APLICÁVEL)',
      corpo: `
        Quando aplicável, o PROFISSIONAL deverá emitir a respectiva Nota Fiscal de prestação de
        serviços conforme solicitado pela PRODUTORA. O envio da Nota Fiscal deverá ocorrer no prazo
        solicitado pela produção para possibilitar a programação de pagamento.
      `,
    },
    {
      titulo: 'CLÁUSULA 6 — NATUREZA DA RELAÇÃO',
      corpo: `
        O presente contrato possui natureza estritamente civil, não gerando vínculo trabalhista,
        previdenciário ou empregatício entre as partes. O PROFISSIONAL exercerá suas atividades com
        autonomia técnica e profissional.
      `,
    },
    {
      titulo: 'CLÁUSULA 7 — DIREITOS AUTORAIS E CESSÃO DE DIREITOS',
      corpo: `
        Todo material produzido no âmbito do presente projeto, incluindo imagens, sons, registros
        audiovisuais, performances e material técnico ou criativo, será considerado obra produzida
        sob encomenda. Os direitos patrimoniais sobre o material ficam integralmente cedidos à
        PRODUTORA, de forma irrevogável e irretratável. A PRODUTORA poderá utilizar o material em
        televisão, internet, cinema, mídia digital, redes sociais, publicidade e quaisquer meios
        existentes ou futuros.
      `,
    },
    {
      titulo: 'CLÁUSULA 8 — CONFIDENCIALIDADE',
      corpo: `
        O PROFISSIONAL compromete-se a manter sigilo absoluto sobre quaisquer informações
        relacionadas à produção, incluindo roteiros, campanhas publicitárias, valores de produção,
        estratégias de marketing e material audiovisual. A divulgação de qualquer informação
        dependerá de autorização expressa da PRODUTORA.
      `,
    },
    {
      titulo: 'CLÁUSULA 9 — COMUNICAÇÕES ELETRÔNICAS',
      corpo: `
        A PRODUTORA poderá realizar comunicações oficiais por e-mail, aplicativos de mensagens ou
        sistemas digitais de produção. O PROFISSIONAL compromete-se a verificar regularmente seu
        e-mail informado neste contrato e monitorar também as pastas de spam, lixo eletrônico ou
        promoções, mantendo seus dados de contato atualizados.<br /><br />
        <strong>§1º</strong> Mensagens enviadas ao e-mail informado serão consideradas comunicação
        válida para todos os efeitos contratuais.<br />
        <strong>§2º</strong> A ausência de verificação da caixa de e-mail ou da pasta de spam não
        poderá ser utilizada como justificativa para o não cumprimento de obrigações contratuais.
      `,
    },
    {
      titulo: 'CLÁUSULA 10 — RESPONSABILIDADE NO SET',
      corpo: `
        O PROFISSIONAL compromete-se a respeitar horários de produção, cumprir normas de segurança
        e seguir orientações da direção e produção.
      `,
    },
    {
      titulo: 'CLÁUSULA 11 — WEATHER DAY',
      corpo: `
        Caso a filmagem seja impossibilitada por condições climáticas adversas ou circunstâncias
        técnicas imprevistas, a PRODUÇÃO poderá remarcar a data de filmagem, reagendar a diária ou
        ajustar as condições de trabalho conforme necessidade da produção.
      `,
    },
    {
      titulo: 'CLÁUSULA 12 — CANCELAMENTO',
      corpo: `
        Em caso de cancelamento ou alteração da produção por motivos operacionais, as partes
        buscarão ajustar novas datas ou condições de trabalho.
      `,
    },
    {
      titulo: 'CLÁUSULA 13 — USO DE IMAGEM DE BASTIDORES',
      corpo: `
        O PROFISSIONAL autoriza a utilização de imagens de bastidores da produção pela PRODUTORA
        para portfólio, divulgação institucional e material promocional da produtora.
      `,
    },
    {
      titulo: 'CLÁUSULA 14 — PROTEÇÃO DO MATERIAL AUDIOVISUAL',
      corpo: `
        Todo material audiovisual produzido ou captado durante o projeto é propriedade da PRODUTORA.
        O PROFISSIONAL não poderá copiar, divulgar, distribuir ou armazenar material bruto sem
        autorização da PRODUTORA.
      `,
    },
    {
      titulo: `CLÁUSULA 15 — FORO`,
      corpo: `
        Fica eleito o foro da comarca de <strong>${esc(data.company_city)}</strong>,
        com renúncia de qualquer outro.
      `,
    },
  ];

  return clauses
    .map(
      ({ titulo, corpo }) => `
      <div style="margin-bottom: 18px;">
        <p style="font-weight: bold; margin: 0 0 6px 0;">${esc(titulo)}</p>
        <p style="margin: 0; text-align: justify; line-height: 1.6;">${corpo.trim()}</p>
      </div>
    `,
    )
    .join('\n');
}

function buildSignatureSection(data: ContractData): string {
  return `
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <p style="text-align: center; margin-bottom: 30px;">
        ${esc(data.contract_date)}
      </p>

      <!-- Bloco de assinaturas lado a lado -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 48%; vertical-align: top; padding-right: 4%;">
            <p style="font-weight: bold; margin: 0 0 8px 0;">CONTRATANTE — ${esc(data.company_name)}</p>
            ${signatureField('Assinatura Contratante', 'Contratante')}
            <p style="margin: 8px 0 0 0; font-size: 9pt; color: #555;">
              ${esc(data.company_name)}<br />
              CNPJ: ${esc(data.company_cnpj)}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 9pt;">
              Data: ${dateField('Data Contratante', 'Contratante')}
            </p>
          </td>
          <td style="width: 48%; vertical-align: top;">
            <p style="font-weight: bold; margin: 0 0 8px 0;">CONTRATADO — ${esc(data.person_name)}</p>
            ${signatureField('Assinatura Contratado', 'Contratado')}
            <p style="margin: 8px 0 0 0; font-size: 9pt; color: #555;">
              ${esc(data.person_name)}<br />
              ${data.person_cpf ? `CPF: ${esc(data.person_cpf)}` : `CPF: ${textField('CPF Contratado', 'Contratado', 130, 18)}`}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 9pt;">
              Data: ${dateField('Data Contratado', 'Contratado')}
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function buildAnnex1(data: ContractData): string {
  // Banco/PIX
  let bankDisplay = '';
  if (data.person_bank_info) {
    const b = data.person_bank_info;
    const bankName = b.bank_name ? esc(b.bank_name) : null;
    const pixKey = b.pix_key ? esc(b.pix_key) : null;
    const pixType = b.pix_key_type ? esc(b.pix_key_type) : null;

    if (bankName) bankDisplay += `<strong>Banco:</strong> ${bankName}<br />`;
    if (pixKey) {
      bankDisplay += `<strong>Chave PIX:</strong> ${pixKey}`;
      if (pixType) bankDisplay += ` (${pixType})`;
      bankDisplay += '<br />';
    }
    if (!bankName && !pixKey) bankDisplay = textField('Dados Bancários / PIX', 'Contratado', 350, 20);
  } else {
    bankDisplay = textField('Dados Bancários / PIX', 'Contratado', 350, 20);
  }

  // Telefone
  const telefoneDisplay = data.person_phone
    ? esc(data.person_phone)
    : textField('Telefone / WhatsApp', 'Contratado', 160, 20);

  // Profissao
  const profissaoDisplay = data.person_profession
    ? esc(data.person_profession)
    : textField('Profissão', 'Contratado', 180, 20);

  // RG
  const rgDisplay = data.person_rg
    ? esc(data.person_rg)
    : textField('RG', 'Contratado', 130, 20);

  // CPF
  const cpfDisplay = data.person_cpf
    ? esc(data.person_cpf)
    : textField('CPF', 'Contratado', 130, 20);

  // Endereco
  const enderecoDisplay = data.person_address
    ? `${esc(data.person_address)}${data.person_city ? `, ${esc(data.person_city)}` : ''}${data.person_state ? `/${esc(data.person_state)}` : ''}`
    : textField('Endereço Completo', 'Contratado', 350, 20);

  return `
    <div style="margin-top: 40px; page-break-before: always;">
      <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0 0 12px 0;
                 border-bottom: 1px solid #333; padding-bottom: 6px;">
        ANEXO 1 — Dados do Profissional
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        <tr>
          <td style="padding: 5px 0; width: 35%; font-weight: bold; vertical-align: top;">Nome completo:</td>
          <td style="padding: 5px 0;">${esc(data.person_name)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Profissão:</td>
          <td style="padding: 5px 0;">${profissaoDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">CPF:</td>
          <td style="padding: 5px 0;">${cpfDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">RG:</td>
          <td style="padding: 5px 0;">${rgDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Endereço:</td>
          <td style="padding: 5px 0;">${enderecoDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Telefone / WhatsApp:</td>
          <td style="padding: 5px 0;">${telefoneDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">E-mail:</td>
          <td style="padding: 5px 0;">${esc(data.person_email)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Dados bancários / PIX:</td>
          <td style="padding: 5px 0;">${bankDisplay}</td>
        </tr>
      </table>
    </div>
  `;
}

function buildAnnex2(data: ContractData): string {
  const rateDisplay = data.rate != null
    ? `R$ ${formatValueBR(data.rate)} (${numberToWordsBR(data.rate)})`
    : '—';

  const shootingDisplay = data.shooting_dates.length > 0
    ? data.shooting_dates.map(esc).join(', ')
    : '—';

  const clienteDisplay = data.client_name ? esc(data.client_name) : '—';
  const agenciaDisplay = data.agency_name ? esc(data.agency_name) : '—';

  return `
    <div style="margin-top: 40px;">
      <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0 0 12px 0;
                 border-bottom: 1px solid #333; padding-bottom: 6px;">
        ANEXO 2 — Dados do Projeto
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        <tr>
          <td style="padding: 5px 0; width: 35%; font-weight: bold; vertical-align: top;">Projeto:</td>
          <td style="padding: 5px 0;">${esc(data.job_title)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Código:</td>
          <td style="padding: 5px 0;">${esc(data.job_code)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Cliente:</td>
          <td style="padding: 5px 0;">${clienteDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Agência:</td>
          <td style="padding: 5px 0;">${agenciaDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Função:</td>
          <td style="padding: 5px 0;">${esc(data.role)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Valor:</td>
          <td style="padding: 5px 0;">${rateDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; vertical-align: top;">Datas de trabalho:</td>
          <td style="padding: 5px 0;">${shootingDisplay}</td>
        </tr>
      </table>
    </div>
  `;
}

function buildAnnex3(data: ContractData): string {
  return `
    <div style="margin-top: 40px;">
      <h3 style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0 0 12px 0;
                 border-bottom: 1px solid #333; padding-bottom: 6px;">
        ANEXO 3 — E-mail para Comunicações Oficiais
      </h3>
      <p style="text-align: justify; margin-bottom: 16px; font-size: 10pt;">
        Conforme Cláusula 9, o PROFISSIONAL declara que o e-mail abaixo é o endereço oficial para
        recebimento de comunicações contratuais, incluindo envios para pasta de spam ou lixo
        eletrônico:
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        <tr>
          <td style="padding: 5px 0; width: 35%; font-weight: bold; vertical-align: top;">E-mail declarado:</td>
          <td style="padding: 5px 0;"><strong>${esc(data.person_email)}</strong></td>
        </tr>
      </table>
      <p style="margin-top: 20px; font-size: 10pt; text-align: justify;">
        ${checkboxField('Declaro Email Correto', 'Contratado')}
        &nbsp;Declaro que o e-mail acima é correto, estou ciente das responsabilidades previstas na
        Cláusula 9, e me comprometo a monitorar inclusive a pasta de spam/lixo eletrônico.
      </p>
    </div>
  `;
}

// ========================================================
// Funcao principal exportada
// ========================================================

/**
 * Gera o HTML completo do contrato de prestacao de servicos audiovisuais.
 * O HTML e enviado ao DocuSeal via POST /api/submissions/html.
 *
 * Campos null no ContractData geram <text-field> DocuSeal para preenchimento pelo signatario.
 */
export function generateContractHtml(data: ContractData): string {
  const body = [
    buildHeader(),
    buildParties(data),
    buildClauses(data),
    buildSignatureSection(data),
    buildAnnex1(data),
    buildAnnex2(data),
    buildAnnex3(data),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato de Prestação de Serviços — ${esc(data.job_title)} (${esc(data.job_code)})</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #111;
      margin: 0;
      padding: 2cm;
      max-width: 21cm;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.5;
    }
    h1, h2, h3 {
      font-family: Arial, Helvetica, sans-serif;
    }
    p {
      margin: 0 0 8px 0;
    }
    table {
      width: 100%;
    }
    @page {
      size: A4;
      margin: 2cm;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}
