import { formDataObject } from '$lib';
import { createNewServer } from '$lib/servers';
import { ServerCreationSchema } from '$lib/servers/schema';
import { isSupportedServerVersion } from '$lib/server/serverVersions';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { canCreateServers, requireLogin } from '$lib/server/auth';

export async function load({ locals }) {
  requireLogin({ user: locals.user });
  if (!(await canCreateServers(locals.user))) return error(403, 'You cannot create a server at this time.');
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    requireLogin({ user: locals.user });
    if (!(await canCreateServers(locals.user))) return fail(403, { success: false, fields: {}, message: 'You have reached your server quota.' });

    const formData = formDataObject(await request.formData());

    const data = ServerCreationSchema.safeParse(formData);
    if (!data.success) return fail(400, { success: false, fields: data.error.flatten().fieldErrors, message: 'Some of the inputs are incorrect' });
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

    const createServerResult = await createNewServer(data.data, locals.user!.id);
    if (createServerResult.isErr()) {
      // TODO: Handle this on page
      return fail(500, { success: false, fields: {}, message: createServerResult.error.message });
    }

    redirect(303, '/');
    return { success: true } as { success: true };
  }
};
