import type { TargetingConfig } from '@/lib/gemini/types';

export function mapTargeting(targeting: TargetingConfig): Record<string, unknown> {
  // Age: Meta requires 13–65 range, age_min <= age_max
  let ageMin = targeting.age_min || 18;
  let ageMax = targeting.age_max || 65;
  ageMin = Math.max(13, Math.min(65, ageMin));
  ageMax = Math.max(13, Math.min(65, ageMax));
  if (ageMin > ageMax) { const tmp = ageMin; ageMin = ageMax; ageMax = tmp; }

  const mapped: Record<string, unknown> = {
    age_min: ageMin,
    age_max: ageMax,
  };

  // Genders: Meta uses [1]=male, [2]=female, [1,2]=both. Omit for all.
  if (targeting.genders?.length > 0 && !targeting.genders.includes(0)) {
    const validGenders = targeting.genders.filter(g => g === 1 || g === 2);
    if (validGenders.length > 0) {
      mapped.genders = validGenders;
    }
  }

  // Geo locations
  // Meta rejects overlapping locations (e.g. country "VE" + city in Venezuela).
  // If specific cities or regions exist, drop country-level targeting to avoid overlap.
  const geoLocations: Record<string, unknown> = {};

  let hasSpecificLocations = false;

  if (targeting.geo_locations.cities?.length) {
    const validCities = targeting.geo_locations.cities.filter(c => c.key && /^\d+$/.test(c.key));
    if (validCities.length > 0) {
      geoLocations.cities = validCities.map(c => ({ key: c.key }));
      hasSpecificLocations = true;
    }
  }
  if (targeting.geo_locations.regions?.length) {
    const validRegions = targeting.geo_locations.regions.filter(r => r.key && /^\d+$/.test(r.key));
    if (validRegions.length > 0) {
      geoLocations.regions = validRegions.map(r => ({ key: r.key }));
      hasSpecificLocations = true;
    }
  }

  // Only include countries if there are NO specific cities/regions (avoids overlap error)
  if (!hasSpecificLocations && targeting.geo_locations.countries?.length) {
    // Validate country codes: must be 2-letter uppercase ISO codes
    const validCountries = targeting.geo_locations.countries.filter(c => /^[A-Z]{2}$/.test(c));
    if (validCountries.length > 0) {
      geoLocations.countries = validCountries;
    }
  }

  // Ensure geo_locations is never empty — Meta rejects empty targeting
  if (!geoLocations.countries && !geoLocations.cities && !geoLocations.regions) {
    throw new Error(
      'No se encontraron ubicaciones geográficas válidas. ' +
      'Asegúrate de seleccionar al menos un país, ciudad o región válida en el editor.'
    );
  }

  mapped.geo_locations = geoLocations;

  // Interests → flexible_spec
  // Only include interests/behaviors whose IDs were validated against Meta's Targeting Search API.
  // AI-generated IDs (even numeric ones) are typically invalid. We mark validated IDs with a
  // "_validated" flag set by the interest selector component. If no validated interests exist,
  // skip flexible_spec entirely — Meta will use broad targeting (Advantage+), which often performs well.
  if (targeting.interests?.length) {
    const validInterests = targeting.interests.filter(i => /^\d+$/.test(i.id) && (i as Record<string, unknown>)._validated === true);
    if (validInterests.length > 0) {
      mapped.flexible_spec = [
        {
          interests: validInterests.map(i => ({
            id: i.id,
            name: i.name,
          })),
        },
      ];
    }
  }

  // Behaviors — same validation
  if (targeting.behaviors?.length) {
    const validBehaviors = targeting.behaviors.filter(b => /^\d+$/.test(b.id) && (b as Record<string, unknown>)._validated === true);
    if (validBehaviors.length > 0) {
      const flexSpec = (mapped.flexible_spec as Array<Record<string, unknown>>) || [{}];
      flexSpec[0].behaviors = validBehaviors.map(b => ({
        id: b.id,
        name: b.name,
      }));
      mapped.flexible_spec = flexSpec;
    }
  }

  // Exclusions — same validation
  if (targeting.excluded_interests?.length) {
    const validExclusions = targeting.excluded_interests.filter(i => /^\d+$/.test(i.id) && (i as Record<string, unknown>)._validated === true);
    if (validExclusions.length > 0) {
      mapped.exclusions = {
        interests: validExclusions.map(i => ({
          id: i.id,
          name: i.name,
        })),
      };
    }
  }

  // Custom audiences
  if (targeting.custom_audiences?.length) {
    mapped.custom_audiences = targeting.custom_audiences.map(id => ({ id }));
  }

  return mapped;
}

export function mapObjective(objective: string): string {
  const map: Record<string, string> = {
    OUTCOME_AWARENESS: 'OUTCOME_AWARENESS',
    OUTCOME_TRAFFIC: 'OUTCOME_TRAFFIC',
    OUTCOME_ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
    OUTCOME_LEADS: 'OUTCOME_LEADS',
    OUTCOME_SALES: 'OUTCOME_SALES',
    OUTCOME_APP_PROMOTION: 'OUTCOME_APP_PROMOTION',
  };
  return map[objective] || 'OUTCOME_TRAFFIC';
}

export function mapPlacements(placements: string[]): Record<string, unknown> | null {
  if (!placements.length) return null;

  const facebookPositions: string[] = [];
  const instagramPositions: string[] = [];

  for (const p of placements) {
    switch (p) {
      case 'feed':
        facebookPositions.push('feed');
        instagramPositions.push('stream');
        break;
      case 'stories':
        facebookPositions.push('story');
        instagramPositions.push('story');
        break;
      case 'reels':
        facebookPositions.push('facebook_reels');
        instagramPositions.push('reels');
        break;
      case 'right_column':
        facebookPositions.push('right_hand_column');
        break;
      case 'search':
        facebookPositions.push('search');
        break;
      case 'marketplace':
        facebookPositions.push('marketplace');
        break;
    }
  }

  // Only include platforms that have positions — empty arrays cause Meta API errors
  const result: Record<string, unknown> = {};
  const platforms: string[] = [];

  if (facebookPositions.length > 0) {
    platforms.push('facebook');
    result.facebook_positions = facebookPositions;
  }
  if (instagramPositions.length > 0) {
    platforms.push('instagram');
    result.instagram_positions = instagramPositions;
  }

  if (platforms.length === 0) return null; // Let Meta use automatic placements
  result.publisher_platforms = platforms;
  return result;
}

// Meta requires the optimization_goal to be compatible with the campaign objective.
// If the AI-generated goal is incompatible, override with the correct default.
const OBJECTIVE_VALID_GOALS: Record<string, string[]> = {
  OUTCOME_AWARENESS: ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT', 'THRUPLAY'],
  OUTCOME_TRAFFIC: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS', 'REACH'],
  OUTCOME_ENGAGEMENT: ['POST_ENGAGEMENT', 'IMPRESSIONS', 'REACH', 'THRUPLAY', 'LINK_CLICKS'],
  OUTCOME_LEADS: ['LEAD_GENERATION', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS'],
  OUTCOME_SALES: ['OFFSITE_CONVERSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'VALUE'],
  OUTCOME_APP_PROMOTION: ['APP_INSTALLS', 'LINK_CLICKS'],
};

const OBJECTIVE_DEFAULT_GOAL: Record<string, string> = {
  OUTCOME_AWARENESS: 'REACH',
  OUTCOME_TRAFFIC: 'LINK_CLICKS',
  OUTCOME_ENGAGEMENT: 'POST_ENGAGEMENT',
  OUTCOME_LEADS: 'LEAD_GENERATION',
  OUTCOME_SALES: 'OFFSITE_CONVERSIONS',
  OUTCOME_APP_PROMOTION: 'APP_INSTALLS',
};

export function mapOptimizationGoal(campaignObjective: string, requestedGoal: string): string {
  const objective = mapObjective(campaignObjective);
  const validGoals = OBJECTIVE_VALID_GOALS[objective];
  if (validGoals && validGoals.includes(requestedGoal)) {
    return requestedGoal;
  }
  return OBJECTIVE_DEFAULT_GOAL[objective] || 'LINK_CLICKS';
}

export function mapBidStrategy(strategy: string): string {
  const map: Record<string, string> = {
    LOWEST_COST_WITHOUT_CAP: 'LOWEST_COST_WITHOUT_CAP',
    LOWEST_COST_WITH_BID_CAP: 'LOWEST_COST_WITH_BID_CAP',
    COST_CAP: 'COST_CAP',
  };
  return map[strategy] || 'LOWEST_COST_WITHOUT_CAP';
}
