import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getMetaClientForUser } from '@/lib/meta/client';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError, rateLimitResponse } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { success, resetAt } = await rateLimit(`geo-search:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'region' | 'city' | null;
    const countryCode = searchParams.get('country_code');
    const q = searchParams.get('q') || undefined;
    const regionId = searchParams.get('region_id') || undefined;

    if (!type || !['region', 'city'].includes(type)) {
      return NextResponse.json({ error: 'type debe ser "region" o "city"' }, { status: 400 });
    }

    if (!countryCode) {
      return NextResponse.json({ error: 'country_code es requerido' }, { status: 400 });
    }

    const client = await getMetaClientForUser(user.id);
    const result = await client.searchGeoLocations({
      location_type: type,
      country_code: countryCode,
      q,
      region_id: regionId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: 'meta/geo-search' });
  }
}
