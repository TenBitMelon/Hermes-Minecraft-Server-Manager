import { serverPB } from '$lib/database';
import { Collections } from '$lib/database/types';
import { removeContainer } from '$lib/docker';
import { getUserDirectory, requireAdministrator } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

const maxOwnedServerLimit = 1000;

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

    if (!userId) return fail(400, { message: 'Missing required user profile values.' });

    // Number() happily produces Infinity, negatives and fractions, and the
    // collection has no min or max, so reject anything that is not a plain
    // count within range rather than just checking for NaN.
    if (!Number.isInteger(ownedServerLimit) || ownedServerLimit < 0 || ownedServerLimit > maxOwnedServerLimit) {
      return fail(400, { message: `Owned server limit must be a whole number between 0 and ${maxOwnedServerLimit}.` });
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
  },
  deleteServer: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const serverId = formData.get('serverId')?.toString();
    if (!serverId) return fail(400, { message: 'Missing server to delete.' });

    const removeResult = await removeContainer(serverId, true);
    if (removeResult.isErr()) return fail(500, { message: removeResult.error.message });

    return { success: true, message: 'Server deleted.' };
  }
} satisfies Actions;
