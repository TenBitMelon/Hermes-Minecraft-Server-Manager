import childProcess from 'node:child_process';
import fs, { read } from 'node:fs';
import { serverPB } from './database';
import { Collections } from './database/types';
import { env as penv } from '$env/dynamic/public';
import path from 'node:path';
import compose, { execCompose, type IDockerComposeResult } from 'docker-compose/dist/v2';
import { Err, err, ok, Result, ResultAsync } from 'neverthrow';
import { zip } from './zip';

export enum ContainerErrorType {
  DoesntExist,
  Start,
  Stop,
  UpdateServerDB,
  ReadServerDB,
  GetLogs,
  SendCommand,
  GetContainerData,
  GetContainerRunningStatus,
  GetAllServerStatuses,
  GetContainerUsageStats,
  ZipContainerFiles,
  RemoveContainer
}

class ContainerError extends Error {
  constructor(message: string, cause: ContainerErrorType) {
    super(message, { cause });
  }
}

// enum ContainerState {
//   Created,
//   Restarting,
//   Running,
//   Removing,
//   Paused,
//   Exited,
//   Dead
// }

type CResult<T> = Promise<Result<T, ContainerError>>;

function getServerFolder(serverID: string): string {
  const relative = `servers/${serverID}/`;
  return path.resolve(relative);
}

function getBackupFolder(): string {
  const relative = `servers/backups/`;
  return path.resolve(relative);
}

export function containerDoesntExists(serverID: string): boolean {
  return !fs.existsSync(`servers/${serverID}`) || !fs.existsSync(getServerFolder(serverID));
}

export async function startContainer(serverID: string): CResult<void> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const composeFile = getServerFolder(serverID);
  const containerStart = await ResultAsync.fromPromise(compose.upAll({ cwd: composeFile }), () => new ContainerError('Failed to start container', ContainerErrorType.Start));

  if (containerStart.isErr()) {
    const dbResult = await ResultAsync.fromPromise(
      serverPB.collection(Collections.Servers).update(serverID, {
        shutdown: true,
        shutdownDate: new Date().toISOString(),
        deletionDate: null
      }),
      () => new ContainerError('Failed to update server status on failed container start', ContainerErrorType.UpdateServerDB)
    );

    return err(dbResult.isErr() ? dbResult.error : containerStart.error);
  }

  const dbResult = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).update(serverID, {
      shutdown: false,
      shutdownDate: null,
      deletionDate: null,
      serverFilesZiped: null
    }),
    () => new ContainerError('Failed to update server status on successful container start', ContainerErrorType.UpdateServerDB)
  );

  return dbResult.map(() => undefined);
}

export async function stopContainer(serverID: string): CResult<void> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const containerStop = await ResultAsync.fromPromise(compose.stop({ cwd: getServerFolder(serverID) }), () => new ContainerError('Failed to stop container', ContainerErrorType.Stop));

  if (containerStop.isErr()) {
    const dbResult = await ResultAsync.fromPromise(
      serverPB.collection(Collections.Servers).update(serverID, {
        shutdown: false,
        shutdownDate: null,
        deletionDate: null,
        serverFilesZiped: null
      }),
      () => new ContainerError('Failed to update server status on failed container stop', ContainerErrorType.UpdateServerDB)
    );

    return err(dbResult.isErr() ? dbResult.error : containerStop.error);
  }

  const serverFiles = await zipContainerFiles(serverID);
  if (serverFiles.isErr()) return err(serverFiles.error);
  const server = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).getOne(serverID), () => new ContainerError('Failed to get server data from DB', ContainerErrorType.ReadServerDB));
  if (server.isErr()) return err(server.error);

  const updateResult = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).update(serverID, {
      shutdown: true,
      shutdownDate: new Date().toISOString(),
      deletionDate: server.value.canBeDeleted ? new Date(Date.now() + 1000 * 60 * 60 * +penv.PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN).toISOString() : null, // 7 days
      serverFilesZiped: serverFiles
    }),
    () => new ContainerError('Failed to update data server on stop', ContainerErrorType.UpdateServerDB)
  );
  return updateResult.map(() => undefined);
}

export async function getContainerLogs(serverID: string, lines: number | 'all'): CResult<string[]> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const containerLogs = await ResultAsync.fromPromise(
    compose.logs([], {
      commandOptions: [`--tail ${lines === 'all' ? 150 : Math.min(lines, 150)}`]
    }),
    () => new ContainerError('Failed to get container logs', ContainerErrorType.GetLogs)
  );
  return containerLogs.map((r) =>
    r.out
      .split('\n')
      .map((s) => s.trim())
      .filter((line) => line !== '')
  );

  // return new Promise((resolve) => {
  //   exec(`docker compose logs --tail ${lines === 'all' ? 150 : Math.min(lines, 150)}`, { cwd: `servers/${serverID}` }, (error, stdout) => {
  //     if (error) return resolve([]);
  //     resolve(
  //       stdout
  //         .split('\n')
  //         .map((s) => s.trim())
  //         .filter((line) => line !== '')
  //     );
  //   });
  // });
}

export async function sendCommandToContainer(serverID: string, command: string): CResult<string[]> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const execResult = await ResultAsync.fromPromise(compose.exec('minecraft', `rcon-cli ${command}`), () => new ContainerError('Failed to execute command in container', ContainerErrorType.SendCommand));
  return execResult.map((r) =>
    r.out
      .split('\n')
      .map((s) => s.trim())
      .filter((line) => line !== '')
  );

  // return new Promise((resolve) => {
  //   exec(`docker compose exec --no-TTY minecraft rcon-cli ${command}`, { cwd: `servers/${serverID}` }, (error, stdout) => {
  //     if (error) return resolve([]);
  //     resolve(
  //       stdout
  //         .split('\n')
  //         .map((s) => s.trim())
  //         .filter((line) => line !== '')
  //     );
  //   });
  // });
}

type ContainerData = {
  ID: string;
  Name: string;
  Command: string;
  Project: string;
  Service: string;
  State: string;
  Health: string;
  ExitCode: number;
  Publishers?: {
    URL: string;
    TargetPort: number;
    PublishedPort: number;
    Protocol: string;
  }[];
};

export async function getContainerData(serverID: string): CResult<ContainerData> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const psResult = await ResultAsync.fromPromise(
    execCompose('ps', [], {
      commandOptions: ['--format json']
    }),
    () => new ContainerError('Failed to read container data', ContainerErrorType.GetContainerData)
  );

  if (psResult.isErr()) return err(psResult.error);

  const containerJSON: ContainerData[] = JSON.parse(
    psResult.value.out
      .split('\n')
      .filter((s) => s.trim() != '')
      .join('')
  );

  if (containerJSON.length === 0) return err(new ContainerError('Failed to get any containers from ps command', ContainerErrorType.GetContainerData));
  if (!containerJSON[0]) return err(new ContainerError('Parsed one undefined container from ps command', ContainerErrorType.GetContainerData));

  return ok(containerJSON[0]);
}

export async function getContainerRunningStatus(serverID: string): CResult<boolean> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));
  return (await getContainerData(serverID)).map((d) => d.State == 'running');
  // return (await getContainerData(serverID)).map(d => d.State == ContainerState.Running);
}

// export function getAllServerStatuses(validIDs: string[]): Promise<Container[]> {
//   return new Promise((resolve) => {
//     exec('docker ps --format json', { cwd: 'servers' }, (error, stdout) => {
//       if (error) resolve([]);
//       const containers: (Container & { [key: string]: string })[] = JSON.parse(stdout);
//       resolve(
//         containers
//           .filter((container) => validIDs.includes(container.Project))
//           .map((container) => ({
//             ID: container.ID,
//             Project: container.Project,
//             Created: container.Created,
//             State: container.State,
//             ExitCode: container.ExitCode
//           }))
//       );
//     });
//   });
// }
type ContainerUsageStats = {
  BlockIO: string;
  CPUPerc: string;
  Container: string;
  ID: string;
  MemPerc: string;
  MemUsage: string;
  Name: string;
  NetIO: string;
  PIDs: string;
};

export async function getContainerUsageStats(serverID: string): CResult<ContainerUsageStats> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const containerID = await getContainerData(serverID);
  if (containerID.isErr()) return err(containerID.error);
  const containerStats = await ResultAsync.fromPromise(
    new Promise<IDockerComposeResult>((resolve, reject): void => {
      const childProc = childProcess.spawn('docker', ['stats', containerID.value.ID, '--no-stream', '--no-trunc', '--format "{{ json . }}"']);

      const result: IDockerComposeResult = {
        exitCode: null,
        err: '',
        out: ''
      };

      childProc.on('error', (err) => reject(err));
      childProc.stdout.on('data', (chunk) => (result.out += chunk.toString()));
      childProc.stderr.on('data', (chunk) => (result.err += chunk.toString()));
      childProc.on('exit', (exitCode): void => {
        result.exitCode = exitCode;
        setTimeout(() => {
          if (exitCode === 0) resolve(result);
          else reject(result);
        }, 500);
      });
    }),
    () => new ContainerError('Failed to the server usage stats', ContainerErrorType.GetContainerUsageStats)
  );

  return containerStats.map((v) => JSON.parse(v.out));

  // return new Promise((resolve) => {
  //   exec('docker stats --no-stream --format json', { cwd: `servers/${serverID}` }, (error, stdout) => {
  //     console.log(error);
  //     if (error) return resolve(null);
  //     console.log(stdout);
  //     const containers: (ContainerUsageStats & { [key: string]: string })[] = JSON.parse(stdout);
  //     console.log(containers);
  //     if (containers.length === 0 || !containers[0]) return resolve(null);
  //     const container = containers.filter((container) => container.Name.includes(serverID))[0];
  //     resolve({
  //       BlockIO: container.BlockIO,
  //       CPUPerc: container.CPUPerc,
  //       Container: container.Container,
  //       ID: container.ID,
  //       MemPerc: container.MemPerc,
  //       MemUsage: container.MemUsage,
  //       Name: container.Name,
  //       NetIO: container.NetIO,
  //       PIDs: container.PIDs
  //     });
  //   });
  // });
}

export async function zipContainerFiles(serverID: string): CResult<File> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const backupFile = getBackupFolder() + `${serverID}.zip`;
  const zipResult = await ResultAsync.fromPromise(zip(getServerFolder(serverID), backupFile), () => new ContainerError('Failed to zip severfiles', ContainerErrorType.ZipContainerFiles));
  if (zipResult.isErr()) return err(zipResult.error);

  return Result.fromThrowable(
    () => new File([fs.readFileSync(backupFile)], `${serverID}.zip`),
    () => new ContainerError('Failed to read zip', ContainerErrorType.ZipContainerFiles)
  )();
}

export async function removeContainer(serverID: string, forcibly = false): CResult<void> {
  if (containerDoesntExists(serverID)) return err(new ContainerError('Server not found', ContainerErrorType.DoesntExist));

  const stopped = await stopContainer(serverID);
  if (stopped.isErr()) return err(stopped.error);

  const remove = Result.fromThrowable(
    () => fs.rmSync(getServerFolder(serverID), { recursive: true, force: forcibly }),
    () => new ContainerError('Failed to remove server files', ContainerErrorType.RemoveContainer)
  )();
  if (remove.isErr()) err(remove.error);

  const dbResult = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).delete(serverID), () => new ContainerError('Failed to update database after removing server', ContainerErrorType.UpdateServerDB));

  return dbResult.map(() => {
    //
  });

  // new Promise((resolve) => {
  //   exec(`cd ../; rm -rf ${serverID}`, { cwd: `servers/${serverID}` }, (error) => {
  //     console.log(error);
  //     if (error && !forcibly) resolve(1);
  //     resolve(0);
  //   });
  // });

  // TODO: Remove cloudflare
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
