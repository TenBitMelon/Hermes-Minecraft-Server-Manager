import { error, type RequestEvent } from '@sveltejs/kit';
import { canHostLocalWorker, getWorkerAuthToken } from '$lib/runtime';

export function requireWorkerBearerAuth(event: RequestEvent) {
  if (!canHostLocalWorker()) error(404, 'This instance does not host game servers.');
  const configuredToken = getWorkerAuthToken();
  if (!configuredToken) error(503, 'Worker API token is not configured.');

  const authHeader = event.request.headers.get('authorization') || '';
  const expected = `Bearer ${configuredToken}`;
  if (authHeader !== expected) error(401, 'Unauthorized worker request.');
}
