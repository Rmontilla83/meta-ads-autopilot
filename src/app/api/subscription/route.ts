import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { getUsage } from '@/lib/usage';
import { getPlanLimits, PLANS } from '@/lib/plans';

export async function GET() {
  try {
    const { user, supabase } = await requireAuth();

    const { success, resetAt } = await rateLimit(`subscription:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!success) return rateLimitResponse(resetAt);

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
        image_generations: usage.image_generations,
        campaigns_created: usage.campaigns_created,
        reports_generated: usage.reports_generated,
        active_campaigns: activeCampaigns ?? 0,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    return handleApiError(error, { route: 'subscription-GET' });
  }
}
