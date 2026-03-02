export interface FatigueResult {
  adId: string;
  metaAdId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  status: 'healthy' | 'warning' | 'fatigued';
  frequency: number;
  ctrBaseline: number;
  ctrCurrent: number;
  ctrDropPercentage: number;
  impressions: number;
}

export interface AdMetricInput {
  adId: string;
  metaAdId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  dailyData: Array<{
    date: string;
    impressions: number;
    clicks: number;
    frequency: number;
  }>;
}

/**
 * Detect creative fatigue in ads based on frequency and CTR degradation.
 *
 * Logic:
 * - Baseline CTR = average of first 3 days (or days until 1000 cumulative impressions)
 * - Current CTR = average of last 3 days
 * - If frequency > 2.5 AND CTR drop > 20%: fatigued
 * - If frequency > 2.0 AND CTR drop > 10%: warning
 * - Otherwise: healthy
 */
export function detectFatigue(adMetrics: AdMetricInput[]): FatigueResult[] {
  const results: FatigueResult[] = [];

  for (const ad of adMetrics) {
    // Sort daily data by date ascending
    const sorted = [...ad.dailyData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sorted.length < 2) {
      // Not enough data to determine fatigue
      const totalImpressions = sorted.reduce((s, d) => s + d.impressions, 0);
      const totalClicks = sorted.reduce((s, d) => s + d.clicks, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgFreq = sorted.length > 0
        ? sorted.reduce((s, d) => s + d.frequency, 0) / sorted.length
        : 0;

      results.push({
        adId: ad.adId,
        metaAdId: ad.metaAdId,
        adName: ad.adName,
        campaignId: ad.campaignId,
        campaignName: ad.campaignName,
        status: 'healthy',
        frequency: Math.round(avgFreq * 100) / 100,
        ctrBaseline: Math.round(ctr * 100) / 100,
        ctrCurrent: Math.round(ctr * 100) / 100,
        ctrDropPercentage: 0,
        impressions: totalImpressions,
      });
      continue;
    }

    // Calculate baseline CTR: first 3 days or until 1000 cumulative impressions
    let baselineImpressions = 0;
    let baselineClicks = 0;
    let baselineDays = 0;

    for (const day of sorted) {
      baselineImpressions += day.impressions;
      baselineClicks += day.clicks;
      baselineDays++;
      if (baselineDays >= 3 || baselineImpressions >= 1000) break;
    }

    const baselineCtr = baselineImpressions > 0
      ? (baselineClicks / baselineImpressions) * 100
      : 0;

    // Calculate current CTR: last 3 days
    const recentDays = sorted.slice(-3);
    const currentImpressions = recentDays.reduce((s, d) => s + d.impressions, 0);
    const currentClicks = recentDays.reduce((s, d) => s + d.clicks, 0);
    const currentCtr = currentImpressions > 0
      ? (currentClicks / currentImpressions) * 100
      : 0;

    // Total impressions
    const totalImpressions = sorted.reduce((s, d) => s + d.impressions, 0);

    // Average frequency (last 3 days for relevance)
    const avgFrequency = recentDays.length > 0
      ? recentDays.reduce((s, d) => s + d.frequency, 0) / recentDays.length
      : 0;

    // CTR drop percentage
    const ctrDrop = baselineCtr > 0
      ? ((baselineCtr - currentCtr) / baselineCtr) * 100
      : 0;

    // Determine status
    let status: 'healthy' | 'warning' | 'fatigued' = 'healthy';

    if (avgFrequency > 2.5 && ctrDrop > 20) {
      status = 'fatigued';
    } else if (avgFrequency > 2.0 && ctrDrop > 10) {
      status = 'warning';
    }

    results.push({
      adId: ad.adId,
      metaAdId: ad.metaAdId,
      adName: ad.adName,
      campaignId: ad.campaignId,
      campaignName: ad.campaignName,
      status,
      frequency: Math.round(avgFrequency * 100) / 100,
      ctrBaseline: Math.round(baselineCtr * 100) / 100,
      ctrCurrent: Math.round(currentCtr * 100) / 100,
      ctrDropPercentage: Math.round(ctrDrop * 100) / 100,
      impressions: totalImpressions,
    });
  }

  // Sort by severity: fatigued first, then warning, then healthy
  const statusOrder: Record<string, number> = { fatigued: 0, warning: 1, healthy: 2 };
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return results;
}
