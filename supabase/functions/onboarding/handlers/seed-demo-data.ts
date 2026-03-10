import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem executar o seed de dados demo
const ADMIN_ROLES = ['admin', 'ceo'];

// Tag para identificar registros demo — facilita exclusao futura
const DEMO_TAG = '[DEMO]';

/**
 * POST /onboarding/seed-demo
 * Popula o workspace do novo tenant com dados de exemplo para que o dashboard
 * nao fique vazio apos o onboarding. Cria clientes, contatos e jobs representativos
 * de um fluxo real de producao audiovisual.
 *
 * Idempotencia: rejeita com CONFLICT se ja existir algum cliente demo
 * (notes comeca com '[DEMO]') para evitar duplicatas em cliques repetidos.
 */
export async function handleSeedDemoData(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[onboarding/seed-demo-data] iniciando seed de dados demo', {
    userId: auth.userId.substring(0, 8),
    tenantId: auth.tenantId.substring(0, 8),
  });

  // Verificar permissao — apenas admin/ceo podem popular dados
  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas administradores podem carregar dados de exemplo',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);
  const tenantId = auth.tenantId;

  // Idempotencia: checar se seed ja foi executado
  const { data: existingDemo } = await client
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('notes', `${DEMO_TAG}%`)
    .limit(1)
    .maybeSingle();

  if (existingDemo) {
    throw new AppError(
      'CONFLICT',
      'Dados de exemplo ja foram carregados para este workspace. Para recriar, remova os registros marcados com [DEMO] manualmente.',
      409,
    );
  }

  // ============================================================
  // 1. Criar clientes demo
  // ============================================================

  const { data: clientAgencia, error: errClientAgencia } = await client
    .from('clients')
    .insert({
      tenant_id: tenantId,
      name: 'Cliente Demo Agencia',
      trading_name: 'Agencia Demo LTDA',
      segment: 'varejo',
      city: 'Sao Paulo',
      state: 'SP',
      notes: `${DEMO_TAG} Cliente de exemplo vinculado via agencia. Representa o fluxo tipico de jobs publicitarios com intermediacao de agencia.`,
      is_active: true,
    })
    .select('id')
    .single();

  if (errClientAgencia) {
    console.error('[onboarding/seed-demo-data] erro ao criar cliente agencia:', errClientAgencia.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar dados de exemplo', 500, {
      detail: errClientAgencia.message,
    });
  }

  const { data: clientDireto, error: errClientDireto } = await client
    .from('clients')
    .insert({
      tenant_id: tenantId,
      name: 'Cliente Demo Direto',
      trading_name: 'Empresa Demo S/A',
      segment: 'tecnologia',
      city: 'Rio de Janeiro',
      state: 'RJ',
      notes: `${DEMO_TAG} Cliente de exemplo contratado diretamente (sem agencia). Representa o fluxo de jobs institucionais e corporativos.`,
      is_active: true,
    })
    .select('id')
    .single();

  if (errClientDireto) {
    console.error('[onboarding/seed-demo-data] erro ao criar cliente direto:', errClientDireto.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar dados de exemplo', 500, {
      detail: errClientDireto.message,
    });
  }

  console.log('[onboarding/seed-demo-data] clientes criados', {
    clientAgenciaId: clientAgencia.id,
    clientDiretoId: clientDireto.id,
  });

  // ============================================================
  // 2. Criar contatos vinculados aos clientes
  // ============================================================

  const { error: errContatos } = await client
    .from('contacts')
    .insert([
      {
        tenant_id: tenantId,
        client_id: clientAgencia.id,
        name: 'Ana Paula Oliveira (Demo)',
        email: 'ana.demo@clienteagencia.exemplo.com',
        phone: '(11) 99000-0001',
        role: 'Gerente de Marketing',
        is_primary: true,
      },
      {
        tenant_id: tenantId,
        client_id: clientDireto.id,
        name: 'Marcos Silva (Demo)',
        email: 'marcos.demo@clientedireto.exemplo.com',
        phone: '(21) 99000-0002',
        role: 'Diretor de Comunicacao',
        is_primary: true,
      },
    ]);

  if (errContatos) {
    console.error('[onboarding/seed-demo-data] erro ao criar contatos:', errContatos.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar dados de exemplo', 500, {
      detail: errContatos.message,
    });
  }

  // ============================================================
  // 3. Criar jobs de exemplo
  // O trigger generate_job_code cuida automaticamente de:
  //   - code (ex: 001)
  //   - index_number
  //   - job_aba (ex: 001_FilmeInstitucionalDemo)
  // Passamos code=NULL para acionar o trigger.
  // ============================================================

  // Job 1: Em producao — job publicitario com budget fechado
  const { data: job1, error: errJob1 } = await client
    .from('jobs')
    .insert({
      tenant_id: tenantId,
      client_id: clientAgencia.id,
      title: 'Filme Institucional Demo',
      project_type: 'institucional',
      status: 'producao_filmagem',
      priority_level: 'alta',
      closed_value: 45000.00,
      production_cost: 28000.00,
      tax_percentage: 12.00,
      briefing_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `${DEMO_TAG} Job de exemplo em fase de producao (filmagem). Budget fechado em R$ 45.000. Demonstra o fluxo de acompanhamento financeiro e de equipe.`,
      internal_notes: 'Dados de exemplo gerados automaticamente durante o onboarding.',
      tags: ['demo', 'institucional'],
    })
    .select('id')
    .single();

  if (errJob1) {
    console.error('[onboarding/seed-demo-data] erro ao criar job 1:', errJob1.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar dados de exemplo', 500, {
      detail: errJob1.message,
    });
  }

  // Job 2: Em pos-producao — campanha digital
  const { data: job2, error: errJob2 } = await client
    .from('jobs')
    .insert({
      tenant_id: tenantId,
      client_id: clientAgencia.id,
      title: 'Campanha Digital Demo',
      project_type: 'conteudo_digital',
      status: 'pos_producao',
      pos_sub_status: 'edicao',
      priority_level: 'media',
      closed_value: 28000.00,
      production_cost: 16000.00,
      tax_percentage: 12.00,
      briefing_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `${DEMO_TAG} Job de exemplo em pos-producao (edicao). Demonstra o pipeline de pos e o sub-status de acompanhamento de etapas internas.`,
      internal_notes: 'Dados de exemplo gerados automaticamente durante o onboarding.',
      tags: ['demo', 'digital'],
    })
    .select('id')
    .single();

  if (errJob2) {
    console.error('[onboarding/seed-demo-data] erro ao criar job 2:', errJob2.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar dados de exemplo', 500, {
      detail: errJob2.message,
    });
  }

  // Job 3: Em orcamento — evento corporativo (cliente direto)
  const { data: job3, error: errJob3 } = await client
    .from('jobs')
    .insert({
      tenant_id: tenantId,
      client_id: clientDireto.id,
      title: 'Evento Corporativo Demo',
      project_type: 'evento_livestream',
      status: 'orcamento_elaboracao',
      priority_level: 'baixa',
      closed_value: 15000.00,
      production_cost: 9000.00,
      tax_percentage: 12.00,
      briefing_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `${DEMO_TAG} Job de exemplo na fase de orcamento. Demonstra o inicio do ciclo de vida de um projeto — da elaboracao do orcamento ate a aprovacao pelo cliente.`,
      internal_notes: 'Dados de exemplo gerados automaticamente durante o onboarding.',
      tags: ['demo', 'evento'],
    })
    .select('id')
    .single();

  if (errJob3) {
    console.error('[onboarding/seed-demo-data] erro ao criar job 3:', errJob3.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar dados de exemplo', 500, {
      detail: errJob3.message,
    });
  }

  console.log('[onboarding/seed-demo-data] jobs criados', {
    job1Id: job1.id,
    job2Id: job2.id,
    job3Id: job3.id,
  });

  // ============================================================
  // 4. Criar deliverables para cada job (2 por job)
  // ============================================================

  const { error: errDeliverables } = await client
    .from('job_deliverables')
    .insert([
      // Job 1 — Filme Institucional
      {
        tenant_id: tenantId,
        job_id: job1.id,
        description: '[DEMO] Versao Final 30" — MP4 Master',
        format: 'MP4',
        resolution: '1080p',
        duration_seconds: 30,
        status: 'em_producao',
        version: 1,
        delivery_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Entregavel de exemplo. Versao principal para broadcast.',
        display_order: 1,
      },
      {
        tenant_id: tenantId,
        job_id: job1.id,
        description: '[DEMO] Versao Social Media 15" — MP4 Vertical',
        format: 'MP4',
        resolution: '1080p',
        duration_seconds: 15,
        status: 'pendente',
        version: 1,
        delivery_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Entregavel de exemplo. Adaptacao vertical para Instagram Reels.',
        display_order: 2,
      },
      // Job 2 — Campanha Digital
      {
        tenant_id: tenantId,
        job_id: job2.id,
        description: '[DEMO] Pack de 5 Reels — MP4 9:16',
        format: 'MP4',
        resolution: '1080p',
        duration_seconds: 60,
        status: 'aguardando_aprovacao',
        version: 2,
        delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Entregavel de exemplo. 5 videos curtos para feed de redes sociais.',
        display_order: 1,
      },
      {
        tenant_id: tenantId,
        job_id: job2.id,
        description: '[DEMO] Thumbnails e Capas — PNG 1200x630',
        format: 'PNG',
        resolution: '1200x630',
        duration_seconds: null,
        status: 'aprovado',
        version: 1,
        delivery_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Entregavel de exemplo. Materiais graficos aprovados pelo cliente.',
        display_order: 2,
      },
      // Job 3 — Evento Corporativo
      {
        tenant_id: tenantId,
        job_id: job3.id,
        description: '[DEMO] Cobertura ao Vivo — Stream HD',
        format: 'Stream',
        resolution: '1080p',
        duration_seconds: 7200,
        status: 'pendente',
        version: 1,
        delivery_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Entregavel de exemplo. Transmissao ao vivo do evento.',
        display_order: 1,
      },
      {
        tenant_id: tenantId,
        job_id: job3.id,
        description: '[DEMO] Highlight 3 min — MP4 editado pos-evento',
        format: 'MP4',
        resolution: '1080p',
        duration_seconds: 180,
        status: 'pendente',
        version: 1,
        delivery_date: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Entregavel de exemplo. Video resumo do evento para distribuicao interna.',
        display_order: 2,
      },
    ]);

  if (errDeliverables) {
    console.error('[onboarding/seed-demo-data] erro ao criar deliverables:', errDeliverables.message);
    // Nao bloquear — jobs ja foram criados, deliverables sao complementares
    console.warn('[onboarding/seed-demo-data] seed concluido parcialmente (deliverables falharam)');
  }

  console.log('[onboarding/seed-demo-data] seed concluido com sucesso');

  return success(
    {
      seeded: true,
      summary: {
        clients: 2,
        contacts: 2,
        jobs: 3,
        deliverables: errDeliverables ? 0 : 6,
      },
    },
    201,
    req,
  );
}
