import { Difficulty, Gamemode, ServerSoftware, ServerSoftwareOptions, TimeToLive, WorldType } from '$lib/database/types';
import { z } from 'zod';

export const ServerCreationSchema = z
  .object({
    title: z.string().min(3).max(63),
    subdomain: z.string().min(3).max(63).or(z.literal('')),
    icon: z.instanceof(File).optional(),
    serverSoftware: z.nativeEnum(ServerSoftware),
    gameVersion: z.string(),

    timeToLive: z.nativeEnum(TimeToLive),
    eula: z.literal(true).or(z.literal('true'))
  })
  .refine(
    (data) => {
      const serverSoftware = ServerSoftwareOptions[data.serverSoftware];
      if (!serverSoftware) return false;
      return serverSoftware.versions.flat().includes(data.gameVersion);
    },
    { message: 'Invalid game version for software' }
  )
  .and(
    z.discriminatedUnion('worldCreator', [
      z.object({
        worldCreator: z.literal('source'),
        worldSourceURL: z.string().url(),
        worldSource: z.instanceof(File)
      }),
      z.object({
        worldCreator: z.literal('new'),
        worldseed: z.string().default(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + ''),
        worldType: z.nativeEnum(WorldType),
        superflatLayers: z
          .object({
            block: z.string(),
            height: z.number()
          })
          .strict()
          .optional()
      })
    ])
  )
  .and(
    z.object({
      maxPlayers: z.coerce.number().default(10),
      difficulty: z.nativeEnum(Difficulty).default(Difficulty.Normal),
      gamemode: z.nativeEnum(Gamemode).default(Gamemode.Survival),
      viewDistance: z.coerce.number().default(16),
      simulationDistance: z.coerce.number().default(10),

      whitelist: z.string().default(''),
      ops: z.string().default(''),
      bannedPlayers: z.string().default(''),

      serverProperties: z.instanceof(File).optional()
    })
  );

export function createNewServer(data: z.infer<typeof ServerCreationSchema>) {
  // const server = new Server(data);
  // server.start();
}
