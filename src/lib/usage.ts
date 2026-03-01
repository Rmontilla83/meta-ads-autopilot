import { createAdminClient } from '@/lib/supabase/admin';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function incrementUsage(
  userId: string,
  field: 'ai_generations' | 'campaigns_created' | 'reports_generated'
) {
  const supabase = createAdminClient();
  const month = getCurrentMonth();

  // Check if row exists
  const { data } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = data as any;

  if (existing && existing.id) {
    const currentVal = (existing[field] as number) || 0;
    await supabase
      .from('usage_tracking')
      .update({ [field]: currentVal + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        month,
        [field]: 1,
      });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;

  return {
    ai_generations: (row?.ai_generations as number) || 0,
    campaigns_created: (row?.campaigns_created as number) || 0,
    reports_generated: (row?.reports_generated as number) || 0,
  };
}
