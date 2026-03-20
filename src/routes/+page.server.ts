import { sortServers } from '$lib';
import { serverPB } from '$lib/database';
import { Collections } from '$lib/database/types';
import { getVisibleServersForUser, isAdmin } from '$lib/server/auth';

export async function load({ locals }) {
  const servers = sortServers(
    await getVisibleServersForUser({
      user: locals.user
    })
  );

  let visibleDashboardServerIds = new Set<string>();
  if (locals.user) {
    if (isAdmin(locals.user)) {
      visibleDashboardServerIds = new Set(servers.map((server) => server.id));
    } else {
      const memberships = await serverPB.collection(Collections.ServerMemberships).getFullList({
        filter: serverPB.filter('user = {:userId}', { userId: locals.user.id })
      });

      visibleDashboardServerIds = new Set([...memberships.map((membership) => membership.server), ...servers.filter((server) => server.owner === locals.user?.id).map((server) => server.id)]);
    }
  }

  return {
    servers: servers.map((server) => ({
      ...server,
      canVisitDashboard: visibleDashboardServerIds.has(server.id)
    }))
  };
}
