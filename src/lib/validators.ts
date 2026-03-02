import { z } from 'zod';

// Sanitize string: strip HTML tags, trim, limit length
export function sanitizeString(input: string, maxLength = 1000): string {
  return input
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

export const createCheckoutSchema = z.object({
  planKey: z.enum(['starter', 'growth', 'agency']),
  interval: z.enum(['monthly', 'annual']),
});

export const publishCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

export const automationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  metric: z.string().min(1),
  condition: z.enum(['greater_than', 'less_than', 'equals', 'greater_equal', 'less_equal']),
  threshold: z.number(),
  action: z.string().min(1),
  action_params: z.record(z.string(), z.unknown()).optional(),
  campaign_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const generateCampaignSchema = z.object({
  businessName: z.string().min(1).max(500),
  businessDescription: z.string().min(1).max(5000),
  targetAudience: z.string().max(2000).optional(),
  objective: z.string().max(500).optional(),
  budget: z.number().positive().optional(),
  adAccountId: z.string().optional(),
});

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  campaignData: z.record(z.string(), z.unknown()).optional(),
});

export const generateCopySchema = z.object({
  campaignData: z.record(z.string(), z.unknown()),
  tone: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
});

export const suggestAudiencesSchema = z.object({
  campaignData: z.record(z.string(), z.unknown()),
  businessDescription: z.string().max(5000).optional(),
});

export const generateBulkSchema = z.object({
  baseDescription: z.string().min(1).max(5000),
  count: z.number().int().min(1).max(50),
  variations: z.string().max(2000).optional(),
  adAccountId: z.string().optional(),
});

export const suggestRulesSchema = z.object({
  campaignData: z.record(z.string(), z.unknown()).optional(),
  currentMetrics: z.record(z.string(), z.unknown()).optional(),
});

export const statusUpdateSchema = z.object({
  campaignId: z.string().uuid().optional(),
  adSetId: z.string().optional(),
  adId: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED']),
});

export const bulkPublishSchema = z.object({
  campaigns: z.array(z.object({
    campaign_data: z.record(z.string(), z.unknown()),
    name: z.string().optional(),
  })).min(1).max(100),
  adAccountId: z.string(),
});
