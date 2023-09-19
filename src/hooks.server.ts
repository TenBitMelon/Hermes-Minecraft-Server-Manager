import { serverPB } from '$lib/database';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = serverPB;
  return await resolve(event);
}
