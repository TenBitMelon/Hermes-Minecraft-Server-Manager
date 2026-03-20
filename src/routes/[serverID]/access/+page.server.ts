import { serverPB } from '$lib/database';
import { Collections, type ServerMembershipResponse } from '$lib/database/types';
import { getServerMemberships, getUserDirectory, requireServerCapability } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

function normalizePermissions(formData: FormData) {
  const permissions = {
    canStartStop: formData.get('canStartStop') === 'on',
    canSendConsole: formData.get('canSendConsole') === 'on',
    canManageFiles: formData.get('canManageFiles') === 'on',
    canManageAccess: formData.get('canManageAccess') === 'on',
    canManageConfig: formData.get('canManageConfig') === 'on'
  };

  return permissions;
}

async function saveMembership(serverId: string, userId: string, permissions: ReturnType<typeof normalizePermissions>) {
  const existing = await serverPB
    .collection(Collections.ServerMemberships)
    .getFirstListItem<ServerMembershipResponse>(serverPB.filter('server = {:serverId} && user = {:userId}', { serverId, userId }))
    .catch(() => null);

  const hasAnyPermission = Object.values(permissions).some(Boolean);
  if (!hasAnyPermission) {
    if (existing) await serverPB.collection(Collections.ServerMemberships).delete(existing.id);
    return;
  }

  if (existing) {
    await serverPB.collection(Collections.ServerMemberships).update(existing.id, permissions);
    return;
  }

  await serverPB.collection(Collections.ServerMemberships).create({
    server: serverId,
    user: userId,
    ...permissions
  });
}

export async function load({ params, locals }) {
  const { server, access } = await requireServerCapability(params.serverID, { user: locals.user }, 'canManageAccess');

  const [memberships, users] = await Promise.all([getServerMemberships(server.id), getUserDirectory()]);

  return {
    server,
    access,
    memberships,
    users: users.filter((entry) => entry.user.id !== server.owner)
  };
}

export const actions = {
  save: async ({ params, request, locals }) => {
    await requireServerCapability(params.serverID, { user: locals.user }, 'canManageAccess');

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();
    if (!userId) return fail(400, { message: 'Missing user for membership update.' });

    await saveMembership(params.serverID, userId, normalizePermissions(formData));
    return { success: true };
  },
  delete: async ({ params, request, locals }) => {
    await requireServerCapability(params.serverID, { user: locals.user }, 'canManageAccess');

    const formData = await request.formData();
    const membershipId = formData.get('membershipId')?.toString();
    if (!membershipId) return fail(400, { message: 'Missing membership to delete.' });

    await serverPB.collection(Collections.ServerMemberships).delete(membershipId);
    return { success: true };
  }
} satisfies Actions;
