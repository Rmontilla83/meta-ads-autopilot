import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetaAdsClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/encryption';
import { calculateMultiVariantSignificance } from '@/lib/ab-testing/statistics';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-errors';
import { requireCronAuth } from '@/lib/auth-utils';
import type { ABTest, ABTestVariant } from '@/types';

export async function GET(request: NextRequest) {
  try {
    requireCronAuth(request);

    const supabase = createAdminClient();
    // Get all running A/B tests
    const { data: runningTests, error: testsError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('status', 'running');

    if (testsError || !runningTests?.length) {
      return NextResponse.json({ message: 'No running tests', evaluated: 0 });
    }

    let evaluated = 0;
    let winnersFound = 0;

    for (const testRow of runningTests) {
      try {
        const test = testRow as unknown as ABTest;

        // Get user's Meta connection
        const { data: connection } = await supabase
          .from('meta_connections')
          .select('access_token_encrypted, is_active')
          .eq('user_id', test.user_id)
          .eq('is_active', true)
          .single();

        if (!connection) continue;

        const accessToken = decrypt(connection.access_token_encrypted);
        const metaClient = new MetaAdsClient(accessToken);

        const today = new Date();
        const startDate = test.started_at
          ? new Date(test.started_at).toISOString().split('T')[0]
          : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateRange = {
          since: startDate,
          until: today.toISOString().split('T')[0],
        };

        // Fetch metrics for each variant
        const variants = (test.variants || []) as ABTestVariant[];
        const updatedVariants: ABTestVariant[] = [];

        for (const variant of variants) {
          if (!variant.meta_adset_id) {
            updatedVariants.push(variant);
            continue;
          }

          try {
            const insights = await metaClient.getAdSetInsights(variant.meta_adset_id, dateRange);
            const data = insights.data?.[0];

            if (data) {
              const impressions = parseInt(String(data.impressions || '0'), 10);
              const clicks = parseInt(String(data.clicks || '0'), 10);
              const spend = parseFloat(String(data.spend || '0'));

              const actions = data.actions as Array<{ action_type: string; value: string }> | undefined;
              const conversions = actions
                ?.filter((a) => ['offsite_conversion', 'onsite_conversion', 'purchase', 'lead'].some(t => a.action_type.includes(t)))
                .reduce((sum, a) => sum + parseInt(a.value, 10), 0) || 0;

              updatedVariants.push({
                ...variant,
                metrics: {
                  impressions,
                  clicks,
                  conversions,
                  spend,
                  ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
                  cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
                },
              });
            } else {
              updatedVariants.push(variant);
            }
          } catch (err) {
            logger.error(`Error fetching metrics for variant ${variant.id}`, { route: '/api/cron/ab-test-evaluator' }, err);
            updatedVariants.push(variant);
          }
        }

        // Calculate significance
        const variantMetrics = updatedVariants.map((v) => ({
          conversions: v.metrics?.conversions || 0,
          impressions: v.metrics?.impressions || 0,
          spend: v.metrics?.spend || 0,
          clicks: v.metrics?.clicks || 0,
        }));

        const significance = calculateMultiVariantSignificance(
          variantMetrics,
          test.success_metric || 'ctr'
        );

        // Check if minimum conversions met
        const minConversions = test.min_conversions_per_variant || 30;
        const allMeetMinimum = updatedVariants.every(
          (v) => (v.metrics?.conversions || 0) >= minConversions
        );

        // Check test duration
        const startedAt = test.started_at ? new Date(test.started_at) : new Date();
        const daysRunning = Math.floor((today.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
        const maxDuration = test.test_duration_days || 14;
        const exceedsDuration = daysRunning >= maxDuration;

        // Decision: auto-declare winner if significant AND meets minimum conversions
        if (test.auto_winner_enabled && significance.significant && significance.confidenceLevel >= 95 && allMeetMinimum) {
          const winnerVariant = updatedVariants[significance.winnerIndex];

          // Pause non-winners in Meta
          for (let i = 0; i < updatedVariants.length; i++) {
            const variantAdSetId = updatedVariants[i].meta_adset_id;
            if (i !== significance.winnerIndex && variantAdSetId) {
              try {
                await metaClient.updateAdSetStatus(variantAdSetId, 'PAUSED');
              } catch { /* ignore */ }
            }
          }

          // Update test as completed
          await supabase
            .from('ab_tests')
            .update({
              status: 'completed',
              winner_variant_id: winnerVariant.id,
              completed_at: new Date().toISOString(),
              variants: updatedVariants,
            })
            .eq('id', test.id);

          // Notify user
          await createNotification({
            user_id: test.user_id,
            type: 'performance_alert',
            title: 'Ganador de A/B Test encontrado',
            message: `La variante "${winnerVariant.name}" del test "${test.name}" ha ganado con ${significance.confidenceLevel.toFixed(1)}% de confianza. Las demás variantes han sido pausadas automáticamente.`,
            metadata: {
              test_id: test.id,
              winner_variant_id: winnerVariant.id,
              confidence: significance.confidenceLevel,
              days_running: daysRunning,
            },
          });

          winnersFound++;
        } else if (exceedsDuration && !significance.significant) {
          // Test exceeded duration without significance
          await supabase
            .from('ab_tests')
            .update({ variants: updatedVariants })
            .eq('id', test.id);

          await createNotification({
            user_id: test.user_id,
            type: 'system',
            title: 'A/B Test sin resultado concluyente',
            message: `El test "${test.name}" lleva ${daysRunning} días sin alcanzar significancia estadística (${significance.confidenceLevel.toFixed(1)}%). Considera extender la duración, aumentar el presupuesto, o cambiar la métrica de éxito.`,
            metadata: {
              test_id: test.id,
              confidence: significance.confidenceLevel,
              days_running: daysRunning,
            },
          });
        } else {
          // Just update metrics
          await supabase
            .from('ab_tests')
            .update({ variants: updatedVariants })
            .eq('id', test.id);
        }

        evaluated++;
      } catch (testError) {
        logger.error(`Error evaluating test ${testRow.id}`, { route: '/api/cron/ab-test-evaluator' }, testError);
      }
    }

    logger.info('AB test evaluator complete', {
      route: '/api/cron/ab-test-evaluator',
      evaluated,
      winnersFound,
      totalRunning: runningTests.length,
    });

    return NextResponse.json({
      message: 'AB test evaluation complete',
      evaluated,
      winnersFound,
      totalRunning: runningTests.length,
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/cron/ab-test-evaluator' });
  }
}
