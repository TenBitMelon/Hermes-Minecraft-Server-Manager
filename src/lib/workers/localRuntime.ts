import compose, { execCompose, type IDockerComposeResult } from 'docker-compose/dist/v2';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Result, ResultAsync, err, ok } from 'neverthrow';
import { zip } from '$lib/zip';
import { parseComposePsOutput } from './compose-ps';
import { ContainerState, CustomError, type ContainerData, type ContainerResult } from '$lib/types';

function getServerFolder(serverID: string): string {
  return path.resolve(`servers/${serverID}/`);
}

export function localContainerDoesNotExist(serverID: string): boolean {
  return !fs.existsSync(getServerFolder(serverID));
}

function containerHasPauseFile(serverID: string): boolean {
  return fs.existsSync(path.join(getServerFolder(serverID), 'server-files', '.paused'));
}

export async function materializeLocalServer(serverID: string, composeContent: string, serverProperties?: string | null): ContainerResult<void> {
  const serverFolderPath = getServerFolder(serverID);
  const serverFilesPath = path.join(serverFolderPath, 'server-files');

  const createDirectoryResult = Result.fromThrowable(
    () => fs.mkdirSync(serverFilesPath, { recursive: true }),
    (error) => CustomError.from(error, 'Failed to prepare the server files directory.')
  )();
  if (createDirectoryResult.isErr()) return err(createDirectoryResult.error);

  if (serverProperties) {
    const writePropertiesResult = Result.fromThrowable(
      () => fs.writeFileSync(path.join(serverFilesPath, 'server.properties'), serverProperties),
      (error) => CustomError.from(error, 'Failed to write the server.properties file.')
    )();
    if (writePropertiesResult.isErr()) return err(writePropertiesResult.error);
  }

  const writeComposeResult = Result.fromThrowable(
    () => fs.writeFileSync(path.join(serverFolderPath, 'docker-compose.yml'), composeContent),
    (error) => CustomError.from(error, 'Failed to write the docker-compose configuration for the server.')
  )();
  if (writeComposeResult.isErr()) return err(writeComposeResult.error);

  return ok(undefined);
}

export async function startLocalContainer(serverID: string): ContainerResult<void> {
  if (localContainerDoesNotExist(serverID)) return err(new CustomError('Server not found'));

  const composeFile = getServerFolder(serverID);
  const containerStart = await ResultAsync.fromPromise(compose.upAll({ cwd: composeFile }), (e) => CustomError.from(e, 'Failed to start container'));
  return containerStart.map(() => undefined);
}

export async function stopLocalContainer(serverID: string): ContainerResult<void> {
  if (localContainerDoesNotExist(serverID)) return err(new CustomError('Server not found'));

  const containerStop = await ResultAsync.fromPromise(compose.stop({ cwd: getServerFolder(serverID) }), () => new CustomError('Failed to stop container'));
  return containerStop.map(() => undefined);
}

export async function getLocalContainerLogs(serverID: string, lines: number | 'all'): ContainerResult<string[]> {
  if (localContainerDoesNotExist(serverID)) return err(new CustomError('Server not found'));

  const containerLogs = await ResultAsync.fromPromise(
    compose.logs([], {
      commandOptions: ['--tail', lines === 'all' ? '150' : Math.min(lines, 150).toString()],
      cwd: getServerFolder(serverID)
    }),
    (e) => CustomError.from(e, 'Failed to get container logs')
  );

  return containerLogs.map((r) =>
    r.out
      .split('\n')
      .map((s) => s.trim())
      .map((line) => {
        if (/.*(RCON Client).*(Thread RCON Client).*(shutting down).*/.test(line)) return '';
        if (/.*(RCON Listener).*(Thread RCON Client).*(started).*/.test(line)) return '';
        return line;
      })
      .filter((line) => line !== '')
  );
}

export async function sendLocalCommandToContainer(serverID: string, command: string): ContainerResult<string[]> {
  if (localContainerDoesNotExist(serverID)) return err(new CustomError('Server not found'));

  const execResult = await ResultAsync.fromPromise(compose.exec('minecraft', `rcon-cli ${command}`, { cwd: getServerFolder(serverID) }), () => new CustomError('Failed to execute command in container'));

  return execResult.map((r) =>
    r.out
      .split('\n')
      .map((s) => s.trim())
      .filter((line) => line !== '')
  );
}

export async function getLocalContainerData(serverID: string): ContainerResult<ContainerData> {
  if (localContainerDoesNotExist(serverID)) return err(new CustomError('Server not found'));

  const psResult = await ResultAsync.fromPromise(execCompose('ps', ['-a', '--format', 'json'], { cwd: getServerFolder(serverID) }), (e) => CustomError.from(e, 'Failed to read container data'));
  if (psResult.isErr()) return err(psResult.error);

  const parsed = parseComposePsOutput(psResult.value.out);
  if (parsed.isErr()) return err(parsed.error);
  const containerJSON = parsed.value;

  const paused = containerHasPauseFile(serverID);
  if (paused && containerJSON.State === ContainerState.Running) containerJSON.State = ContainerState.Paused;

  return ok(containerJSON);
}

export type LocalContainerUsageStats = {
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

export async function getLocalContainerUsageStats(serverID: string): ContainerResult<LocalContainerUsageStats> {
  if (localContainerDoesNotExist(serverID)) return err(new CustomError('Server not found'));

  const containerData = await getLocalContainerData(serverID);
  if (containerData.isErr()) return err(containerData.error);

  const containerStats = await ResultAsync.fromPromise(
    new Promise<IDockerComposeResult>((resolve, reject): void => {
      const childProc = childProcess.spawn('docker', ['stats', containerData.value.ID, '--no-stream', '--no-trunc', '--format', '{{ json . }}']);

      const result: IDockerComposeResult = { exitCode: null, err: '', out: '' };

      childProc.on('error', (childError) => reject(childError));
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
    () => new CustomError('Failed to get the server usage stats')
  );

  return containerStats.map((value) =>
    JSON.parse(
      value.out
        .trim()
        .split('\n')
        .filter((s) => s.trim() !== '')
        .join('')
    )
  );
}

export async function removeLocalServer(serverID: string, forcibly = false): ContainerResult<void> {
  if (!localContainerDoesNotExist(serverID)) {
    const composeStop = await ResultAsync.fromPromise(compose.stop({ cwd: getServerFolder(serverID) }), (e) => CustomError.from(e, 'Failed to stop container'));
    if (composeStop.isErr()) return err(composeStop.error);

    const remove = Result.fromThrowable(
      () => fs.rmSync(getServerFolder(serverID), { recursive: true, force: forcibly }),
      () => new CustomError('Failed to remove server files')
    )();
    if (remove.isErr()) return err(remove.error);
  }

  return ok(undefined);
}

export async function createLocalBackupArchive(serverID: string): Promise<Result<Buffer, CustomError>> {
  const serverFolder = getServerFolder(serverID);
  if (!fs.existsSync(serverFolder)) return err(new CustomError("Server folder doesn't exist!"));

  const zipResult = await zip(serverFolder, '/tmp/server-backup.zip', ['**/libraries/**', '**/.*/**', '**/.**']);
  if (zipResult.isErr()) return err(zipResult.error);

  return Result.fromThrowable(
    () => fs.readFileSync('/tmp/server-backup.zip'),
    (e) => CustomError.from(e, 'Failed to read the zip file')
  )();
}

export type WorkerHealthSummary = {
  version: string;
  runningServerCount: number;
  totalServerCount: number;
  availablePorts: number;
};

export async function getLocalWorkerHealth(portMin: number, portMax: number, avoidDefaultPort: boolean): Promise<Result<WorkerHealthSummary, CustomError>> {
  const root = path.resolve('servers');
  const directories = fs.existsSync(root)
    ? fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  let runningServerCount = 0;
  for (const serverID of directories) {
    const container = await getLocalContainerData(serverID);
    if (container.isOk() && container.value.State === ContainerState.Running) runningServerCount += 1;
  }

  const usedPorts = new Set<number>();
  for (const serverID of directories) {
    const composePath = path.join(root, serverID, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) continue;
    const match = fs.readFileSync(composePath, 'utf8').match(/-\s*"(\d+):25565"/);
    const port = Number(match?.[1] || '');
    if (!Number.isNaN(port)) usedPorts.add(port);
  }

  const minecraftDefaultPort = 25565;
  let availablePorts = 0;
  for (let port = portMin; port <= portMax; port += 1) {
    if (usedPorts.has(port)) continue;
    if (avoidDefaultPort && port === minecraftDefaultPort) continue;
    availablePorts += 1;
  }

  return ok({
    version: '1',
    runningServerCount,
    totalServerCount: directories.length,
    availablePorts
  });
}

export class ComposeBuilder {
  private readonly version = '3.9';
  private readonly image = 'itzg/minecraft-server:latest';
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
  constructor(_cwd: string) {}

  setPort(port: number) {
    this.port = port;
    return this;
  }

  addVariable(key: string, value: string | number | boolean) {
    this.variables.push({ key, value: `'${value}'` });
    return this;
  }

  addListVariable(key: string, value: (string | number | boolean)[]) {
    this.variables.push({ key, value: `|\n        ${value.join('\n        ')}` });
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
    for (const volume of this.volumes) file += `      - ${volume}\n`;
    file += `    environment:\n`;
    for (const variable of this.variables) file += `      ${variable.key}: ${variable.value}\n`;
    file += `    restart: "${this.restart}"\n`;
    file += `    healthcheck:\n`;
    file += `      test: ${this.healthcheck.test}\n`;
    file += `      start_period: ${this.healthcheck.start_period}\n`;
    file += `      interval: ${this.healthcheck.interval}\n`;
    file += `      retries: ${this.healthcheck.retries}\n`;
    return file;
  }
}
