import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUsage } from '@/lib/usage';
import { getPlanLimits, PLANS } from '@/lib/plans';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, stripe_customer_id')
      .eq('id', user.id)
      .single();

    const plan = profile?.plan ?? 'free';
    const normalizedPlan = plan === 'professional' ? 'growth' : plan;

    // Get subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get current usage
    const usage = await getUsage(user.id);

    // Count active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['active', 'publishing']);

    const limits = getPlanLimits(normalizedPlan);
    const planInfo = PLANS[normalizedPlan] || PLANS.free;

    return NextResponse.json({
      plan: normalizedPlan,
      planName: planInfo.name,
      price: planInfo.price,
      limits,
      subscription: subscription || null,
      usage: {
        ai_generations: usage.ai_generations,
        campaigns_created: usage.campaigns_created,
        reports_generated: usage.reports_generated,
        active_campaigns: activeCampaigns ?? 0,
      },
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
