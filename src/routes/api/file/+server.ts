// http://0.0.0.0:8090/api/files/80olb9b23s3qall/70of1w247c4k8h2/17cae35fbcbb5cfdc23894dd33b9da0bad0f03c2_6dMTIrIIyy.webp

import { serverPB } from '$lib/database/index.js';
import { Collections } from '$lib/database/types';
import { requireAdministrator, requireServerCapability } from '$lib/server/auth';
import { error } from '@sveltejs/kit';

function contentDispositionFilename(filename: string) {
  return filename.replace(/[\r\n"\\]/g, '_');
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
  const queryParameters = url.searchParams;

  const collectionID = queryParameters.get('collectionID') || queryParameters.get('collection') || queryParameters.get('cid');
  const recordID = queryParameters.get('recordID') || queryParameters.get('id') || queryParameters.get('rid');
  const filename = queryParameters.get('filename') || queryParameters.get('file') || queryParameters.get('name');
  const download = !!queryParameters.get('download');

  if (!filename || !recordID || !collectionID) error(400, (!filename ? 'filename, ' : '') + (!recordID ? 'recordID, ' : '') + (!collectionID ? 'collectionID, ' : '') + 'are required');

  const viewer = { user: locals.user };
  // Protected file fields are only served by PocketBase when the request carries a
  // file token, so remember whether we have to ask for one.
  let needsFileToken = false;

  const serverRecord = await serverPB
    .collection(Collections.Servers)
    .getOne(recordID)
    .catch(() => null);
  if (serverRecord?.collectionId === collectionID) {
    // The icon is rendered on the public server list, so it stays world readable.
    // Every other file on a server record (the zipped server files) holds world
    // saves, player data and server properties, so it needs permission.
    if (filename !== serverRecord.icon) {
      await requireServerCapability(serverRecord.id, viewer, 'canManageFiles');
      needsFileToken = true;
    }
  } else {
    const backupRecord = await serverPB
      .collection(Collections.Backups)
      .getOne(recordID)
      .catch(() => null);
    if (backupRecord?.collectionId === collectionID) {
      await requireServerCapability(backupRecord.serverID, viewer, 'canViewDashboard');
      needsFileToken = true;
    } else {
      const userRecord = await serverPB
        .collection(Collections.Users)
        .getOne(recordID)
        .catch(() => null);
      if (userRecord?.collectionId === collectionID) {
        if (!locals.user) error(403, 'Forbidden');
        if (locals.user.id !== userRecord.id) requireAdministrator({ user: locals.user });
        needsFileToken = true;
      } else {
        requireAdministrator({ user: locals.user });
        needsFileToken = true;
      }
    }
  }

  const record = { id: recordID, collectionId: collectionID, collectionName: '' };
  const fileURL = needsFileToken ? serverPB.files.getUrl(record, filename, { token: await serverPB.files.getToken() }) : serverPB.files.getUrl(record, filename);

  const imageResponse = await fetch(fileURL);
  if (!imageResponse.ok) error(imageResponse.status, imageResponse.statusText);

  const headers = new Headers();
  const contentType = imageResponse.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (download) headers.set('content-disposition', `attachment; filename="${contentDispositionFilename(filename)}"`);

  return new Response(await imageResponse.arrayBuffer(), { headers });
}
