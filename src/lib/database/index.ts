import { building } from '$app/environment';
import { env as privateENV } from '$env/dynamic/private';
import { canRunControlPlane } from '$lib/runtime';
import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './types';

function getPocketBaseURL() {
  return 'http://127.0.0.1:8090';
}

export function createPocketBaseClient(): TypedPocketBase {
  const pb: TypedPocketBase = new PocketBase(getPocketBaseURL());
  pb.autoCancellation(false);
  return pb;
}

const serverPB = createPocketBaseClient();
if (!building && canRunControlPlane()) {
  try {
    await serverPB.admins.authWithPassword(privateENV.POCKETBASE_INTERNAL_ADMIN_EMAIL || '', privateENV.POCKETBASE_INTERNAL_ADMIN_PASSWORD || '');
  } catch {
    throw new Error('Failed to authenticate with PocketBase (thats not good). Check internal admin configuration.');
  }
}
export { getPocketBaseURL, serverPB };
