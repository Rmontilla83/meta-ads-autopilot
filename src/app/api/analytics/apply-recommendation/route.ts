import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getMetaClientForUser } from '@/lib/meta/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`apply-rec:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const {
      recommendation_title,
      action_type,
      action_params,
      target_id,
      target_name,
      campaign_id,
    } = await request.json();

    if (!action_type || !target_id) {
      return NextResponse.json({ error: 'action_type y target_id son requeridos' }, { status: 400 });
    }

    const admin = createAdminClient();
    let result: 'success' | 'failed' = 'success';
    let errorMessage: string | null = null;

    try {
      const client = await getMetaClientForUser(user.id);

      switch (action_type) {
        case 'pause_ad': {
          // Try as ad first, then as ad set, then as campaign
          try {
            await client.updateAdStatus(target_id, 'PAUSED');
          } catch {
            try {
              await client.updateAdSetStatus(target_id, 'PAUSED');
            } catch {
              await client.updateCampaignStatus(target_id, 'PAUSED');
            }
          }
          // Update local status
          await admin.from('campaign_ads').update({ status: 'paused' }).eq('meta_ad_id', target_id);
          await admin.from('campaign_ad_sets').update({ status: 'paused' }).eq('meta_adset_id', target_id);
          await admin.from('campaigns').update({ status: 'paused' }).eq('meta_campaign_id', target_id);
          break;
        }

        case 'increase_budget': {
          const percentage = Number(action_params?.percentage) || 20;
          const currentBudget = Number(action_params?.current_budget) || 0;
          const newBudget = Math.round(currentBudget * (1 + percentage / 100));
          if (newBudget > 0) {
            try {
              await client.updateAdSetBudget(target_id, newBudget);
            } catch {
              await client.updateCampaignBudget(target_id, newBudget);
            }
          }
          break;
        }

        case 'decrease_budget': {
          const percentage = Number(action_params?.percentage) || 20;
          const currentBudget = Number(action_params?.current_budget) || 0;
          const newBudget = Math.max(500, Math.round(currentBudget * (1 - percentage / 100)));
          try {
            await client.updateAdSetBudget(target_id, newBudget);
          } catch {
            await client.updateCampaignBudget(target_id, newBudget);
          }
          break;
        }

        case 'rotate_creative': {
          // Pause the current ad
          try {
            await client.updateAdStatus(target_id, 'PAUSED');
            await admin.from('campaign_ads').update({ status: 'paused' }).eq('meta_ad_id', target_id);
          } catch {
            await client.updateAdSetStatus(target_id, 'PAUSED');
          }
          break;
        }

        case 'change_bid': {
          const newStrategy = action_params?.bid_strategy || 'LOWEST_COST_WITHOUT_CAP';
          await client.updateAdSetBudget(target_id, 0); // Workaround: we can't change bid via simple API
          // For bid strategy changes, we log the recommendation but note it requires manual intervention
          errorMessage = `Cambio de estrategia a ${newStrategy} registrado. Algunos cambios de puja requieren intervención manual en Meta Ads Manager.`;
          break;
        }

        case 'create_ab_test': {
          result = 'success';
          errorMessage = 'Navega a la página de A/B Tests para crear el test.';
          break;
        }

        case 'create_retargeting': {
          result = 'success';
          errorMessage = 'Navega a la página de Retargeting para crear la campaña.';
          break;
        }

        case 'scale_winner': {
          const percentage = Number(action_params?.percentage) || 20;
          const currentBudget = Number(action_params?.current_budget) || 0;
          if (currentBudget > 0) {
            const newBudget = Math.round(currentBudget * (1 + percentage / 100));
            try {
              await client.updateAdSetBudget(target_id, newBudget);
            } catch {
              await client.updateCampaignBudget(target_id, newBudget);
            }
            // Log scaling event
            await admin.from('scaling_events').insert({
              user_id: user.id,
              campaign_id: campaign_id || null,
              meta_adset_id: target_id,
              scaling_type: 'vertical',
              action_detail: { percentage, old_budget: currentBudget, new_budget: newBudget },
              success: true,
            });
          } else {
            errorMessage = 'Navega a la página de Escalado para ejecutar con protecciones.';
          }
          break;
        }

        case 'create_funnel': {
          result = 'success';
          errorMessage = 'Navega a la página de Funnels para crear el embudo.';
          break;
        }

        case 'create_lookalike': {
          result = 'success';
          errorMessage = 'Navega a Retargeting para crear audiencias lookalike.';
          break;
        }

        case 'apply_schedule': {
          result = 'success';
          errorMessage = 'Navega a la página de Scheduling de la campaña para aplicar el horario.';
          break;
        }

        case 'test_hooks': {
          result = 'success';
          errorMessage = 'Navega a la página de A/B Tests para probar hooks.';
          break;
        }

        default: {
          // For action types that can't be auto-executed (adjust_targeting, change_placement, duplicate_winner, create_variation, adjust_schedule)
          // Log the recommendation as pending manual action
          result = 'success';
          errorMessage = 'Recomendación registrada. Esta acción requiere configuración manual.';
        }
      }
    } catch (metaError) {
      result = 'failed';
      errorMessage = metaError instanceof Error ? metaError.message : 'Error al ejecutar en Meta';
    }

    // Save recommendation action
    await admin.from('recommendation_actions').insert({
      user_id: user.id,
      campaign_id: campaign_id || null,
      recommendation_title: recommendation_title || action_type,
      action_type,
      action_params: action_params || {},
      target_id,
      target_name: target_name || null,
      result,
      error_message: errorMessage,
    });

    logger.info('Recommendation applied', {
      route: 'analytics/apply-recommendation',
      userId: user.id,
      action_type,
      target_id,
      result,
    });

    return NextResponse.json({ success: result === 'success', result, error: errorMessage });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/apply-recommendation' });
  }
}

// GET: Fetch history of applied recommendations
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`apply-rec-history:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const { data, error } = await supabase
      .from('recommendation_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }

    return NextResponse.json({ actions: data });
  } catch (error) {
    return handleApiError(error, { route: 'analytics/apply-recommendation' });
  }
}
