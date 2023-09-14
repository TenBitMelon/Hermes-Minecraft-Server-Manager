import { Collections, type ServerResponse } from '$lib/database/types';
import type { PageServerLoadEvent } from './$types';

export async function load({ fetch, params, locals }: PageServerLoadEvent) {
  return {
    server: await locals.pb.collection(Collections.Servers).getOne<ServerResponse>(params.serverID),
    logs: await fetch(`/api/${params.serverID}/logs`).then((res) => res.json())
  };
}
