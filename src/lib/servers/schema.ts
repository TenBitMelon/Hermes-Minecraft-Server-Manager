import { z } from 'zod';
import { Difficulty, Gamemode, ServerSoftware, ServerSoftwareOptions, TimeToLive, WorldType, WorldCreationMethod } from '$lib/database/types';
import { randomWord } from '$lib';
import { PUBLIC_REQUIRE_WHITELIST } from '$env/static/public';

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

    timeToLive: z.nativeEnum(TimeToLive).default(TimeToLive['12 hr']),
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
          (() => {
            const pipeType = z
              .object({
                uuid: z.string(),
                name: z.string()
              })
              .array();
            if (PUBLIC_REQUIRE_WHITELIST) return pipeType;
            else return pipeType.default([]);
          })()
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
