import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { createLocalBackupArchive } from '$lib/workers/localRuntime';

export async function POST(event) {
  requireWorkerBearerAuth(event);
  const result = await createLocalBackupArchive(event.params.serverID);
  if (result.isErr()) return new Response(result.error.message, { status: 500 });

  return new Response(result.value, {
    headers: {
      'content-type': 'application/zip'
    }
  });
}
