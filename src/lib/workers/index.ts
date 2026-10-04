import { WorkerStatus, type WorkerRecord, type WorkerResponse } from '$lib/database/types';
import { canRunControlPlane } from '$lib/runtime';
import { CustomError } from '$lib/types';
import { serverPB } from '$lib/database';
import { Collections } from '$lib/database/types';
import { getWorkerClientForWorker } from './client';
import { deriveWorkerStatus, hashWorkerToken } from './status';

export { deriveWorkerStatus, hashWorkerToken };

export async function syncWorkersHealth() {
  if (!canRunControlPlane()) return;

  const workers = await serverPB.collection(Collections.Workers).getFullList<WorkerResponse>();
  for (const worker of workers) {
    if (worker.status === WorkerStatus.Disabled) continue;
    try {
      const workerClient = getWorkerClientForWorker(worker);
      if (workerClient.isErr()) {
        await markWorkerUnreachable(worker, workerClient.error);
        continue;
      }

      const health = await workerClient.value.getHealth(worker);
      if (health.isErr()) {
        await markWorkerUnreachable(worker, health.error);
        continue;
      }

      await serverPB.collection(Collections.Workers).update(worker.id, {
        status: WorkerStatus.Online,
        runningServerCount: health.value.runningServerCount,
        totalServerCount: health.value.totalServerCount,
        lastHeartbeatAt: new Date().toISOString(),
        lastHeartbeatVersion: health.value.version,
        lastHeartbeatError: ''
      } satisfies Partial<WorkerRecord>);
    } catch (error) {
      console.error(`[hermes] health sync failed for worker ${worker.id}`, error);
      await markWorkerUnreachable(worker, CustomError.from(error, `Failed to sync worker ${worker.name}.`)).catch(() => undefined);
    }
  }
}

async function markWorkerUnreachable(worker: WorkerResponse, error: CustomError) {
  await serverPB.collection(Collections.Workers).update(worker.id, {
    status: WorkerStatus.Offline,
    lastHeartbeatError: error.message
  } satisfies Partial<WorkerRecord>);
}

export async function getWorkersWithDerivedStatus() {
  const workers = await serverPB.collection(Collections.Workers).getFullList<WorkerResponse>();
  return workers.map((worker) => ({
    ...worker,
    derivedStatus: deriveWorkerStatus(worker)
  }));
}

export function getWorkerAvailabilitySummary(worker: WorkerResponse | null | undefined) {
  if (!worker) return { status: WorkerStatus.Online, label: 'Local runtime' };

  const status = deriveWorkerStatus(worker);
  switch (status) {
    case WorkerStatus.Online:
      return { status, label: `${worker.name} online` };
    case WorkerStatus.Restarting:
      return { status, label: `${worker.name} restarting` };
    case WorkerStatus.Disabled:
      return { status, label: `${worker.name} disabled` };
    case WorkerStatus.Offline:
    default:
      return { status, label: `${worker.name} offline` };
  }
}

export function workerError(message: string) {
  return new CustomError(message);
}
