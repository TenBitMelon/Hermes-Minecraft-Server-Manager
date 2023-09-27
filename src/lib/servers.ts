import { Collections, Difficulty, Gamemode, ServerSoftware, ServerSoftwareOptions, TimeToLive, WorldType, type ServerResponse, WorldCreationMethod } from '$lib/database/types';
import { z } from 'zod';
import { randomWord } from '$lib';
import { serverPB } from '$lib/database';
import fs from 'node:fs';
import path from 'node:path';
import { env as penv } from '$env/dynamic/public';
import { addServerRecords } from './cloudflare';
import { ComposeBuilder, containerDoesntExists, getContainerRunningStatus, removeContainer, startContainer, stopContainer, zipContainerFiles } from './docker';
import { building, dev } from '$app/environment';

const PORT_RANGE = [+penv.PUBLIC_PORT_MIN, +penv.PUBLIC_PORT_MAX];

export const ServerCreationSchema = z
  .object({
    title: z.string().min(3).max(63), // CONFIRMED WORKING
    subdomain: z // CONFIRMED WORKING
      .string()
      .min(3)
      .max(63)
      .or(z.literal(''))
      .transform((v) => (v ? v.toLowerCase() : randomWord())),
    icon: z.instanceof(File).optional(),
    motd: z // CONFIRMED WORKING
      .string()
      .transform((s) => (s ? s : 'A Hermes Minecraft Server'))
      .default('A Hermes Minecraft Server'),
    serverSoftware: z.nativeEnum(ServerSoftware), // CONFIRMED WORKING
    gameVersion: z.string(), // CONFIRMED WORKING

    timeToLive: z.nativeEnum(TimeToLive).default(TimeToLive['12 hr Inactivity']),
    eula: z.literal(true).or(z.literal('true')), // CONFIRMED WORKING

    // resourcePack: z.instanceof(File).optional(),
    resourcepackURL: z.string().optional(),
    datapackURL: z.string().optional(),
    mods: z.instanceof(File).array().optional(),
    plugins: z.instanceof(File).array().optional()
  })
  .refine(
    (data) => {
      const serverSoftware = ServerSoftwareOptions[data.serverSoftware];
      if (!serverSoftware) return false;

      if (data.mods && !serverSoftware.modsUpload) return false;
      if (data.plugins && !serverSoftware.pluginsUpload) return false;

      return serverSoftware.versions.flat().includes(data.gameVersion);
    },
    { message: 'Invalid game version for software' }
  )
  .and(
    z.discriminatedUnion('worldCreator', [
      z.object({
        worldCreator: z.literal(WorldCreationMethod.Source),
        worldSourceURL: z.string().url().optional(),
        worldSource: z.instanceof(File).optional()
      }),
      z.object({
        worldCreator: z.literal(WorldCreationMethod.New),
        worldSeed: z.string().default(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + ''), // CONFIRMED WORKING
        worldType: z.nativeEnum(WorldType),
        superflatLayers: z
          .string()
          .optional()
          .transform((v) => (v ? JSON.parse(v) : []))
          .pipe(
            z
              .object({
                block: z.string(),
                height: z.number()
              })
              .strict()
              .array()
              .default([])
          )
      })
    ])
  )
  .and(
    z.object({
      maxPlayers: z.coerce.number().default(10),
      difficulty: z.nativeEnum(Difficulty).default(Difficulty.Normal), // CONFIRMED WORKING
      gamemode: z.nativeEnum(Gamemode).default(Gamemode.Survival), // CONFIRMED WORKING

      viewDistance: z.coerce.number().default(16), // CONFIRMED WORKING
      simulationDistance: z.coerce.number().default(10), // CONFIRMED WORKING

      allowNether: z.coerce.boolean().default(true), // ASSUMED WORKING
      hardcore: z.coerce.boolean().default(false), // ASSUMED WORKING
      enableCommandBlock: z.coerce.boolean().default(true), // UNTESTED
      enablePVP: z.coerce.boolean().default(true), // ASSUMED WORKING

      whitelist: z
        .string()
        .transform((v) => (v.trim() ? JSON.parse(v) : []))
        .pipe(
          z
            .object({
              uuid: z.string(),
              name: z.string()
            })
            .array()
            .default([])
        ),
      ops: z
        .string()
        .transform((v) => (v.trim() ? JSON.parse(v) : []))
        .pipe(
          z
            .object({
              uuid: z.string(),
              name: z.string(),
              level: z.number().default(4),
              bypassesPlayerLimit: z.coerce.boolean().default(true)
            })
            .array()
            .default([])
        ),
      bannedPlayers: z
        .string()
        .transform((v) => (v.trim() ? JSON.parse(v) : []))
        .pipe(
          z
            .object({
              uuid: z.string(),
              name: z.string(),
              created: z.string(),
              source: z.string(),
              expires: z.string(),
              reason: z.string()
            })
            .array()
            .default([])
        ),

      serverProperties: z.instanceof(File).optional()
    })
  );

function up(str: string) {
  return str.toUpperCase();
}
export async function createNewServer(data: z.infer<typeof ServerCreationSchema>) {
  const usedPorts = (await serverPB.collection(Collections.Servers).getFullList<ServerResponse>()).map((server) => server.port);
  let port: number = PORT_RANGE[0];
  // Find first unused port
  while (usedPorts.includes(port)) if (port++ > PORT_RANGE[1]) throw new Error('No available ports');

  const defaultIconBuffer = await fetch(penv.PUBLIC_DEFAULT_ICON_URL).then((r) => r.arrayBuffer());

  const record = await serverPB
    .collection(Collections.Servers)
    .create<ServerResponse>({
      port,
      title: data.title,
      // icon: data.icon,
      icon: data.icon ? data.icon : new File([defaultIconBuffer], 'default-server-icon.png'),
      subdomain: data.subdomain,
      serverSoftware: data.serverSoftware,
      gameVersion: data.gameVersion,
      worldType: data.worldCreator === WorldCreationMethod.New ? data.worldType : '', // TODO: Allow for source
      timeToLive: data.timeToLive,
      deletionDate: undefined,
      shutdownDate: undefined,
      shutdown: false,
      canBeDeleted: true
    })
    .catch((e) => {
      console.error(e);
      throw new Error('Failed to create server record');
    });

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

  builder.addVariable('TYPE', up(data.serverSoftware));
  builder.addVariable('VERSION', data.gameVersion);
  builder.addVariable('MOTD', data.motd);
  builder.addVariable('ICON', '/data/icon.png');
  builder.addVariable('OVERRIDE_ICON', 'true');

  builder.addVariable('DIFFICULTY', up(data.difficulty));
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

  // ${data.timeToLive === TimeToLive['12 hr Inactivity'] ? 'AUTOPAUSE_TIMEOUT_EST: "7200"' : ''}
  // ${data.timeToLive === TimeToLive['24 hr Inactivity'] ? 'AUTOPAUSE_TIMEOUT_EST: "14400"' : ''}
  // ${data.timeToLive === TimeToLive['1 Day'] ? 'AUTOPAUSE_TIMEOUT_INIT: "86400"' : ''}
  // ${data.timeToLive === TimeToLive['7 Days'] ? 'AUTOPAUSE_TIMEOUT_INIT: "259200"' : ''}
  builder.addVariable('ENABLE_AUTOPAUSE', 'true');
  builder.addVariable('AUTOPAUSE_TIMEOUT_EST', '7200');
  // ^ AUTOPAUSE_TIMEOUT_EST is the time in seconds before the server is paused after the last player leaves
  // ^ AUTOPAUSE_TIMEOUT_INIT is the time in seconds before the server is paused after it is started (once no one is on the server)

  fs.writeFileSync(`${serverFolderPath}/docker-compose.yml`, builder.build());

  addServerRecords(data.subdomain, port);

  // Start the mc server's docker-compose file
  startContainer(record.id);

  return record;
}

export async function updateServerStates() {
  const servers = await serverPB.collection(Collections.Servers).getFullList<ServerResponse>();
  for (const server of servers) {
    if (!containerDoesntExists(server.id)) {
      const running = await getContainerRunningStatus(server.id);
      if (server.shutdown && running) startContainer(server.id);
      else if (!server.shutdown && !running) stopContainer(server.id);

      if (server.serverHasGoneMissing)
        serverPB.collection(Collections.Servers).update(server.id, {
          serverHasGoneMissing: false
        });
    } else {
      if (server.serverHasGoneMissing) removeContainer(server.id, true);
      else
        serverPB.collection(Collections.Servers).update(server.id, {
          serverHasGoneMissing: true
        });
    }

    if (server.deletionDate && new Date(server.deletionDate) < new Date()) {
      removeContainer(server.id);
    }
  }
}
