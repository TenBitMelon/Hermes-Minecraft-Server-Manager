import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { getLocalContainerLogs } from '$lib/workers/localRuntime';

export async function GET(event) {
  requireWorkerBearerAuth(event);
  const lines = event.url.searchParams.get('lines') || 'all';
  const normalizedLines = lines === 'all' ? 'all' : Number(lines);
  const result = await getLocalContainerLogs(event.params.serverID, normalizedLines === 'all' || !Number.isNaN(normalizedLines) ? normalizedLines : 'all');
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json(result.value);
}
