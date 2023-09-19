import { spawn, exec } from 'node:child_process';
import fs from 'node:fs';

export async function startCompose(serverID: string) {
  const out = spawn('docker', ['compose', 'up', '-d'], { cwd: `servers/${serverID}` });
  return new Promise((resolve) => out.on('close', (code) => resolve(code)));
}

export async function stopCompose(serverID: string) {
  const out = spawn('docker', ['compose', 'down'], { cwd: `servers/${serverID}` });
  return new Promise((resolve) => out.on('close', (code) => resolve(code)));
}

export function getLogs(serverID: string, lines: number | 'all'): Promise<string[]> {
  return new Promise((resolve) => {
    exec(`docker compose logs --tail ${lines === 'all' ? lines : Math.min(lines, 150)}`, { cwd: `servers/${serverID}` }, (error, stdout) => {
      if (error) resolve([]);
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

export function getServerData(serverID: string): Promise<Container> {
  return new Promise((resolve, reject) => {
    exec('docker compose ps --format json', { cwd: `servers/${serverID}` }, (error, stdout) => {
      if (error) reject(error);
      const containers: (Container & { [key: string]: string })[] = JSON.parse(stdout);
      if (containers.length === 0) reject('No containers found');
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

export async function getServerRunningStatus(serverID: string): Promise<boolean> {
  return await getServerData(serverID).then((data) => data !== null && data.State === 'running');
}

export function getAllServerStatuses(validIDs: string[]): Promise<Container[]> {
  return new Promise((resolve, reject) => {
    exec('docker ps --format json', { cwd: 'servers' }, (error, stdout) => {
      if (error) reject(error);
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

export function zipServerFiles(serverID: string): Promise<File> {
  return new Promise((resolve, reject) => {
    exec('zip -r serverFiles.zip .', { cwd: `servers/${serverID}` }, (error) => {
      if (error) reject(error);
      resolve(new File([fs.readFileSync(`servers/${serverID}/serverFiles.zip`)], 'serverFiles.zip'));
    });
  });
}
