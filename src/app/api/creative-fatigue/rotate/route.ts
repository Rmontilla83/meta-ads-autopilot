import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMetaClientForUser } from '@/lib/meta/client';
import { getGeminiFlash, generateStructuredJSON } from '@/lib/gemini/client';
import { CREATIVE_ROTATION_ADVISOR, buildCreativeRotationPrompt } from '@/lib/gemini/prompts';
import { creativeRotationSchema } from '@/lib/gemini/validators';
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`creative-rotate:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

    const body = await request.json();
    const { ad_id, campaign_id, replacement_index } = body;

    if (!ad_id || !campaign_id) {
      return NextResponse.json(
        { error: 'ad_id y campaign_id son requeridos' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get the ad details
    const { data: ad, error: adError } = await admin
      .from('campaign_ads')
      .select('id, campaign_id, name, meta_ad_id, meta_creative_id, creative_data, ad_set_id')
      .eq('id', ad_id)
      .single();

    if (adError || !ad) {
      return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
    }

    // Verify the campaign belongs to this user
    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .select('id, name, user_id, meta_campaign_id, campaign_data, objective')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Get business profile for AI context
    const { data: businessProfile } = await admin
      .from('business_profiles')
      .select('business_name, industry')
      .eq('user_id', user.id)
      .single();

    if (!businessProfile) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 404 });
    }

    // Get the fatigue record for this ad
    const { data: fatigueRecord } = await admin
      .from('creative_rotations')
      .select('*')
      .eq('ad_id', ad_id)
      .in('status', ['warning', 'fatigued'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Extract current ad creative data
    const creativeData = (ad.creative_data || {}) as Record<string, string>;
    const currentAd = {
      primary_text: creativeData.primary_text || creativeData.text || '',
      headline: creativeData.headline || creativeData.title || '',
      description: creativeData.description || '',
      format: creativeData.format || 'single_image',
    };

    const performanceData = {
      ctr: fatigueRecord?.ctr_at_detection || 0,
      frequency: fatigueRecord?.frequency_at_detection || 0,
      ctrDrop: fatigueRecord?.ctr_drop_percentage || 0,
    };

    // Generate replacement creatives with Gemini
    const model = getGeminiFlash();
    const prompt = buildCreativeRotationPrompt({
      currentAd,
      performanceData,
      businessName: businessProfile.business_name,
      industry: businessProfile.industry,
    });

    const aiResult = await generateStructuredJSON(
      model,
      CREATIVE_ROTATION_ADVISOR,
      prompt,
      creativeRotationSchema
    );

    // Select which replacement to use
    const selectedIndex = typeof replacement_index === 'number'
      ? Math.min(replacement_index, aiResult.replacements.length - 1)
      : 0;
    const replacement = aiResult.replacements[selectedIndex];

    // Get Meta connection details for creating the new ad
    const { data: metaConnection } = await admin
      .from('meta_connections')
      .select('ad_account_id, page_id, pixel_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!metaConnection?.ad_account_id || !metaConnection?.page_id) {
      return NextResponse.json(
        { error: 'No hay conexión activa con Meta. Reconecta tu cuenta.' },
        { status: 400 }
      );
    }

    let newMetaAdId: string | null = null;
    let newMetaCreativeId: string | null = null;

    // Pause the fatigued ad and create replacement on Meta
    if (ad.meta_ad_id) {
      try {
        const metaClient = await getMetaClientForUser(user.id);

        // Step 1: Pause the fatigued ad
        await metaClient.updateAdStatus(ad.meta_ad_id, 'PAUSED');

        // Step 2: Create new ad creative
        const defaultLink = (creativeData.destination_url as string) || `https://facebook.com/${metaConnection.page_id}`;
        const callToAction = creativeData.call_to_action || 'LEARN_MORE';

        const objectStorySpec: Record<string, unknown> = {
          page_id: metaConnection.page_id,
          link_data: {
            message: replacement.primary_text.substring(0, 2200),
            name: replacement.headline.substring(0, 255),
            description: replacement.description.substring(0, 255),
            link: defaultLink,
            call_to_action: {
              type: callToAction,
              value: { link: defaultLink },
            },
            // Carry over image from original ad if available
            ...(creativeData.image_url ? { picture: creativeData.image_url } : {}),
          },
        };

        const creative = await metaClient.createAdCreative(metaConnection.ad_account_id, {
          name: `Creative - ${replacement.name}`.substring(0, 400),
          object_story_spec: objectStorySpec,
        });
        newMetaCreativeId = creative.id;

        // Step 3: Create new ad in same ad set
        const adSetId = ad.ad_set_id;
        const { data: adSetRecord } = await admin
          .from('campaign_ad_sets')
          .select('meta_adset_id')
          .eq('id', adSetId)
          .single();

        if (adSetRecord?.meta_adset_id) {
          const newAd = await metaClient.createAd(
            adSetRecord.meta_adset_id,
            metaConnection.ad_account_id,
            {
              name: replacement.name.substring(0, 400),
              adset_id: adSetRecord.meta_adset_id,
              creative: { creative_id: creative.id },
              status: 'ACTIVE',
            }
          );
          newMetaAdId = newAd.id;
        }
      } catch (metaError) {
        logger.error('[Creative Rotation] Meta API error', { route: 'creative-fatigue-rotate' }, metaError);
        // Continue anyway to save the rotation record and generated creatives
      }
    }

    // Update old ad status in our DB
    await admin.from('campaign_ads')
      .update({ status: 'paused' })
      .eq('id', ad_id);

    // Create new ad record in our DB
    const newAdData = {
      campaign_id,
      ad_set_id: ad.ad_set_id,
      name: replacement.name,
      meta_ad_id: newMetaAdId,
      meta_creative_id: newMetaCreativeId,
      creative_data: {
        primary_text: replacement.primary_text,
        headline: replacement.headline,
        description: replacement.description,
        format: currentAd.format,
        call_to_action: creativeData.call_to_action || 'LEARN_MORE',
        destination_url: creativeData.destination_url || '',
        image_url: creativeData.image_url || '',
        image_prompt: replacement.image_prompt,
        angle_description: replacement.angle_description,
        rotated_from_ad_id: ad_id,
      },
      status: newMetaAdId ? 'active' : 'draft',
    };

    const { data: newAd } = await admin
      .from('campaign_ads')
      .insert(newAdData)
      .select('id')
      .single();

    // Update creative_rotations table
    if (fatigueRecord) {
      await admin.from('creative_rotations')
        .update({
          status: 'rotated',
          replacement_ad_id: newAd?.id || null,
          rotated_at: new Date().toISOString(),
        })
        .eq('id', fatigueRecord.id);
    } else {
      // Create rotation record if it didn't exist
      await admin.from('creative_rotations').insert({
        user_id: user.id,
        campaign_id,
        ad_id,
        meta_ad_id: ad.meta_ad_id,
        status: 'rotated',
        frequency_at_detection: performanceData.frequency,
        ctr_at_detection: performanceData.ctr,
        ctr_baseline: performanceData.ctr, // No baseline available
        ctr_drop_percentage: performanceData.ctrDrop,
        impressions_at_detection: 0,
        replacement_ad_id: newAd?.id || null,
        detected_at: new Date().toISOString(),
        rotated_at: new Date().toISOString(),
      });
    }

    // Send notification to user
    await createNotification({
      user_id: user.id,
      type: 'performance_alert',
      title: 'Creativo rotado por fatiga',
      message: `El anuncio "${ad.name}" fue reemplazado por "${replacement.name}" en la campaña "${campaign.name}" debido a fatiga creativa.`,
      metadata: {
        campaign_id,
        old_ad_id: ad_id,
        new_ad_id: newAd?.id,
        ctr_drop: performanceData.ctrDrop,
        frequency: performanceData.frequency,
      },
    });

    return NextResponse.json({
      success: true,
      replacement: {
        ...replacement,
        ad_id: newAd?.id,
        meta_ad_id: newMetaAdId,
      },
      all_replacements: aiResult.replacements,
      old_ad: {
        id: ad_id,
        name: ad.name,
        status: 'paused',
      },
    });
  } catch (error) {
    return handleApiError(error, { route: 'creative-fatigue-rotate' });
  }
}
