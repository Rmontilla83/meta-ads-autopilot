import { z } from 'zod';

export const RULE_TEMPLATE_ADVISOR = `Eres un experto en automatización de Meta Ads para Latinoamérica.

Tu rol es sugerir reglas de automatización inteligentes basadas en la industria, objetivos y métricas actuales del usuario.

REGLAS:
1. SIEMPRE responde en español.
2. Sugiere entre 3-5 reglas relevantes.
3. Las métricas válidas son: spend, ctr, cpc, cpm, cpa, impressions, clicks, conversions, reach, frequency.
4. Los operadores válidos son: gt (mayor que), lt (menor que), gte (mayor o igual), lte (menor o igual), eq (igual).
5. Los tipos de acción válidos son: pause_campaign, activate_campaign, increase_budget, decrease_budget, notify_only.
6. Los períodos válidos son: last_1_day, last_3_days, last_7_days, last_14_days, last_30_days.
7. Las frecuencias válidas son: hourly, daily, weekly.
8. Los valores de acción son porcentajes (para ajustes de presupuesto, entre 5-50%).
9. Adapta los umbrales a benchmarks de LATAM.
10. Explica el razonamiento detrás de cada regla.

FORMATO DE RESPUESTA (JSON):
{
  "rules": [
    {
      "name": "Nombre descriptivo de la regla",
      "description": "Explicación de por qué esta regla es útil",
      "condition_metric": "ctr",
      "condition_operator": "lt",
      "condition_value": 1.0,
      "condition_period": "last_7_days",
      "action_type": "pause_campaign",
      "action_value": 0,
      "frequency": "daily"
    }
  ]
}`;

export const ruleTemplateSchema = z.object({
  rules: z.array(z.object({
    name: z.string(),
    description: z.string(),
    condition_metric: z.enum(['spend', 'ctr', 'cpc', 'cpm', 'cpa', 'impressions', 'clicks', 'conversions', 'reach', 'frequency']),
    condition_operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
    condition_value: z.number(),
    condition_period: z.enum(['last_1_day', 'last_3_days', 'last_7_days', 'last_14_days', 'last_30_days']),
    action_type: z.enum(['pause_campaign', 'activate_campaign', 'increase_budget', 'decrease_budget', 'notify_only']),
    action_value: z.number().default(0),
    frequency: z.enum(['hourly', 'daily', 'weekly']),
  })),
});

export type RuleTemplateResult = z.infer<typeof ruleTemplateSchema>;

export function buildRuleTemplatePrompt(context: {
  industry: string | null;
  objectives: string[];
  active_campaigns: number;
  avg_spend?: number;
  avg_ctr?: number;
}): string {
  return `CONTEXTO DEL NEGOCIO:
- Industria: ${context.industry || 'No especificada'}
- Objetivos: ${context.objectives.join(', ') || 'No especificados'}
- Campañas activas: ${context.active_campaigns}
${context.avg_spend ? `- Gasto promedio diario: $${context.avg_spend.toFixed(2)} USD` : ''}
${context.avg_ctr ? `- CTR promedio: ${context.avg_ctr.toFixed(2)}%` : ''}

Sugiere reglas de automatización que optimicen el rendimiento.`;
}
