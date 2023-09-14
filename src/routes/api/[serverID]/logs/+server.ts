import { getLogs } from '$lib/docker';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
  return json(await getLogs(params.serverID, 'all'));
}
