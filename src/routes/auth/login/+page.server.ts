import { getAvailableAuthProviders, getPostLoginRedirect } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
  if (locals.user) throw redirect(303, getPostLoginRedirect(url));

  return {
    redirectTo: getPostLoginRedirect(url),
    providers: await getAvailableAuthProviders(locals.pb)
  };
}
