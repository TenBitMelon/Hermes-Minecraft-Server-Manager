import { serverPB } from '$lib/database';
import { Collections, WorkerStatus, type WorkerRecord, type WorkerResponse } from '$lib/database/types';
import { canRunControlPlane, getWorkerOfflineThresholdMs, getWorkerRestartingThresholdMs } from '$lib/runtime';
import { CustomError } from '$lib/types';
import { createHash } from 'node:crypto';
import { getWorkerClientForWorker } from './client';

export function hashWorkerToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function deriveWorkerStatus(worker: WorkerResponse) {
  if (worker.status === WorkerStatus.Disabled) return WorkerStatus.Disabled;
  if (!worker.lastHeartbeatAt) return WorkerStatus.Offline;

  const age = Date.now() - Date.parse(worker.lastHeartbeatAt);
  if (age >= getWorkerOfflineThresholdMs()) return WorkerStatus.Offline;
  if (age >= getWorkerRestartingThresholdMs()) return WorkerStatus.Restarting;
  return WorkerStatus.Online;
}

export async function syncWorkersHealth() {
  if (!canRunControlPlane()) return;

  const workers = await serverPB.collection(Collections.Workers).getFullList<WorkerResponse>();
  for (const worker of workers) {
    if (worker.status === WorkerStatus.Disabled) continue;

    const workerClient = getWorkerClientForWorker(worker);
    if (workerClient.isErr()) {
      await serverPB.collection(Collections.Workers).update(worker.id, {
        status: WorkerStatus.Offline,
        lastHeartbeatError: workerClient.error.message
      } satisfies Partial<WorkerRecord>);
      continue;
    }

    const health = await workerClient.value.getHealth(worker);
    if (health.isErr()) {
      await serverPB.collection(Collections.Workers).update(worker.id, {
        status: WorkerStatus.Offline,
        lastHeartbeatError: health.error.message
      } satisfies Partial<WorkerRecord>);
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
  }
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
