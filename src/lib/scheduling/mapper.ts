export interface HourlyPerformance {
  hour: number;  // 0-23
  day: number;   // 0-6 (Sunday-Saturday)
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpa: number;
}

/**
 * Build a 7x24 heatmap matrix of performance scores (0-100).
 * Each cell represents day x hour performance relative to the best cell.
 * Input: hourly insights from Meta API with hourly_stats_aggregated_by_advertiser_time_zone breakdown.
 */
export function buildHeatmap(hourlyInsights: Array<{
  hourly_stats_aggregated_by_advertiser_time_zone: string;
  impressions: string;
  clicks: string;
  spend: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start?: string;
}>): number[][] {
  // Initialize 7x24 matrix (rows = days Sun-Sat, cols = hours 0-23)
  const totals: { impressions: number; clicks: number; spend: number; conversions: number; count: number }[][] = [];
  for (let d = 0; d < 7; d++) {
    totals[d] = [];
    for (let h = 0; h < 24; h++) {
      totals[d][h] = { impressions: 0, clicks: 0, spend: 0, conversions: 0, count: 0 };
    }
  }

  // Aggregate insights by day-of-week and hour
  for (const row of hourlyInsights) {
    // hourly_stats_aggregated_by_advertiser_time_zone is "HH:MM:SS" or similar, extract hour
    const hourStr = row.hourly_stats_aggregated_by_advertiser_time_zone;
    const hour = parseInt(hourStr.split(':')[0], 10);
    if (isNaN(hour) || hour < 0 || hour > 23) continue;

    // Determine day of week from date_start (if available)
    let dayOfWeek = 0;
    if (row.date_start) {
      const date = new Date(row.date_start);
      dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    }

    const impressions = parseInt(row.impressions, 10) || 0;
    const clicks = parseInt(row.clicks, 10) || 0;
    const spend = parseFloat(row.spend) || 0;
    const conversions = row.actions?.reduce((sum, a) => {
      if (a.action_type === 'offsite_conversion' || a.action_type === 'lead' || a.action_type === 'purchase') {
        return sum + (parseInt(a.value, 10) || 0);
      }
      return sum;
    }, 0) || 0;

    totals[dayOfWeek][hour].impressions += impressions;
    totals[dayOfWeek][hour].clicks += clicks;
    totals[dayOfWeek][hour].spend += spend;
    totals[dayOfWeek][hour].conversions += conversions;
    totals[dayOfWeek][hour].count += 1;
  }

  // Compute a performance score per cell combining CTR-weighted efficiency
  // Score formula: weighted combination of CTR and cost efficiency
  const rawScores: number[][] = [];
  let maxScore = 0;

  for (let d = 0; d < 7; d++) {
    rawScores[d] = [];
    for (let h = 0; h < 24; h++) {
      const cell = totals[d][h];
      if (cell.impressions === 0) {
        rawScores[d][h] = 0;
        continue;
      }

      const ctr = (cell.clicks / cell.impressions) * 100;
      const cpc = cell.clicks > 0 ? cell.spend / cell.clicks : cell.spend;
      const cpcInverse = cpc > 0 ? 1 / cpc : 0;

      // Combined score: 60% CTR + 40% cost efficiency (inverse CPC)
      const score = ctr * 0.6 + cpcInverse * 0.4;
      rawScores[d][h] = score;
      if (score > maxScore) maxScore = score;
    }
  }

  // Normalize to 0-100 scale relative to the best cell
  const heatmap: number[][] = [];
  for (let d = 0; d < 7; d++) {
    heatmap[d] = [];
    for (let h = 0; h < 24; h++) {
      if (maxScore === 0) {
        heatmap[d][h] = 50; // Default score when no data
      } else {
        heatmap[d][h] = Math.round((rawScores[d][h] / maxScore) * 100);
      }
    }
  }

  return heatmap;
}

/**
 * Convert a 7x24 boolean matrix to Meta's adset_schedule format.
 * Meta format: array of { start_minute, end_minute, days, timezone_type }.
 * start_minute/end_minute: minutes from midnight (0-1440).
 * days: array of day numbers (0=Sunday, 6=Saturday).
 * timezone_type: 'USER'.
 * Groups consecutive hours on same days into single entries.
 */
export function mapScheduleToMeta(matrix: boolean[][]): Array<{
  start_minute: number;
  end_minute: number;
  days: number[];
  timezone_type: string;
}> {
  // First, build per-day time ranges
  const dayRanges: Map<number, Array<{ start: number; end: number }>> = new Map();

  for (let d = 0; d < 7; d++) {
    const ranges: Array<{ start: number; end: number }> = [];
    let rangeStart: number | null = null;

    for (let h = 0; h < 24; h++) {
      const isActive = matrix[d]?.[h] ?? false;

      if (isActive && rangeStart === null) {
        rangeStart = h;
      } else if (!isActive && rangeStart !== null) {
        ranges.push({ start: rangeStart * 60, end: h * 60 });
        rangeStart = null;
      }
    }

    // Close any open range at end of day
    if (rangeStart !== null) {
      ranges.push({ start: rangeStart * 60, end: 1440 });
    }

    if (ranges.length > 0) {
      dayRanges.set(d, ranges);
    }
  }

  // Group days that share the same time ranges into single schedule entries
  const schedule: Array<{
    start_minute: number;
    end_minute: number;
    days: number[];
    timezone_type: string;
  }> = [];

  // Create a map: "start-end" -> set of days
  const rangeKey = (r: { start: number; end: number }) => `${r.start}-${r.end}`;
  const rangeGroups = new Map<string, Set<number>>();

  for (const [day, ranges] of dayRanges) {
    for (const range of ranges) {
      const key = rangeKey(range);
      if (!rangeGroups.has(key)) {
        rangeGroups.set(key, new Set());
      }
      rangeGroups.get(key)!.add(day);
    }
  }

  // Convert grouped ranges to Meta schedule format
  for (const [key, days] of rangeGroups) {
    const [startStr, endStr] = key.split('-');
    schedule.push({
      start_minute: parseInt(startStr, 10),
      end_minute: parseInt(endStr, 10),
      days: Array.from(days).sort((a, b) => a - b),
      timezone_type: 'USER',
    });
  }

  return schedule;
}

/**
 * Generate a default schedule matrix (all active).
 */
export function createDefaultSchedule(allActive: boolean = true): boolean[][] {
  const matrix: boolean[][] = [];
  for (let d = 0; d < 7; d++) {
    matrix[d] = [];
    for (let h = 0; h < 24; h++) {
      matrix[d][h] = allActive;
    }
  }
  return matrix;
}

/**
 * Count total active hours in a schedule matrix.
 */
export function countActiveHours(matrix: boolean[][]): number {
  let count = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (matrix[d]?.[h]) count++;
    }
  }
  return count;
}
