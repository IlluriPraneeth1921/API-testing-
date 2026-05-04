/**
 * SaveUserContext Cookie Manager — uses Playwright's APIRequestContext.
 *
 * POST /view/Core/SecurityModule/Security/SaveUserContext with Bearer + context body,
 * captures set-cookie header. Cached for 55 min.
 */

import { APIRequestContext } from '@playwright/test';
import { getAccessToken } from './auth';
import { EnvConfig } from './env-config';

let cachedCookie: string | null = null;
let cookieExpiresAt = 0;

const USER_CONTEXT = {
  organizationKey: 'a6342be6-9484-4856-b0d2-ac0500da8f64',
  locationKey: 'ce37659c-7aea-497c-a5d0-ac0500daaefb',
  staffMemberKey: '8aec7af9-415a-49f9-9d92-ac0500dadf73',
};

export async function getUserContextCookie(
  request: APIRequestContext, cfg: EnvConfig,
): Promise<string | null> {
  const now = Date.now();
  if (cachedCookie && now < cookieExpiresAt) return cachedCookie;

  const token = await getAccessToken(cfg.AUTH_ENV, cfg.AUTH_USERNAME, cfg.AUTH_PASSWORD);
  const url = cfg.BASE_URL.replace(/\/+$/, '') + '/view/Core/SecurityModule/Security/SaveUserContext';
  const body = {
    organization: { key: cfg.CONTEXT_ORG_KEY || USER_CONTEXT.organizationKey },
    location: { key: cfg.CONTEXT_LOC_KEY || USER_CONTEXT.locationKey },
    staffDelegation: { key: cfg.CONTEXT_STAFF_KEY || USER_CONTEXT.staffMemberKey },
  };

  try {
    const resp = await request.post(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: body,
      timeout: 30000,
    });

    const allHeaders = resp.headersArray();
    const cookies = allHeaders
      .filter(h => h.name.toLowerCase() === 'set-cookie')
      .map(h => {
        // Extract just name=value, strip Path, HttpOnly, etc.
        const parts = h.value.split(';');
        return parts[0].trim();
      });

    const cookie = cookies.join('; ');
    if (cookie) {
      cachedCookie = cookie;
      cookieExpiresAt = now + 55 * 60 * 1000;
      console.log(`  🍪 SaveUserContext OK (status=${resp.status()})`);
      return cookie;
    }

    console.log(`  ⚠ SaveUserContext: no cookie returned (status=${resp.status()})`);
    return null;
  } catch (e: any) {
    console.log(`  ⚠ SaveUserContext failed: ${e.message}`);
    return null;
  }
}

export function clearCookieCache(): void {
  cachedCookie = null;
  cookieExpiresAt = 0;
}
