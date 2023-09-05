// src/hooks.server.js
import PocketBase from 'pocketbase';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = new PocketBase('http://127.0.0.1:8090');
  event.locals.pb.autoCancellation(false);

  const response = await resolve(event);
  return response;
}
