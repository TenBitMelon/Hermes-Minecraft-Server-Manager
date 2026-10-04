import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { removeLocalServer } from '$lib/workers/localRuntime';

export async function DELETE(event) {
  requireWorkerBearerAuth(event);
  const forcibly = event.url.searchParams.get('forcibly') === 'true';
  const result = await removeLocalServer(event.params.serverID, forcibly);
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json({ success: true });
}
