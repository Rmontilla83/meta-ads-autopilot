import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { mapTargeting, mapObjective, mapOptimizationGoal, mapBidStrategy } from '@/lib/meta/targeting-mapper';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import type { ABTestVariant, ABTestCampaignJoin, ABTestWithCampaign } from '@/types';

const META_MIN_DAILY_BUDGET_CENTS = 100;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ab-test-launch:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    const admin = createAdminClient();

    // Get test with campaign data
    const { data: testRow, error: testError } = await admin
      .from('ab_tests')
      .select('*, campaigns(name, objective, status, meta_campaign_id, campaign_data)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (testError || !testRow) {
      return NextResponse.json({ error: 'Test no encontrado' }, { status: 404 });
    }

    const test = testRow as unknown as ABTestWithCampaign;

    if (test.status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo se pueden lanzar tests en estado borrador' },
        { status: 400 }
      );
    }

    const campaign = test.campaigns as ABTestCampaignJoin | null;
    if (!campaign?.meta_campaign_id) {
      return NextResponse.json(
        { error: 'La campaña debe estar publicada en Meta para lanzar un A/B test' },
        { status: 400 }
      );
    }

    // Get Meta connection info
    const { data: metaConn } = await admin
      .from('meta_connections')
      .select('ad_account_id, page_id, pixel_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!metaConn?.ad_account_id || !metaConn?.page_id) {
      return NextResponse.json(
        { error: 'Se requiere cuenta publicitaria y página de Facebook configuradas' },
        { status: 400 }
      );
    }

    const metaClient = await getMetaClientForUser(user.id);

    const campaignData = campaign.campaign_data || {};
    const campaignObj = (campaignData as { campaign?: { objective?: string; daily_budget?: number } }).campaign;
    const campaignObjective = mapObjective(campaignObj?.objective || campaign.objective || 'OUTCOME_TRAFFIC');

    // Budget per variant: split equally across all variants
    const variants = (test.variants || []) as ABTestVariant[];
    const totalDailyBudget = campaignObj?.daily_budget || 10;
    const budgetPerVariantUSD = totalDailyBudget / variants.length;
    let budgetPerVariantCents = Math.round(budgetPerVariantUSD * 100);
    if (budgetPerVariantCents < META_MIN_DAILY_BUDGET_CENTS) {
      budgetPerVariantCents = META_MIN_DAILY_BUDGET_CENTS;
    }

    // Get base ad set and ad data from campaign
    const adSets = (campaignData as { ad_sets?: Array<Record<string, unknown>> }).ad_sets || [];
    const ads = (campaignData as { ads?: Array<Record<string, unknown>> }).ads || [];
    const baseAdSet = adSets[0] || {};
    const baseAd = ads[0] || {};

    // Create ad sets and ads for each variant
    const updatedVariants = [];

    for (const variant of variants) {
      try {
        // Build targeting for this variant
        let targeting: Record<string, unknown>;

        if (test.test_type === 'audience' && variant.config?.targeting) {
          // Audience test: use variant-specific targeting
          try {
            targeting = mapTargeting(variant.config.targeting as unknown as Parameters<typeof mapTargeting>[0]);
          } catch {
            // Fallback to base targeting
            targeting = baseAdSet.targeting
              ? mapTargeting(baseAdSet.targeting as Parameters<typeof mapTargeting>[0])
              : { age_min: 18, age_max: 65, geo_locations: { countries: ['MX'] } };
          }
        } else {
          // For non-audience tests, use the campaign's base targeting
          targeting = baseAdSet.targeting
            ? mapTargeting(baseAdSet.targeting as Parameters<typeof mapTargeting>[0])
            : { age_min: 18, age_max: 65, geo_locations: { countries: ['MX'] } };
        }

        const optimizationGoal = mapOptimizationGoal(
          campaignObjective,
          (baseAdSet.optimization_goal as string) || 'LINK_CLICKS'
        );
        const bidStrategy = mapBidStrategy((baseAdSet.bid_strategy as string) || 'LOWEST_COST_WITHOUT_CAP');

        // Promoted object
        let promotedObject: Record<string, unknown> | undefined;
        if (campaignObjective === 'OUTCOME_SALES' && metaConn.pixel_id) {
          promotedObject = { pixel_id: metaConn.pixel_id, custom_event_type: 'PURCHASE' };
        } else {
          promotedObject = { page_id: metaConn.page_id };
        }

        // Create ad set in Meta
        const adsetResult = await metaClient.createAdSet(
          campaign.meta_campaign_id,
          metaConn.ad_account_id,
          {
            name: `[AB Test] ${test.name} - ${variant.name}`.substring(0, 400),
            campaign_id: campaign.meta_campaign_id,
            targeting: {
              ...targeting,
              targeting_automation: { advantage_audience: 0 },
            },
            optimization_goal: optimizationGoal,
            billing_event: 'IMPRESSIONS',
            bid_strategy: bidStrategy,
            daily_budget: budgetPerVariantCents,
            status: 'ACTIVE',
            promoted_object: promotedObject,
          }
        );

        // Build creative spec for this variant
        const primaryText = variant.config?.copy?.primary_text
          || variant.config?.hook
          || (baseAd.primary_text as string)
          || 'Descubre más';
        const headline = variant.config?.copy?.headline
          || (baseAd.headline as string)
          || '';
        const description = variant.config?.copy?.description
          || (baseAd.description as string)
          || '';
        const destinationUrl = (baseAd.destination_url as string)
          || `https://facebook.com/${metaConn.page_id}`;

        const ctaType = (baseAd.call_to_action as string) || 'LEARN_MORE';

        const objectStorySpec: Record<string, unknown> = {
          page_id: metaConn.page_id,
          link_data: {
            message: primaryText.substring(0, 2200),
            name: headline.substring(0, 255),
            description: description.substring(0, 255),
            link: destinationUrl,
            call_to_action: {
              type: ctaType,
              value: { link: destinationUrl },
            },
            ...(baseAd.image_url ? { picture: baseAd.image_url } : {}),
          },
        };

        // Create creative
        const creative = await metaClient.createAdCreative(metaConn.ad_account_id, {
          name: `[AB Test] Creative - ${variant.name}`.substring(0, 400),
          object_story_spec: objectStorySpec,
        });

        // Create ad
        const adResult = await metaClient.createAd(
          adsetResult.id,
          metaConn.ad_account_id,
          {
            name: `[AB Test] Ad - ${variant.name}`.substring(0, 400),
            adset_id: adsetResult.id,
            creative: { creative_id: creative.id },
            status: 'ACTIVE',
          }
        );

        updatedVariants.push({
          ...variant,
          meta_adset_id: adsetResult.id,
          meta_ad_id: adResult.id,
          meta_creative_id: creative.id,
        });
      } catch (variantError) {
        logger.error(`Error launching variant ${variant.name}`, { route: 'ab-tests-[id]-launch' }, variantError);

        // Clean up already created variants on failure
        for (const created of updatedVariants) {
          try {
            if (created.meta_ad_id) await metaClient.deleteObject(created.meta_ad_id);
            if (created.meta_creative_id) await metaClient.deleteObject(created.meta_creative_id);
            if (created.meta_adset_id) await metaClient.deleteObject(created.meta_adset_id);
          } catch { /* ignore cleanup errors */ }
        }

        const errorMsg = variantError instanceof Error ? variantError.message : 'Error desconocido';
        return NextResponse.json(
          { error: `Error al crear variante "${variant.name}": ${errorMsg}` },
          { status: 500 }
        );
      }
    }

    // Update test in DB
    const { data: updated, error: updateError } = await admin
      .from('ab_tests')
      .update({
        status: 'running',
        variants: updatedVariants,
        started_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating ab test after launch', { route: 'ab-tests-[id]-launch' }, updateError);
      return NextResponse.json({ error: 'Test lanzado pero error al guardar estado' }, { status: 500 });
    }

    // Notify user
    await createNotification({
      user_id: user.id,
      type: 'system',
      title: 'A/B Test lanzado',
      message: `El test "${test.name}" se ha lanzado con ${updatedVariants.length} variantes. Los resultados comenzarán a acumularse en las próximas horas.`,
      metadata: { test_id: id, variant_count: updatedVariants.length },
    });

    return NextResponse.json({ test: updated });
  } catch (error) {
    return handleApiError(error, { route: 'ab-tests-[id]-launch' });
  }
}
