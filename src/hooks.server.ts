import { serverPB } from '$lib';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = serverPB;
  return await resolve(event);
}
