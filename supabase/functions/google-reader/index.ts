import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError, success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { getGoogleAccessToken } from '../_shared/google-drive-client.ts';
import { getSecret } from '../_shared/vault.ts';

// ========================================================
// google-reader — Le conteudo de arquivos Google Workspace
// GET /:fileId  — le conteudo de Sheet, Doc, Slides, Form, ou qualquer arquivo
//
// Query params:
//   type=auto|sheet|doc|slides|form|file  (default: auto — detecta via mimeType)
//   range=Sheet1!A1:Z100   (so para sheets — range A1 notation)
//   sheet=0                (so para sheets — indice da aba, default 0)
//   export=txt|csv|pdf     (formato de export para docs/slides)
// ========================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DOCS_API = 'https://docs.googleapis.com/v1/documents';

// Mapeamento mimeType → tipo
const MIME_TYPE_MAP: Record<string, string> = {
  'application/vnd.google-apps.spreadsheet': 'sheet',
  'application/vnd.google-apps.document': 'doc',
  'application/vnd.google-apps.presentation': 'slides',
  'application/vnd.google-apps.form': 'form',
  'application/vnd.google-apps.drawing': 'drawing',
};

// Busca metadata do arquivo no Drive
async function getFileMetadata(
  token: string,
  fileId: string,
): Promise<{ name: string; mimeType: string; modifiedTime: string; size?: string }> {
  const fields = 'name,mimeType,modifiedTime,size';
  const resp = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=${fields}&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 404) {
      throw new AppError('NOT_FOUND', `Arquivo nao encontrado: ${fileId}`, 404);
    }
    throw new AppError('INTERNAL_ERROR', `Drive API erro: ${body}`, resp.status as 500);
  }

  return await resp.json();
}

// Le conteudo de Google Sheets via Sheets API v4
async function readSheet(
  token: string,
  fileId: string,
  range?: string,
  sheetIndex?: number,
): Promise<{ headers: string[]; rows: string[][]; totalRows: number; range: string }> {
  // Se nao tem range, buscar info das abas primeiro
  let effectiveRange = range;

  if (!effectiveRange) {
    // Buscar metadata do spreadsheet para pegar nome da aba
    const metaResp = await fetch(
      `${SHEETS_API}/${fileId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (metaResp.ok) {
      const meta = await metaResp.json();
      const sheets = meta.sheets || [];
      const idx = sheetIndex ?? 0;
      const sheetName = sheets[idx]?.properties?.title || 'Sheet1';
      effectiveRange = `'${sheetName}'`;
    } else {
      effectiveRange = 'Sheet1';
    }
  }

  const encodedRange = encodeURIComponent(effectiveRange);
  const resp = await fetch(
    `${SHEETS_API}/${fileId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new AppError('INTERNAL_ERROR', `Sheets API erro: ${body}`, 500);
  }

  const data = await resp.json();
  const values: string[][] = data.values || [];

  if (values.length === 0) {
    return { headers: [], rows: [], totalRows: 0, range: data.range || effectiveRange };
  }

  return {
    headers: values[0],
    rows: values.slice(1),
    totalRows: values.length - 1,
    range: data.range || effectiveRange,
  };
}

// Le conteudo de Google Sheets — retorna TODAS as abas
async function readAllSheets(
  token: string,
  fileId: string,
): Promise<{ sheets: Array<{ name: string; headers: string[]; rows: string[][]; totalRows: number }> }> {
  // Buscar metadata com nomes das abas
  const metaResp = await fetch(
    `${SHEETS_API}/${fileId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!metaResp.ok) {
    const body = await metaResp.text();
    throw new AppError('INTERNAL_ERROR', `Sheets API erro (meta): ${body}`, 500);
  }

  const meta = await metaResp.json();
  const sheetList = meta.sheets || [];
  const results: Array<{ name: string; headers: string[]; rows: string[][]; totalRows: number }> = [];

  for (const sheet of sheetList) {
    const sheetName = sheet.properties?.title || 'Sheet1';
    const sheetData = await readSheet(token, fileId, `'${sheetName}'`);
    results.push({
      name: sheetName,
      headers: sheetData.headers,
      rows: sheetData.rows,
      totalRows: sheetData.totalRows,
    });
  }

  return { sheets: results };
}

// Le conteudo de Google Docs via Docs API
async function readDoc(
  token: string,
  fileId: string,
): Promise<{ title: string; bodyText: string; wordCount: number }> {
  const resp = await fetch(
    `${DOCS_API}/${fileId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new AppError('INTERNAL_ERROR', `Docs API erro: ${body}`, 500);
  }

  const doc = await resp.json();
  const title = doc.title || '';

  // Extrair texto do body
  let bodyText = '';
  if (doc.body?.content) {
    for (const element of doc.body.content) {
      if (element.paragraph?.elements) {
        for (const el of element.paragraph.elements) {
          if (el.textRun?.content) {
            bodyText += el.textRun.content;
          }
        }
      }
      if (element.table) {
        for (const row of element.table.tableRows || []) {
          const cells: string[] = [];
          for (const cell of row.tableCells || []) {
            let cellText = '';
            for (const content of cell.content || []) {
              if (content.paragraph?.elements) {
                for (const el of content.paragraph.elements) {
                  if (el.textRun?.content) {
                    cellText += el.textRun.content.trim();
                  }
                }
              }
            }
            cells.push(cellText);
          }
          bodyText += cells.join('\t') + '\n';
        }
      }
    }
  }

  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return { title, bodyText, wordCount };
}

// Le conteudo de Slides/Forms/Drawing via export texto plano
async function readViaExport(
  token: string,
  fileId: string,
  exportMime: string,
): Promise<string> {
  const resp = await fetch(
    `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new AppError('INTERNAL_ERROR', `Export erro: ${body}`, 500);
  }

  return await resp.text();
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Encontrar indice do 'google-reader' no path
    const fnIndex = pathSegments.findIndex(s => s === 'google-reader');
    const fileId = pathSegments[fnIndex + 1] || '';

    if (!fileId) {
      throw new AppError('VALIDATION_ERROR', 'fileId obrigatorio na URL: /google-reader/:fileId', 400);
    }

    if (req.method !== 'GET') {
      throw new AppError('METHOD_NOT_ALLOWED', 'Apenas GET permitido', 405);
    }

    // Auth — requer JWT valido
    const auth = await getAuthContext(req);

    // Buscar SA credentials do Vault
    const serviceClient = getServiceClient();
    const saJson = await getSecret(serviceClient, `${auth.tenantId}_gdrive_service_account`);

    if (!saJson) {
      throw new AppError(
        'NOT_FOUND',
        'Service Account nao configurada. Configure em Configuracoes > Integracoes > Google Drive.',
        404,
      );
    }

    const sa = JSON.parse(saJson);
    const token = await getGoogleAccessToken(sa, [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
    ]);

    if (!token) {
      throw new AppError('INTERNAL_ERROR', 'Falha ao obter access token do Google', 500);
    }

    // Query params
    const typeParam = url.searchParams.get('type') || 'auto';
    const range = url.searchParams.get('range') || undefined;
    const sheetIndex = url.searchParams.has('sheet')
      ? parseInt(url.searchParams.get('sheet')!, 10)
      : undefined;
    const allSheets = url.searchParams.get('all_sheets') === 'true';

    // Buscar metadata do arquivo
    const metadata = await getFileMetadata(token, fileId);
    let fileType = typeParam;

    // Auto-detect tipo pelo mimeType
    if (fileType === 'auto') {
      fileType = MIME_TYPE_MAP[metadata.mimeType] || 'file';
    }

    // Ler conteudo baseado no tipo
    let content: unknown;

    switch (fileType) {
      case 'sheet': {
        if (allSheets) {
          const sheetsData = await readAllSheets(token, fileId);
          content = {
            type: 'sheet',
            all_sheets: true,
            ...sheetsData,
          };
        } else {
          const sheetData = await readSheet(token, fileId, range, sheetIndex);
          content = {
            type: 'sheet',
            ...sheetData,
          };
        }
        break;
      }

      case 'doc': {
        const docData = await readDoc(token, fileId);
        content = {
          type: 'doc',
          ...docData,
        };
        break;
      }

      case 'slides': {
        const text = await readViaExport(token, fileId, 'text/plain');
        content = {
          type: 'slides',
          bodyText: text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        };
        break;
      }

      case 'form': {
        // Forms nao tem API de leitura direta — exportar como texto
        const formText = await readViaExport(token, fileId, 'text/plain');
        content = {
          type: 'form',
          bodyText: formText,
        };
        break;
      }

      case 'drawing': {
        const svgContent = await readViaExport(token, fileId, 'image/svg+xml');
        content = {
          type: 'drawing',
          svg: svgContent,
        };
        break;
      }

      default: {
        // Arquivo generico — tentar exportar como texto
        try {
          const text = await readViaExport(token, fileId, 'text/plain');
          content = {
            type: 'file',
            bodyText: text,
          };
        } catch {
          content = {
            type: 'file',
            bodyText: null,
            note: 'Arquivo binario ou formato nao suportado para leitura de texto',
          };
        }
        break;
      }
    }

    return success({
      file: {
        id: fileId,
        name: metadata.name,
        mimeType: metadata.mimeType,
        modifiedTime: metadata.modifiedTime,
        size: metadata.size || null,
      },
      content,
    }, 200, req);
  } catch (err) {
    if (err instanceof AppError) {
      return fromAppError(err, req);
    }
    console.error('[google-reader] Erro inesperado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
