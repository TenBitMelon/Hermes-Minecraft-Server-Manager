import { building, dev } from '$app/environment';
import { createPocketBaseClient } from '$lib/database';
import { Collections, type UserResponse } from '$lib/database/types';
import { updateAllServerStates } from '$lib/servers';
import { ensureUserDefaults } from '$lib/server/auth';
import { canRunControlPlane, getWorkerRestartingThresholdMs } from '$lib/runtime';
import { syncWorkersHealth } from '$lib/workers';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  if (!canRunControlPlane() && !event.url.pathname.startsWith('/api/worker/v1/')) return new Response('Not found', { status: 404 });
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

function reportBackgroundSyncFailure(task: string) {
  return (error: unknown) => {
    console.error(`[hermes] ${task} failed`, error);
  };
}

let interval = null;
if (!building && !interval && canRunControlPlane()) {
  let syncing = false;
  const runBackgroundSync = async () => {
    if (syncing) return;
    syncing = true;
    try {
      await syncWorkersHealth().catch(reportBackgroundSyncFailure('syncWorkersHealth'));
      await updateAllServerStates().catch(reportBackgroundSyncFailure('updateAllServerStates'));
    } finally {
      syncing = false;
    }
  };

  void runBackgroundSync();
  // Poll before a healthy worker could be classified as restarting.
  interval = setInterval(runBackgroundSync, Math.max(1000, Math.min(30000, getWorkerRestartingThresholdMs() / 2)));
}
