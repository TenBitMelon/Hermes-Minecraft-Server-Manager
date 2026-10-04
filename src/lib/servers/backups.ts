import { serverPB } from '$lib/database';
import { Collections, type BackupResponse } from '$lib/database/types';
import { CustomError } from '$lib/types';
import { Result, ResultAsync, err } from 'neverthrow';
import { getWorkerClientForServer } from '$lib/workers/client';

export async function createBackup(serverID: string, backupName: string = ''): Promise<Result<void, CustomError>> {
  if (backupName == '') {
    const dbResult = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).getOne(serverID), (e) => CustomError.from(e, 'Failed to get the existing server in the database'));
    if (dbResult.isOk()) backupName = dbResult.value.title;
  }

  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);
  const zipFile = await workerClient.value.createBackup(serverID);
  if (zipFile.isErr()) return err(zipFile.error);

  return ResultAsync.fromPromise(
    serverPB.collection(Collections.Backups).create<BackupResponse>({
      name: backupName,
      file: new File([zipFile.value], `${new Date().toISOString()} - ${backupName}.zip`),
      serverID: serverID,
      fileSize: zipFile.value.byteLength
    }),
    (e) => CustomError.from(e, 'Failed to create backup record in database')
  ).map(() => undefined);
}
