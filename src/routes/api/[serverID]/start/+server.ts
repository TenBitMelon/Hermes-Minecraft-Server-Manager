import { Collections } from '$lib/database/types.js';
import { startCompose } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  const code = await startCompose(params.serverID);
  await locals.pb.collection(Collections.Servers).update(params.serverID, {
    shutdown: false,
    shutdownDate: null
  });
  return json(code);
}
