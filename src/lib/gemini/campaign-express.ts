import { z } from 'zod';

export const CAMPAIGN_EXPRESS_PROMPT = `Eres un estratega senior de Meta Ads con 10+ años de experiencia en mercados de Latinoamérica.

Tu tarea es crear una campaña completa y optimizada usando TODA la información disponible del negocio.

CONTEXTO DISPONIBLE:
- Perfil del negocio (nombre, industria, descripción, público objetivo)
- Personas compradoras (si existen)
- Ángulos de venta (si existen)
- Identidad de marca (colores, tono)
- Historial de mejores campañas (si existen)
- Objetivo del usuario para esta campaña

REGLAS:
1. SIEMPRE responde en español
2. Usa los datos reales del negocio, NO inventes información
3. Si hay campañas exitosas previas, basa la estrategia en los patrones que funcionaron
4. El confidence_score debe ser honesto (0-100):
   - 90+ si hay buen historial de campañas y datos completos
   - 70-89 si hay datos de negocio pero sin historial
   - 50-69 si los datos son mínimos
5. Objetivos válidos: OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES
6. CTAs válidos: LEARN_MORE, SHOP_NOW, SIGN_UP, CONTACT_US, GET_OFFER, DOWNLOAD, WATCH_MORE, SEND_MESSAGE, CALL_NOW, APPLY_NOW, SUBSCRIBE
7. Presupuestos realistas para LATAM (mínimo $5 USD/día)
8. optimization_goal relevante al objetivo
9. budget_percentage de todos los ad_sets debe sumar 100
10. Genera 2-3 ad sets y 2-4 anuncios variados

FORMATO DE RESPUESTA (JSON):`;

export const campaignExpressSchema = z.object({
  executive_summary: z.string().describe('Resumen ejecutivo de 2-3 frases sobre la estrategia'),
  confidence_score: z.number().min(0).max(100).describe('Score de confianza basado en los datos disponibles'),
  confidence_reasoning: z.string().describe('Explicación breve del score'),
  strategy: z.object({
    rationale: z.string(),
    objective: z.string(),
    estimated_results: z.object({
      daily_reach_min: z.number(),
      daily_reach_max: z.number(),
      daily_clicks_min: z.number(),
      daily_clicks_max: z.number(),
      estimated_cpa_min: z.number(),
      estimated_cpa_max: z.number(),
      estimated_ctr: z.number(),
    }),
    optimization_tips: z.array(z.string()),
  }),
  campaign: z.object({
    name: z.string(),
    objective: z.string(),
    special_ad_categories: z.array(z.string()),
    daily_budget: z.number(),
  }),
  ad_sets: z.array(z.object({
    name: z.string(),
    targeting: z.object({
      age_min: z.number(),
      age_max: z.number(),
      genders: z.array(z.number()),
      geo_locations: z.object({
        countries: z.array(z.string()).optional(),
        cities: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
        regions: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
      }),
      interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    }),
    placements: z.array(z.string()),
    budget_percentage: z.number(),
    optimization_goal: z.string(),
    bid_strategy: z.string(),
  })),
  ads: z.array(z.object({
    name: z.string(),
    format: z.enum(['single_image', 'carousel', 'video']),
    primary_text: z.string(),
    headline: z.string(),
    description: z.string(),
    call_to_action: z.string(),
    destination_url: z.string().optional(),
  })),
});

export type CampaignExpressResult = z.infer<typeof campaignExpressSchema>;
