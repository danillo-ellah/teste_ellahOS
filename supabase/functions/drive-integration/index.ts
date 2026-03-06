import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listFolders } from './handlers/list-folders.ts';
import { createStructure } from './handlers/create-structure.ts';
import { recreateStructure } from './handlers/recreate.ts';
import { syncUrls } from './handlers/sync-urls.ts';
import { handleCopyTemplates } from './handlers/copy-templates.ts';
import { deleteStructure } from './handlers/delete-structure.ts';
import { grantMemberPermissions } from './handlers/grant-member-permissions.ts';
import { revokeMemberPermissions } from './handlers/revoke-member-permissions.ts';
import { syncPermissions } from './handlers/sync-permissions.ts';
import { listPermissions } from './handlers/list-permissions.ts';

// ========================================================
// drive-integration — CRUD pastas Google Drive por job
// POST   /:jobId/create-structure         — criar estrutura de pastas (admin/ceo)
// POST   /:jobId/recreate                 — recriar pastas (admin/ceo)
// POST   /:jobId/sync-urls                — callback do n8n (webhook)
// POST   /:jobId/copy-templates           — copiar templates para pastas do job (admin/ceo/pe)
// DELETE /:jobId/delete-structure         — excluir pastas do Drive (admin/ceo)
// GET    /:jobId/folders                  — listar pastas do job
// POST   /:jobId/sync-permissions         — re-sync completo de permissoes (admin/ceo)
// POST   /:jobId/grant-member-permissions — conceder permissoes a membro (admin/ceo/pe)
// POST   /:jobId/revoke-member-permissions — revogar permissoes de membro (admin/ceo/pe)
// GET    /:jobId/permissions              — listar permissoes do job (qualquer autenticado)
// ========================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Encontrar indice do 'drive-integration' no path
    const fnIndex = pathSegments.findIndex(s => s === 'drive-integration');
    const segment1 = pathSegments[fnIndex + 1] || ''; // jobId
    const segment2 = pathSegments[fnIndex + 2] || ''; // action

    if (!segment1) {
      throw new AppError('VALIDATION_ERROR', 'jobId obrigatorio na URL', 400);
    }

    const jobId = segment1;

    // sync-urls pode usar autenticacao alternativa (webhook secret)
    if (req.method === 'POST' && segment2 === 'sync-urls') {
      return await syncUrls(req, jobId);
    }

    // Demais endpoints requerem auth JWT
    const auth = await getAuthContext(req);

    switch (req.method) {
      case 'GET':
        if (segment2 === 'folders' || segment2 === '') {
          return await listFolders(req, auth, jobId);
        }
        if (segment2 === 'permissions') {
          // Qualquer usuario autenticado do tenant pode listar permissoes
          return await listPermissions(req, auth, jobId);
        }
        break;

      case 'POST':
        if (segment2 === 'create-structure') {
          // Apenas admin/ceo
          if (!['admin', 'ceo'].includes(auth.role)) {
            throw new AppError('FORBIDDEN', 'Apenas admin/ceo podem criar pastas manualmente', 403);
          }
          return await createStructure(req, auth, jobId);
        }
        if (segment2 === 'recreate') {
          if (!['admin', 'ceo'].includes(auth.role)) {
            throw new AppError('FORBIDDEN', 'Apenas admin/ceo podem recriar pastas', 403);
          }
          return await recreateStructure(req, auth, jobId);
        }
        if (segment2 === 'copy-templates') {
          // Permitido para admin, ceo e produtor_executivo
          // (verificacao de role granular feita dentro do handler)
          return await handleCopyTemplates(req, auth, jobId);
        }
        if (segment2 === 'sync-permissions') {
          // Re-sync completo — apenas admin e ceo (verificacao granular dentro do handler)
          return await syncPermissions(req, auth, jobId);
        }
        if (segment2 === 'grant-member-permissions') {
          // Conceder permissoes a membro especifico — admin/ceo/pe
          return await grantMemberPermissions(req, auth, jobId);
        }
        if (segment2 === 'revoke-member-permissions') {
          // Revogar permissoes de membro especifico — admin/ceo/pe
          return await revokeMemberPermissions(req, auth, jobId);
        }
        break;

      case 'DELETE':
        if (segment2 === 'delete-structure') {
          if (!['admin', 'ceo'].includes(auth.role)) {
            throw new AppError('FORBIDDEN', 'Apenas admin/ceo podem excluir pastas', 403);
          }
          return await deleteStructure(req, auth, jobId);
        }
        break;
    }

    throw new AppError('NOT_FOUND', `Rota nao encontrada: ${req.method} ${segment2}`, 404);
  } catch (err) {
    if (err instanceof AppError) {
      return fromAppError(err, req);
    }
    console.error('[drive-integration] Erro inesperado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
