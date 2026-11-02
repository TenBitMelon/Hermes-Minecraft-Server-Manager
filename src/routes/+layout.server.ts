import { canCreateServers, getAvailableAuthProviders } from '$lib/server/auth';

export async function load({ locals }) {
  const [availableAuthProviders, allowCreate] = await Promise.all([getAvailableAuthProviders(locals.pb), canCreateServers(locals.user)]);
  return {
    currentUser: locals.user
      ? {
          id: locals.user.id,
          email: locals.user.email,
          name: locals.user.name,
          username: locals.user.username,
          avatar: locals.user.avatar ?? '',
          administrator: locals.user.administrator,
          ownedServerLimit: locals.user.ownedServerLimit
        }
      : null,
    availableAuthProviders,
    allowCreate
  };
}
