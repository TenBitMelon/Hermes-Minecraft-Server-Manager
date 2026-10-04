import { serverPB } from '$lib/database';
import { Collections, WorkerStatus, type ServerResponse, type WorkerResponse } from '$lib/database/types';
import { canHostLocalWorker } from '$lib/runtime';
import { env as privateEnv } from '$env/dynamic/private';
import { Result, err, ok } from 'neverthrow';
import { deriveWorkerStatus } from './index';

type PlacementCandidate = {
  worker: WorkerResponse | null;
  availablePorts: number;
  runningServerCount: number;
  totalServerCount: number;
};

const minecraftDefaultPort = 25565;

export async function getWorkers() {
  return serverPB.collection(Collections.Workers).getFullList<WorkerResponse>();
}

export async function getAvailablePortCountForWorker(worker: WorkerResponse | null): Promise<number> {
  if (!worker) {
    if (!canHostLocalWorker()) return 0;
    const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>({
      filter: 'worker = "" || worker = null',
      fields: 'port,workerPort'
    });
    const usedPorts = new Set(servers.map((server) => server.workerPort ?? server.port));
    let availablePorts = 0;
    const portMin = +privateEnv.PORT_MIN;
    const portMax = +privateEnv.PORT_MAX;
    const avoidDefaultPort = Boolean(privateEnv.AVOID_DEFAULT_PORT);
    for (let port = portMin; port <= portMax; port += 1) {
      if (usedPorts.has(port)) continue;
      if (avoidDefaultPort && port === minecraftDefaultPort) continue;
      availablePorts += 1;
    }
    return availablePorts;
  }

  const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>({
    filter: serverPB.filter('worker = {:workerId}', { workerId: worker.id }),
    fields: 'port,workerPort'
  });

  const usedPorts = new Set(servers.map((server) => server.workerPort ?? server.port));
  let availablePorts = 0;
  for (let port = worker.portMin; port <= worker.portMax; port += 1) {
    if (usedPorts.has(port)) continue;
    if (worker.avoidDefaultPort && port === minecraftDefaultPort) continue;
    availablePorts += 1;
  }
  return availablePorts;
}

export async function getUnusedPortForWorker(worker: WorkerResponse | null): Promise<Result<number, Error>> {
  if (!worker) {
    const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>({
      filter: 'worker = "" || worker = null',
      fields: 'port,workerPort'
    });
    const usedPorts = new Set(servers.map((server) => server.workerPort ?? server.port));
    const portMin = +privateEnv.PORT_MIN;
    const portMax = +privateEnv.PORT_MAX;
    const avoidDefaultPort = Boolean(privateEnv.AVOID_DEFAULT_PORT);

    for (let port = portMin; port <= portMax; port += 1) {
      if (usedPorts.has(port)) continue;
      if (avoidDefaultPort && port === minecraftDefaultPort) continue;
      return ok(port);
    }
    return err(new Error('No Ports Available'));
  }

  const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>({
    filter: serverPB.filter('worker = {:workerId}', { workerId: worker.id }),
    fields: 'port,workerPort'
  });
  const usedPorts = new Set(servers.map((server) => server.workerPort ?? server.port));

  for (let port = worker.portMin; port <= worker.portMax; port += 1) {
    if (usedPorts.has(port)) continue;
    if (worker.avoidDefaultPort && port === minecraftDefaultPort) continue;
    return ok(port);
  }

  return err(new Error('No Ports Available'));
}

export async function selectWorkerForNewServer(manualWorkerId?: string | null): Promise<Result<WorkerResponse | null, Error>> {
  const workers = await getWorkers();
  if (manualWorkerId) {
    const worker = workers.find((entry) => entry.id === manualWorkerId);
    if (!worker) return err(new Error('Selected worker was not found.'));
    const status = deriveWorkerStatus(worker);
    if (status === WorkerStatus.Disabled || status === WorkerStatus.Offline) return err(new Error('Selected worker is not available.'));
    const availablePorts = await getAvailablePortCountForWorker(worker);
    if (availablePorts < 1) return err(new Error('Selected worker has no remaining ports.'));
    if (worker.totalServerCount >= worker.serverCapacity) return err(new Error('Selected worker is already at capacity.'));
    return ok(worker);
  }

  const candidates: PlacementCandidate[] = [];
  for (const worker of workers) {
    const status = deriveWorkerStatus(worker);
    if (status === WorkerStatus.Disabled || status === WorkerStatus.Offline) continue;
    const availablePorts = await getAvailablePortCountForWorker(worker);
    if (availablePorts < 1) continue;
    if (worker.totalServerCount >= worker.serverCapacity) continue;
    candidates.push({
      worker,
      availablePorts,
      runningServerCount: worker.runningServerCount,
      totalServerCount: worker.totalServerCount
    });
  }

  candidates.sort((a, b) => a.runningServerCount - b.runningServerCount || a.totalServerCount - b.totalServerCount || a.worker!.name.localeCompare(b.worker!.name));
  if (candidates[0]) return ok(candidates[0].worker);

  if (canHostLocalWorker()) return ok(null);
  return err(new Error('No worker is currently available.'));
}
