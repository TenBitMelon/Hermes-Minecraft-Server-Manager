import { serverPB } from '$lib/database';
import { Collections, type ServerMembershipResponse } from '$lib/database/types';
import { getServerMemberships, getUserDirectory, requireServerCapability } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

const capabilityFields = ['canStartStop', 'canSendConsole', 'canManageFiles', 'canManageAccess', 'canManageConfig'] as const;

type Capabilities = ReturnType<typeof normalizePermissions>;

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

/**
 * Ownership and administration are the only real sources of operational control over a
 * server. Delegated access must therefore never be able to hand out more than the person
 * delegating already holds, otherwise "manage access" silently becomes "own the server".
 */
function findUngrantableCapabilities(requested: Capabilities, held: Capabilities) {
  return capabilityFields.filter((capability) => requested[capability] && !held[capability]);
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
    grantableCapabilities: capabilityFields.filter((capability) => access[capability]),
    memberships,
    users: users.filter((entry) => entry.user.id !== server.owner)
  };
}

export const actions = {
  save: async ({ params, request, locals }) => {
    const { server, access } = await requireServerCapability(params.serverID, { user: locals.user }, 'canManageAccess');

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();
    if (!userId) return fail(400, { message: 'Missing user for membership update.' });

    if (userId === locals.user?.id) return fail(403, { message: 'You cannot change your own access.' });

    // The owner already has every capability, so a membership row for them would only be
    // a stale grant waiting to outlive a future ownership transfer.
    if (userId === server.owner) return fail(403, { message: "The owner's access cannot be edited here." });

    const permissions = normalizePermissions(formData);

    const ungrantable = findUngrantableCapabilities(permissions, access);
    if (ungrantable.length > 0) {
      return fail(403, { message: `You cannot grant access you do not have yourself: ${ungrantable.join(', ')}.` });
    }

    await saveMembership(params.serverID, userId, permissions);
    return { success: true };
  },
  delete: async ({ params, request, locals }) => {
    await requireServerCapability(params.serverID, { user: locals.user }, 'canManageAccess');

    const formData = await request.formData();
    const membershipId = formData.get('membershipId')?.toString();
    if (!membershipId) return fail(400, { message: 'Missing membership to delete.' });

    // Without this the id is trusted as-is, so manage access on one server would be
    // enough to remove grants belonging to a different server.
    const membership = await serverPB
      .collection(Collections.ServerMemberships)
      .getOne(membershipId)
      .catch(() => null);
    if (!membership || membership.server !== params.serverID) {
      return fail(404, { message: 'That access grant does not belong to this server.' });
    }

    await serverPB.collection(Collections.ServerMemberships).delete(membershipId);
    return { success: true };
  }
} satisfies Actions;
