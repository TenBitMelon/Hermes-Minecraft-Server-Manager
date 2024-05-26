import { formDataObject } from '$lib';
import { createNewServer } from '$lib/servers';
import { ServerCreationSchema } from '$lib/servers/schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const formData = formDataObject(await request.formData());

    const data = ServerCreationSchema.safeParse(formData);
    if (!data.success) return fail(400, { success: false, fields: data.error.flatten().fieldErrors, message: 'Some of the inputs are incorrect' });

    const createServerResult = await createNewServer(data.data);
    if (createServerResult.isErr()) {
      // TODO: Handle this on page
      return fail(500, { success: false, fields: {}, message: createServerResult.error.message });
    }

    redirect(303, '/');
    return { success: true } as { success: true };
  }
};
