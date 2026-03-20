import { serverPB } from '$lib/database';
import { Collections } from '$lib/database/types';
import { getUserDirectory, requireAdministrator } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export async function load({ locals }) {
  requireAdministrator({ user: locals.user });

  const [users, servers] = await Promise.all([getUserDirectory(), serverPB.collection(Collections.Servers).getFullList()]);

  return {
    users,
    servers
  };
}

export const actions = {
  updateUser: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();
    const administrator = formData.get('administrator') === 'true';
    const ownedServerLimit = Number(formData.get('ownedServerLimit')?.toString() ?? '0');

    if (!userId || Number.isNaN(ownedServerLimit)) {
      return fail(400, { message: 'Missing required user profile values.' });
    }

    await serverPB.collection(Collections.Users).update(userId, {
      administrator,
      ownedServerLimit
    });

    return { success: true };
  },
  transferOwner: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const serverId = formData.get('serverId')?.toString();
    const ownerUserId = formData.get('ownerUserId')?.toString();
    if (!serverId || !ownerUserId) return fail(400, { message: 'Missing server transfer fields.' });

    await serverPB.collection(Collections.Servers).update(serverId, {
      owner: ownerUserId
    });

    return { success: true };
  }
} satisfies Actions;
