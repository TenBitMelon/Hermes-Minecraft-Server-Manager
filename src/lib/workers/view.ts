import type { WorkerResponse } from '$lib/database/types';
import type { WorkerStatus } from '$lib/database/types';

type WorkerWithDerivedStatus = WorkerResponse & { derivedStatus: WorkerStatus };

/** Everything a worker may hold that must never reach a browser. */
const workerSecretFields = ['apiToken', 'apiTokenHash'] as const;

// Safe for ui on any page
export function workerSummary(worker: WorkerWithDerivedStatus) {
  return {
    id: worker.id,
    name: worker.name,
    derivedStatus: worker.derivedStatus
  };
}

export type WorkerSummary = ReturnType<typeof workerSummary>;

// Safe for any signed-in page
export function workerPickerView(worker: WorkerWithDerivedStatus) {
  return {
    ...workerSummary(worker),
    runningServerCount: worker.runningServerCount,
    totalServerCount: worker.totalServerCount,
    portMin: worker.portMin,
    portMax: worker.portMax,
    serverCapacity: worker.serverCapacity,
    avoidDefaultPort: worker.avoidDefaultPort
  };
}

export type WorkerPickerView = ReturnType<typeof workerPickerView>;

// Fields for the admin page.
export function workerAdminView(worker: WorkerWithDerivedStatus) {
  return {
    id: worker.id,
    collectionId: worker.collectionId,
    collectionName: worker.collectionName,
    created: worker.created,
    updated: worker.updated,
    name: worker.name,
    baseUrl: worker.baseUrl,
    status: worker.status,
    publicAddress: worker.publicAddress,
    portMin: worker.portMin,
    portMax: worker.portMax,
    avoidDefaultPort: worker.avoidDefaultPort,
    serverCapacity: worker.serverCapacity,
    runningServerCount: worker.runningServerCount,
    totalServerCount: worker.totalServerCount,
    lastHeartbeatAt: worker.lastHeartbeatAt,
    lastHeartbeatVersion: worker.lastHeartbeatVersion,
    lastHeartbeatError: worker.lastHeartbeatError,
    derivedStatus: worker.derivedStatus
  };
}

export type WorkerAdminView = ReturnType<typeof workerAdminView>;

export function hasWorkerSecretFields(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return workerSecretFields.some((field) => field in value);
}
