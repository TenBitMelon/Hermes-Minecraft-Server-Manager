import { Collections, type ServersResponse } from '$lib/database/types';
import type { Actions, PageServerLoadEvent } from './$types';

export async function load({ locals }: PageServerLoadEvent) {
  const servers: ServersResponse[] = [],
    shutdownServers: ServersResponse[] = [];
  (await locals.pb.collection(Collections.Servers).getFullList<ServersResponse>())
    .map((server) => {
      return (server.icon = locals.pb.getFileUrl(server, server.icon)), server;
    })
    .forEach((server) => {
      if (server.shutdown) shutdownServers.push(server);
      else servers.push(server);
    });

  return {
    servers: servers || [],
    shutdownServers: shutdownServers || []
  };
}

// export const actions: Actions = {
// 	default: async ({ params }) => {
// 		return {};
// 	}
// };
