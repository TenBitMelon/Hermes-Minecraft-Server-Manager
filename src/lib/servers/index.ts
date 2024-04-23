import { Collections, WorldType, type ServerResponse, WorldCreationMethod, TimeToLive, type ServerRecord, ServerState, TimeToLiveMiliseconds } from '$lib/database/types';
import { serverPB } from '$lib/database';
import fs from 'node:fs';
import { env as publicENV } from '$env/dynamic/public';
import { env as privateENV } from '$env/dynamic/private';
import { addServerRecords } from '$lib/cloudflare';
import { ComposeBuilder, ContainerError, ContainerErrorType, ContainerState, containerDoesntExists, getContainerData, removeContainer, startContainer, stopContainer } from '$lib/docker';
import type { ServerCreationSchema } from './schema';
// import DefaultIcon from '$lib/servers/icon.png';
import { z } from 'zod';
import { Result, ResultAsync, err, ok } from 'neverthrow';
import { PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN } from '$env/static/public';
import { writable, type Writable } from 'svelte/store';

const PORT_RANGE = [+privateENV.PRIVATE_PORT_MIN, +privateENV.PRIVATE_PORT_MAX];

export async function createNewServer(data: z.infer<typeof ServerCreationSchema>): Promise<Result<ServerResponse, Error>> {
  const usedPorts = (await serverPB.collection(Collections.Servers).getFullList<ServerResponse>()).map((server) => server.port);
  let port: number = PORT_RANGE[0];
  // Find first unused port
  while (usedPorts.includes(port)) if (port++ > PORT_RANGE[1]) return err(new Error('No Ports Available'));

  const defaultIconBuffer = await fetch(publicENV.PUBLIC_DEFAULT_ICON_URL).then((r) => r.arrayBuffer());

  const recordIds = await addServerRecords(data.subdomain, port);
  if (recordIds.isErr()) return err(recordIds.error);

  const createResponse = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).create<ServerResponse>({
      port,
      title: data.title,
      // icon: data.icon,
      icon: data.icon ? data.icon : new File([defaultIconBuffer], 'icon.png'), // TODO: Check if you can do files here or if it needs to be formdata
      subdomain: data.subdomain,
      serverSoftware: data.serverSoftware,
      gameVersion: data.gameVersion,
      worldType: data.worldCreator === WorldCreationMethod.New ? data.worldType : WorldType.Normal, // TODO: Allow for source
      timeToLive: data.timeToLive,

      startDate: null,
      deletionDate: null,
      shutdownDate: null,
      canBeDeleted: +PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN == -1 ? false : true,

      cloudflareCNAMERecordID: recordIds.value.cname,
      cloudflareSRVRecordID: recordIds.value.srv,

      serverFilesMissing: false,
      serverFilesZipped: null,
      state: ServerState.Creating
    }),
    () => new Error('Failed to create new server in DB')
  );
  if (createResponse.isErr()) return err(createResponse.error);
  const record = createResponse.value;

  const serverFolderPath = `servers/${record.id}`;
  const serverFilesPath = `${serverFolderPath}/server-files`;
  fs.mkdirSync(serverFilesPath, { recursive: true });

  if (data.icon) fs.writeFileSync(`${serverFilesPath}/icon.png`, Buffer.from(await data.icon.arrayBuffer()));
  else fs.writeFileSync(`${serverFilesPath}/icon.png`, Buffer.from(defaultIconBuffer));

  if (data.whitelist.length > 0) fs.writeFileSync(`${serverFilesPath}/whitelist.json`, JSON.stringify(data.whitelist));
  if (data.ops.length > 0) fs.writeFileSync(`${serverFilesPath}/ops.json`, JSON.stringify(data.ops));
  if (data.bannedPlayers.length > 0) fs.writeFileSync(`${serverFilesPath}/banned-players.json`, JSON.stringify(data.bannedPlayers));

  if (data.serverProperties) {
    const serverProperties = await data.serverProperties.text();
    fs.writeFileSync(`${serverFilesPath}/server.properties`, serverProperties);
  }

  /* 
  TODO: Files to create
  - docker-compose.yml
  - server.properties if not null
  - extract world if source is url
  */

  // Docker compose file
  const builder = new ComposeBuilder(`${serverFolderPath}/docker-compose.yml`);
  builder.setPort(port);

  builder.addVariable('USE_AIKAR_FLAGS', 'true');
  builder.addVariable('EULA', 'true');
  builder.addVariable('MEMORY', '2G');
  builder.addVariable('MAX_TICK_TIME', '-1');

  if (data.serverProperties) {
    builder.addVariable('OVERRIDE_SERVER_PROPERTIES', 'true');
    builder.addVariable('SERVER_PROPERTIES', '/data/server-files/server.properties');
  }

  builder.addVariable('TYPE', data.serverSoftware.toUpperCase());
  builder.addVariable('VERSION', data.gameVersion);
  builder.addVariable('MOTD', data.motd);
  builder.addVariable('ICON', '/data/icon.png');
  // builder.addVariable('OVERRIDE_ICON', 'true');

  builder.addVariable('DIFFICULTY', data.difficulty.toUpperCase());
  builder.addVariable('MODE', data.gamemode);
  builder.addVariable('MAX_PLAYERS', data.maxPlayers);
  builder.addVariable('ALLOW_NETHER', data.allowNether);
  builder.addVariable('ENABLE_COMMAND_BLOCK', data.enableCommandBlock);
  builder.addVariable('HARDCORE', data.hardcore);
  builder.addVariable('PVP', data.enablePVP);
  builder.addVariable('ALLOW_FLIGHT', 'true');

  builder.addVariable('SPAWN_PROTECTION', '0');
  builder.addVariable('VIEW_DISTANCE', data.viewDistance);
  builder.addVariable('SIMULATION_DISTANCE', data.simulationDistance);

  if (data.worldCreator === WorldCreationMethod.Source) {
    if (data.worldSourceURL) builder.addVariable('WORLD', data.worldSourceURL);
  } else if (data.worldCreator === WorldCreationMethod.New) {
    builder.addVariable('SEED', data.worldSeed);
    builder.addVariable('LEVEL_TYPE', data.worldType);
    if (data.worldType === WorldType.Flat) {
      builder.addVariable('GENERATOR_SETTINGS', `{layers:${data.superflatLayers}}`);
    }
  }

  if (data.resourcepackURL) {
    builder.addVariable('RESOURCE_PACK_ENFORCE', 'true');
    builder.addVariable('RESOURCE_PACK', data.resourcepackURL);
  }

  if (data.datapackURL) builder.addVariable('DATAPACKS', data.datapackURL);

  builder.addVariable('EXISTING_WHITELIST_FILE', 'SKIP');
  builder.addVariable('EXISTING_OPS_FILE', 'SKIP');
  builder.addVariable('EXISTING_BANNED_PLAYERS_FILE', 'SKIP');

  // ^ AUTOPAUSE_TIMEOUT_EST is the time in seconds before the server is paused after the last player leaves
  // ^ AUTOPAUSE_TIMEOUT_INIT is the time in seconds before the server is paused after it is started (once no one is on the server)

  // ${data.timeToLive === TimeToLive['12 hr Inactivity'] ? 'AUTOPAUSE_TIMEOUT_EST: "7200"' : ''}
  // ${data.timeToLive === TimeToLive['24 hr Inactivity'] ? 'AUTOPAUSE_TIMEOUT_EST: "14400"' : ''}
  // ${data.timeToLive === TimeToLive['1 Day'] ? 'AUTOPAUSE_TIMEOUT_INIT: "86400"' : ''}
  // ${data.timeToLive === TimeToLive['7 Days'] ? 'AUTOPAUSE_TIMEOUT_INIT: "259200"' : ''}
  builder.addVariable('ENABLE_AUTOPAUSE', 'true');
  builder.addVariable('AUTOPAUSE_TIMEOUT_EST', '3600');

  // builder.addVariable('ENABLE_AUTOSTOP', 'true');
  // builder.addVariable('AUTOSTOP_TIMEOUT_EST', '1800');
  switch (data.timeToLive) {
    case TimeToLive['12 hr']:
      builder.addVariable('AUTOSTOP_TIMEOUT_INIT', '7200');
      break;
    case TimeToLive['1 Day']:
      builder.addVariable('AUTOSTOP_TIMEOUT_INIT', '14400');
      break;
    case TimeToLive['7 Days']:
      builder.addVariable('AUTOSTOP_TIMEOUT_INIT', '259200');
      break;
  }

  fs.writeFileSync(`${serverFolderPath}/docker-compose.yml`, builder.build());

  // Start the mc server's docker-compose file
  const containerResult = await startContainer(record.id);
  return containerResult.map(() => record);
}

export let latestUpdateResults: {
  server: ServerResponse;
  result: Promise<Result<ServerUpdateType[], ServerUpdateError>>;
}[] = [];

export async function updateAllServerStates() {
  const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>();
  const updateResults = servers.map((server) => ({ server, result: updateServerState(server) }));

  latestUpdateResults = updateResults;
}

export enum ServerUpdateType {
  ContainerDoesntExist,
  StartedServer,
  StoppedServer,
  KeepState,
  ChangeState,
  ServerTimeToLiveExpired,
  RemoveServer
}

class ServerUpdateError extends Error {
  stack: string = '';
  cause: ServerUpdateType | ContainerErrorType;

  constructor(
    message: string,
    cause: ServerUpdateType | ContainerErrorType,
    readonly error?: unknown
  ) {
    super(message, { cause });
    this.cause = cause;
  }

  json(): ServerUpdateError {
    return JSON.parse(JSON.stringify(this, Object.getOwnPropertyNames(this)));
  }
}

export async function updateServerState(server: ServerResponse): Promise<Result<ServerUpdateType[], ServerUpdateError>> {
  const changeToServer: ServerUpdateType[] = [];

  if (containerDoesntExists(server.id)) {
    if (!server.serverFilesMissing)
      await serverPB.collection(Collections.Servers).update<ServerRecord>(server.id, {
        serverFilesMissing: true
      });
    return err(new ServerUpdateError("The server doesn't exist", ServerUpdateType.ContainerDoesntExist));
  }

  const statsResult = await getContainerData(server.id);
  if (statsResult.isErr()) return err(new ServerUpdateError(statsResult.error.message, statsResult.error.cause));
  const stats = statsResult.value;

  if (server.state == ServerState.Stopped && stats.State == ContainerState.Running) {
    // Server unexpectedly was running!
    const startResult = await startContainer(server.id);
    if (startResult.isErr()) return err(new ServerUpdateError(startResult.error.message, startResult.error.cause, startResult.error));
    changeToServer.push(ServerUpdateType.StartedServer);
  } else if (server.state == ServerState.Running && stats.State == ContainerState.Exited) {
    // Server unexpectedly stopped!
    const stopResult = await stopContainer(server.id);
    if (stopResult.isErr()) return err(new ServerUpdateError(stopResult.error.message, stopResult.error.cause, stopResult.error));
    changeToServer.push(ServerUpdateType.StoppedServer);
  } else {
    let newState: ServerState;
    switch (stats.State) {
      case ContainerState.Created:
        newState = ServerState.Creating;
        break;
      case ContainerState.Dead:
        newState = ServerState.Stopped;
        break;
      case ContainerState.Exited:
        newState = ServerState.Stopped;
        break;
      case ContainerState.Paused:
        newState = ServerState.Paused;
        break;
      case ContainerState.Removing:
        newState = ServerState.Stopped;
        break;
      case ContainerState.Restarting:
        newState = ServerState.Stopped;
        break;
      case ContainerState.Running:
        newState = ServerState.Running;
        break;
    }

    await serverPB.collection(Collections.Servers).update<ServerRecord>(server.id, {
      state: newState,
      serverFilesMissing: false
    });

    if (server.state != newState) changeToServer.push(ServerUpdateType.ChangeState);
    else changeToServer.push(ServerUpdateType.KeepState);
  }

  if (server.state == ServerState.Paused && server.startDate && Date.now() > Date.parse(server.startDate) + TimeToLiveMiliseconds[server.timeToLive]) {
    // The server is paused and it has been up longer than the time to live
    // Stop the server
    const stopResult = await stopContainer(server.id);
    if (stopResult.isErr()) return err(new ServerUpdateError(stopResult.error.message, stopResult.error.cause, stopResult.error));
    changeToServer.push(ServerUpdateType.ServerTimeToLiveExpired);
    changeToServer.push(ServerUpdateType.StoppedServer);
  }

  if (server.state == ServerState.Stopped && server.shutdownDate && server.canBeDeleted && server.deletionDate && Date.now() > Date.parse(server.deletionDate)) {
    // The server can be deleted and it is passed the deletion date.
    const removeResult = await removeContainer(server.id);
    if (removeResult.isErr()) return err(new ServerUpdateError(removeResult.error.message, removeResult.error.cause, removeResult.error));
    changeToServer.push(ServerUpdateType.RemoveServer);
  }

  return ok(changeToServer);
}
