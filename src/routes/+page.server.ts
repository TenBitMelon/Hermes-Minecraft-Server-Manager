import { sortServers } from '$lib';
import { getVisibleServersForUser } from '$lib/server/auth';

export async function load({ locals }) {
  const servers = await getVisibleServersForUser({
    user: locals.user
  });

  return {
    servers: sortServers(servers)
  };
}
