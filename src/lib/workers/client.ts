import { serverPB } from '$lib/database';
import { Collections, type ServerResponse, type WorkerResponse } from '$lib/database/types';
import type { CustomError } from '$lib/types';
import type { Result as NeverthrowResult } from 'neverthrow';
import { getWorkerClientForWorker, type WorkerClient } from './transport';

export { LocalWorkerClient, RemoteWorkerClient, getWorkerClientForWorker } from './transport';
export type { ProvisionServerInput, WorkerClient } from './transport';

export async function getWorkerRecordForServer(serverID: string): Promise<WorkerResponse | null> {
  const server = await serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID);
  if (!server.worker) return null;
  return serverPB
    .collection(Collections.Workers)
    .getOne<WorkerResponse>(server.worker)
    .catch(() => null);
}

export async function getWorkerClientForServer(serverID: string): Promise<NeverthrowResult<WorkerClient, CustomError>> {
  const worker = await getWorkerRecordForServer(serverID);
  return getWorkerClientForWorker(worker);
}
