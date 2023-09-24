import { Collections, type ServerResponse } from '$lib/database/types';
import type { PageServerLoadEvent } from './$types';

export async function load({ fetch, params, locals }: PageServerLoadEvent) {
  const server = await locals.pb
    .collection(Collections.Servers)
    .getOne<ServerResponse>(params.serverID)
    .catch(() => null);

  const logs = server
    ? await fetch(`/api/${params.serverID}/logs`)
        .then((res) => res.json())
        .catch(() => null)
    : null;
  return {
    server,
    logs
  };
}
