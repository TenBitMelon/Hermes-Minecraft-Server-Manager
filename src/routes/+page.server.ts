import { getFileURL } from '$lib';
import { Collections, type ServerResponse } from '$lib/database/types';
import type { PageServerLoadEvent } from './$types';

export async function load({ locals }: PageServerLoadEvent) {
  const servers: ServerResponse[] = await locals.pb.collection(Collections.Servers).getFullList<ServerResponse>();
  // servers.forEach((server) => {
  //   if (server.icon) server.icon = getFileURL(server.collectionId, server.id, server.icon);
  // });

  return {
    servers: servers || []
  };
}

// export const actions: Actions = {
// 	default: async ({ params }) => {
// 		return {};
// 	}
// };
