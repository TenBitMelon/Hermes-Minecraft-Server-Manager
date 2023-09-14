import { spawn, exec } from 'node:child_process';

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
    exec(`docker compose logs --tail ${lines.toString()}`, { cwd: `servers/${serverID}` }, (error, stdout) => {
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
