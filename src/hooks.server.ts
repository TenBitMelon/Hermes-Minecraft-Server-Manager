import { building, dev } from '$app/environment';
import { serverPB } from '$lib/database';
import { updateAllServerStates } from '$lib/servers';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = serverPB;
  return await resolve(event);
}

let interval = null;
if (!building && !interval) {
  updateAllServerStates();
  interval = setInterval(updateAllServerStates, dev ? 1000 * 30 : 1000 * 60);
}
