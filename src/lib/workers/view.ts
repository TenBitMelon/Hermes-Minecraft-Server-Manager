import type { WorkerResponse } from '$lib/database/types';
import type { WorkerStatus } from '$lib/database/types';

// A WorkerResponse carries the credential the control plane uses to drive the worker.
// It also carries the worker's internal address and its last heartbeat error. None of
// that belongs in a page payload, so every worker value that crosses into the UI goes
// through one of the projections below first.
//
// A worker record is never passed to a component directly. The projections are the only
// supported way to hand one to SvelteKit, which serialises the load result into the page.

type WorkerWithDerivedStatus = WorkerResponse & { derivedStatus: WorkerStatus };

/** Everything a worker may hold that must never reach a browser. */
const workerSecretFields = ['apiToken', 'apiTokenHash'] as const;

/**
 * Safe for any page, including publicly reachable ones. Carries only what the UI
 * renders next to a server.
 */
export function workerSummary(worker: WorkerWithDerivedStatus) {
  return {
    id: worker.id,
    name: worker.name,
    derivedStatus: worker.derivedStatus
  };
}

export type WorkerSummary = ReturnType<typeof workerSummary>;

/**
 * Safe for any signed-in page that offers a host choice. Adds the capacity counters
 * and port range a user needs to pick a home for their data, but still omits the
 * worker's address and credential.
 */
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

/**
 * Fields for the admin page.
 * Drops the credential
 */
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
