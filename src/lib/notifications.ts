import { createAdminClient } from '@/lib/supabase/admin';

export async function createNotification(params: {
  user_id: string;
  type: 'rule_executed' | 'campaign_published' | 'campaign_error' | 'budget_alert' | 'performance_alert' | 'system' | 'ab_test_winner' | 'creative_fatigue' | 'scaling_alert' | 'funnel_published';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    message: params.message,
    metadata: params.metadata || {},
  });

  if (error) {
    console.error('Error creating notification:', error);
  }
}
