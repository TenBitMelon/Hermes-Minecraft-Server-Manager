import type { WorkerResponse } from '$lib/database/types';
import { canHostLocalWorker, getWorkerRequestTimeoutMs } from '$lib/runtime';
import { CustomError, type ContainerData } from '$lib/types';
import { Result, ResultAsync, err, ok, type Result as NeverthrowResult } from 'neverthrow';
import { createLocalBackupArchive, getLocalContainerData, getLocalContainerLogs, getLocalContainerUsageStats, getLocalWorkerHealth, materializeLocalServer, removeLocalServer, sendLocalCommandToContainer, startLocalContainer, stopLocalContainer, type LocalContainerUsageStats, type WorkerHealthSummary } from './localRuntime';

export type ProvisionServerInput = {
  serverID: string;
  composeContent: string;
  serverProperties?: string | null;
};

export interface WorkerClient {
  provisionServer(input: ProvisionServerInput): Promise<NeverthrowResult<void, CustomError>>;
  startServer(serverID: string): Promise<NeverthrowResult<void, CustomError>>;
  stopServer(serverID: string): Promise<NeverthrowResult<void, CustomError>>;
  sendCommand(serverID: string, command: string): Promise<NeverthrowResult<string[], CustomError>>;
  getLogs(serverID: string, lines: number | 'all'): Promise<NeverthrowResult<string[], CustomError>>;
  getStats(serverID: string): Promise<NeverthrowResult<LocalContainerUsageStats, CustomError>>;
  getState(serverID: string): Promise<NeverthrowResult<ContainerData, CustomError>>;
  removeServer(serverID: string, forcibly?: boolean): Promise<NeverthrowResult<void, CustomError>>;
  createBackup(serverID: string): Promise<NeverthrowResult<Buffer, CustomError>>;
  getHealth(worker: WorkerResponse): Promise<NeverthrowResult<WorkerHealthSummary, CustomError>>;
}

export class LocalWorkerClient implements WorkerClient {
  async provisionServer(input: ProvisionServerInput) {
    return materializeLocalServer(input.serverID, input.composeContent, input.serverProperties ?? null);
  }

  async startServer(serverID: string) {
    return startLocalContainer(serverID);
  }

  async stopServer(serverID: string) {
    return stopLocalContainer(serverID);
  }

  async sendCommand(serverID: string, command: string) {
    return sendLocalCommandToContainer(serverID, command);
  }

  async getLogs(serverID: string, lines: number | 'all') {
    return getLocalContainerLogs(serverID, lines);
  }

  async getStats(serverID: string) {
    return getLocalContainerUsageStats(serverID);
  }

  async getState(serverID: string) {
    return getLocalContainerData(serverID);
  }

  async removeServer(serverID: string, forcibly = false) {
    return removeLocalServer(serverID, forcibly);
  }

  async createBackup(serverID: string) {
    return createLocalBackupArchive(serverID);
  }

  async getHealth(worker: WorkerResponse) {
    return getLocalWorkerHealth(worker.portMin, worker.portMax, worker.avoidDefaultPort);
  }
}

export class RemoteWorkerClient implements WorkerClient {
  constructor(private readonly worker: WorkerResponse) {}

  private async fetchWorker(path: string, init?: RequestInit, timeoutMs: number = getWorkerRequestTimeoutMs()) {
    if (!this.worker.apiToken) return err(new CustomError(`Worker ${this.worker.name} is missing its API token.`));

    const urlResult = Result.fromThrowable(
      () => new URL(path, this.worker.baseUrl).toString(),
      (error) => CustomError.from(error, `Worker ${this.worker.name} has an invalid base URL.`)
    )();
    if (urlResult.isErr()) return err(urlResult.error);

    const signal = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;

    const response = await ResultAsync.fromPromise(
      fetch(urlResult.value, {
        ...init,
        signal,
        headers: {
          Authorization: `Bearer ${this.worker.apiToken}`,
          ...(init?.headers ?? {})
        }
      }),
      (error) => CustomError.from(error, `Failed to reach worker ${this.worker.name}.`)
    );
    if (response.isErr()) return err(response.error);
    if (!response.value.ok) {
      const text = await response.value.text().catch(() => response.value.statusText);
      return err(new CustomError(text || `Worker ${this.worker.name} responded with ${response.value.status}.`));
    }
    return ok(response.value);
  }

  async provisionServer(input: ProvisionServerInput) {
    const response = await this.fetchWorker('/api/worker/v1/servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    return response.map(() => undefined);
  }

  async startServer(serverID: string) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/start`, { method: 'POST' });
    return response.map(() => undefined);
  }

  async stopServer(serverID: string) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/stop`, { method: 'POST' });
    return response.map(() => undefined);
  }

  async sendCommand(serverID: string, command: string) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });
    if (response.isErr()) return err(response.error);
    return ResultAsync.fromPromise(response.value.json() as Promise<string[]>, (error) => CustomError.from(error, 'Failed to parse worker command response.'));
  }

  async getLogs(serverID: string, lines: number | 'all') {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/logs?lines=${lines}`, { method: 'GET' });
    if (response.isErr()) return err(response.error);
    return ResultAsync.fromPromise(response.value.json() as Promise<string[]>, (error) => CustomError.from(error, 'Failed to parse worker logs response.'));
  }

  async getStats(serverID: string) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/stats`, { method: 'GET' });
    if (response.isErr()) return err(response.error);
    return ResultAsync.fromPromise(response.value.json() as Promise<LocalContainerUsageStats>, (error) => CustomError.from(error, 'Failed to parse worker stats response.'));
  }

  async getState(serverID: string) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/state`, { method: 'GET' });
    if (response.isErr()) return err(response.error);
    return ResultAsync.fromPromise(response.value.json() as Promise<ContainerData>, (error) => CustomError.from(error, 'Failed to parse worker state response.'));
  }

  async removeServer(serverID: string, forcibly = false) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}?forcibly=${forcibly ? 'true' : 'false'}`, { method: 'DELETE' });
    return response.map(() => undefined);
  }

  async createBackup(serverID: string) {
    const response = await this.fetchWorker(`/api/worker/v1/servers/${serverID}/backup`, { method: 'POST' }, 0);
    if (response.isErr()) return err(response.error);
    return ResultAsync.fromPromise(
      response.value.arrayBuffer().then((buffer) => Buffer.from(buffer)),
      (error) => CustomError.from(error, 'Failed to read backup archive from worker.')
    );
  }

  async getHealth(_worker: WorkerResponse) {
    const response = await this.fetchWorker('/api/worker/v1/health', { method: 'GET' });
    if (response.isErr()) return err(response.error);
    return ResultAsync.fromPromise(response.value.json() as Promise<WorkerHealthSummary>, (error) => CustomError.from(error, 'Failed to parse worker health response.'));
  }
}

const localWorkerClient = new LocalWorkerClient();

export function getWorkerClientForWorker(worker: WorkerResponse | null): NeverthrowResult<WorkerClient, CustomError> {
  if (!worker) {
    if (!canHostLocalWorker()) return err(new CustomError('No worker is assigned and this Hermes instance cannot host local servers.'));
    return ok(localWorkerClient);
  }

  if (worker.baseUrl === 'local') {
    if (!canHostLocalWorker()) return err(new CustomError(`Worker ${worker.name} is configured as local, but this runtime cannot host containers.`));
    return ok(localWorkerClient);
  }

  return ok(new RemoteWorkerClient(worker));
}
