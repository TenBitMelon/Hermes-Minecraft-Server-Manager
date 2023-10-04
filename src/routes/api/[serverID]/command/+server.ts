import { sendCommandToContainer } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  try {
    await sendCommandToContainer(params.serverID, params.searchParams.get('command'));
  } catch (e) {
    console.error(e);
    return json({ success: false });
  }
  return json({ success: true });
}
