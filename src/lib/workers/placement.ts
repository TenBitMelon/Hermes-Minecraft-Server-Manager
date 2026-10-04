import { serverPB } from '$lib/database';
import { Collections, WorkerStatus, type ServerResponse, type WorkerResponse } from '$lib/database/types';
import { Result, err, ok } from 'neverthrow';
import { deriveWorkerStatus } from './index';
import { countAvailablePorts, findFirstAvailablePort, localPortRangeFromEnv, workerPortRange, type PortRange } from './ports';

type PlacementCandidate = {
  worker: WorkerResponse;
  runningServerCount: number;
  totalServerCount: number;
};

export async function getWorkers() {
  return serverPB.collection(Collections.Workers).getFullList<WorkerResponse>();
}

async function getUsedPortsForWorker(worker: WorkerResponse | null) {
  const filter = worker ? serverPB.filter('worker = {:workerId}', { workerId: worker.id }) : 'worker = ""';
  const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>({
    filter,
    fields: 'port'
  });
  return new Set(servers.map((server) => server.port));
}

/**
 * The range a new server could take on the given worker, or on this host when the
 * worker is null. Returns null when this host cannot host servers at all.
 */
export async function getPortRangeForWorker(worker: WorkerResponse | null): Promise<PortRange | null> {
  const usedPorts = await getUsedPortsForWorker(worker);
  if (!worker) return localPortRangeFromEnv(usedPorts);
  return workerPortRange(worker.portMin, worker.portMax, worker.avoidDefaultPort, usedPorts);
}

export async function getAvailablePortCountForWorker(worker: WorkerResponse | null): Promise<number> {
  const range = await getPortRangeForWorker(worker);
  if (!range) return 0;
  return countAvailablePorts(range);
}

export async function getUnusedPortForWorker(worker: WorkerResponse | null): Promise<Result<number, Error>> {
  const range = await getPortRangeForWorker(worker);
  if (!range) return err(new Error('This Hermes instance cannot host local servers.'));
  return findFirstAvailablePort(range);
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
      runningServerCount: worker.runningServerCount,
      totalServerCount: worker.totalServerCount
    });
  }

  candidates.sort((a, b) => a.runningServerCount - b.runningServerCount || a.totalServerCount - b.totalServerCount || a.worker.name.localeCompare(b.worker.name));
  if (candidates[0]) return ok(candidates[0].worker);

  const localRange = localPortRangeFromEnv(await getUsedPortsForWorker(null));
  if (localRange && countAvailablePorts(localRange) > 0) return ok(null);
  return err(new Error('No worker is currently available.'));
}
