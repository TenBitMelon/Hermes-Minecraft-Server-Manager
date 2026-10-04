import { sortServers } from '$lib';
import { serverPB } from '$lib/database';
import { Collections, type ServerMembershipResponse, type ServerResponse } from '$lib/database/types';
import { getVisibleServersForUser, isAdmin } from '$lib/server/auth';
import { getWorkersWithDerivedStatus } from '$lib/workers';

type InternalServerField = 'owner' | 'port' | 'cloudflareCNAMERecordID' | 'cloudflareSRVRecordID';
type PublicServerResponse = Omit<ServerResponse, InternalServerField>;

// The server list is intentionally public, but these fields are internal plumbing.
// Handing them to a visitor who cannot manage the server would point them at the
// owner id, the internal port and the Cloudflare record ids.
const internalServerFields: InternalServerField[] = ['owner', 'port', 'cloudflareCNAMERecordID', 'cloudflareSRVRecordID'];

function withoutInternalFields(server: ServerResponse): PublicServerResponse {
  return Object.fromEntries(Object.entries(server).filter(([key]) => !internalServerFields.includes(key as InternalServerField))) as PublicServerResponse;
}

export async function load({ locals }) {
  const workers = await getWorkersWithDerivedStatus();
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const servers = sortServers(
    await getVisibleServersForUser({
      user: locals.user
    })
  );

  const administrator = Boolean(locals.user && isAdmin(locals.user));

  const membershipsByServerId = new Map<string, ServerMembershipResponse>();
  if (locals.user && !administrator) {
    const memberships = await serverPB.collection(Collections.ServerMemberships).getFullList<ServerMembershipResponse>({
      filter: serverPB.filter('user = {:userId}', { userId: locals.user.id })
    });

    for (const membership of memberships) membershipsByServerId.set(membership.server, membership);
  }

  return {
    servers: servers.map((server) => {
      const membership = membershipsByServerId.get(server.id);
      const isOwner = Boolean(locals.user && server.owner === locals.user.id);

      return {
        ...(locals.user ? server : withoutInternalFields(server)),
        canVisitDashboard: administrator || isOwner || Boolean(membership),
        canStartStop: administrator || isOwner || Boolean(membership?.canStartStop)
      };
    })
  };
}
