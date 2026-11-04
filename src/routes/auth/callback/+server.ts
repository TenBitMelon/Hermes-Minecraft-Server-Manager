import type { UserResponse } from '$lib/database/types';
import { ensureUserDefaults } from '$lib/server/auth';
import { error, redirect } from '@sveltejs/kit';

const OAuthCookieName = 'hermes_oauth';

type OAuthCookiePayload = {
  state: string;
  codeVerifier: string;
  provider: string;
  redirectTo: string;
  redirectUrl: string;
};

export async function GET({ locals, url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');
  if (providerError) error(400, providerError);
  if (!code || !state) error(400, 'Missing OAuth callback parameters.');

  const storedCookie = cookies.get(OAuthCookieName);
  if (!storedCookie) error(400, 'Missing OAuth login state.');

  const payload = JSON.parse(storedCookie) as OAuthCookiePayload;
  cookies.delete(OAuthCookieName, { path: '/' });

  if (payload.state !== state) error(400, 'OAuth state mismatch.');

  const auth = await locals.pb.collection('users').authWithOAuth2Code(payload.provider, code, payload.codeVerifier, payload.redirectUrl);
  const user = await ensureUserDefaults(auth.record as UserResponse);
  locals.user = user;

  throw redirect(303, payload.redirectTo || '/');
}
