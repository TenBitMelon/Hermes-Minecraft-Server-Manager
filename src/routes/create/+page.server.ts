import { formDataObject } from '$lib';
import { serverPB } from '$lib/database';
import { Collections } from '$lib/database/types';
import { createNewServer } from '$lib/servers';
import { ServerCreationSchema } from '$lib/servers/schema';
import { isSupportedServerVersion } from '$lib/server/serverVersions';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { canCreateServers, requireLogin } from '$lib/server/auth';
import { getWorkersWithDerivedStatus } from '$lib/workers';

export async function load({ locals }) {
  requireLogin({ user: locals.user });
  if (!(await canCreateServers(locals.user))) return error(403, 'You cannot create a server at this time.');

  return {
    workers: await getWorkersWithDerivedStatus()
  };
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    requireLogin({ user: locals.user });
    if (!(await canCreateServers(locals.user))) return fail(403, { success: false, fields: {}, message: 'You have reached your server quota.' });

    const formData = formDataObject(await request.formData());

    const data = ServerCreationSchema.safeParse(formData);
    if (!data.success) return fail(400, { success: false, fields: data.error.flatten().fieldErrors, message: 'Some of the inputs are incorrect' });

    const existingServers = await serverPB.collection(Collections.Servers).getList(1, 1, {
      filter: `subdomain="${data.data.subdomain}"`
    });
    if (existingServers.items.length > 0) {
      return fail(400, {
        success: false,
        fields: {
          subdomain: ['That subdomain is already in use. Pick a different one.']
        },
        message: 'Choose a unique subdomain.'
      });
    }

    if (data.data.whitelist.length < 1) {
      return fail(400, {
        success: false,
        fields: {
          whitelist: ['Add at least one player to the whitelist.']
        },
        message: 'At least one whitelisted player is required.'
      });
    }
    if (!(await isSupportedServerVersion(data.data.serverSoftware, data.data.gameVersion))) {
      return fail(400, {
        success: false,
        fields: {
          gameVersion: ['That Minecraft version is not currently available for the selected server software.']
        },
        message: 'Select a currently supported version.'
      });
    }

    const createServerResult = await createNewServer(data.data, locals.user!.id, data.data.worker || null);
    if (createServerResult.isErr()) {
      const duplicateSubdomain = /subdomain is already in use|already in use in cloudflare/i.test(createServerResult.error.message);
      return fail(duplicateSubdomain ? 400 : 500, {
        success: false,
        fields: duplicateSubdomain
          ? {
              subdomain: ['That subdomain is already in use. Pick a different one.']
            }
          : {},
        message: createServerResult.error.message
      });
    }

    redirect(303, '/');
    return { success: true } as { success: true };
  }
};
