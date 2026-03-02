import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { checkPlanLimit } from '@/lib/plan-limits';
import { mapScheduleToMeta } from '@/lib/scheduling/mapper';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`scheduling-apply:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    // Check plan limit
    const limitCheck = await checkPlanLimit(user.id, 'smart_scheduling');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Smart Scheduling requiere un plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { campaign_id, schedule_matrix } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id es requerido' }, { status: 400 });
    }

    if (!schedule_matrix || !Array.isArray(schedule_matrix) || schedule_matrix.length !== 7) {
      return NextResponse.json({ error: 'schedule_matrix debe ser un array de 7x24 booleanos' }, { status: 400 });
    }

    // Validate schedule matrix dimensions
    for (let d = 0; d < 7; d++) {
      if (!Array.isArray(schedule_matrix[d]) || schedule_matrix[d].length !== 24) {
        return NextResponse.json({
          error: `schedule_matrix[${d}] debe tener exactamente 24 elementos`,
        }, { status: 400 });
      }
    }

    const admin = createAdminClient();

    // Get campaign
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('id, name, meta_campaign_id, user_id')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    if (!campaign.meta_campaign_id) {
      return NextResponse.json({
        error: 'La campaña debe estar publicada en Meta para aplicar horarios',
      }, { status: 400 });
    }

    // Get all ad sets for this campaign
    const { data: adSets, error: adSetsError } = await admin
      .from('campaign_ad_sets')
      .select('id, meta_adset_id, name')
      .eq('campaign_id', campaign_id);

    if (adSetsError) {
      return NextResponse.json({ error: 'Error al obtener ad sets' }, { status: 500 });
    }

    const adSetsWithMeta = (adSets || []).filter(as => as.meta_adset_id);

    if (adSetsWithMeta.length === 0) {
      return NextResponse.json({
        error: 'No hay ad sets publicados en Meta para esta campaña',
      }, { status: 400 });
    }

    // Convert boolean matrix to Meta schedule format
    const metaSchedule = mapScheduleToMeta(schedule_matrix);

    // Check if all hours are active (means removing schedule / running 24/7)
    const allActive = schedule_matrix.every((day: boolean[]) => day.every((h: boolean) => h));

    // Apply schedule to each ad set via Meta API
    const metaClient = await getMetaClientForUser(user.id);
    const results: Array<{ adset_id: string; name: string; success: boolean; error?: string }> = [];

    for (const adSet of adSetsWithMeta) {
      try {
        if (allActive) {
          // Remove day parting - set to standard pacing
          await metaClient.updateAdSetSchedule(adSet.meta_adset_id!, []);
        } else {
          await metaClient.updateAdSetSchedule(adSet.meta_adset_id!, metaSchedule);
        }
        results.push({
          adset_id: adSet.id,
          name: adSet.name,
          success: true,
        });
      } catch (metaError) {
        logger.error(`[Scheduling] Error applying schedule to ad set ${adSet.meta_adset_id}`, { route: 'scheduling-apply' }, metaError);
        results.push({
          adset_id: adSet.id,
          name: adSet.name,
          success: false,
          error: metaError instanceof Error ? metaError.message : 'Error desconocido',
        });
      }
    }

    const allSuccess = results.every(r => r.success);
    const someSuccess = results.some(r => r.success);

    // Update schedule_configs
    await admin
      .from('schedule_configs')
      .upsert({
        user_id: user.id,
        campaign_id: campaign_id,
        schedule_matrix: schedule_matrix,
        is_applied: someSuccess,
        applied_at: someSuccess ? new Date().toISOString() : null,
      }, {
        onConflict: 'campaign_id',
      });

    if (!someSuccess) {
      return NextResponse.json({
        error: 'No se pudo aplicar el horario a ningún ad set',
        results,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: allSuccess,
      partial: !allSuccess && someSuccess,
      message: allSuccess
        ? `Horario aplicado exitosamente a ${results.length} ad set(s)`
        : `Horario aplicado parcialmente: ${results.filter(r => r.success).length}/${results.length} ad sets`,
      results,
    });
  } catch (error) {
    return handleApiError(error, { route: 'scheduling-apply' });
  }
}
