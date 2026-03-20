// http://0.0.0.0:8090/api/files/80olb9b23s3qall/70of1w247c4k8h2/17cae35fbcbb5cfdc23894dd33b9da0bad0f03c2_6dMTIrIIyy.webp

import { serverPB } from '$lib/database/index.js';
import { Collections } from '$lib/database/types';
import { requireAdministrator, requireServerCapability } from '$lib/server/auth';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
  const queryParameters = url.searchParams;
  console.log(queryParameters);

  const collectionID = queryParameters.get('collectionID') || queryParameters.get('collection') || queryParameters.get('cid');
  const recordID = queryParameters.get('recordID') || queryParameters.get('id') || queryParameters.get('rid');
  const filename = queryParameters.get('filename') || queryParameters.get('file') || queryParameters.get('name');
  const download = !!queryParameters.get('download');

  if (!filename || !recordID || !collectionID) error(400, (!filename ? 'filename, ' : '') + (!recordID ? 'recordID, ' : '') + (!collectionID ? 'collectionID, ' : '') + 'are required');

  const serverRecord = await serverPB
    .collection(Collections.Servers)
    .getOne(recordID)
    .catch(() => null);
  if (serverRecord?.collectionId === collectionID) {
    // await requireServerCapability(serverRecord.id, { user: locals.user }, 'canViewDashboard');
  } else {
    const backupRecord = await serverPB
      .collection(Collections.Backups)
      .getOne(recordID)
      .catch(() => null);
    if (backupRecord?.collectionId === collectionID) {
      await requireServerCapability(backupRecord.serverID, { user: locals.user }, 'canViewDashboard');
    } else {
      const userRecord = await serverPB
        .collection(Collections.Users)
        .getOne(recordID)
        .catch(() => null);
      if (userRecord?.collectionId === collectionID) {
        if (!locals.user) error(403, 'Forbidden');
        if (locals.user.id !== userRecord.id) requireAdministrator({ user: locals.user });
      } else {
        requireAdministrator({ user: locals.user });
      }
    }
  }

  const fileURL = await serverPB.files.getUrl({ id: recordID, collectionId: collectionID, collectionName: '' }, filename);
  const imageResponse = await fetch(fileURL);
  if (!imageResponse.ok) error(imageResponse.status, imageResponse.statusText);

  const headers = new Headers();
  const contentType = imageResponse.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (download) headers.set('content-disposition', `attachment; filename="${filename}"`);

  return new Response(await imageResponse.arrayBuffer(), { headers });
}
