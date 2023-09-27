import { spawn, exec } from 'node:child_process';
import fs from 'node:fs';
import { serverPB } from './database';
import { Collections } from './database/types';
import { env as penv } from '$env/dynamic/public';

function trycatch<T>(fn: () => T, catchFn: (e: unknown) => void): T | null {
  try {
    return fn();
  } catch (e: unknown) {
    catchFn(e);
    return null;
  }
}

export function containerDoesntExists(serverID: string): boolean {
  return !fs.existsSync(`servers/${serverID}`);
}

export async function startContainer(serverID: string) {
  if (containerDoesntExists(serverID)) return;
  return trycatch(
    async () => {
      serverPB.collection(Collections.Servers).update(serverID, {
        shutdown: false,
        shutdownDate: null,
        deletionDate: null,
        serverFilesZiped: null
      });

      const out = spawn('docker', ['compose', 'up', '-d'], { cwd: `servers/${serverID}` });
      return new Promise((resolve) => out.on('close', (code) => resolve(code)));
    },
    (e) => {
      console.error(e);
      serverPB.collection(Collections.Servers).update(serverID, {
        shutdown: true,
        shutdownDate: new Date().toISOString(),
        deletionDate: null,
        serverFilesZiped: null
      });
    }
  );
}

export async function stopContainer(serverID: string) {
  if (containerDoesntExists(serverID)) return;
  return trycatch(
    async () => {
      const server = await serverPB.collection(Collections.Servers).getOne(serverID);
      const serverFiles = await zipContainerFiles(serverID);
      serverPB.collection(Collections.Servers).update(serverID, {
        shutdown: true,
        shutdownDate: new Date().toISOString(),
        deletionDate: server.canBeDeleted ? new Date(Date.now() + 1000 * 60 * 60 * +penv.PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN).toISOString() : null, // 7 days
        serverFilesZiped: serverFiles
      });

      const out = spawn('docker', ['compose', 'down'], { cwd: `servers/${serverID}` });
      return new Promise((resolve) => out.on('close', (code) => resolve(code)));
    },
    (e) => {
      console.error(e);
      serverPB.collection(Collections.Servers).update(serverID, {
        shutdown: false,
        shutdownDate: null,
        deletionDate: null,
        serverFilesZiped: null
      });
    }
  );
}

export async function getContainerLogs(serverID: string, lines: number | 'all'): Promise<string[]> {
  if (containerDoesntExists(serverID)) return [];
  return new Promise((resolve) => {
    exec(`docker compose logs --tail ${lines === 'all' ? 150 : Math.min(lines, 150)}`, { cwd: `servers/${serverID}` }, (error, stdout) => {
      if (error) return resolve([]);
      resolve(
        stdout
          .split('\n')
          .map((s) => s.trim())
          .filter((line) => line !== '')
      );
    });
  });
}

type Container = {
  ID: string;
  Project: string;
  Created: number;
  State: string;
  ExitCode: number;
};

export async function getContainerData(serverID: string): Promise<Container | null> {
  if (containerDoesntExists(serverID)) return null;
  return new Promise((resolve) => {
    exec('docker compose ps --format json', { cwd: `servers/${serverID}` }, (error, stdout) => {
      if (error) return resolve(null);

      const containers: (Container & { [key: string]: string })[] = JSON.parse(stdout);

      console.log('containers', containers);
      if (containers.length === 0 || !containers[0]) return resolve(null);

      resolve({
        ID: containers[0].ID,
        Project: containers[0].Project,
        Created: containers[0].Created,
        State: containers[0].State,
        ExitCode: containers[0].ExitCode
      });
    });
  });
}

const containerStatuses: { [key: string]: boolean } = {
  starting: true,
  running: true,
  stopping: true,
  paused: true,
  exited: false,
  dead: false
};
export async function getContainerRunningStatus(serverID: string): Promise<boolean> {
  if (containerDoesntExists(serverID)) return false;
  return await getContainerData(serverID).then((data) => data !== null && containerStatuses[data.State]);
}

export function getAllServerStatuses(validIDs: string[]): Promise<Container[]> {
  return new Promise((resolve) => {
    exec('docker ps --format json', { cwd: 'servers' }, (error, stdout) => {
      if (error) resolve([]);
      const containers: (Container & { [key: string]: string })[] = JSON.parse(stdout);
      resolve(
        containers
          .filter((container) => validIDs.includes(container.Project))
          .map((container) => ({
            ID: container.ID,
            Project: container.Project,
            Created: container.Created,
            State: container.State,
            ExitCode: container.ExitCode
          }))
      );
    });
  });
}

export async function zipContainerFiles(serverID: string): Promise<File | null> {
  if (containerDoesntExists(serverID)) return null;
  return new Promise((resolve) => {
    exec('zip -r serverFiles.zip .', { cwd: `servers/${serverID}` }, (error) => {
      if (error) resolve(null);
      resolve(new File([fs.readFileSync(`servers/${serverID}/serverFiles.zip`)], 'serverFiles.zip'));
    });
  });
}

export async function removeContainer(serverID: string, forcibly = false) {
  if (containerDoesntExists(serverID)) return;
  if (
    await new Promise((resolve) => {
      exec('docker compose down', { cwd: `servers/${serverID}` }, (error) => {
        if (error && !forcibly) resolve(1);
        resolve(0);
      });
    })
  )
    return;
  if (
    await new Promise((resolve) => {
      exec(`rm -rf ${serverID}`, { cwd: `servers` }, (error) => {
        if (error && !forcibly) resolve(1);
        resolve(0);
      });
    })
  )
    return;

  // TODO: Remove cloudflare server

  await serverPB
    .collection(Collections.Servers)
    .delete(serverID)
    .catch(() => null);
}

export class ComposeBuilder {
  private readonly version = '3.9';
  private readonly image = 'itzg/minecraft-server';
  private port = 25565;
  private readonly volumes: string[] = ['./server-files:/data'];
  private readonly restart = 'no';
  private readonly healthcheck = {
    test: 'mc-health',
    start_period: '1m',
    interval: '5s',
    retries: '20'
  };

  private readonly variables: { key: string; value: string | number | boolean }[] = [];
  constructor(private readonly cwd: string) {}

  setPort(port: number) {
    this.port = port;
    return this;
  }

  addVariable(key: string, value: string | number | boolean) {
    this.variables.push({ key, value });
    return this;
  }

  build() {
    let file = '';
    file += `version: "${this.version}"\n`;
    file += `services:\n`;
    file += `  minecraft:\n`;
    file += `    image: ${this.image}\n`;
    file += `    ports:\n`;
    file += `      - "${this.port}:25565"\n`;
    file += `    volumes:\n`;
    for (const volume of this.volumes) {
      file += `      - ${volume}\n`;
    }
    file += `    environment:\n`;
    for (const variable of this.variables) {
      file += `      ${variable.key}: "${variable.value}"\n`;
    }
    file += `    restart: "${this.restart}"\n`;
    file += `    healthcheck:\n`;
    file += `      test: ${this.healthcheck.test}\n`;
    file += `      start_period: ${this.healthcheck.start_period}\n`;
    file += `      interval: ${this.healthcheck.interval}\n`;
    file += `      retries: ${this.healthcheck.retries}\n`;
    return file;
  }
}
