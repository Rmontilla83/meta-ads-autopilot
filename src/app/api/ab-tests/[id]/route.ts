import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { logger } from '@/lib/logger';
import type { ABTestVariant, ABTestWithCampaign } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ab-test-detail:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    const admin = createAdminClient();

    const { data: testRow, error } = await admin
      .from('ab_tests')
      .select('*, campaigns(name, objective, status, meta_campaign_id, campaign_data)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !testRow) {
      return NextResponse.json({ error: 'Test no encontrado' }, { status: 404 });
    }

    const test = testRow as unknown as ABTestWithCampaign;
    const variants = (test.variants || []) as ABTestVariant[];

    // If running, fetch live metrics from Meta API for each variant
    if (test.status === 'running' && variants.length > 0) {
      try {
        const metaClient = await getMetaClientForUser(user.id);
        const today = new Date();
        const startDate = test.started_at
          ? new Date(test.started_at).toISOString().split('T')[0]
          : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateRange = {
          since: startDate,
          until: today.toISOString().split('T')[0],
        };

        const updatedVariants = await Promise.all(variants.map(async (variant: ABTestVariant) => {
          if (!variant.meta_adset_id) return variant;

          try {
            const insights = await metaClient.getAdSetInsights(variant.meta_adset_id, dateRange);
            const data = insights.data?.[0];

            if (data) {
              const impressions = parseInt(String(data.impressions || '0'), 10);
              const clicks = parseInt(String(data.clicks || '0'), 10);
              const spend = parseFloat(String(data.spend || '0'));

              // Extract conversions from actions
              const actions = data.actions as Array<{ action_type: string; value: string }> | undefined;
              const conversions = actions
                ?.filter((a) => ['offsite_conversion', 'onsite_conversion', 'purchase', 'lead'].some(t => a.action_type.includes(t)))
                .reduce((sum, a) => sum + parseInt(a.value, 10), 0) || 0;

              return {
                ...variant,
                metrics: {
                  impressions,
                  clicks,
                  conversions,
                  spend,
                  ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
                  cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
                },
              };
            }
          } catch (err) {
            logger.error(`Error fetching metrics for variant ${variant.id}`, { route: 'ab-tests-[id]-GET' }, err);
          }

          return variant;
        }));

        // Update variants in DB with fresh metrics
        await admin
          .from('ab_tests')
          .update({ variants: updatedVariants })
          .eq('id', id);

        test.variants = updatedVariants;
      } catch (metaError) {
        logger.error('Error fetching Meta metrics for test', { route: 'ab-tests-[id]-GET' }, metaError);
        // Return test with last known metrics
      }
    }

    return NextResponse.json({ test });
  } catch (error) {
    return handleApiError(error, { route: 'ab-tests-[id]-GET' });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ab-test-patch:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['paused', 'running'].includes(status)) {
      return NextResponse.json(
        { error: 'status debe ser "paused" o "running"' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: patchTestRow, error: fetchError } = await admin
      .from('ab_tests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !patchTestRow) {
      return NextResponse.json({ error: 'Test no encontrado' }, { status: 404 });
    }

    const patchTest = patchTestRow as unknown as ABTestWithCampaign;
    const patchVariants = (patchTest.variants || []) as ABTestVariant[];

    // Validate state transition
    if (status === 'running' && patchTest.status !== 'paused') {
      return NextResponse.json(
        { error: 'Solo se pueden reanudar tests pausados' },
        { status: 400 }
      );
    }

    if (status === 'paused' && patchTest.status !== 'running') {
      return NextResponse.json(
        { error: 'Solo se pueden pausar tests en ejecución' },
        { status: 400 }
      );
    }

    // If the test has meta ad sets, pause/resume them in Meta
    try {
      const metaClient = await getMetaClientForUser(user.id);
      const metaStatus = status === 'paused' ? 'PAUSED' : 'ACTIVE';

      for (const variant of patchVariants) {
        if (variant.meta_adset_id) {
          await metaClient.updateAdSetStatus(variant.meta_adset_id, metaStatus);
        }
      }
    } catch (metaError) {
      logger.error('Error updating Meta status', { route: 'ab-tests-[id]-PATCH' }, metaError);
      // Continue with local update even if Meta fails
    }

    // Update status
    const { data: updated, error: updateError } = await admin
      .from('ab_tests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar el test' }, { status: 500 });
    }

    return NextResponse.json({ test: updated });
  } catch (error) {
    return handleApiError(error, { route: 'ab-tests-[id]-PATCH' });
  }
}
