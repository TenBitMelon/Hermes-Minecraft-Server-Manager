import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { stopLocalContainer } from '$lib/workers/localRuntime';

export async function POST(event) {
  requireWorkerBearerAuth(event);
  const result = await stopLocalContainer(event.params.serverID);
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json({ success: true });
}
