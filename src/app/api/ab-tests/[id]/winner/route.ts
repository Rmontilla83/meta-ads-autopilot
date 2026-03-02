import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import type { ABTest, ABTestVariant } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`ab-test-winner:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    const body = await request.json();
    const { winner_variant_id } = body;

    if (!winner_variant_id) {
      return NextResponse.json(
        { error: 'winner_variant_id es requerido' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get test
    const { data: testRow, error: testError } = await admin
      .from('ab_tests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (testError || !testRow) {
      return NextResponse.json({ error: 'Test no encontrado' }, { status: 404 });
    }

    const test = testRow as unknown as ABTest;

    if (test.status !== 'running' && test.status !== 'paused') {
      return NextResponse.json(
        { error: 'Solo se puede declarar ganador en tests en ejecución o pausados' },
        { status: 400 }
      );
    }

    // Verify that the winner variant exists
    const variants = (test.variants || []) as ABTestVariant[];
    const winnerVariant = variants.find((v) => v.id === winner_variant_id);
    if (!winnerVariant) {
      return NextResponse.json(
        { error: 'Variante ganadora no encontrada en este test' },
        { status: 400 }
      );
    }

    // Pause all non-winner variants in Meta
    try {
      const metaClient = await getMetaClientForUser(user.id);

      for (const variant of variants) {
        if (variant.id !== winner_variant_id && variant.meta_adset_id) {
          try {
            await metaClient.updateAdSetStatus(variant.meta_adset_id, 'PAUSED');
          } catch (err) {
            logger.error(`Error pausing variant ${variant.id}`, { route: 'ab-tests-[id]-winner' }, err);
          }
        }
      }
    } catch (metaError) {
      logger.error('Error connecting to Meta for winner declaration', { route: 'ab-tests-[id]-winner' }, metaError);
      // Continue with local update
    }

    // Update test status
    const { data: updated, error: updateError } = await admin
      .from('ab_tests')
      .update({
        status: 'completed',
        winner_variant_id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Error al declarar ganador' }, { status: 500 });
    }

    // Notify user
    await createNotification({
      user_id: user.id,
      type: 'performance_alert',
      title: 'Ganador de A/B Test declarado',
      message: `La variante "${winnerVariant.name}" ha sido declarada ganadora del test "${test.name}". Las demás variantes han sido pausadas.`,
      metadata: {
        test_id: id,
        winner_variant_id,
        winner_name: winnerVariant.name,
      },
    });

    return NextResponse.json({ test: updated });
  } catch (error) {
    return handleApiError(error, { route: 'ab-tests-[id]-winner' });
  }
}
