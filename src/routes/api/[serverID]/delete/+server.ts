import { removeContainer, stopContainer } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  try {
    if (await stopContainer(params.serverID)) await removeContainer(params.serverID);
  } catch (e) {
    console.error(e);
    return json({ success: false });
  }
  return json({ success: true });
}
