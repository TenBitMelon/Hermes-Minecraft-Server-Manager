import { building } from '$app/environment';
import { serverPB } from '$lib/database';
import { updateServerStates } from '$lib/servers';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = serverPB;
  return await resolve(event);
}

let interval = null;
if (!building && !interval) interval = setInterval(updateServerStates, 1000 * 60 * 5);
