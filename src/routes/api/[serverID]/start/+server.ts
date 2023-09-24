import { Collections } from '$lib/database/types.js';
import { startContainer } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  let code;
  try {
    code = await startContainer(params.serverID);
    await locals.pb.collection(Collections.Servers).update(params.serverID, {
      shutdown: false,
      shutdownDate: null
    });
  } catch (e) {
    console.error(e);
  }
  return json(code);
}
