import { MetaAdsClient } from './client';
import { mapTargeting, mapObjective, mapPlacements, mapBidStrategy } from './targeting-mapper';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export type PublishStep =
  | 'validating'
  | 'creating_campaign'
  | 'creating_adsets'
  | 'uploading_creatives'
  | 'creating_ads'
  | 'activating'
  | 'done'
  | 'error';

export interface PublishProgress {
  step: PublishStep;
  message: string;
  completed: boolean;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  meta_campaign_id?: string;
  meta_adset_ids?: string[];
  meta_ad_ids?: string[];
  error?: string;
}

export class CampaignPublisher {
  private client: MetaAdsClient;
  private data: GeneratedCampaign;
  private adAccountId: string;
  private pageId: string;
  private onProgress: (progress: PublishProgress) => void;
  private createdIds: { campaigns: string[]; adsets: string[]; ads: string[]; creatives: string[] } = {
    campaigns: [],
    adsets: [],
    ads: [],
    creatives: [],
  };

  constructor(
    client: MetaAdsClient,
    data: GeneratedCampaign,
    adAccountId: string,
    pageId: string,
    onProgress: (progress: PublishProgress) => void
  ) {
    this.client = client;
    this.data = data;
    this.adAccountId = adAccountId;
    this.pageId = pageId;
    this.onProgress = onProgress;
  }

  async publish(): Promise<PublishResult> {
    try {
      // Step 1: Validate
      this.onProgress({ step: 'validating', message: 'Validando campaña...', completed: false });
      this.validate();
      this.onProgress({ step: 'validating', message: 'Validación completada', completed: true });

      // Step 2: Create campaign (PAUSED)
      this.onProgress({ step: 'creating_campaign', message: 'Creando campaña...', completed: false });
      const campaign = await this.client.createCampaign(this.adAccountId, {
        name: this.data.campaign.name,
        objective: mapObjective(this.data.campaign.objective),
        status: 'PAUSED',
        special_ad_categories: this.data.campaign.special_ad_categories,
      });
      this.createdIds.campaigns.push(campaign.id);
      this.onProgress({ step: 'creating_campaign', message: 'Campaña creada', completed: true });

      // Step 3: Create ad sets
      this.onProgress({ step: 'creating_adsets', message: 'Configurando audiencias...', completed: false });
      const adsetIds: string[] = [];
      for (const adSet of this.data.ad_sets) {
        const targeting = mapTargeting(adSet.targeting);
        const placements = mapPlacements(adSet.placements);
        const dailyBudget = Math.round(
          (this.data.campaign.daily_budget * adSet.budget_percentage) / 100 * 100
        ); // cents

        const adsetData: Record<string, unknown> = {
          name: adSet.name,
          campaign_id: campaign.id,
          targeting: { ...targeting, ...(placements || {}) },
          optimization_goal: adSet.optimization_goal,
          billing_event: 'IMPRESSIONS',
          bid_strategy: mapBidStrategy(adSet.bid_strategy),
          daily_budget: dailyBudget,
          status: 'PAUSED',
        };

        const adset = await this.client.createAdSet(
          campaign.id,
          this.adAccountId,
          adsetData as Parameters<MetaAdsClient['createAdSet']>[2]
        );
        this.createdIds.adsets.push(adset.id);
        adsetIds.push(adset.id);
      }
      this.onProgress({ step: 'creating_adsets', message: `${adsetIds.length} audiencias configuradas`, completed: true });

      // Step 4: Create creatives and ads
      this.onProgress({ step: 'uploading_creatives', message: 'Subiendo creativos...', completed: false });
      this.onProgress({ step: 'uploading_creatives', message: 'Creativos preparados', completed: true });

      this.onProgress({ step: 'creating_ads', message: 'Publicando anuncios...', completed: false });
      const adIds: string[] = [];
      for (const ad of this.data.ads) {
        // Create creative for each ad
        const objectStorySpec: Record<string, unknown> = {
          page_id: this.pageId,
          link_data: {
            message: ad.primary_text,
            name: ad.headline,
            description: ad.description,
            call_to_action: {
              type: ad.call_to_action,
              value: ad.destination_url ? { link: ad.destination_url } : undefined,
            },
            link: ad.destination_url || `https://facebook.com/${this.pageId}`,
          },
        };

        const creative = await this.client.createAdCreative(this.adAccountId, {
          name: `Creative - ${ad.name}`,
          object_story_spec: objectStorySpec,
        });
        this.createdIds.creatives.push(creative.id);

        // Create ad in first ad set (distribute across sets if multiple ads)
        const targetAdSetId = adsetIds[adIds.length % adsetIds.length];
        const createdAd = await this.client.createAd(targetAdSetId, this.adAccountId, {
          name: ad.name,
          adset_id: targetAdSetId,
          creative: { creative_id: creative.id },
          status: 'PAUSED',
        });
        this.createdIds.ads.push(createdAd.id);
        adIds.push(createdAd.id);
      }
      this.onProgress({ step: 'creating_ads', message: `${adIds.length} anuncios creados`, completed: true });

      // Step 5: Activate campaign
      this.onProgress({ step: 'activating', message: 'Activando campaña...', completed: false });
      await this.client.updateCampaignStatus(campaign.id, 'ACTIVE');
      this.onProgress({ step: 'activating', message: 'Campaña activada', completed: true });

      this.onProgress({ step: 'done', message: '¡Campaña publicada exitosamente!', completed: true });

      return {
        success: true,
        meta_campaign_id: campaign.id,
        meta_adset_ids: adsetIds,
        meta_ad_ids: adIds,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.onProgress({ step: 'error', message, completed: false, error: message });

      // Attempt rollback
      await this.rollback();

      return { success: false, error: message };
    }
  }

  private validate() {
    if (!this.data.campaign.name) throw new Error('El nombre de la campaña es requerido');
    if (!this.data.campaign.objective) throw new Error('El objetivo es requerido');
    if (this.data.ad_sets.length === 0) throw new Error('Se requiere al menos un ad set');
    if (this.data.ads.length === 0) throw new Error('Se requiere al menos un anuncio');
    if (!this.adAccountId) throw new Error('No se encontró cuenta publicitaria');
    if (!this.pageId) throw new Error('No se encontró página de Facebook');

    for (const adSet of this.data.ad_sets) {
      if (!adSet.targeting.geo_locations.countries?.length &&
          !adSet.targeting.geo_locations.cities?.length) {
        throw new Error(`El ad set "${adSet.name}" necesita al menos una ubicación geográfica`);
      }
    }
  }

  private async rollback() {
    // Delete in reverse order: ads → creatives → adsets → campaigns
    for (const id of this.createdIds.ads) {
      try { await this.client.deleteObject(id); } catch { /* ignore */ }
    }
    for (const id of this.createdIds.creatives) {
      try { await this.client.deleteObject(id); } catch { /* ignore */ }
    }
    for (const id of this.createdIds.adsets) {
      try { await this.client.deleteObject(id); } catch { /* ignore */ }
    }
    for (const id of this.createdIds.campaigns) {
      try { await this.client.deleteObject(id); } catch { /* ignore */ }
    }
  }
}
