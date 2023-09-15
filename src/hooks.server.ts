// src/hooks.server.js
import { env } from '$env/dynamic/private';
import { Collections } from '$lib/database/types';
import PocketBase from 'pocketbase';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.pb = new PocketBase('http://127.0.0.1:8090');
  event.locals.pb.autoCancellation(false);
  event.locals.pb.collection(Collections.Users).authWithPassword(env.POCKETBASE_INTERNAL_ADMIN_EMAIL, env.POCKETBASE_INTERNAL_ADMIN_PASSWORD);

  const response = await resolve(event);
  return response;
}
