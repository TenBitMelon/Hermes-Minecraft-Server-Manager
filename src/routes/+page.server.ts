import { Collections, type ServerResponse } from '$lib/database/types';
import type { Actions, PageServerLoadEvent } from './$types';

export async function load({ locals }: PageServerLoadEvent) {
  const servers: ServerResponse[] = (await locals.pb.collection(Collections.Servers).getFullList<ServerResponse>()).map((server) => {
    return (server.icon = locals.pb.getFileUrl(server, server.icon)), server;
  });

  return {
    servers: servers || []
  };
}

// export const actions: Actions = {
// 	default: async ({ params }) => {
// 		return {};
// 	}
// };
