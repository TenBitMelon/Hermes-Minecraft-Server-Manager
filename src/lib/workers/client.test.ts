import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerStatus, type WorkerResponse } from '$lib/database/types';
import { CustomError } from '$lib/types';
import { getWorkerRequestTimeoutMs } from '$lib/runtime';
import { RemoteWorkerClient } from './transport';
import { env, resetEnv } from '../../test/stubs/private-env';

afterEach(() => {
  resetEnv();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function workerWith(overrides: Partial<WorkerResponse> = {}): WorkerResponse {
  return {
    id: 'wrk_1',
    collectionId: '2f0o4v7l4r1k9sy',
    collectionName: 'workers',
    name: 'mc-node-1',
    baseUrl: 'http://10.0.0.5:3000',
    apiToken: 'token',
    apiTokenHash: 'hash',
    status: WorkerStatus.Online,
    publicAddress: 'mc-node-1.example.com',
    portMin: 30000,
    portMax: 30010,
    avoidDefaultPort: true,
    serverCapacity: 25,
    runningServerCount: 0,
    totalServerCount: 0,
    lastHeartbeatAt: new Date().toISOString(),
    lastHeartbeatVersion: '1',
    lastHeartbeatError: '',
    created: '2026-03-20 20:30:00.000Z',
    updated: '2026-03-20 20:30:00.000Z',
    ...overrides
  } as WorkerResponse;
}

// transport.ts holds the adapters and never imports the database, so they can be
// constructed directly in a test.
function remoteClientFor(worker: WorkerResponse) {
  return new RemoteWorkerClient(worker);
}

describe('RemoteWorkerClient request handling', () => {
  it('returns an err rather than throwing when baseUrl is malformed', async () => {
    // new URL throws on a bad base URL. Evaluated as an argument expression it would
    // reject the method, and an unhandled rejection terminates the process under
    // Node's default --unhandled-rejections=throw.
    const client = await remoteClientFor(workerWith({ baseUrl: 'not a url' }));

    const result = await client.getHealth(workerWith({ baseUrl: 'not a url' }));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain('invalid base URL');
  });

  it('returns an err rather than throwing when baseUrl has no scheme', async () => {
    const client = await remoteClientFor(workerWith({ baseUrl: '10.0.0.5:3000' }));

    const result = await client.getHealth(workerWith({ baseUrl: '10.0.0.5:3000' }));

    expect(result.isErr()).toBe(true);
  });

  it('aborts a request that never gets a response', async () => {
    // The health loop awaits workers one at a time, so a worker that accepts the
    // connection and then goes quiet would stall every worker queued behind it,
    // forever, while the control plane kept reporting them all as online.
    env.HERMES_WORKER_REQUEST_TIMEOUT_MS = '50';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
          })
      )
    );

    const client = await remoteClientFor(workerWith());
    const result = await client.getHealth(workerWith());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain('Failed to reach worker');
  });

  it('passes an abort signal on ordinary requests', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ version: '1', runningServerCount: 1, totalServerCount: 1, availablePorts: 2 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await remoteClientFor(workerWith());
    await client.getHealth(workerWith());

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('omits the abort signal for backup creation', async () => {
    // Archive length is bounded by world size, not by a sensible number of seconds,
    // so a fixed timeout would break large backups. This path is not on the health
    // route, so an unbounded wait cannot stall the loop that judges worker health.
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = await remoteClientFor(workerWith());
    await client.createBackup('srv_1');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBeUndefined();
  });

  it('sends the bearer token it was configured with', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ version: '1', runningServerCount: 0, totalServerCount: 0, availablePorts: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const worker = workerWith({ apiToken: 'shared-secret' });
    const client = await remoteClientFor(worker);
    await client.getHealth(worker);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer shared-secret');
  });
});

describe('getWorkerRequestTimeoutMs', () => {
  it('defaults to 30 seconds', () => {
    expect(getWorkerRequestTimeoutMs()).toBe(30_000);
  });

  it('reads an override in milliseconds', () => {
    env.HERMES_WORKER_REQUEST_TIMEOUT_MS = '5000';
    expect(getWorkerRequestTimeoutMs()).toBe(5000);
  });

  it('falls back to the default for a nonsense value', () => {
    // A bad value must not disable the timeout, which would reintroduce the stall.
    env.HERMES_WORKER_REQUEST_TIMEOUT_MS = 'soon';
    expect(getWorkerRequestTimeoutMs()).toBe(30_000);
  });

  it('falls back to the default for a non-positive value', () => {
    env.HERMES_WORKER_REQUEST_TIMEOUT_MS = '-1';
    expect(getWorkerRequestTimeoutMs()).toBe(30_000);
  });
});

describe('CustomError.from', () => {
  it('keeps a message for an abort so the caller can report it', () => {
    const error = CustomError.from(new DOMException('The operation was aborted.', 'AbortError'), 'Failed to reach worker mc-node-1.');

    expect(error.message).toBe('Failed to reach worker mc-node-1.');
    expect(error.error?.message).toBe('The operation was aborted.');
  });
});
