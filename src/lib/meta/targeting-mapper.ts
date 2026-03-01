import type { TargetingConfig } from '@/lib/gemini/types';

export function mapTargeting(targeting: TargetingConfig): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    age_min: targeting.age_min || 18,
    age_max: targeting.age_max || 65,
  };

  // Genders: Meta uses array [1], [2], or [1,2] for specific, omit for all
  if (targeting.genders.length > 0 && !targeting.genders.includes(0)) {
    mapped.genders = targeting.genders;
  }

  // Geo locations
  const geoLocations: Record<string, unknown> = {};
  if (targeting.geo_locations.countries?.length) {
    geoLocations.countries = targeting.geo_locations.countries;
  }
  if (targeting.geo_locations.cities?.length) {
    geoLocations.cities = targeting.geo_locations.cities.map(c => ({ key: c.key }));
  }
  if (targeting.geo_locations.regions?.length) {
    geoLocations.regions = targeting.geo_locations.regions.map(r => ({ key: r.key }));
  }
  mapped.geo_locations = geoLocations;

  // Interests → flexible_spec
  if (targeting.interests?.length) {
    mapped.flexible_spec = [
      {
        interests: targeting.interests.map(i => ({
          id: i.id,
          name: i.name,
        })),
      },
    ];
  }

  // Behaviors
  if (targeting.behaviors?.length) {
    const flexSpec = (mapped.flexible_spec as Array<Record<string, unknown>>) || [{}];
    flexSpec[0].behaviors = targeting.behaviors.map(b => ({
      id: b.id,
      name: b.name,
    }));
    mapped.flexible_spec = flexSpec;
  }

  // Exclusions
  if (targeting.excluded_interests?.length) {
    mapped.exclusions = {
      interests: targeting.excluded_interests.map(i => ({
        id: i.id,
        name: i.name,
      })),
    };
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

  return {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: facebookPositions,
    instagram_positions: instagramPositions,
  };
}

export function mapBidStrategy(strategy: string): string {
  const map: Record<string, string> = {
    LOWEST_COST_WITHOUT_CAP: 'LOWEST_COST_WITHOUT_CAP',
    LOWEST_COST_WITH_BID_CAP: 'LOWEST_COST_WITH_BID_CAP',
    COST_CAP: 'COST_CAP',
  };
  return map[strategy] || 'LOWEST_COST_WITHOUT_CAP';
}
