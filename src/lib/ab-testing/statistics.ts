export interface SignificanceResult {
  zScore: number;
  pValue: number;
  significant: boolean;
  winnerIndex: number;
  confidenceLevel: number;
}

/**
 * Approximation of the cumulative distribution function (CDF)
 * of the standard normal distribution.
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp((-absX * absX) / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate statistical significance between two variants using a Z-test.
 *
 * Supports two metric modes:
 * - "ctr" (default): Z-test for proportions (clicks / impressions)
 * - "cpa": comparison of cost-per-action (spend / conversions)
 *
 * Returns whether p < 0.05 (significant), which variant wins,
 * and the confidence level as a percentage.
 */
export function calculateSignificance(
  variantA: { conversions: number; impressions: number; spend: number; clicks?: number },
  variantB: { conversions: number; impressions: number; spend: number; clicks?: number },
  metric: string = 'ctr'
): SignificanceResult {
  // Default result when we cannot compute
  const defaultResult: SignificanceResult = {
    zScore: 0,
    pValue: 1,
    significant: false,
    winnerIndex: -1,
    confidenceLevel: 0,
  };

  if (metric === 'cpa') {
    return calculateCPASignificance(variantA, variantB);
  }

  // CTR-based Z-test for two proportions
  const nA = variantA.impressions;
  const nB = variantB.impressions;

  if (nA === 0 || nB === 0) return defaultResult;

  // Use clicks if available, otherwise fall back to conversions
  const successesA = variantA.clicks ?? variantA.conversions;
  const successesB = variantB.clicks ?? variantB.conversions;

  const pA = successesA / nA;
  const pB = successesB / nB;

  // Pooled proportion
  const pPool = (successesA + successesB) / (nA + nB);
  const qPool = 1 - pPool;

  if (pPool === 0 || pPool === 1) return defaultResult;

  // Standard error
  const se = Math.sqrt(pPool * qPool * (1 / nA + 1 / nB));

  if (se === 0) return defaultResult;

  const zScore = (pA - pB) / se;
  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  const confidenceLevel = (1 - pValue) * 100;
  const significant = pValue < 0.05;

  // Determine winner: higher rate wins
  let winnerIndex = -1;
  if (significant) {
    winnerIndex = pA > pB ? 0 : 1;
  }

  return {
    zScore: Math.round(zScore * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    significant,
    winnerIndex,
    confidenceLevel: Math.round(confidenceLevel * 100) / 100,
  };
}

/**
 * CPA-based significance: compare cost-per-action between two variants.
 * Uses a Z-test approximation treating CPA as a ratio metric.
 */
function calculateCPASignificance(
  variantA: { conversions: number; impressions: number; spend: number },
  variantB: { conversions: number; impressions: number; spend: number }
): SignificanceResult {
  const defaultResult: SignificanceResult = {
    zScore: 0,
    pValue: 1,
    significant: false,
    winnerIndex: -1,
    confidenceLevel: 0,
  };

  if (variantA.conversions < 2 || variantB.conversions < 2) {
    return defaultResult;
  }

  const cpaA = variantA.spend / variantA.conversions;
  const cpaB = variantB.spend / variantB.conversions;

  // Approximate variance using delta method: Var(CPA) ~ spend^2 / conversions^3
  const varA = (variantA.spend * variantA.spend) / (variantA.conversions * variantA.conversions * variantA.conversions);
  const varB = (variantB.spend * variantB.spend) / (variantB.conversions * variantB.conversions * variantB.conversions);

  const se = Math.sqrt(varA + varB);
  if (se === 0) return defaultResult;

  const zScore = (cpaA - cpaB) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
  const confidenceLevel = (1 - pValue) * 100;
  const significant = pValue < 0.05;

  // Lower CPA wins
  let winnerIndex = -1;
  if (significant) {
    winnerIndex = cpaA < cpaB ? 0 : 1;
  }

  return {
    zScore: Math.round(zScore * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    significant,
    winnerIndex,
    confidenceLevel: Math.round(confidenceLevel * 100) / 100,
  };
}

/**
 * Calculate significance across multiple variants (>2).
 * Compares each pair and returns the best-performing variant
 * only if it is significantly better than ALL others.
 */
export function calculateMultiVariantSignificance(
  variants: Array<{ conversions: number; impressions: number; spend: number; clicks?: number }>,
  metric: string = 'ctr'
): SignificanceResult & { pairResults: Array<{ a: number; b: number; result: SignificanceResult }> } {
  const pairResults: Array<{ a: number; b: number; result: SignificanceResult }> = [];

  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const result = calculateSignificance(variants[i], variants[j], metric);
      pairResults.push({ a: i, b: j, result });
    }
  }

  // Find the best performer
  let bestIndex = 0;
  if (metric === 'cpa') {
    // Lowest CPA is best
    let bestCPA = Infinity;
    for (let i = 0; i < variants.length; i++) {
      const cpa = variants[i].conversions > 0 ? variants[i].spend / variants[i].conversions : Infinity;
      if (cpa < bestCPA) {
        bestCPA = cpa;
        bestIndex = i;
      }
    }
  } else {
    // Highest CTR is best
    let bestRate = -1;
    for (let i = 0; i < variants.length; i++) {
      const rate = variants[i].impressions > 0
        ? (variants[i].clicks ?? variants[i].conversions) / variants[i].impressions
        : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestIndex = i;
      }
    }
  }

  // Check if best is significantly better than ALL others
  let allSignificant = true;
  let lowestConfidence = 100;

  for (const pair of pairResults) {
    if (pair.a === bestIndex || pair.b === bestIndex) {
      if (!pair.result.significant) {
        allSignificant = false;
      }
      if (pair.result.confidenceLevel < lowestConfidence) {
        lowestConfidence = pair.result.confidenceLevel;
      }
    }
  }

  // Find the overall z-score and p-value (use the weakest comparison)
  let worstPValue = 0;
  let worstZScore = Infinity;
  for (const pair of pairResults) {
    if (pair.a === bestIndex || pair.b === bestIndex) {
      if (pair.result.pValue > worstPValue) {
        worstPValue = pair.result.pValue;
        worstZScore = pair.result.zScore;
      }
    }
  }

  return {
    zScore: worstZScore === Infinity ? 0 : worstZScore,
    pValue: worstPValue,
    significant: allSignificant && pairResults.length > 0,
    winnerIndex: allSignificant && pairResults.length > 0 ? bestIndex : -1,
    confidenceLevel: Math.round(lowestConfidence * 100) / 100,
    pairResults,
  };
}
