import { getAuthProviderConfig, getPostLoginRedirect } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

const OAuthCookieName = 'hermes_oauth';

function replaceQueryParams(url: string, values: Record<string, string>) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(values)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

export async function GET({ locals, url, cookies, params }) {
  const { pbProvider, appProvider } = await getAuthProviderConfig(locals.pb, params.provider);

  const state = randomUUID();
  const redirectUrl = `${url.origin}/auth/callback`;
  const redirectTo = getPostLoginRedirect(url);

  cookies.set(
    OAuthCookieName,
    JSON.stringify({
      state,
      codeVerifier: pbProvider.codeVerifier,
      provider: pbProvider.name,
      appProvider,
      redirectUrl,
      redirectTo
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/',
      maxAge: 60 * 10
    }
  );

  throw redirect(303, replaceQueryParams(`${pbProvider.authUrl}${redirectUrl}`, { state }));
}
