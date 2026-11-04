import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { sendLocalCommandToContainer } from '$lib/workers/localRuntime';

export async function POST(event) {
  requireWorkerBearerAuth(event);
  const body = await event.request.json();
  const result = await sendLocalCommandToContainer(event.params.serverID, body.command || '');
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json(result.value);
}
