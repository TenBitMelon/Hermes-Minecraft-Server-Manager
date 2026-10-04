import { env as publicENV } from '$env/dynamic/public';
import { getFileURL } from '$lib';
import { addCloudflareRecords, removeCloudflareRecords } from '$lib/cloudflare';
import { serverPB } from '$lib/database';
import { Collections, ServerState, TimeToLiveMilliseconds, WorkerStatus, WorldCreationMethod, WorldType, type ServerRecord, type ServerResponse, type WorkerResponse } from '$lib/database/types';
import { ComposeBuilder, getContainerData, removeContainer, startContainer, stopContainer } from '$lib/docker';
import { ContainerState, CustomError } from '$lib/types';
import { getWorkerClientForWorker } from '$lib/workers/client';
import { getUnusedPortForWorker, selectWorkerForNewServer } from '$lib/workers/placement';
import { Result, ResultAsync, err } from 'neverthrow';
import { z } from 'zod';
import type { ServerCreationSchema } from './schema';

// TODO: Clean up this function
export async function createNewServer(data: z.infer<typeof ServerCreationSchema>, ownerUserId: string, manualWorkerId?: string | null): Promise<Result<ServerResponse, Error>> {
  const selectedWorkerResult = await selectWorkerForNewServer(manualWorkerId);
  if (selectedWorkerResult.isErr()) return err(selectedWorkerResult.error);
  const selectedWorker = selectedWorkerResult.value;

  const portR = await getUnusedPortForWorker(selectedWorker);
  if (portR.isErr()) return err(portR.error);
  const port = portR.value;

  const defaultIconResult = await ResultAsync.fromPromise(
    fetch(publicENV.PUBLIC_DEFAULT_ICON_URL).then((r) => r.arrayBuffer()),
    (error) => CustomError.from(error, 'Failed to load the default server icon.')
  );
  if (defaultIconResult.isErr()) return err(defaultIconResult.error);
  const defaultIconBuffer = defaultIconResult.value;
  let createdRecord: ServerResponse | null = null;
  let dnsRecordIds: { cname: string; srv: string } | null = null;

  async function cleanupCreationFailure(nestedError: Error) {
    if (createdRecord) {
      const workerClient = getWorkerClientForWorker(selectedWorker);
      if (workerClient.isOk()) await workerClient.value.removeServer(createdRecord.id, true);

      const deleteRecordResult = await ResultAsync.fromPromise(serverPB.collection(Collections.Servers).delete(createdRecord.id), (error) => CustomError.from(error, 'Failed to roll back the partially created server record.'));
      if (deleteRecordResult.isErr()) return err(new CustomError(nestedError.message, deleteRecordResult.error));
    }

    if (dnsRecordIds) {
      const removeDnsResult = await removeCloudflareRecords(dnsRecordIds.cname, dnsRecordIds.srv);
      if (removeDnsResult.isErr()) return err(new CustomError(nestedError.message, removeDnsResult.error));
    }

    return err(nestedError);
  }

  const createResponse = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).create<ServerResponse>({
      port,
      icon: data.icon ? data.icon : new File([defaultIconBuffer], 'icon.png'),
      title: data.title,
      subdomain: data.subdomain,

      serverSoftware: data.serverSoftware,
      gameVersion: data.gameVersion,
      worldType: data.worldCreator === WorldCreationMethod.New ? data.worldType : 'source',

      timeToLive: data.timeToLive,

      state: ServerState.Creating,
      startDate: null,
      shutdownDate: null,
      deletionDate: null,
      canBeDeleted: +publicENV.PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN == -1 ? false : true,
      serverFilesMissing: false,
      owner: ownerUserId,
      createdBy: ownerUserId,
      worker: selectedWorker?.id ?? null,
      workerPort: port,
      cloudflareCNAMERecordID: '',
      cloudflareSRVRecordID: ''
    }),
    () => new Error('Failed to create new server in DB')
  );
  if (createResponse.isErr()) {
    return err(createResponse.error);
  }
  const record = createResponse.value;
  createdRecord = record;

  // TODO: This needs to write after the server is created or set the URL in the compose file
  // if (data.icon) fs.writeFileSync(`${serverFilesPath}/server-icon.png`, Buffer.from(await data.icon.arrayBuffer()));
  // else fs.writeFileSync(`${serverFilesPath}/server-icon.png`, Buffer.from(defaultIconBuffer));
  const appOrigin = publicENV.PUBLIC_APP_ORIGIN;
  if (!appOrigin) return cleanupCreationFailure(new CustomError('PUBLIC_APP_ORIGIN is not configured.'));
  const serverIconURL = data.icon ? getFileURL(record.collectionId, record.id, record.icon) : publicENV.PUBLIC_DEFAULT_ICON_URL;

  // if (data.whitelist.length > 0) fs.writeFileSync(`${serverFilesPath}/whitelist.json`, JSON.stringify(data.whitelist));
  // if (data.ops.length > 0) fs.writeFileSync(`${serverFilesPath}/ops.json`, JSON.stringify(data.ops));
  // if (data.bannedPlayers.length > 0) fs.writeFileSync(`${serverFilesPath}/banned-players.json`, JSON.stringify(data.bannedPlayers));

  const serverPropertiesResult = data.serverProperties ? await ResultAsync.fromPromise(data.serverProperties.text(), (error) => CustomError.from(error, 'Failed to read the uploaded server.properties file.')) : null;
  if (serverPropertiesResult?.isErr()) return cleanupCreationFailure(serverPropertiesResult.error);

  /* 
  TODO: Files to create
  - extract world if source is url
  */

  // Docker compose file
  const builder = new ComposeBuilder(`servers/${record.id}/docker-compose.yml`);
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
  builder.addVariable('ICON', `${appOrigin.replace(/\/$/, '')}${serverIconURL}`);

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
      builder.addVariable('GENERATOR_SETTINGS', `{"layers":${JSON.stringify(data.superflatLayers)}}`);
    }
  }

  if (data.resourcepackURL) {
    builder.addVariable('RESOURCE_PACK_ENFORCE', 'true');
    builder.addVariable('RESOURCE_PACK', data.resourcepackURL);
  }

  if (data.datapackURL) builder.addVariable('DATAPACKS', data.datapackURL);

  if (data.whitelist.length > 0) builder.addListVariable('WHITELIST', data.whitelist);
  if (data.ops.length > 0) builder.addListVariable('OPS', data.ops);
  // builder.addVariable('EXISTING_WHITELIST_FILE', 'SKIP'); // already defaults
  // builder.addVariable('EXISTING_OPS_FILE', 'SKIP'); // already defaults
  // builder.addVariable('EXISTING_BANNED_PLAYERS_FILE', 'SKIP'); // already defaults

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
  // switch (data.timeToLive) {
  //   case TimeToLive['12 hr']:
  //     builder.addVariable('AUTOSTOP_TIMEOUT_INIT', '7200');
  //     break;
  //   case TimeToLive['1 Day']:
  //     builder.addVariable('AUTOSTOP_TIMEOUT_INIT', '14400');
  //     break;
  //   case TimeToLive['7 Days']:
  //     builder.addVariable('AUTOSTOP_TIMEOUT_INIT', '259200');
  //     break;
  // }

  const workerClient = getWorkerClientForWorker(selectedWorker);
  if (workerClient.isErr()) return cleanupCreationFailure(workerClient.error);

  const provisionResult = await workerClient.value.provisionServer({
    serverID: record.id,
    composeContent: builder.build(),
    serverProperties: serverPropertiesResult && serverPropertiesResult.isOk() ? serverPropertiesResult.value : null
  });
  if (provisionResult.isErr()) return cleanupCreationFailure(provisionResult.error);

  const recordIds = await addCloudflareRecords(data.subdomain, port, selectedWorker?.publicAddress);
  if (recordIds.isErr()) return cleanupCreationFailure(recordIds.error);
  dnsRecordIds = recordIds.value;

  const updateDnsResult = await ResultAsync.fromPromise(
    serverPB.collection(Collections.Servers).update<ServerRecord>(record.id, {
      cloudflareCNAMERecordID: dnsRecordIds.cname,
      cloudflareSRVRecordID: dnsRecordIds.srv
    }),
    (error) => CustomError.from(error, 'Failed to save the Cloudflare record IDs on the new server.')
  );
  if (updateDnsResult.isErr()) return cleanupCreationFailure(updateDnsResult.error);

  const containerResult = await startContainer(record.id);
  if (containerResult.isErr()) return cleanupCreationFailure(new CustomError('Failed to start the server after creation.', containerResult.error));
  return containerResult.map(() => record);
}

type UpdateResult =
  | {
      value: string;
      variables: Record<string, unknown> & { time: string };
      hasError: false;
    }
  | {
      error: CustomError;
      variables: Record<string, unknown> & { time: string };
      hasError: true;
    };

export const latestUpdateResults: {
  server: ServerResponse;
  updates: UpdateResult[];
}[] = [];

export async function updateAllServerStates() {
  const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>();

  for (const server of servers) {
    updateServerState(server).then((r) => {
      const existing = latestUpdateResults.find((l) => l.server.id == server.id);
      if (existing) {
        if (existing.updates.length >= 25) existing.updates.shift();
        existing.updates.push(...r);
      } else {
        latestUpdateResults.push({
          server,
          updates: r
        });
      }
    });
  }
}

export async function updateServerState(server: ServerResponse): Promise<UpdateResult[]> {
  const changeToServer: UpdateResult[] = [];

  function addValue(value: string, variables: Record<string, unknown>) {
    changeToServer.push({ value, hasError: false, variables: { ...variables, time: new Date().toISOString() } });
  }
  function addError(error: CustomError, variables: Record<string, unknown>) {
    changeToServer.push({ error, hasError: true, variables: { ...variables, time: new Date().toISOString() } });
    return changeToServer;
  }

  let worker: WorkerResponse | null = null;
  if (server.worker) {
    worker = await serverPB
      .collection(Collections.Workers)
      .getOne<WorkerResponse>(server.worker)
      .catch(() => null);
    if (!worker) return addError(new CustomError('The assigned worker no longer exists.'), { workerId: server.worker });
    if (worker.status === WorkerStatus.Offline || worker.status === WorkerStatus.Restarting || worker.status === WorkerStatus.Disabled) {
      await serverPB.collection(Collections.Servers).update<ServerRecord>(server.id, {
        serverFilesMissing: false
      });
      addValue('Worker unavailable; skipped direct runtime reconciliation', { worker: worker.name, workerStatus: worker.status });
      return changeToServer;
    }
  }

  const statsResult = await getContainerData(server.id);
  if (statsResult.isErr()) return addError(statsResult.error, {});
  const stats = statsResult.value;

  if (server.state == ServerState.Stopped && stats.State == ContainerState.Running) {
    // Server unexpectedly was running!
    const startResult = await startContainer(server.id);
    if (startResult.isErr()) return addError(startResult.error, {});
    // changeToServer.push('Started server because it was unexpectedly running');
    // variables.push({ time: new Date().toISOString(), databaseState: server.state, containerState: stats.State });
    addValue('Started server because it was unexpectedly running', { databaseState: server.state, containerState: stats.State });
  } else if (server.state == ServerState.Running && stats.State == ContainerState.Exited) {
    // Server unexpectedly stopped!
    const stopResult = await stopContainer(server.id);
    if (stopResult.isErr()) return addError(stopResult.error, {});
    // changeToServer.push('Stopped server because it was unexpectedly stopped');
    // variables.push({ time: new Date().toISOString(), databaseState: server.state, containerState: stats.State });
    addValue('Stopped server because it was unexpectedly stopped', { databaseState: server.state, containerState: stats.State });
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

    if (server.state != newState) {
      // changeToServer.push('Changed server state from ' + server.state + ' to ' + newState);
      // variables.push({ time: new Date().toISOString(), oldState: server.state, newState });
      addValue('Changed server state', { oldState: server.state, newState });
    } else {
      // changeToServer.push('Server state is the same');
      // variables.push({ time: new Date().toISOString(), currentState: server.state });
      addValue('Server state is the same', { currentState: server.state });
    }
  }

  if (server.state == ServerState.Paused && server.startDate && Date.now() > Date.parse(server.startDate) + TimeToLiveMilliseconds[server.timeToLive]) {
    // The server is paused and it has been up longer than the time to live
    // Stop the server
    const stopResult = await stopContainer(server.id);
    if (stopResult.isErr()) return addError(stopResult.error, {});
    // changeToServer.push(ServerUpdateType.ServerTimeToLiveExpired);
    // changeToServer.push(ServerUpdateType.StoppedServer);
    // changeToServer.push('Stopped server because it was paused and the time to live expired');
    // variables.push({ time: new Date().toISOString(), timeToLive: server.timeToLive, databaseState: server.state, startDate: server.startDate });
    addValue('Stopped server because it was paused and the time to live expired', { timeToLive: server.timeToLive, databaseState: server.state, startDate: server.startDate });
  }

  if (server.state == ServerState.Stopped && server.shutdownDate && server.canBeDeleted && server.deletionDate && Date.now() > Date.parse(server.deletionDate)) {
    // The server can be deleted and it is passed the deletion date.
    const removeResult = await removeContainer(server.id);
    if (removeResult.isErr()) return addError(removeResult.error, {});
    // changeToServer.push("Removed server because it's past the deletion date");
    // variables.push({ time: new Date().toISOString(), deletionDate: server.deletionDate, databaseState: server.state, canBeDeleted: server.canBeDeleted, shutdownDate: server.shutdownDate });
    addValue("Removed server because it's past the deletion date", { deletionDate: server.deletionDate, databaseState: server.state, canBeDeleted: server.canBeDeleted, shutdownDate: server.shutdownDate });
  }

  return changeToServer;
}
