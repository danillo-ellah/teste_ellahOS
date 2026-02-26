import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';
import { createSubmission } from '../../_shared/docuseal-client.ts';
import type { DocuSealCreateSubmission } from '../../_shared/docuseal-client.ts';

// Handler: processa evento docuseal_create_batch
// Cria submissions em lote no DocuSeal para assinatura de contratos
export async function processDocuSealEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const jobId = event.payload.job_id as string;
  const tenantId = event.tenant_id;

  if (!jobId) {
    throw new Error('docuseal_create_batch: job_id ausente no payload');
  }

  const members = (event.payload.members as Array<Record<string, unknown>>) ?? [];
  const templateId = (event.payload.template_id as number) ?? 0;

  if (!templateId) {
    throw new Error('docuseal_create_batch: template_id ausente no payload');
  }

  if (members.length === 0) {
    throw new Error('docuseal_create_batch: nenhum membro na lista');
  }

  console.log(
    `[docuseal-handler] criando ${members.length} submission(s) para job ${jobId} template ${templateId}`,
  );

  let created = 0;
  let failed = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const member of members) {
    const email = member.email as string;
    const name = member.name as string;
    const personId = (member.person_id as string) ?? null;
    const cpf = (member.cpf as string) ?? null;

    if (!email || !name) {
      console.warn(`[docuseal-handler] membro sem email ou nome — pulando`);
      failed++;
      results.push({ email, name, status: 'skipped', reason: 'email ou nome ausente' });
      continue;
    }

    try {
      // Verificar duplicata: ja existe submission ativa para esta pessoa/job/template?
      const { data: existing } = await serviceClient
        .from('docuseal_submissions')
        .select('id, docuseal_status')
        .eq('tenant_id', tenantId)
        .eq('job_id', jobId)
        .eq('person_email', email)
        .eq('docuseal_template_id', templateId)
        .is('deleted_at', null)
        .not('docuseal_status', 'in', '("declined","expired","error")')
        .maybeSingle();

      if (existing) {
        console.log(
          `[docuseal-handler] submission ja existe para ${email} no job ${jobId} (status: ${existing.docuseal_status}) — pulando`,
        );
        results.push({ email, name, status: 'skipped', reason: 'ja existe submission ativa' });
        continue;
      }

      // Montar payload para DocuSeal
      const fields = (member.fields as Array<{ name: string; value: string }>) ?? [];
      const memberRole = (member.role as string) || 'Contratado';
      const submission: DocuSealCreateSubmission = {
        template_id: templateId,
        send_email: true,
        submitters: [
          {
            role: memberRole,
            email,
            fields,
          },
        ],
      };

      // Chamar DocuSeal API
      const dsResponse = await createSubmission(serviceClient, tenantId, submission);

      // Registrar no banco
      const now = new Date().toISOString();
      const contractData = (member.contract_data as Record<string, unknown>) ?? {};

      const { data: insertedRow, error: insertError } = await serviceClient
        .from('docuseal_submissions')
        .insert({
          tenant_id: tenantId,
          job_id: jobId,
          person_id: personId,
          person_name: name,
          person_email: email,
          person_cpf: cpf,
          docuseal_submission_id: dsResponse.id,
          docuseal_template_id: templateId,
          docuseal_status: 'sent',
          contract_data: contractData,
          sent_at: now,
          created_by: (event.payload.created_by as string) ?? null,
          metadata: { source: 'batch', event_id: event.id },
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`[docuseal-handler] falha ao registrar submission para ${email}: ${insertError.message}`);
        failed++;
        results.push({ email, name, status: 'error', reason: insertError.message });
      } else {
        created++;
        results.push({
          email,
          name,
          status: 'created',
          submission_id: insertedRow?.id,
          docuseal_submission_id: dsResponse.id,
        });
        console.log(`[docuseal-handler] submission criada para ${email} → docuseal_id=${dsResponse.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[docuseal-handler] falha ao criar submission para ${email}: ${msg}`);
      failed++;
      results.push({ email, name, status: 'error', reason: msg });
    }
  }

  console.log(`[docuseal-handler] batch concluido: ${created} criados, ${failed} falhas de ${members.length} total`);

  return {
    job_id: jobId,
    template_id: templateId,
    created,
    failed,
    total: members.length,
    results,
  };
}
