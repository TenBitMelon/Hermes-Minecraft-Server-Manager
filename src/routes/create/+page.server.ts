import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { formDataObject } from '$lib';
import { ServerCreationSchema, createNewServer } from '$lib/servers';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = formDataObject(await request.formData());

    const data = ServerCreationSchema.safeParse(formData);
    if (!data.success) return fail(400, { errors: data.error.flatten().fieldErrors });

    try {
      createNewServer(data.data);
    } catch (e: unknown) {
      if (e instanceof Error) return fail(500, { errors: {}, message: e.message });
      console.error(e);
      return fail(500, { errors: {}, message: 'Unknown error' });
    }

    throw redirect(303, '/');
    return { errors: {}, success: true };
  }
};
