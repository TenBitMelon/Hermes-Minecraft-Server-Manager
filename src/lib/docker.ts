import { env as publicENV } from '$env/dynamic/public';
import { ResultAsync, err } from 'neverthrow';
import { removeCloudflareRecords } from './cloudflare';
import { serverPB } from './database';
import { Collections, ServerState, type ServerRecord, type ServerResponse } from './database/types';
import { createBackup } from './servers/backups';
import { ContainerState, CustomError, type ContainerData, type ContainerResult } from './types';
import { getWorkerClientForServer } from './workers/client';
import { ComposeBuilder, localContainerDoesNotExist, type LocalContainerUsageStats as ContainerUsageStats } from './workers/localRuntime';

export { ComposeBuilder, ContainerState, localContainerDoesNotExist as containerDoesNotExists };
export type { ContainerUsageStats };

export async function startContainer(serverID: string): ContainerResult<void> {
  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);

  const containerStart = await workerClient.value.startServer(serverID);
  if (containerStart.isErr()) return err(containerStart.error);

  const dbResult = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).update<ServerRecord>(serverID, {
      state: ServerState.Running,
      startDate: new Date().toISOString(),
      shutdownDate: null,
      deletionDate: null,
      serverFilesMissing: false
    }),
    () => new CustomError('Failed to update server status on successful container start')
  );

  return dbResult.map(() => undefined);
}

export async function stopContainer(serverID: string): ContainerResult<void> {
  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);

  const containerStop = await workerClient.value.stopServer(serverID);
  if (containerStop.isErr()) return err(containerStop.error);

  const backupResult = await createBackup(serverID);
  if (backupResult.isErr()) return err(backupResult.error);

  const server = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).getOne(serverID), () => new CustomError('Failed to get server data from DB'));
  if (server.isErr()) return err(server.error);

  const updateResult = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).update(serverID, {
      state: ServerState.Stopped,
      startDate: null,
      shutdownDate: new Date().toISOString(),
      deletionDate: server.value.canBeDeleted ? new Date(Date.now() + 1000 * 60 * 60 * +publicENV.PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN).toISOString() : null,
      serverFilesMissing: false
    }),
    (e) => CustomError.from(e, 'Failed to update server data on stop')
  );
  return updateResult.map(() => undefined);
}

export async function getContainerLogs(serverID: string, lines: number | 'all'): ContainerResult<string[]> {
  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);
  return workerClient.value.getLogs(serverID, lines);
}

export async function sendCommandToContainer(serverID: string, command: string): ContainerResult<string[]> {
  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);
  return workerClient.value.sendCommand(serverID, command);
}

export async function getContainerData(serverID: string): ContainerResult<ContainerData> {
  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);
  return workerClient.value.getState(serverID);
}

export async function getContainerRunningStatus(serverID: string): ContainerResult<boolean> {
  return (await getContainerData(serverID)).map((d) => d.State === ContainerState.Running);
}

export async function getContainerUsageStats(serverID: string): ContainerResult<ContainerUsageStats> {
  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);
  return workerClient.value.getStats(serverID);
}

export async function removeContainer(serverID: string, forcibly = false): ContainerResult<void> {
  const serverRecordResult = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID), (e) => CustomError.from(e, 'Failed to get server data from DB'));
  if (serverRecordResult.isErr()) return err(serverRecordResult.error);
  const serverRecord = serverRecordResult.value;

  const workerClient = await getWorkerClientForServer(serverID);
  if (workerClient.isErr()) return err(workerClient.error);

  const removeResult = await workerClient.value.removeServer(serverID, forcibly);
  if (removeResult.isErr()) return err(removeResult.error);

  const removed = await removeCloudflareRecords(serverRecord.cloudflareCNAMERecordID, serverRecord.cloudflareSRVRecordID);
  if (removed.isErr()) return err(new CustomError(removed.error.message, removed.error));

  const dbResult = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).delete(serverID), () => new CustomError('Failed to update database after removing server'));
  return dbResult.map(() => undefined);
}
