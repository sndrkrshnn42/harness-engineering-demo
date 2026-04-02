/**
 * Server-side Azure AD OAuth2 client credentials flow.
 * Tokens are cached in memory with automatic refresh (60s buffer before expiry).
 *
 * This module runs ONLY on the server — never imported by client code.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix ms
}

let cached: CachedToken | null = null;

const REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cached && Date.now() < cached.expiresAt - REFRESH_BUFFER_MS) {
    return cached.accessToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Azure AD credentials not set. Provide AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET in .env.local'
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: `api://${clientId}/.default`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Azure AD token request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('No access_token in Azure AD token response');
  }

  const expiresIn: number = data.expires_in ?? 3600; // default 1 hour

  cached = {
    accessToken: data.access_token as string,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return cached.accessToken;
}
