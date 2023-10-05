import { sendCommandToContainer } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  return json(await sendCommandToContainer(params.serverID, params.searchParams.get('command')).catch(() => []));
}
