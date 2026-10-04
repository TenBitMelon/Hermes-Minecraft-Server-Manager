import { describe, expect, it } from 'vitest';
import { WorkerStatus, type WorkerResponse } from '$lib/database/types';
import { deriveWorkerStatus, hashWorkerToken } from './status';
import { hasWorkerSecretFields, workerAdminView, workerPickerView, workerSummary } from './view';
import { env, resetEnv } from '../../test/stubs/private-env';

function workerWith(overrides: Partial<Pick<WorkerResponse, 'status' | 'lastHeartbeatAt'>>) {
  return { status: WorkerStatus.Online, lastHeartbeatAt: new Date().toISOString(), ...overrides } as WorkerResponse;
}

function fullWorker(): WorkerResponse {
  return {
    id: 'wrk_1',
    collectionId: '2f0o4v7l4r1k9sy',
    collectionName: 'workers',
    name: 'mc-node-1',
    baseUrl: 'http://10.0.0.5:3000',
    apiToken: 'super-secret-token',
    apiTokenHash: 'deadbeef',
    status: WorkerStatus.Online,
    publicAddress: 'mc-node-1.example.com',
    portMin: 30000,
    portMax: 30010,
    avoidDefaultPort: true,
    serverCapacity: 25,
    runningServerCount: 2,
    totalServerCount: 4,
    lastHeartbeatAt: new Date().toISOString(),
    lastHeartbeatVersion: '1',
    lastHeartbeatError: '',
    created: '2026-03-20 20:30:00.000Z',
    updated: '2026-03-20 20:30:00.000Z'
  } as WorkerResponse;
}

describe('deriveWorkerStatus', () => {
  it('treats a disabled worker as disabled no matter how fresh the heartbeat', () => {
    expect(deriveWorkerStatus(workerWith({ status: WorkerStatus.Disabled }))).toBe(WorkerStatus.Disabled);
  });

  it('treats a worker that never reported as offline', () => {
    expect(deriveWorkerStatus(workerWith({ lastHeartbeatAt: '' }))).toBe(WorkerStatus.Offline);
  });

  it('reports a fresh heartbeat as online', () => {
    expect(deriveWorkerStatus(workerWith({}))).toBe(WorkerStatus.Online);
  });

  it('escalates to restarting once the heartbeat is old enough', () => {
    resetEnv();
    env.HERMES_WORKER_RESTARTING_AFTER_SECONDS = '45';
    env.HERMES_WORKER_OFFLINE_AFTER_SECONDS = '120';

    const now = Date.parse('2026-03-20T12:00:00.000Z');
    const worker = workerWith({ lastHeartbeatAt: new Date(now - 60_000).toISOString() });

    expect(deriveWorkerStatus(worker, now)).toBe(WorkerStatus.Restarting);
  });

  it('escalates to offline past the offline threshold', () => {
    resetEnv();
    env.HERMES_WORKER_RESTARTING_AFTER_SECONDS = '45';
    env.HERMES_WORKER_OFFLINE_AFTER_SECONDS = '120';

    const now = Date.parse('2026-03-20T12:00:00.000Z');
    const worker = workerWith({ lastHeartbeatAt: new Date(now - 300_000).toISOString() });

    expect(deriveWorkerStatus(worker, now)).toBe(WorkerStatus.Offline);
  });

  it('ignores the stored status when the heartbeat is stale', () => {
    // The stored status is a cache written by a background loop that can stop
    // running while the control plane stays up, so age wins over what it says.
    resetEnv();
    env.HERMES_WORKER_OFFLINE_AFTER_SECONDS = '120';

    const now = Date.parse('2026-03-20T12:00:00.000Z');
    const worker = workerWith({ status: WorkerStatus.Online, lastHeartbeatAt: new Date(now - 600_000).toISOString() });

    expect(deriveWorkerStatus(worker, now)).toBe(WorkerStatus.Offline);
  });

  it('falls back to offline for an unparseable heartbeat', () => {
    expect(deriveWorkerStatus(workerWith({ lastHeartbeatAt: 'not-a-date' }))).toBe(WorkerStatus.Offline);
  });
});

describe('worker projections', () => {
  it('reduces a worker to only what a public page renders', () => {
    const summary = workerSummary({ ...fullWorker(), derivedStatus: WorkerStatus.Online });

    expect(summary).toEqual({ id: 'wrk_1', name: 'mc-node-1', derivedStatus: WorkerStatus.Online });
    expect(hasWorkerSecretFields(summary)).toBe(false);
  });

  it('never leaks the credential through the public summary', () => {
    const summary = JSON.stringify(workerSummary({ ...fullWorker(), derivedStatus: WorkerStatus.Online }));

    expect(summary).not.toContain('super-secret-token');
    expect(summary).not.toContain('deadbeef');
    expect(summary).not.toContain('10.0.0.5');
  });

  it('keeps the operational fields the admin form edits', () => {
    const view = workerAdminView({ ...fullWorker(), derivedStatus: WorkerStatus.Restarting });

    expect(view.baseUrl).toBe('http://10.0.0.5:3000');
    expect(view.portMin).toBe(30000);
    expect(view.serverCapacity).toBe(25);
    expect(view.derivedStatus).toBe(WorkerStatus.Restarting);
  });

  it('gives the host picker the capacity counters it renders', () => {
    const view = workerPickerView({ ...fullWorker(), derivedStatus: WorkerStatus.Online });

    expect(view.name).toBe('mc-node-1');
    expect(view.runningServerCount).toBe(2);
    expect(view.totalServerCount).toBe(4);
    expect(view.portMin).toBe(30000);
    expect(view.portMax).toBe(30010);
  });

  it('keeps the worker address and credential out of the host picker', () => {
    // The picker is reachable by any signed-in user, so it gets counters but not the
    // address the control plane dials.
    const view = workerPickerView({ ...fullWorker(), derivedStatus: WorkerStatus.Online });

    expect(hasWorkerSecretFields(view)).toBe(false);
    expect('baseUrl' in view).toBe(false);
    expect('publicAddress' in view).toBe(false);
  });

  it('still drops the credential from the admin view', () => {
    // The admin page is authenticated, but a token readable out of the page source is
    // still a token in a browser cache, a proxy log and a screenshot.
    const view = workerAdminView({ ...fullWorker(), derivedStatus: WorkerStatus.Online });

    expect(hasWorkerSecretFields(view)).toBe(false);
    expect('apiToken' in view).toBe(false);
    expect('apiTokenHash' in view).toBe(false);
  });
});

describe('hashWorkerToken', () => {
  it('is stable and does not contain the token', () => {
    const hash = hashWorkerToken('super-secret-token');

    expect(hash).toBe(hashWorkerToken('super-secret-token'));
    expect(hash).not.toContain('super-secret-token');
    expect(hash).toHaveLength(64);
  });
});
