import { error, type RequestEvent } from '@sveltejs/kit';
import { getWorkerAuthToken } from '$lib/runtime';

export function requireWorkerBearerAuth(event: RequestEvent) {
  const configuredToken = getWorkerAuthToken();
  if (!configuredToken) error(503, 'Worker API token is not configured.');

  const authHeader = event.request.headers.get('authorization') || '';
  const expected = `Bearer ${configuredToken}`;
  if (authHeader !== expected) error(401, 'Unauthorized worker request.');
}
