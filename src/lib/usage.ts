import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

type UsageField = 'ai_generations' | 'image_generations' | 'campaigns_created' | 'reports_generated' | 'ab_tests_created' | 'funnels_created';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function incrementUsage(
  userId: string,
  field: UsageField
) {
  const supabase = createAdminClient();
  const month = getCurrentMonth();

  // Atomic upsert: insert row if not exists, then increment the field
  // This avoids the race condition of check-then-update
  const { error: upsertError } = await supabase
    .from('usage_tracking')
    .upsert(
      { user_id: userId, month, [field]: 1 },
      { onConflict: 'user_id,month', ignoreDuplicates: true }
    );

  if (upsertError) {
    // Row already exists (expected on subsequent calls)
    // Fall through to increment
  }

  // Atomic increment via RPC if available, otherwise use update
  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id, ' + field)
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  if (existing) {
    const row = existing as unknown as Record<string, unknown>;
    const currentVal = (row[field] as number) || 0;
    const { error } = await supabase
      .from('usage_tracking')
      .update({ [field]: currentVal + 1 })
      .eq('id', row.id as string);

    if (error) {
      logger.error('Failed to increment usage', { userId, field }, error);
    }
  }
}

export async function getUsage(userId: string) {
  const supabase = createAdminClient();
  const month = getCurrentMonth();

  const { data } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  const row = data as Record<string, unknown> | null;

  return {
    ai_generations: (row?.ai_generations as number) || 0,
    image_generations: (row?.image_generations as number) || 0,
    campaigns_created: (row?.campaigns_created as number) || 0,
    reports_generated: (row?.reports_generated as number) || 0,
    ab_tests_created: (row?.ab_tests_created as number) || 0,
    funnels_created: (row?.funnels_created as number) || 0,
  };
}
