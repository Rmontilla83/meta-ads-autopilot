import { MetaAdsClient } from '@/lib/meta/client';
import { mapTargeting, mapObjective, mapPlacements, mapBidStrategy, mapOptimizationGoal } from '@/lib/meta/targeting-mapper';
import { logger } from '@/lib/logger';
import type { FunnelDesignOutput } from '@/lib/gemini/validators';

const META_MIN_DAILY_BUDGET_CENTS = 100;

export type FunnelPublishStep =
  | 'validating'
  | 'creating_tofu'
  | 'creating_tofu_audience'
  | 'creating_mofu'
  | 'creating_mofu_audience'
  | 'creating_bofu'
  | 'activating'
  | 'done'
  | 'error';

export interface FunnelPublishProgress {
  step: FunnelPublishStep;
  message: string;
  completed: boolean;
  error?: string;
}

export interface FunnelPublishResult {
  success: boolean;
  tofuCampaignId?: string;
  mofuCampaignId?: string;
  bofuCampaignId?: string;
  customAudienceIds?: string[];
  error?: string;
}

export class FunnelPublisher {
  private client: MetaAdsClient;
  private adAccountId: string;
  private pageId: string;
  private pixelId: string | null;
  private onProgress: (progress: FunnelPublishProgress) => void;

  private createdIds: {
    campaigns: string[];
    adsets: string[];
    ads: string[];
    creatives: string[];
    audiences: string[];
  } = {
    campaigns: [],
    adsets: [],
    ads: [],
    creatives: [],
    audiences: [],
  };

  constructor(
    client: MetaAdsClient,
    adAccountId: string,
    pageId: string,
    onProgress: (progress: FunnelPublishProgress) => void,
    pixelId?: string | null,
  ) {
    this.client = client;
    this.adAccountId = adAccountId;
    this.pageId = pageId;
    this.pixelId = pixelId || null;
    this.onProgress = onProgress;
  }

  async publishFunnel(
    funnelConfig: FunnelDesignOutput,
    dailyBudget: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<FunnelPublishResult> {
    try {
      // Step 1: Validate
      this.onProgress({ step: 'validating', message: 'Validando configuración del funnel...', completed: false });
      this.validateFunnel(funnelConfig, dailyBudget);
      this.onProgress({ step: 'validating', message: 'Validación completada', completed: true });

      // Step 2: Create TOFU campaign
      this.onProgress({ step: 'creating_tofu', message: 'Creando campaña TOFU (Conocimiento)...', completed: false });
      const tofuResult = await this.publishStage(
        funnelConfig.stages.tofu,
        dailyBudget,
        'TOFU',
      );
      this.onProgress({ step: 'creating_tofu', message: 'Campaña TOFU creada', completed: true });

      // Step 3: Create Custom Audience from TOFU (website visitors)
      this.onProgress({ step: 'creating_tofu_audience', message: 'Creando audiencia de retargeting TOFU...', completed: false });
      let tofuAudienceId: string | null = null;
      try {
        if (this.pixelId) {
          const tofuAudience = await this.client.createCustomAudience(this.adAccountId, {
            name: `Funnel - Visitantes TOFU - ${funnelConfig.funnel_name}`,
            subtype: 'WEBSITE',
            description: 'Audiencia de retargeting: visitantes del sitio web desde campaña TOFU',
            pixel_id: this.pixelId,
            retention_days: 30,
            prefill: true,
            rule: {
              inclusions: {
                operator: 'or',
                rules: [
                  {
                    event_sources: [{ id: this.pixelId, type: 'pixel' }],
                    retention_seconds: 2592000, // 30 days
                    filter: { operator: 'and', filters: [{ field: 'url', operator: 'i_contains', value: '/' }] },
                  },
                ],
              },
            },
          });
          tofuAudienceId = tofuAudience.id;
          this.createdIds.audiences.push(tofuAudience.id);
        }
      } catch (err) {
        logger.warn('Could not create TOFU retargeting audience', { route: 'funnel-publisher', error: String(err) });
      }
      this.onProgress({
        step: 'creating_tofu_audience',
        message: tofuAudienceId ? 'Audiencia TOFU creada' : 'Audiencia TOFU omitida (sin pixel)',
        completed: true,
      });

      // Step 4: Create MOFU campaign
      this.onProgress({ step: 'creating_mofu', message: 'Creando campaña MOFU (Consideración)...', completed: false });
      const mofuTargeting = { ...funnelConfig.stages.mofu.targeting };
      if (tofuAudienceId) {
        mofuTargeting.custom_audiences = [tofuAudienceId];
      }
      const mofuStage = { ...funnelConfig.stages.mofu, targeting: mofuTargeting };
      const mofuResult = await this.publishStage(mofuStage, dailyBudget, 'MOFU');
      this.onProgress({ step: 'creating_mofu', message: 'Campaña MOFU creada', completed: true });

      // Step 5: Create Custom Audience from MOFU engagement
      this.onProgress({ step: 'creating_mofu_audience', message: 'Creando audiencia de retargeting MOFU...', completed: false });
      let mofuAudienceId: string | null = null;
      try {
        if (this.pixelId) {
          const mofuAudience = await this.client.createCustomAudience(this.adAccountId, {
            name: `Funnel - Engaged MOFU - ${funnelConfig.funnel_name}`,
            subtype: 'WEBSITE',
            description: 'Audiencia de retargeting: usuarios engaged desde campaña MOFU',
            pixel_id: this.pixelId,
            retention_days: 14,
            prefill: true,
            rule: {
              inclusions: {
                operator: 'or',
                rules: [
                  {
                    event_sources: [{ id: this.pixelId, type: 'pixel' }],
                    retention_seconds: 1209600, // 14 days
                    filter: {
                      operator: 'and',
                      filters: [
                        { field: 'url', operator: 'i_contains', value: '/' },
                      ],
                    },
                  },
                ],
              },
            },
          });
          mofuAudienceId = mofuAudience.id;
          this.createdIds.audiences.push(mofuAudience.id);
        }
      } catch (err) {
        logger.warn('Could not create MOFU retargeting audience', { route: 'funnel-publisher', error: String(err) });
      }
      this.onProgress({
        step: 'creating_mofu_audience',
        message: mofuAudienceId ? 'Audiencia MOFU creada' : 'Audiencia MOFU omitida (sin pixel)',
        completed: true,
      });

      // Step 6: Create BOFU campaign
      this.onProgress({ step: 'creating_bofu', message: 'Creando campaña BOFU (Conversión)...', completed: false });
      const bofuTargeting = { ...funnelConfig.stages.bofu.targeting };
      if (mofuAudienceId) {
        bofuTargeting.custom_audiences = [mofuAudienceId];
      }
      const bofuStage = { ...funnelConfig.stages.bofu, targeting: bofuTargeting };
      const bofuResult = await this.publishStage(bofuStage, dailyBudget, 'BOFU');
      this.onProgress({ step: 'creating_bofu', message: 'Campaña BOFU creada', completed: true });

      // Step 7: Activate all campaigns
      this.onProgress({ step: 'activating', message: 'Activando campañas del funnel...', completed: false });
      await this.client.updateCampaignStatus(tofuResult.campaignId, 'ACTIVE');
      await this.client.updateCampaignStatus(mofuResult.campaignId, 'ACTIVE');
      await this.client.updateCampaignStatus(bofuResult.campaignId, 'ACTIVE');
      this.onProgress({ step: 'activating', message: 'Campañas activadas', completed: true });

      this.onProgress({ step: 'done', message: 'Funnel publicado exitosamente', completed: true });

      return {
        success: true,
        tofuCampaignId: tofuResult.campaignId,
        mofuCampaignId: mofuResult.campaignId,
        bofuCampaignId: bofuResult.campaignId,
        customAudienceIds: this.createdIds.audiences,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al publicar el funnel';
      this.onProgress({ step: 'error', message, completed: false, error: message });

      // Rollback all created objects
      await this.rollback();

      return { success: false, error: message };
    }
  }

  private async publishStage(
    stage: FunnelDesignOutput['stages']['tofu'],
    totalDailyBudget: number,
    stageLabel: string,
  ): Promise<{ campaignId: string; adSetId: string; adIds: string[] }> {
    const objective = mapObjective(stage.objective);

    // Create campaign (PAUSED initially)
    const campaign = await this.client.createCampaign(this.adAccountId, {
      name: (stage.campaign_name || `${stageLabel} Campaign`).substring(0, 400),
      objective,
      status: 'PAUSED',
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: false,
    });
    this.createdIds.campaigns.push(campaign.id);

    // Calculate budget in cents
    let dailyBudgetCents = Math.round(totalDailyBudget * (stage.budget_percentage / 100) * 100);
    if (dailyBudgetCents < META_MIN_DAILY_BUDGET_CENTS) {
      dailyBudgetCents = META_MIN_DAILY_BUDGET_CENTS;
    }

    // Map targeting
    const targeting = mapTargeting(stage.targeting);
    const placements = mapPlacements(stage.placements || []);

    const targetingPayload: Record<string, unknown> = {
      ...targeting,
      ...(placements || {}),
      targeting_automation: { advantage_audience: 0 },
    };

    // Promoted object
    const promotedObject = this.getPromotedObject(objective);

    // Create ad set
    const adset = await this.client.createAdSet(
      campaign.id,
      this.adAccountId,
      {
        name: `${stageLabel} - Audiencia Principal`,
        campaign_id: campaign.id,
        targeting: targetingPayload,
        optimization_goal: mapOptimizationGoal(stage.objective, stage.optimization_goal),
        billing_event: 'IMPRESSIONS',
        bid_strategy: mapBidStrategy('LOWEST_COST_WITHOUT_CAP'),
        daily_budget: dailyBudgetCents,
        status: 'ACTIVE',
        ...(promotedObject ? { promoted_object: promotedObject } : {}),
      },
    );
    this.createdIds.adsets.push(adset.id);

    // Create ads
    const adIds: string[] = [];
    for (const ad of stage.ads) {
      const defaultLink = `https://facebook.com/${this.pageId}`;
      const objectStorySpec = {
        page_id: this.pageId,
        link_data: {
          message: (ad.primary_text || '').substring(0, 2200),
          name: (ad.headline || '').substring(0, 255),
          description: (ad.description || '').substring(0, 255),
          link: defaultLink,
          call_to_action: {
            type: ad.call_to_action || 'LEARN_MORE',
            value: { link: defaultLink },
          },
        },
      };

      const creative = await this.client.createAdCreative(this.adAccountId, {
        name: `Creative - ${stageLabel} - ${ad.name}`.substring(0, 400),
        object_story_spec: objectStorySpec,
      });
      this.createdIds.creatives.push(creative.id);

      const adPayload: Parameters<MetaAdsClient['createAd']>[2] = {
        name: `${ad.name}`.substring(0, 400),
        adset_id: adset.id,
        creative: { creative_id: creative.id },
        status: 'ACTIVE',
      };

      if (this.pixelId && objective === 'OUTCOME_SALES') {
        adPayload.tracking_specs = [
          { 'action.type': ['offsite_conversion'], fb_pixel: [this.pixelId] },
        ];
      }

      const createdAd = await this.client.createAd(adset.id, this.adAccountId, adPayload);
      this.createdIds.ads.push(createdAd.id);
      adIds.push(createdAd.id);
    }

    return { campaignId: campaign.id, adSetId: adset.id, adIds };
  }

  private getPromotedObject(objective: string): Record<string, unknown> | null {
    switch (objective) {
      case 'OUTCOME_SALES':
        if (this.pixelId) {
          return { pixel_id: this.pixelId, custom_event_type: 'PURCHASE' };
        }
        return { page_id: this.pageId };
      case 'OUTCOME_LEADS':
        return { page_id: this.pageId };
      default:
        return { page_id: this.pageId };
    }
  }

  private validateFunnel(config: FunnelDesignOutput, dailyBudget: number) {
    const errors: string[] = [];

    if (!this.adAccountId) errors.push('No se encontró cuenta publicitaria.');
    if (!this.pageId) errors.push('No se encontró página de Facebook.');
    if (dailyBudget < 3) errors.push('El presupuesto diario mínimo para un funnel es $3 USD ($1 por etapa).');

    const stages = ['tofu', 'mofu', 'bofu'] as const;
    for (const stageKey of stages) {
      const stage = config.stages[stageKey];
      if (!stage.campaign_name?.trim()) {
        errors.push(`${stageKey.toUpperCase()}: El nombre de la campaña es requerido.`);
      }
      if (!stage.ads.length) {
        errors.push(`${stageKey.toUpperCase()}: Se requiere al menos un anuncio.`);
      }
      const geo = stage.targeting.geo_locations;
      if (!geo.countries?.length && !geo.cities?.length && !geo.regions?.length) {
        errors.push(`${stageKey.toUpperCase()}: Se requiere al menos una ubicación geográfica.`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        errors.length === 1
          ? errors[0]
          : `Se encontraron ${errors.length} problemas:\n${errors.map(e => `- ${e}`).join('\n')}`
      );
    }
  }

  private async rollback() {
    const failedRollbacks: string[] = [];
    for (const [label, ids, deleteFn] of [
      ['ad', this.createdIds.ads, (id: string) => this.client.deleteObject(id)],
      ['creative', this.createdIds.creatives, (id: string) => this.client.deleteObject(id)],
      ['adset', this.createdIds.adsets, (id: string) => this.client.deleteObject(id)],
      ['campaign', this.createdIds.campaigns, (id: string) => this.client.deleteObject(id)],
      ['audience', this.createdIds.audiences, (id: string) => this.client.deleteCustomAudience(id)],
    ] as const) {
      for (const id of ids) {
        try {
          await (deleteFn as (id: string) => Promise<unknown>)(id);
        } catch (err) {
          failedRollbacks.push(`${label}:${id}`);
          logger.error(`Funnel rollback failed for ${label}`, { route: 'funnel-publisher', objectId: id }, err);
        }
      }
    }
    if (failedRollbacks.length > 0) {
      logger.error('Funnel partial rollback failure — manual cleanup may be needed', {
        route: 'funnel-publisher',
        failedObjects: failedRollbacks.join(', '),
      });
    }
  }
}
