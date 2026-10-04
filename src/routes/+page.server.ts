import { sortServers } from '$lib';
import { serverPB } from '$lib/database';
import { Collections, type ServerMembershipResponse } from '$lib/database/types';
import { getVisibleServersForUser, isAdmin } from '$lib/server/auth';
import { withoutInternalFields } from '$lib/servers/visibility';
import { getWorkersWithDerivedStatus } from '$lib/workers';
import { workerSummary } from '$lib/workers/view';

export async function load({ locals }) {
  const workers = await getWorkersWithDerivedStatus();
  const workerSummaryById = new Map(workers.map((worker) => [worker.id, workerSummary(worker)]));
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
