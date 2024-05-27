import { latestUpdateResults } from '$lib/servers';
import type { PageServerLoadEvent } from './$types';

export async function load({}: PageServerLoadEvent) {
  return {
    update: latestUpdateResults.map((serverUpdate) => ({
      server: serverUpdate.server,
      updates: serverUpdate.updates.map((r) => {
        if (r.hasError) r.error = r.error.json();
        return r;
      })
    }))
  };
}
