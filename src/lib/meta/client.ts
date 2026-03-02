import { decrypt } from '@/lib/encryption';
import { createAdminClient } from '@/lib/supabase/admin';

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface GeoLocation {
  key: string;
  name: string;
  type: string;
  country_code: string;
  region?: string;
  region_id?: string;
}

export class MetaAdsClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${META_GRAPH_URL}${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Meta API error: ${response.status}`);
    }

    return response.json();
  }

  private async post<T>(endpoint: string, data: Record<string, unknown> = {}): Promise<T> {
    const url = new URL(`${META_GRAPH_URL}${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      const metaErr = error.error || {};
      console.error('[Meta API Error] endpoint:', endpoint);
      console.error('[Meta API Error] code:', metaErr.code, 'subcode:', metaErr.error_subcode);
      console.error('[Meta API Error] message:', metaErr.message);
      console.error('[Meta API Error] user_title:', metaErr.error_user_title);
      console.error('[Meta API Error] user_msg:', metaErr.error_user_msg);
      console.error('[Meta API Error] sent_data:', JSON.stringify(data).substring(0, 1000));
      const detail = metaErr.error_user_msg || metaErr.error_user_title || metaErr.message || `Meta API error: ${response.status}`;
      throw new Error(detail);
    }

    return response.json();
  }

  async createCampaign(adAccountId: string, data: {
    name: string;
    objective: string;
    status: string;
    special_ad_categories: string[];
    is_adset_budget_sharing_enabled?: boolean;
  }): Promise<{ id: string }> {
    return this.post(`/${adAccountId}/campaigns`, data);
  }

  async createAdSet(campaignId: string, adAccountId: string, data: {
    name: string;
    campaign_id: string;
    targeting: Record<string, unknown>;
    optimization_goal: string;
    billing_event: string;
    bid_strategy: string;
    daily_budget: number;
    status: string;
    promoted_object?: Record<string, unknown>;
    targeting_automation?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    return this.post(`/${adAccountId}/adsets`, {
      ...data,
      campaign_id: campaignId,
    });
  }

  async uploadAdImage(adAccountId: string, imageUrl: string): Promise<{ images: Record<string, { hash: string }> }> {
    return this.post(`/${adAccountId}/adimages`, {
      url: imageUrl,
    });
  }

  async createAdCreative(adAccountId: string, data: {
    name: string;
    object_story_spec: Record<string, unknown>;
  }): Promise<{ id: string }> {
    return this.post(`/${adAccountId}/adcreatives`, data);
  }

  async createAd(adSetId: string, adAccountId: string, data: {
    name: string;
    adset_id: string;
    creative: { creative_id: string };
    status: string;
    tracking_specs?: Array<Record<string, unknown>>;
  }): Promise<{ id: string }> {
    return this.post(`/${adAccountId}/ads`, {
      ...data,
      adset_id: adSetId,
    });
  }

  async getCampaignStatus(campaignId: string): Promise<{ effective_status: string; status: string }> {
    return this.request(`/${campaignId}`, { fields: 'effective_status,status' });
  }

  async updateCampaignStatus(campaignId: string, status: string): Promise<{ success: boolean }> {
    return this.post(`/${campaignId}`, { status });
  }

  async deleteObject(objectId: string): Promise<{ success: boolean }> {
    const url = new URL(`${META_GRAPH_URL}/${objectId}`);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString(), { method: 'DELETE' });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Meta API error: ${response.status}`);
    }

    return response.json();
  }

  async getAdAccounts(): Promise<{ data: Array<{
    id: string;
    account_id: string;
    name: string;
    currency: string;
    account_status: number;
    business_name?: string;
  }> }> {
    return this.request('/me/adaccounts', {
      fields: 'id,account_id,name,currency,account_status,business_name',
      limit: '100',
    });
  }

  async getPages(): Promise<{ data: Array<{
    id: string;
    name: string;
    category: string;
    access_token: string;
  }> }> {
    return this.request('/me/accounts', {
      fields: 'id,name,category,access_token',
      limit: '100',
    });
  }

  async getPixels(adAccountId: string): Promise<{ data: Array<{
    id: string;
    name: string;
    last_fired_time?: string;
  }> }> {
    return this.request(`/${adAccountId}/adspixels`, {
      fields: 'id,name,last_fired_time',
    });
  }

  async getCampaigns(adAccountId: string): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.request(`/${adAccountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
      limit: '100',
    });
  }

  async getAccountInsights(adAccountId: string, dateRange: { since: string; until: string }): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.request(`/${adAccountId}/insights`, {
      fields: 'impressions,clicks,spend,cpc,cpm,ctr,reach,actions',
      time_range: JSON.stringify(dateRange),
      level: 'account',
    });
  }

  async getCampaignInsights(
    campaignId: string,
    dateRange: { since: string; until: string },
    breakdowns?: string
  ): Promise<{ data: Array<Record<string, unknown>> }> {
    const params: Record<string, string> = {
      fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,frequency,actions',
      time_range: JSON.stringify(dateRange),
      time_increment: '1',
    };
    if (breakdowns) {
      params.breakdowns = breakdowns;
    }
    return this.request(`/${campaignId}/insights`, params);
  }

  async getAdSetInsights(
    adSetId: string,
    dateRange: { since: string; until: string }
  ): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.request(`/${adSetId}/insights`, {
      fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions',
      time_range: JSON.stringify(dateRange),
    });
  }

  async getAdInsights(
    adId: string,
    dateRange: { since: string; until: string }
  ): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.request(`/${adId}/insights`, {
      fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions',
      time_range: JSON.stringify(dateRange),
    });
  }

  async updateAdSetStatus(adSetId: string, status: string): Promise<{ success: boolean }> {
    return this.post(`/${adSetId}`, { status });
  }

  async updateAdStatus(adId: string, status: string): Promise<{ success: boolean }> {
    return this.post(`/${adId}`, { status });
  }

  async updateCampaignBudget(campaignId: string, dailyBudgetCents: number): Promise<{ success: boolean }> {
    return this.post(`/${campaignId}`, { daily_budget: dailyBudgetCents });
  }

  async updateAdSetBudget(adSetId: string, dailyBudgetCents: number): Promise<{ success: boolean }> {
    return this.post(`/${adSetId}`, { daily_budget: dailyBudgetCents });
  }

  // === Advanced Optimization Methods ===

  async createCustomAudience(adAccountId: string, data: {
    name: string;
    subtype: string;
    description?: string;
    customer_file_source?: string;
    rule?: Record<string, unknown>;
    pixel_id?: string;
    retention_days?: number;
    prefill?: boolean;
  }): Promise<{ id: string }> {
    return this.post(`/${adAccountId}/customaudiences`, data);
  }

  async createLookalikeAudience(adAccountId: string, data: {
    name: string;
    origin_audience_id: string;
    lookalike_spec: {
      type: string;
      ratio: number;
      country: string;
    };
    subtype: string;
  }): Promise<{ id: string }> {
    return this.post(`/${adAccountId}/customaudiences`, {
      name: data.name,
      subtype: 'LOOKALIKE',
      origin_audience_id: data.origin_audience_id,
      lookalike_spec: JSON.stringify(data.lookalike_spec),
    });
  }

  async getCustomAudiences(adAccountId: string): Promise<{ data: Array<{
    id: string;
    name: string;
    subtype: string;
    approximate_count: number;
    delivery_status: Record<string, unknown>;
  }> }> {
    return this.request(`/${adAccountId}/customaudiences`, {
      fields: 'id,name,subtype,approximate_count,delivery_status',
      limit: '100',
    });
  }

  async deleteCustomAudience(audienceId: string): Promise<{ success: boolean }> {
    return this.deleteObject(audienceId);
  }

  async updateAdSetSchedule(adSetId: string, schedule: Array<{
    start_minute: number;
    end_minute: number;
    days: number[];
    timezone_type: string;
  }>): Promise<{ success: boolean }> {
    return this.post(`/${adSetId}`, {
      adset_schedule: JSON.stringify(schedule),
      pacing_type: ['day_parting'],
    });
  }

  async getAdSet(adSetId: string): Promise<Record<string, unknown>> {
    return this.request(`/${adSetId}`, {
      fields: 'id,name,campaign_id,targeting,optimization_goal,billing_event,bid_strategy,daily_budget,status,promoted_object',
    });
  }

  async getAdsInAdSet(adSetId: string): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.request(`/${adSetId}/ads`, {
      fields: 'id,name,status,creative{id,name,body,title,image_url,thumbnail_url}',
      limit: '100',
    });
  }

  async getCampaignInsightsHourly(
    campaignId: string,
    dateRange: { since: string; until: string }
  ): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.request(`/${campaignId}/insights`, {
      fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,hourly_stats_aggregated_by_advertiser_time_zone',
      time_range: JSON.stringify(dateRange),
      breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
    });
  }

  async searchInterests(query: string): Promise<{ data: Array<{ id: string; name: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number }> }> {
    return this.request('/search', {
      type: 'adinterest',
      q: query,
    });
  }

  async searchGeoLocations(params: {
    location_type: 'region' | 'city';
    country_code: string;
    q?: string;
    region_id?: string;
  }): Promise<{ data: GeoLocation[] }> {
    const searchParams: Record<string, string> = {
      type: 'adgeolocation',
      'location_types': `["${params.location_type}"]`,
      country_code: params.country_code,
    };
    if (params.q) {
      searchParams.q = params.q;
    }
    if (params.region_id) {
      searchParams.region_id = params.region_id;
    }
    return this.request('/search', searchParams);
  }
}

export async function getMetaClientForUser(userId: string): Promise<MetaAdsClient> {
  const supabase = createAdminClient();

  const { data: connection, error } = await supabase
    .from('meta_connections')
    .select('access_token_encrypted, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !connection) {
    throw new Error('No active Meta connection found');
  }

  const accessToken = decrypt(connection.access_token_encrypted);
  return new MetaAdsClient(accessToken);
}
