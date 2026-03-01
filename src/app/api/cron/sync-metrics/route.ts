import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetaAdsClient } from '@/lib/meta/client';
import { decrypt } from '@/lib/encryption';

function extractConversions(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0;
  const conversionTypes = ['offsite_conversion', 'onsite_conversion', 'purchase', 'complete_registration'];
  return actions
    .filter(a => conversionTypes.some(t => a.action_type.includes(t)))
    .reduce((sum, a) => sum + parseInt(a.value, 10), 0);
}

function extractLeads(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0;
  const leadTypes = ['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped'];
  return actions
    .filter(a => leadTypes.some(t => a.action_type.includes(t)))
    .reduce((sum, a) => sum + parseInt(a.value, 10), 0);
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Get all active meta connections
    const { data: connections, error: connError } = await supabase
      .from('meta_connections')
      .select('user_id, access_token_encrypted')
      .eq('is_active', true);

    if (connError || !connections?.length) {
      return NextResponse.json({ message: 'No active connections', synced: 0 });
    }

    // Date range: last 2 days
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateRange = {
      since: twoDaysAgo.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0],
    };

    let totalSynced = 0;

    for (const conn of connections) {
      try {
        const accessToken = decrypt(conn.access_token_encrypted);
        const client = new MetaAdsClient(accessToken);

        // Get campaigns with meta_campaign_id
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, meta_campaign_id')
          .eq('user_id', conn.user_id)
          .not('meta_campaign_id', 'is', null)
          .in('status', ['active', 'paused']);

        if (!campaigns?.length) continue;

        for (const campaign of campaigns) {
          try {
            // 1. Base metrics (daily)
            const baseInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange);

            // 2. Breakdown by age
            const ageInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'age');

            // 3. Breakdown by gender
            const genderInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'gender');

            // 4. Breakdown by placement
            const placementInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'publisher_platform,platform_position');

            // 5. Breakdown by device
            const deviceInsights = await client.getCampaignInsights(campaign.meta_campaign_id!, dateRange, 'device_platform');

            // Group breakdowns by date
            const breakdownsByDate: Record<string, {
              age: Array<{ label: string; value: number; percentage: number }>;
              gender: Array<{ label: string; value: number; percentage: number }>;
              placement: Array<{ label: string; value: number; percentage: number }>;
              device: Array<{ label: string; value: number; percentage: number }>;
            }> = {};

            const buildBreakdown = (
              data: Array<Record<string, unknown>>,
              labelField: string | string[],
              targetKey: 'age' | 'gender' | 'placement' | 'device'
            ) => {
              for (const row of data) {
                const date = row.date_start as string;
                if (!breakdownsByDate[date]) {
                  breakdownsByDate[date] = { age: [], gender: [], placement: [], device: [] };
                }
                const labels = Array.isArray(labelField)
                  ? labelField.map(f => row[f]).filter(Boolean).join(' - ')
                  : (row[labelField] as string);
                breakdownsByDate[date][targetKey].push({
                  label: labels,
                  value: parseInt(row.impressions as string, 10) || 0,
                  percentage: 0,
                });
              }
              // Calculate percentages per date
              for (const date of Object.keys(breakdownsByDate)) {
                const entries = breakdownsByDate[date][targetKey];
                const total = entries.reduce((s, e) => s + e.value, 0);
                for (const entry of entries) {
                  entry.percentage = total > 0 ? Math.round((entry.value / total) * 10000) / 100 : 0;
                }
              }
            };

            if (ageInsights.data) buildBreakdown(ageInsights.data, 'age', 'age');
            if (genderInsights.data) buildBreakdown(genderInsights.data, 'gender', 'gender');
            if (placementInsights.data) buildBreakdown(placementInsights.data, ['publisher_platform', 'platform_position'], 'placement');
            if (deviceInsights.data) buildBreakdown(deviceInsights.data, 'device_platform', 'device');

            // Upsert daily metrics
            for (const row of (baseInsights.data || [])) {
              const date = row.date_start as string;
              const impressions = parseInt(row.impressions as string, 10) || 0;
              const reach = parseInt(row.reach as string, 10) || 0;
              const clicks = parseInt(row.clicks as string, 10) || 0;
              const spend = parseFloat(row.spend as string) || 0;
              const actions = row.actions as Array<{ action_type: string; value: string }> | undefined;
              const conversions = extractConversions(actions);
              const leads = extractLeads(actions);

              const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
              const cpc = clicks > 0 ? spend / clicks : 0;
              const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
              const cpa = conversions > 0 ? spend / conversions : 0;
              const frequency = reach > 0 ? impressions / reach : 0;

              const dateBreakdowns = breakdownsByDate[date] || { age: [], gender: [], placement: [], device: [] };

              await supabase
                .from('campaign_metrics')
                .upsert({
                  campaign_id: campaign.id,
                  user_id: conn.user_id,
                  date,
                  impressions,
                  reach,
                  clicks,
                  spend,
                  conversions,
                  leads,
                  ctr: Math.round(ctr * 10000) / 10000,
                  cpc: Math.round(cpc * 10000) / 10000,
                  cpm: Math.round(cpm * 10000) / 10000,
                  cpa: Math.round(cpa * 10000) / 10000,
                  frequency: Math.round(frequency * 10000) / 10000,
                  breakdown_age: dateBreakdowns.age,
                  breakdown_gender: dateBreakdowns.gender,
                  breakdown_placement: dateBreakdowns.placement,
                  breakdown_device: dateBreakdowns.device,
                }, { onConflict: 'campaign_id,date' });

              totalSynced++;
            }
          } catch (campaignError) {
            console.error(`Error syncing campaign ${campaign.id}:`, campaignError);
          }
        }
      } catch (userError) {
        // Token expired or invalid — mark connection inactive
        const message = userError instanceof Error ? userError.message : '';
        if (message.includes('OAuthException') || message.includes('token') || message.includes('expired')) {
          await supabase
            .from('meta_connections')
            .update({ is_active: false })
            .eq('user_id', conn.user_id);
        }
        console.error(`Error syncing user ${conn.user_id}:`, userError);
      }
    }

    return NextResponse.json({ message: 'Sync complete', synced: totalSynced });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
