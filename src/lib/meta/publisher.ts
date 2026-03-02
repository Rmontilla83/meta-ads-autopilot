import { MetaAdsClient } from './client';
import { mapTargeting, mapObjective, mapPlacements, mapBidStrategy, mapOptimizationGoal } from './targeting-mapper';
import type { GeneratedCampaign, GeneratedAd } from '@/lib/gemini/types';
import { logger } from '@/lib/logger';

// Meta API constants
const META_NAME_MAX_LENGTH = 400;
const META_MIN_DAILY_BUDGET_CENTS = 100; // $1.00 USD minimum per ad set
const META_PRIMARY_TEXT_MAX = 2200;
const META_HEADLINE_MAX = 255;

// Valid CTA types accepted by Meta Graph API
const VALID_CTA_TYPES = new Set([
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'DOWNLOAD',
  'GET_OFFER', 'GET_QUOTE', 'BOOK_TRAVEL', 'CONTACT_US', 'APPLY_NOW',
  'BUY_NOW', 'ORDER_NOW', 'SELL_NOW', 'SEND_MESSAGE', 'WATCH_MORE',
  'GET_DIRECTIONS', 'LISTEN_NOW', 'SEE_MENU', 'WHATSAPP_MESSAGE',
  'CALL_NOW', 'OPEN_LINK', 'NO_BUTTON', 'MESSAGE_PAGE',
  'LIKE_PAGE', 'PLAY_GAME', 'INSTALL_APP', 'USE_APP',
  'WATCH_VIDEO', 'REQUEST_TIME', 'SEE_MORE',
]);

// Special ad categories that restrict targeting
const RESTRICTED_CATEGORIES = new Set(['HOUSING', 'CREDIT', 'EMPLOYMENT', 'ISSUES_ELECTIONS_POLITICS']);

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
  private pixelId: string | null;
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
    onProgress: (progress: PublishProgress) => void,
    pixelId?: string | null
  ) {
    this.client = client;
    this.data = data;
    this.adAccountId = adAccountId;
    this.pageId = pageId;
    this.pixelId = pixelId || null;
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
      const campaignName = this.safeName(this.data.campaign.name);
      const campaignObjective = mapObjective(this.data.campaign.objective);

      const campaign = await this.client.createCampaign(this.adAccountId, {
        name: campaignName,
        objective: campaignObjective,
        status: 'PAUSED',
        special_ad_categories: this.data.campaign.special_ad_categories || [],
        is_adset_budget_sharing_enabled: false,
      });
      this.createdIds.campaigns.push(campaign.id);
      this.onProgress({ step: 'creating_campaign', message: 'Campaña creada', completed: true });

      // Step 3: Create ad sets
      this.onProgress({ step: 'creating_adsets', message: 'Configurando audiencias...', completed: false });
      const adsetIds: string[] = [];
      const promotedObject = this.getPromotedObject(campaignObjective);

      for (const adSet of this.data.ad_sets) {
        const targeting = mapTargeting(adSet.targeting);
        const placements = mapPlacements(adSet.placements || []);

        // Budget: calculate cents, enforce minimum $1.00/day
        let dailyBudget = Math.round(
          (this.data.campaign.daily_budget * (adSet.budget_percentage || 100)) / 100 * 100
        );
        if (dailyBudget < META_MIN_DAILY_BUDGET_CENTS) {
          dailyBudget = META_MIN_DAILY_BUDGET_CENTS;
        }

        // Build targeting object — merge placements if manual, otherwise let Meta auto-place
        const targetingPayload: Record<string, unknown> = {
          ...targeting,
          ...(placements || {}),
          targeting_automation: { advantage_audience: 0 },
        };

        const adsetData: Record<string, unknown> = {
          name: this.safeName(adSet.name),
          campaign_id: campaign.id,
          targeting: targetingPayload,
          optimization_goal: mapOptimizationGoal(this.data.campaign.objective, adSet.optimization_goal),
          billing_event: 'IMPRESSIONS',
          bid_strategy: mapBidStrategy(adSet.bid_strategy),
          daily_budget: dailyBudget,
          status: 'ACTIVE',
          ...(promotedObject ? { promoted_object: promotedObject } : {}),
        };

        // Schedule: add start/end dates if present and valid
        if (adSet.schedule?.start_date) {
          const start = new Date(adSet.schedule.start_date);
          if (!isNaN(start.getTime()) && start > new Date()) {
            adsetData.start_time = start.toISOString();
          }
        }
        if (adSet.schedule?.end_date) {
          const end = new Date(adSet.schedule.end_date);
          if (!isNaN(end.getTime())) {
            adsetData.end_time = end.toISOString();
          }
        }

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
        const objectStorySpec = this.buildCreativeSpec(ad);
        const creativeName = this.safeName(`Creative - ${ad.name}`);

        logger.info('Creating creative for ad', { route: 'publisher', adName: ad.name, format: ad.format });
        const creative = await this.client.createAdCreative(this.adAccountId, {
          name: creativeName,
          object_story_spec: objectStorySpec,
        });
        this.createdIds.creatives.push(creative.id);

        // Distribute ads across ad sets (round-robin)
        const targetAdSetId = adsetIds[adIds.length % adsetIds.length];
        const adPayload: Parameters<MetaAdsClient['createAd']>[2] = {
          name: this.safeName(ad.name),
          adset_id: targetAdSetId,
          creative: { creative_id: creative.id },
          status: 'ACTIVE',
        };

        // Conversion campaigns require tracking_specs with the pixel
        if (this.pixelId && campaignObjective === 'OUTCOME_SALES') {
          adPayload.tracking_specs = [
            { 'action.type': ['offsite_conversion'], fb_pixel: [this.pixelId] },
          ];
        }

        const createdAd = await this.client.createAd(targetAdSetId, this.adAccountId, adPayload);
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
      const message = this.parseError(error);
      this.onProgress({ step: 'error', message, completed: false, error: message });

      // Attempt rollback
      await this.rollback();

      return { success: false, error: message };
    }
  }

  /**
   * Parse Meta API errors into user-friendly Spanish messages with actionable guidance.
   */
  private parseError(error: unknown): string {
    if (!(error instanceof Error)) return 'Error desconocido al publicar la campaña.';

    const msg = error.message;

    // Map common Meta API error patterns to actionable Spanish messages
    const patterns: Array<[RegExp | string, string]> = [
      [/overlapping/i, 'Las ubicaciones geográficas se superponen. Usa solo países O ciudades/regiones, no ambos.'],
      [/pixel.*required|tracking.*pixel/i, 'Se requiere un Pixel de Meta para esta campaña. Ve a Configuración → Conexión Meta.'],
      [/optimization.*goal.*objective|objective.*optimization/i, 'El objetivo de optimización no es compatible. Se ajustó automáticamente, intenta de nuevo.'],
      [/daily_budget.*too low|minimum.*budget/i, 'El presupuesto diario es muy bajo. Meta requiere mínimo $1.00 USD por ad set.'],
      [/name.*too long/i, 'El nombre excede el límite de caracteres permitido por Meta.'],
      [/invalid.*call_to_action|unknown.*cta/i, 'El botón de acción (CTA) no es válido. Usa uno estándar como "Más información" o "Comprar ahora".'],
      [/invalid.*url|url.*invalid/i, 'La URL de destino no es válida. Debe ser una URL completa con https://.'],
      [/targeting.*too narrow|audience.*small/i, 'La audiencia es demasiado pequeña. Amplía la edad, ubicación o intereses.'],
      [/age.*restriction|special.*category.*age/i, 'Las campañas con categorías especiales requieren edad mínima de 18 años.'],
      [/rate.*limit|too many.*request/i, 'Meta API está limitando las solicitudes. Espera unos minutos e intenta de nuevo.'],
      [/permission|unauthorized|OAuthException/i, 'Error de permisos de Meta. Reconecta tu cuenta en Configuración → Conexión Meta.'],
      [/ad.*account.*disabled/i, 'Tu cuenta publicitaria está deshabilitada. Revisa el estado en Meta Business Suite.'],
      [/billing/i, 'Hay un problema con la facturación de tu cuenta de Meta Ads. Revisa tus métodos de pago.'],
      [/policy|disapproved|rejected/i, 'El contenido del anuncio fue rechazado por las políticas de Meta. Revisa el texto e imágenes.'],
      [/No se encontraron ubicaciones/i, msg], // Our own error, pass through
    ];

    for (const [pattern, replacement] of patterns) {
      if (typeof pattern === 'string' ? msg.includes(pattern) : pattern.test(msg)) {
        return replacement;
      }
    }

    // Return original message for unrecognized errors (it likely came from Meta's user_msg)
    return msg;
  }

  /**
   * Build the object_story_spec for an ad creative, handling all formats.
   */
  private buildCreativeSpec(ad: GeneratedAd): Record<string, unknown> {
    const defaultLink = ad.destination_url || `https://facebook.com/${this.pageId}`;
    const safeCta = this.safeCta(ad.call_to_action);

    if (ad.format === 'carousel' && ad.carousel_images && ad.carousel_images.length >= 2) {
      const childAttachments = ad.carousel_images.map((card) => ({
        link: card.destination_url || defaultLink,
        name: (card.headline || ad.headline || '').substring(0, META_HEADLINE_MAX),
        description: (card.description || ad.description || '').substring(0, META_HEADLINE_MAX),
        ...(card.image_url ? { picture: card.image_url } : {}),
      }));

      return {
        page_id: this.pageId,
        link_data: {
          message: ad.primary_text.substring(0, META_PRIMARY_TEXT_MAX),
          link: defaultLink,
          child_attachments: childAttachments,
          multi_share_optimized: true,
          call_to_action: {
            type: safeCta,
            value: { link: defaultLink },
          },
        },
      };
    }

    // Single image / video / fallback
    const linkData: Record<string, unknown> = {
      message: ad.primary_text.substring(0, META_PRIMARY_TEXT_MAX),
      name: (ad.headline || '').substring(0, META_HEADLINE_MAX),
      description: (ad.description || '').substring(0, META_HEADLINE_MAX),
      link: defaultLink,
      call_to_action: {
        type: safeCta,
        value: { link: defaultLink },
      },
    };

    // Add image if available
    if (ad.image_url) {
      linkData.picture = ad.image_url;
    }

    return {
      page_id: this.pageId,
      link_data: linkData,
    };
  }

  private getPromotedObject(objective: string): Record<string, unknown> | null {
    // Meta requires promoted_object on ad sets depending on campaign objective
    switch (objective) {
      case 'OUTCOME_SALES':
        if (this.pixelId) {
          return { pixel_id: this.pixelId, custom_event_type: 'PURCHASE' };
        }
        // Should not reach here — validate() catches this
        return { page_id: this.pageId };
      case 'OUTCOME_LEADS':
        return { page_id: this.pageId };
      case 'OUTCOME_TRAFFIC':
      case 'OUTCOME_ENGAGEMENT':
      case 'OUTCOME_AWARENESS':
      default:
        return { page_id: this.pageId };
    }
  }

  /** Truncate name to Meta's max length */
  private safeName(name: string): string {
    return (name || 'Sin nombre').substring(0, META_NAME_MAX_LENGTH);
  }

  /** Ensure CTA is valid, fallback to LEARN_MORE */
  private safeCta(cta: string): string {
    if (cta && VALID_CTA_TYPES.has(cta)) return cta;
    return 'LEARN_MORE';
  }

  /**
   * Comprehensive pre-publish validation covering all known Meta API rejection scenarios.
   * Throws descriptive, actionable error messages in Spanish.
   */
  private validate() {
    const errors: string[] = [];

    // === Account / Connection ===
    if (!this.adAccountId) errors.push('No se encontró cuenta publicitaria. Ve a Configuración → Conexión Meta.');
    if (!this.pageId) errors.push('No se encontró página de Facebook. Ve a Configuración → Conexión Meta.');

    // === Campaign level ===
    if (!this.data.campaign.name?.trim()) {
      errors.push('El nombre de la campaña es requerido.');
    } else if (this.data.campaign.name.length > META_NAME_MAX_LENGTH) {
      errors.push(`El nombre de la campaña excede ${META_NAME_MAX_LENGTH} caracteres (tiene ${this.data.campaign.name.length}).`);
    }

    if (!this.data.campaign.objective) {
      errors.push('El objetivo de la campaña es requerido.');
    }

    const objective = mapObjective(this.data.campaign.objective);

    // OUTCOME_SALES requires pixel
    if (objective === 'OUTCOME_SALES' && !this.pixelId) {
      errors.push(
        'Las campañas de conversiones (Ventas) requieren un Pixel de Meta. ' +
        'Ve a Configuración → Conexión Meta y selecciona tu Pixel, ' +
        'o cambia el objetivo a Tráfico o Leads.'
      );
    }

    // OUTCOME_LEADS with LEAD_GENERATION requires page_id
    if (objective === 'OUTCOME_LEADS' && !this.pageId) {
      errors.push('Las campañas de generación de leads requieren una página de Facebook.');
    }

    // Daily budget must be positive
    if (!this.data.campaign.daily_budget || this.data.campaign.daily_budget <= 0) {
      errors.push('El presupuesto diario debe ser mayor a $0.');
    }

    // Special ad categories restrictions
    const hasRestrictedCategory = this.data.campaign.special_ad_categories?.some(
      c => RESTRICTED_CATEGORIES.has(c)
    );

    // === Ad Sets ===
    if (this.data.ad_sets.length === 0) {
      errors.push('Se requiere al menos un ad set (audiencia).');
    }

    // Validate budget percentages sum
    const totalPercentage = this.data.ad_sets.reduce((sum, s) => sum + (s.budget_percentage || 0), 0);
    if (this.data.ad_sets.length > 0 && (totalPercentage < 95 || totalPercentage > 105)) {
      // Allow 5% tolerance for rounding
      errors.push(`Los porcentajes de presupuesto suman ${totalPercentage}%, deben sumar ~100%.`);
    }

    for (const adSet of this.data.ad_sets) {
      const prefix = `Ad set "${adSet.name || '(sin nombre)'}": `;

      if (!adSet.name?.trim()) {
        errors.push(`${prefix}El nombre es requerido.`);
      } else if (adSet.name.length > META_NAME_MAX_LENGTH) {
        errors.push(`${prefix}El nombre excede ${META_NAME_MAX_LENGTH} caracteres.`);
      }

      // Minimum budget per ad set ($1/day)
      const dailyBudgetCents = Math.round(
        (this.data.campaign.daily_budget * (adSet.budget_percentage || 0)) / 100 * 100
      );
      if (dailyBudgetCents < META_MIN_DAILY_BUDGET_CENTS) {
        errors.push(
          `${prefix}El presupuesto diario resulta en $${(dailyBudgetCents / 100).toFixed(2)}, ` +
          `pero Meta requiere mínimo $1.00 USD por ad set. Aumenta el presupuesto total o reduce el número de ad sets.`
        );
      }

      // Geo location validation
      const geo = adSet.targeting.geo_locations;
      if (!geo.countries?.length && !geo.cities?.length && !geo.regions?.length) {
        errors.push(`${prefix}Necesita al menos una ubicación geográfica (país, ciudad o región).`);
      }

      // Age range
      if (adSet.targeting.age_min && adSet.targeting.age_max) {
        if (adSet.targeting.age_min > adSet.targeting.age_max) {
          errors.push(`${prefix}La edad mínima (${adSet.targeting.age_min}) es mayor que la máxima (${adSet.targeting.age_max}).`);
        }
      }

      // Special ad category age restriction: must be 18+
      if (hasRestrictedCategory && adSet.targeting.age_min && adSet.targeting.age_min < 18) {
        errors.push(
          `${prefix}Las campañas con categorías especiales (vivienda/crédito/empleo) requieren edad mínima de 18 años.`
        );
      }

      // Special ad category gender restriction: cannot target specific gender
      if (hasRestrictedCategory && adSet.targeting.genders?.length > 0 &&
          !adSet.targeting.genders.includes(0) && adSet.targeting.genders.length < 2) {
        errors.push(
          `${prefix}Las campañas con categorías especiales no pueden segmentar por género específico.`
        );
      }
    }

    // === Ads ===
    if (this.data.ads.length === 0) {
      errors.push('Se requiere al menos un anuncio.');
    }

    for (const ad of this.data.ads) {
      const prefix = `Anuncio "${ad.name || '(sin nombre)'}": `;

      if (!ad.name?.trim()) {
        errors.push(`${prefix}El nombre es requerido.`);
      } else if (ad.name.length > META_NAME_MAX_LENGTH) {
        errors.push(`${prefix}El nombre excede ${META_NAME_MAX_LENGTH} caracteres.`);
      }

      if (!ad.primary_text?.trim()) {
        errors.push(`${prefix}El texto principal es requerido.`);
      } else if (ad.primary_text.length > META_PRIMARY_TEXT_MAX) {
        errors.push(`${prefix}El texto principal excede ${META_PRIMARY_TEXT_MAX} caracteres.`);
      }

      if (!ad.headline?.trim()) {
        errors.push(`${prefix}El titular (headline) es requerido.`);
      } else if (ad.headline.length > META_HEADLINE_MAX) {
        errors.push(`${prefix}El titular excede ${META_HEADLINE_MAX} caracteres.`);
      }

      // CTA validation
      if (ad.call_to_action && !VALID_CTA_TYPES.has(ad.call_to_action)) {
        errors.push(
          `${prefix}El CTA "${ad.call_to_action}" no es válido. ` +
          `Usa uno de: LEARN_MORE, SHOP_NOW, SIGN_UP, CONTACT_US, etc.`
        );
      }

      // Destination URL validation for objectives that require it
      if (objective === 'OUTCOME_TRAFFIC' || objective === 'OUTCOME_SALES') {
        if (!ad.destination_url?.trim()) {
          errors.push(`${prefix}Se requiere URL de destino para campañas de ${objective === 'OUTCOME_TRAFFIC' ? 'tráfico' : 'conversiones'}.`);
        }
      }

      if (ad.destination_url?.trim()) {
        try {
          const url = new URL(ad.destination_url);
          if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            errors.push(`${prefix}La URL de destino debe usar protocolo HTTP o HTTPS.`);
          }
        } catch {
          errors.push(`${prefix}La URL de destino "${ad.destination_url}" no es una URL válida.`);
        }
      }

      // Image validation: Meta uses OG image from URL if no picture is provided
      if (ad.format === 'single_image' && !ad.image_url?.trim()) {
        errors.push(
          `${prefix}No tiene imagen. Sin imagen, Meta usará la imagen de la URL de destino, ` +
          `que puede no ser la deseada. Sube o genera una imagen en el editor.`
        );
      }

      // Carousel validation
      if (ad.format === 'carousel') {
        if (!ad.carousel_images || ad.carousel_images.length < 2) {
          errors.push(`${prefix}El formato carrusel requiere al menos 2 tarjetas (tiene ${ad.carousel_images?.length || 0}).`);
        } else {
          // Validate each card has an image
          for (let ci = 0; ci < ad.carousel_images.length; ci++) {
            if (!ad.carousel_images[ci].image_url?.trim()) {
              errors.push(`${prefix}La tarjeta ${ci + 1} del carrusel no tiene imagen. Cada tarjeta necesita una imagen.`);
            }
          }
        }
        if (ad.carousel_images && ad.carousel_images.length > 10) {
          errors.push(`${prefix}El formato carrusel permite máximo 10 tarjetas (tiene ${ad.carousel_images.length}).`);
        }
      }
    }

    // Throw all errors at once for better UX
    if (errors.length > 0) {
      throw new Error(
        errors.length === 1
          ? errors[0]
          : `Se encontraron ${errors.length} problemas:\n• ${errors.join('\n• ')}`
      );
    }
  }

  private async rollback() {
    const failedRollbacks: string[] = [];
    // Delete in reverse order: ads → creatives → adsets → campaigns
    for (const [label, ids] of [
      ['ad', this.createdIds.ads],
      ['creative', this.createdIds.creatives],
      ['adset', this.createdIds.adsets],
      ['campaign', this.createdIds.campaigns],
    ] as const) {
      for (const id of ids) {
        try {
          await this.client.deleteObject(id);
        } catch (err) {
          failedRollbacks.push(`${label}:${id}`);
          logger.error(`Rollback failed for ${label}`, { route: 'publisher', objectId: id }, err);
        }
      }
    }
    if (failedRollbacks.length > 0) {
      logger.error('Partial rollback failure — manual cleanup may be needed', {
        route: 'publisher',
        failedObjects: failedRollbacks.join(', '),
      });
    }
  }
}
