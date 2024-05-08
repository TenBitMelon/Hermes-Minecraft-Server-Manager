import { serverPB } from '$lib/database';
import { Collections, type BackupRecord, type BackupResponse } from '$lib/database/types';
import { CustomError, type ServerBackup } from '$lib/types';
import { zip } from '$lib/zip';
import fs from 'fs';
import { Result, ResultAsync, err, ok } from 'neverthrow';
import path from 'path';

export async function createBackup(serverID: string, backupName: string = ''): Promise<Result<void, CustomError>> {
  const serverFolder = path.resolve(`servers/${serverID}/`);
  if (!fs.existsSync(serverFolder)) return err(new CustomError("Server folder doesn't exist!"));

  const zipResult = await zip(serverFolder, '/tmp/server-backup.zip', ['**/libraries/**', '**/.*/**', '**/.**']);
  if (zipResult.isErr()) return err(zipResult.error);

  const zipFile = Result.fromThrowable(
    () => fs.readFileSync('/tmp/server-backup.zip'),
    (e) => CustomError.from(e, 'Failed to read the zip file')
  )();
  if (zipFile.isErr()) return err(zipFile.error);

  return ResultAsync.fromPromise(
    serverPB.collection(Collections.Backups).create<BackupRecord | { file: File }, BackupResponse>({
      name: backupName,
      file: new File([zipFile.value], `${new Date().toISOString()} - ${backupName}.zip`),
      serverID: serverID,
      fileSize: zipFile.value.byteLength
    }),
    (e) => CustomError.from(e, 'Failed to create backup record in database')
  ).map(() => undefined);
}
