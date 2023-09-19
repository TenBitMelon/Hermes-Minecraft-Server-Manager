// src/hooks.server.js
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import PocketBase from 'pocketbase';

const pb = new PocketBase(dev ? 'http://127.0.0.1:8090' : 'http://0.0.0.0:8090');
pb.autoCancellation(false);
try {
  console.log(`Authenticating with PocketBase using email: ${env.POCKETBASE_INTERNAL_ADMIN_EMAIL} password: ${env.POCKETBASE_INTERNAL_ADMIN_PASSWORD}`);
  pb.admins.authWithPassword(env.POCKETBASE_INTERNAL_ADMIN_EMAIL, env.POCKETBASE_INTERNAL_ADMIN_PASSWORD);
  console.log('Authenticated with PocketBase');
} catch (e) {
  console.log('Failed to authenticate with PocketBase (thats not good)');
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = pb;

  const response = await resolve(event);
  return response;
}
