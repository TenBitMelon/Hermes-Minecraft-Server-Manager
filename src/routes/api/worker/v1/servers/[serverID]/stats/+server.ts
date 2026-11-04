import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { getLocalContainerUsageStats } from '$lib/workers/localRuntime';

export async function GET(event) {
  requireWorkerBearerAuth(event);
  const result = await getLocalContainerUsageStats(event.params.serverID);
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json(result.value);
}
