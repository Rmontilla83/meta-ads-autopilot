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

    const { success, resetAt } = await rateLimit(`lookalike:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const limitCheck = await checkPlanLimit(user.id, 'retargeting');
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: 'Las audiencias lookalike están disponibles en el plan Growth o superior',
        upgrade: true,
        planRequired: limitCheck.planRequired,
      }, { status: 403 });
    }

    const { ad_account_id, source_audience_id, country, ratios } = await request.json();

    if (!ad_account_id || !source_audience_id || !country) {
      return NextResponse.json(
        { error: 'ad_account_id, source_audience_id y country son requeridos' },
        { status: 400 }
      );
    }

    const lookalikeRatios = ratios || [0.01, 0.03];

    const admin = createAdminClient();

    // Get source audience
    const { data: sourceAudience, error: sourceError } = await admin
      .from('custom_audiences')
      .select('*')
      .eq('id', source_audience_id)
      .eq('user_id', user.id)
      .single();

    if (sourceError || !sourceAudience) {
      return NextResponse.json({ error: 'Audiencia de origen no encontrada' }, { status: 404 });
    }

    if (!sourceAudience.meta_audience_id) {
      return NextResponse.json(
        { error: 'La audiencia de origen no tiene un ID de Meta válido' },
        { status: 400 }
      );
    }

    const metaClient = await getMetaClientForUser(user.id);
    const createdAudiences = [];

    for (const ratio of lookalikeRatios) {
      const percentage = Math.round(ratio * 100);
      const name = `Lookalike ${percentage}% - ${sourceAudience.name}`;

      try {
        // Create lookalike via Meta API
        const metaResult = await metaClient.createLookalikeAudience(ad_account_id, {
          name,
          origin_audience_id: sourceAudience.meta_audience_id,
          lookalike_spec: {
            type: 'similarity',
            ratio,
            country: country.toUpperCase(),
          },
          subtype: 'LOOKALIKE',
        });

        // Save to DB
        const { data: audience, error: insertError } = await admin
          .from('custom_audiences')
          .insert({
            user_id: user.id,
            meta_audience_id: metaResult.id,
            name,
            audience_type: 'lookalike',
            subtype: 'LOOKALIKE',
            source_audience_id: sourceAudience.id,
            lookalike_spec: {
              type: 'similarity',
              ratio,
              country: country.toUpperCase(),
            },
            approximate_count: 0,
            status: 'ready',
            metadata: {
              source_audience_name: sourceAudience.name,
              percentage,
            },
          })
          .select()
          .single();

        if (!insertError && audience) {
          createdAudiences.push(audience);
        }
      } catch (metaError) {
        logger.error(`Error creating lookalike ${percentage}%`, { route: 'audiences-lookalike' }, metaError);
        // Save as error
        const { data: audience } = await admin
          .from('custom_audiences')
          .insert({
            user_id: user.id,
            meta_audience_id: null,
            name,
            audience_type: 'lookalike',
            subtype: 'LOOKALIKE',
            source_audience_id: sourceAudience.id,
            lookalike_spec: {
              type: 'similarity',
              ratio,
              country: country.toUpperCase(),
            },
            approximate_count: 0,
            status: 'error',
            metadata: {
              error: metaError instanceof Error ? metaError.message : 'Error desconocido',
              source_audience_name: sourceAudience.name,
              percentage,
            },
          })
          .select()
          .single();

        if (audience) {
          createdAudiences.push(audience);
        }
      }
    }

    // Notify
    const successCount = createdAudiences.filter(a => a.status === 'ready').length;
    await createNotification({
      user_id: user.id,
      type: 'system',
      title: 'Audiencias lookalike creadas',
      message: `Se crearon ${successCount} de ${lookalikeRatios.length} audiencias lookalike basadas en "${sourceAudience.name}".`,
      metadata: { audience_ids: createdAudiences.map(a => a.id) },
    });

    return NextResponse.json({ audiences: createdAudiences }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: 'audiences-lookalike' });
  }
}
