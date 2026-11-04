import { redirect } from '@sveltejs/kit';

export async function POST({ locals }) {
  locals.pb.authStore.clear();
  locals.user = null;

  throw redirect(303, '/');
}
