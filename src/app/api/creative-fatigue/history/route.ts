import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`fatigue-history:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const admin = createAdminClient();

    // Get all creative_rotations for the current user, with related ad names
    const { data: rotations, error: rotationsError } = await admin
      .from('creative_rotations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (rotationsError) {
      logger.error('[Fatigue History] Error', { route: 'creative-fatigue-history' }, rotationsError);
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
    }

    if (!rotations?.length) {
      return NextResponse.json({ rotations: [] });
    }

    // Collect all ad IDs and campaign IDs to resolve names
    const adIds = new Set<string>();
    const campaignIds = new Set<string>();

    for (const r of rotations) {
      if (r.ad_id) adIds.add(r.ad_id);
      if (r.replacement_ad_id) adIds.add(r.replacement_ad_id);
      if (r.campaign_id) campaignIds.add(r.campaign_id);
    }

    // Fetch ad names
    const adNames = new Map<string, string>();
    if (adIds.size > 0) {
      const { data: ads } = await admin
        .from('campaign_ads')
        .select('id, name')
        .in('id', Array.from(adIds));

      if (ads) {
        for (const ad of ads) {
          adNames.set(ad.id, ad.name || 'Sin nombre');
        }
      }
    }

    // Fetch campaign names
    const campaignNames = new Map<string, string>();
    if (campaignIds.size > 0) {
      const { data: campaigns } = await admin
        .from('campaigns')
        .select('id, name')
        .in('id', Array.from(campaignIds));

      if (campaigns) {
        for (const c of campaigns) {
          campaignNames.set(c.id, c.name || 'Sin nombre');
        }
      }
    }

    // Enrich rotations with names
    const enrichedRotations = rotations.map(r => ({
      ...r,
      ad_name: r.ad_id ? (adNames.get(r.ad_id) || 'Sin nombre') : 'Desconocido',
      replacement_ad_name: r.replacement_ad_id ? (adNames.get(r.replacement_ad_id) || 'Sin nombre') : null,
      campaign_name: r.campaign_id ? (campaignNames.get(r.campaign_id) || 'Sin nombre') : 'Sin campaña',
    }));

    return NextResponse.json({ rotations: enrichedRotations }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'creative-fatigue-history' });
  }
}
