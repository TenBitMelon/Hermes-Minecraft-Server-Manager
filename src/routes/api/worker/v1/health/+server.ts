import { env as privateEnv } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { requireWorkerBearerAuth } from '$lib/workers/auth';
import { getLocalWorkerHealth } from '$lib/workers/localRuntime';

export async function GET(event) {
  requireWorkerBearerAuth(event);

  const result = await getLocalWorkerHealth(+privateEnv.PORT_MIN, +privateEnv.PORT_MAX, Boolean(privateEnv.AVOID_DEFAULT_PORT));
  if (result.isErr()) return json({ message: result.error.message }, { status: 500 });
  return json(result.value);
}
