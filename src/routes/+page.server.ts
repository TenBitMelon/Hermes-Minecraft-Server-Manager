import { getFileURL } from '$lib';
import { Collections, ServerState, type ServerResponse } from '$lib/database/types';
import type { PageServerLoadEvent } from './$types';

export async function load({ locals }: PageServerLoadEvent) {
  const servers: ServerResponse[] = await locals.pb.collection(Collections.Servers).getFullList<ServerResponse>();
  // servers.forEach((server) => {
  //   if (server.icon) server.icon = getFileURL(server.collectionId, server.id, server.icon);
  // });

  // export enum ServerState {
  //   'Creating' = 'creating', // first
  //   'Running' = 'running', // second
  //   'Paused' = 'paused' // third
  //   'Stopped' = 'stopped', // fourth
  // }

  const StateOrderMap = {
    [ServerState.Creating]: 0,
    [ServerState.Running]: 1,
    [ServerState.Paused]: 2,
    [ServerState.Stopped]: 3
  };

  return {
    // Negative value if the first argument is less than the second argument
    // zero if they're equal
    // Positive value otherwise
    servers: servers.sort((a, b) => StateOrderMap[a.state] - StateOrderMap[b.state])
  };
}

// export const actions: Actions = {
// 	default: async ({ params }) => {
// 		return {};
// 	}
// };
