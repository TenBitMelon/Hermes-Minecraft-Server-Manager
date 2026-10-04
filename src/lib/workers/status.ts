import { WorkerStatus, type WorkerResponse } from '$lib/database/types';
import { getWorkerOfflineThresholdMs, getWorkerRestartingThresholdMs } from '$lib/runtime';
import { createHash } from 'node:crypto';

export function hashWorkerToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Works out how usable a worker is from how stale its last heartbeat is.
 *
 * This only ever runs on the control plane.
 */
export function deriveWorkerStatus(worker: Pick<WorkerResponse, 'status' | 'lastHeartbeatAt'>, now: number = Date.now()) {
  if (worker.status === WorkerStatus.Disabled) return WorkerStatus.Disabled;
  if (!worker.lastHeartbeatAt) return WorkerStatus.Offline;

  const age = now - Date.parse(worker.lastHeartbeatAt);
  if (Number.isNaN(age)) return WorkerStatus.Offline;
  if (age >= getWorkerOfflineThresholdMs()) return WorkerStatus.Offline;
  if (age >= getWorkerRestartingThresholdMs()) return WorkerStatus.Restarting;
  return WorkerStatus.Online;
}
