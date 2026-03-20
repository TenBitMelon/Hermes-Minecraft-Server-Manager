import { getServerVersionCatalog } from '$lib/server/serverVersions';
import { json } from '@sveltejs/kit';

export async function GET() {
  return json(await getServerVersionCatalog());
}
