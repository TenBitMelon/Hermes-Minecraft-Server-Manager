import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { materializeLocalServer } from '$lib/workers/localRuntime';

export async function POST(event) {
  requireWorkerBearerAuth(event);

  const body = await event.request.json();
  const result = await materializeLocalServer(body.serverID, body.composeContent, body.serverProperties ?? null);
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json({ success: true });
}
