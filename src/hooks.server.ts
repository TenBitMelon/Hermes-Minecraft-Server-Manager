import { building, dev } from '$app/environment';
import { createPocketBaseClient } from '$lib/database';
import { Collections, type UserResponse } from '$lib/database/types';
import { updateAllServerStates } from '$lib/servers';
import { ensureUserDefaults } from '$lib/server/auth';
import { canRunControlPlane } from '$lib/runtime';
import { syncWorkersHealth } from '$lib/workers';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = createPocketBaseClient();
  event.locals.pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

  try {
    if (event.locals.pb.authStore.isValid) {
      const auth = await event.locals.pb.collection(Collections.Users).authRefresh();
      event.locals.user = await ensureUserDefaults(auth.record as UserResponse);
    } else {
      event.locals.user = null;
    }
  } catch {
    event.locals.pb.authStore.clear();
    event.locals.user = null;
  }

  const response = await resolve(event);
  response.headers.append(
    'set-cookie',
    event.locals.pb.authStore.exportToCookie({
      secure: !dev,
      sameSite: 'lax',
      httpOnly: true,
      path: '/'
    })
  );

  return response;
}

let interval = null;
if (!building && !interval && canRunControlPlane()) {
  syncWorkersHealth();
  updateAllServerStates();
  interval = setInterval(
    () => {
      syncWorkersHealth();
      updateAllServerStates();
    },
    dev ? 1000 * 30 : 1000 * 60
  );
}
