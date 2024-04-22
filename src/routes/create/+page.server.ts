import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { formDataObject } from '$lib';
import { createNewServer } from '$lib/servers';
import { ServerCreationSchema } from '$lib/servers/schema';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = formDataObject(await request.formData());

    const data = ServerCreationSchema.safeParse(formData);
    if (!data.success) return fail(400, { errors: data.error.flatten().fieldErrors });

    const createServerResult = await createNewServer(data.data);
    if (createServerResult.isErr()) {
      return fail(500, { errors: {}, message: createServerResult.error.message, cause: createServerResult.error.cause });
    }

    redirect(303, '/');
    return { errors: {}, success: true };
  }
};
