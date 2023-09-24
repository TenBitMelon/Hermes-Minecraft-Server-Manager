import { getContainerLogs } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  return json(await getContainerLogs(params.serverID, 'all').catch(() => []));
}
