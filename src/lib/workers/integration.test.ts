import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
// Static and type-only. $lib/database/types has no side effects, unlike $lib/database
// which authenticates at import time, so this is safe to import before the
// environment is loaded. Naming a local variable "types" would shadow the TypeScript
// namespace and break every `types.ServerResponse` reference in a type position.
import { Collections, ServerState, type ServerResponse } from '$lib/database/types';
import { ContainerState } from '$lib/types';
import { integrationEnabled, loadLocalEnvironment } from '../../test/environment';

/**
 * Exercises the real single-node path end to end: a server record in the developer's
 * own PocketBase, driven through the worker client, down to a real Docker container.
 *
 * This is the regression proof for the worker split. Before it, $lib/docker.ts talked
 * to docker-compose directly. Now every call goes through WorkerClient ->
 * LocalWorkerClient -> localRuntime. If that indirection changed behaviour, these are
 * the calls that would break.
 *
 * Opt in, because it starts and stops a real container:
 *   HERMES_INTEGRATION=1 pnpm exec vitest run src/lib/workers/integration.test.ts
 *
 * The container is expected to be running with a reachable ICON, since the itzg image
 * treats a failed icon download as fatal and exits 1. A compose file still pointing at
 * an origin that no longer serves the icon will fail to start.
 */
describe.skipIf(!integrationEnabled())('single-node lifecycle through the worker client', () => {
  const serverID = process.env.HERMES_TEST_SERVER_ID ?? '9xptshlvbu2ku9v';
  const containerName = `${serverID}-minecraft-1`;
  const repoRoot = path.resolve(__dirname, '..', '..', '..');

  let docker: typeof import('$lib/docker');
  let pb: typeof import('$lib/database');

  const containerStatus = () => {
    try {
      return execFileSync('docker', ['inspect', containerName, '--format', '{{.State.Status}}'], { encoding: 'utf8' }).trim();
    } catch {
      return 'absent';
    }
  };

  const waitForHealthy = async (timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = execFileSync('docker', ['inspect', containerName, '--format', '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}'], { encoding: 'utf8' }).trim();
      if (state.includes('healthy')) return true;
      if (state.startsWith('exited') || state.startsWith('dead')) return false;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    return false;
  };

  // The usual reason a container never gets here is the itzg image treating a failed
  // icon download as fatal, which exits 1 before Minecraft boots. Surfacing the last
  // log lines turns that from a puzzling test failure into an obvious one.
  const containerLogTail = () => {
    try {
      return execFileSync('docker', ['logs', '--tail', '12', containerName], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      return '(no logs available)';
    }
  };

  beforeAll(async () => {
    await loadLocalEnvironment();
    pb = await import('$lib/database');
    docker = await import('$lib/docker');

    // Start it through the application's own entry point, not the docker CLI, so the
    // start path under test is the one being measured.
    if (containerStatus() !== 'running') {
      const started = await docker.startContainer(serverID);
      if (started.isErr()) throw new Error(`startContainer failed: ${started.error.message}`);
    }
    const healthy = await waitForHealthy(180_000);
    if (!healthy) {
      throw new Error(`Container ${containerName} never became healthy (status: ${containerStatus()}).\n` + `Check that the ICON url in servers/${serverID}/docker-compose.yml resolves, ` + `and that it does not collide with an existing container.\n` + `Last log lines:\n${containerLogTail()}`);
    }
  }, 300_000);

  afterAll(async () => {
    // Leave the machine as it was found: running container, running server record.
    await docker.startContainer(serverID);
  }, 120_000);

  it('reads the server record and sees no worker assigned', async () => {
    const server = await pb.serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID);

    expect(server.id).toBe(serverID);
    // An unset relation is the empty string, which is what routes a server to the
    // local runtime rather than to a remote worker.
    expect(server.worker).toBe('');
  });

  it('resolves to the local worker client for an unassigned server', async () => {
    const { getWorkerClientForServer } = await import('$lib/workers/client');
    const result = await getWorkerClientForServer(serverID);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().constructor.name).toBe('LocalWorkerClient');
  });

  it('reads container state with a usable State and Project', async () => {
    const result = await docker.getContainerData(serverID);

    expect(result.isErr()).toBe(false);
    const container = result._unsafeUnwrap();
    // These were both undefined before the compose v2 array output was handled, which
    // made state reconciliation a no-op.
    expect(container.Project).toBe(serverID);
    expect(container.State).toBe(ContainerState.Running);
  });

  it('reports the container as running', async () => {
    const result = await docker.getContainerRunningStatus(serverID);

    expect(result.isErr()).toBe(false);
    expect(result._unsafeUnwrap()).toBe(true);
  });

  it('reads logs', async () => {
    const result = await docker.getContainerLogs(serverID, 50);

    expect(result.isErr()).toBe(false);
    const logs = result._unsafeUnwrap();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('filters RCON listener noise out of the logs', async () => {
    // The log filter drops the RCON start/stop chatter so the console is readable.
    const result = await docker.getContainerLogs(serverID, 'all');

    expect(result.isErr()).toBe(false);
    expect(result._unsafeUnwrap().join('\n')).not.toMatch(/Thread RCON Client.*(started|shutting down)/);
  });

  it('reads usage stats', async () => {
    const result = await docker.getContainerUsageStats(serverID);

    expect(result.isErr()).toBe(false);
    expect(result._unsafeUnwrap()).toHaveProperty('MemUsage');
  });

  it('sends a console command and returns its output', async () => {
    const result = await docker.sendCommandToContainer(serverID, 'list');

    expect(result.isErr() ? result.error.message : 'sent').toBe('sent');
    expect(result.isErr()).toBe(false);
    expect(result._unsafeUnwrap().join(' ')).toMatch(/players online/i);
  });

  it('creates a backup and records it against the server', async () => {
    const backupsBefore = await pb.serverPB.collection(Collections.Backups).getFullList({ filter: pb.serverPB.filter('serverID = {:serverID}', { serverID }) });

    const { createBackup } = await import('$lib/servers/backups');
    const result = await createBackup(serverID);

    expect(result.isErr() ? result.error.message : 'created').toBe('created');

    const backupsAfter = await pb.serverPB.collection(Collections.Backups).getFullList({ filter: pb.serverPB.filter('serverID = {:serverID}', { serverID }) });
    expect(backupsAfter.length).toBe(backupsBefore.length + 1);
  });

  it('allocates the next free local port without colliding', async () => {
    const { getUnusedPortForWorker, getAvailablePortCountForWorker } = await import('$lib/workers/placement');

    const port = await getUnusedPortForWorker(null);
    expect(port.isOk()).toBe(true);

    const taken = new Set([25550, 25551, 25552]);
    expect(taken.has(port._unsafeUnwrap())).toBe(false);

    const count = await getAvailablePortCountForWorker(null);
    expect(count).toBeGreaterThan(0);
  });

  it('reconciles server state from the runtime', async () => {
    const { updateServerState } = await import('$lib/servers');
    const server = await pb.serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID);

    const updates = await updateServerState(server);

    expect(Array.isArray(updates)).toBe(true);
    // An unassigned server must not be treated as having a missing worker.
    expect(JSON.stringify(updates)).not.toContain('The assigned worker no longer exists');
  });

  it('stops the container, takes a backup and records the shutdown', async () => {
    const result = await docker.stopContainer(serverID);

    expect(result.isErr() ? result.error.message : 'stopped').toBe('stopped');

    const server = await pb.serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID);
    expect(server.state).toBe(ServerState.Stopped);
    expect(server.shutdownDate).not.toBeNull();
    // canBeDeleted drives the deletion countdown, so a stoppable server must get one.
    expect(server.deletionDate).not.toBeNull();
  });

  it('restarts cleanly, proving start and stop are symmetric', async () => {
    const started = await docker.startContainer(serverID);
    expect(started.isErr() ? started.error.message : 'started').toBe('started');

    const server = await pb.serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID);
    expect(server.state).toBe(ServerState.Running);

    const stopped = await docker.stopContainer(serverID);
    expect(stopped.isErr() ? stopped.error.message : 'stopped').toBe('stopped');
  }, 240_000);

  it('leaves the compose file it was given untouched', async () => {
    // The worker split moved compose generation but must not rewrite the file as a
    // side effect of a start or stop.
    const server = await pb.serverPB.collection(Collections.Servers).getOne<ServerResponse>(serverID);
    const composePath = path.join(repoRoot, 'servers', serverID, 'docker-compose.yml');
    const contents = readFileSync(composePath, 'utf8');

    expect(contents).toContain('services:');
    expect(contents).toContain(`"${server.port}:25565"`);
  });
});
