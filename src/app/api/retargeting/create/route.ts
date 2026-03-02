import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { checkPlanLimit } from '@/lib/plan-limits';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`retargeting-create:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'retargeting');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'El retargeting está disponible en el plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { campaign_id, opportunity, ad_account_id } = await request.json();

    if (!campaign_id || !opportunity || !ad_account_id) {
      return NextResponse.json(
        { error: 'campaign_id, opportunity y ad_account_id son requeridos' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get meta connection for pixel info
    const { data: metaConnection } = await admin
      .from('meta_connections')
      .select('pixel_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const metaClient = await getMetaClientForUser(user.id);

    // Build the audience rule based on audience type
    let audienceData: Record<string, unknown> = {
      name: `Retargeting - ${opportunity.name}`,
      subtype: 'WEBSITE',
      description: opportunity.rationale || `Audiencia de retargeting: ${opportunity.audience_type}`,
      retention_days: opportunity.retention_days || 30,
      prefill: true,
    };

    const audienceType = opportunity.audience_type as string;

    if (['website_visitors', 'add_to_cart', 'past_purchasers'].includes(audienceType) && metaConnection?.pixel_id) {
      // Pixel-based audiences
      const eventMap: Record<string, string> = {
        website_visitors: 'PageView',
        add_to_cart: 'AddToCart',
        past_purchasers: 'Purchase',
      };

      audienceData = {
        ...audienceData,
        pixel_id: metaConnection.pixel_id,
        rule: {
          inclusions: {
            operator: 'or',
            rules: [
              {
                event_sources: [{ id: metaConnection.pixel_id, type: 'pixel' }],
                retention_seconds: (opportunity.retention_days || 30) * 86400,
                filter: {
                  operator: 'and',
                  filters: [
                    {
                      field: 'event',
                      operator: 'eq',
                      value: eventMap[audienceType] || 'PageView',
                    },
                  ],
                },
              },
            ],
          },
        },
      };
    } else if (['engaged_users', 'video_viewers', 'page_visitors', 'lead_form_openers'].includes(audienceType)) {
      // Engagement-based audiences (no pixel needed)
      audienceData = {
        ...audienceData,
        subtype: 'ENGAGEMENT',
      };
    }

    // Create Custom Audience via Meta API
    let metaAudienceId: string | null = null;
    try {
      const metaResult = await metaClient.createCustomAudience(ad_account_id, audienceData as {
        name: string;
        subtype: string;
        description?: string;
        rule?: Record<string, unknown>;
        pixel_id?: string;
        retention_days?: number;
        prefill?: boolean;
      });
      metaAudienceId = metaResult.id;
    } catch (metaError) {
      logger.error('Meta API error creating audience', { route: 'retargeting-create' }, metaError);
      // Continue without Meta audience - save as draft
    }

    // Save to custom_audiences table
    const { data: audience, error: audienceError } = await admin
      .from('custom_audiences')
      .insert({
        user_id: user.id,
        meta_audience_id: metaAudienceId,
        name: `Retargeting - ${opportunity.name}`,
        audience_type: 'retargeting',
        subtype: audienceData.subtype as string,
        approximate_count: 0,
        status: metaAudienceId ? 'ready' : 'pending',
        campaign_id,
        metadata: {
          audience_type: opportunity.audience_type,
          retention_days: opportunity.retention_days,
          offer_suggestion: opportunity.offer_suggestion,
          copy: opportunity.copy,
          rationale: opportunity.rationale,
        },
      })
      .select()
      .single();

    if (audienceError) {
      logger.error('Error saving audience', { route: 'retargeting-create' }, audienceError);
      return NextResponse.json({ error: 'Error al guardar la audiencia' }, { status: 500 });
    }

    // Create retargeting campaign draft
    const { data: newCampaign, error: campaignError } = await admin
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: `[Retargeting] ${opportunity.name}`,
        status: 'draft',
        objective: 'OUTCOME_SALES',
        campaign_data: {
          campaign: {
            name: `[Retargeting] ${opportunity.name}`,
            objective: 'OUTCOME_SALES',
            special_ad_categories: [],
            daily_budget: 10,
          },
          ad_sets: [
            {
              name: `Retargeting - ${opportunity.audience_type}`,
              targeting: {
                custom_audiences: metaAudienceId ? [metaAudienceId] : [],
                age_min: 18,
                age_max: 65,
                genders: [0],
                geo_locations: { countries: ['MX'] },
              },
              placements: ['feed', 'stories', 'reels'],
              budget_percentage: 100,
              optimization_goal: 'OFFSITE_CONVERSIONS',
              bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            },
          ],
          ads: [
            {
              name: `Anuncio Retargeting - ${opportunity.name}`,
              format: 'single_image',
              primary_text: opportunity.copy.primary_text,
              headline: opportunity.copy.headline,
              description: opportunity.copy.description || '',
              call_to_action: 'SHOP_NOW',
            },
          ],
          strategy: {
            rationale: opportunity.rationale,
            objective: 'OUTCOME_SALES',
            estimated_results: {
              daily_reach_min: 500,
              daily_reach_max: 2000,
              daily_clicks_min: 20,
              daily_clicks_max: 100,
              estimated_cpa_min: 1,
              estimated_cpa_max: 5,
              estimated_ctr: 3,
            },
            optimization_tips: [
              'El retargeting tiene un CTR naturalmente mayor porque la audiencia ya conoce tu marca',
              `Oferta sugerida: ${opportunity.offer_suggestion}`,
            ],
          },
        },
      })
      .select()
      .single();

    if (campaignError) {
      logger.error('Error creating retargeting campaign', { route: 'retargeting-create' }, campaignError);
      return NextResponse.json({ error: 'Error al crear la campaña de retargeting' }, { status: 500 });
    }

    // Notify user
    await createNotification({
      user_id: user.id,
      type: 'system',
      title: 'Campaña de retargeting creada',
      message: `Se creó la campaña de retargeting "${opportunity.name}" como borrador. Revísala y publícala cuando estés listo.`,
      metadata: { campaign_id: newCampaign.id, audience_id: audience.id },
    });

    return NextResponse.json({
      audience,
      campaign: newCampaign,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: 'retargeting-create' });
  }
}
