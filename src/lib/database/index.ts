import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import PocketBase from 'pocketbase';

const serverPB = new PocketBase(dev ? 'http://127.0.0.1:8090' : 'http://0.0.0.0:8090');
if (!building) {
  serverPB.autoCancellation(false);
  try {
    console.log(`Authenticating with PocketBase using email: ${env.POCKETBASE_INTERNAL_ADMIN_EMAIL} password: ${env.POCKETBASE_INTERNAL_ADMIN_PASSWORD}`);
    serverPB.admins.authWithPassword(env.POCKETBASE_INTERNAL_ADMIN_EMAIL, env.POCKETBASE_INTERNAL_ADMIN_PASSWORD);
    console.log('Authenticated with PocketBase');
  } catch (e) {
    console.log('Failed to authenticate with PocketBase (thats not good)');
  }
}
export { serverPB };
