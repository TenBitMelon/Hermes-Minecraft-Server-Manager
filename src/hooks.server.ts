// src/hooks.server.js
import { env } from '$env/dynamic/private';
import PocketBase from 'pocketbase';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = new PocketBase('http://0.0.0.0:8090');
  event.locals.pb.autoCancellation(false);
  try {
    event.locals.pb.admins.authWithPassword(env.POCKETBASE_INTERNAL_ADMIN_EMAIL, env.POCKETBASE_INTERNAL_ADMIN_PASSWORD);
  } catch (e) {
    console.error('Failed to authenticate with PocketBase (thats not good)');
  }

  const response = await resolve(event);
  return response;
}
