import { canCreateServers, getAvailableAuthProviders } from '$lib/server/auth';

export async function load({ locals }) {
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
    availableAuthProviders: getAvailableAuthProviders(locals.pb),
    allowCreate: canCreateServers(locals.user)
  };
}
