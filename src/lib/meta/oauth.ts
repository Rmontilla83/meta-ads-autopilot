const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const REQUIRED_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'read_insights',
];

export function getMetaAuthUrl(state: string): string {
  const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;

  const params = new URLSearchParams({
    client_id: appId!,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES.join(','),
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`,
    code,
  });

  const response = await fetch(
    `${META_GRAPH_URL}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  return response.json();
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${META_GRAPH_URL}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get long-lived token');
  }

  return response.json();
}

export async function getMetaUserInfo(accessToken: string): Promise<{
  id: string;
  name: string;
  email?: string;
}> {
  const response = await fetch(
    `${META_GRAPH_URL}/me?fields=id,name,email&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get user info');
  }

  return response.json();
}

export async function refreshLongLivedToken(token: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  return getLongLivedToken(token);
}
