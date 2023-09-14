// src/hooks.server.js
import { POCKETBASE_INTERNAL_ADMIN_EMAIL, POCKETBASE_INTERNAL_ADMIN_PASSWORD } from '$env/static/private';
import PocketBase from 'pocketbase';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = new PocketBase('http://127.0.0.1:8090');
  event.locals.pb.autoCancellation(false);
  event.locals.pb.admins.authWithPassword(POCKETBASE_INTERNAL_ADMIN_EMAIL, POCKETBASE_INTERNAL_ADMIN_PASSWORD);

  const response = await resolve(event);
  return response;
}
