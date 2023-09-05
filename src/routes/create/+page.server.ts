import { ServerSoftware, ServerSoftwareOptions, WorldType, Difficulty, Gamemode, TimeToLive } from '$lib/database/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';
import { formDataObject } from '$lib';
import { ServerCreationSchema, createNewServer } from '$lib/servers/manager';

// const CreateServerFormSchema = z.object({
//   title: z.string().min(3).max(63),
//   subdomain: z.string().min(3).max(63).or(z.literal('')),
//   icon: z.instanceof(File).optional(),
//   serverSoftware: z.nativeEnum(ServerSoftware),

//   timeToLive: z.nativeEnum(TimeToLive),
//   eula: z.literal(true).or(z.literal('true'))
// });

// const SourceWorldSchema = z.object({
//   worldSourceURL: z.string().url(),
//   worldSource: z.instanceof(File)
// });

// const NewWorldSchema = z.object({
//   worldseed: z.string().default(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + ''),
//   worldType: z.nativeEnum(WorldType),
//   superflatLayers: z
//     .object({
//       block: z.string(),
//       height: z.number()
//     })
//     .strict()
//     .optional()
// });

// const AdvancedOptionsSchema = z.object({
//   maxPlayers: z.coerce.number().default(10),
//   difficulty: z.nativeEnum(Difficulty).default(Difficulty.Normal),
//   gamemode: z.nativeEnum(Gamemode).default(Gamemode.Survival),
//   viewDistance: z.coerce.number().default(16),
//   simulationDistance: z.coerce.number().default(10),

//   whitelist: z.string().default(''),
//   ops: z.string().default(''),
//   bannedPlayers: z.string().default(''),

//   serverProperties: z.instanceof(File).optional()
// });

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = formDataObject(await request.formData());

    const data = ServerCreationSchema.safeParse(formData);
    if (!data.success) return fail(400, { errors: data.error.flatten().fieldErrors });

    createNewServer(data.data);

    throw redirect(303, '/');
    return { errors: {}, success: true };

    // const requiredData = CreateServerFormSchema.safeParse(formData);
    // if (!requiredData.success) return fail(400, { errors: requiredData.error.flatten().fieldErrors });

    // const serverSoftware = ServerSoftwareOptions[requiredData.data.serverSoftware];
    // if (!serverSoftware) return fail(400, { errors: { serverSoftware: 'Invalid server software' } });
    // const SoftwareSchema = CreateServerFormSchema.extend({
    //   gameVersion: z.string().refine((v) => serverSoftware.versions.flat().includes(v), { message: 'Invaild game version for software' }),
    //   worldCreator: z
    //     .literal('new')
    //     .or(z.literal('source'))
    //     .refine((v) => (serverSoftware.newWorld && v == 'new') || (serverSoftware.fromSource && v == 'source'))
    // });

    // const softwareData = SoftwareSchema.safeParse(formData);
    // if (!softwareData.success) return fail(400, { errors: softwareData.error.flatten().fieldErrors });

    // let WorldSchema = SoftwareSchema.extend({
    //   mods: z
    //     .instanceof(File)
    //     .array()
    //     .refine(() => serverSoftware.modsUpload)
    //     .optional(),
    //   plugins: z
    //     .instanceof(File)
    //     .array()
    //     .refine(() => serverSoftware.pluginsUpload)
    //     .optional()
    // });
    // if (softwareData.data.worldCreator == 'new') WorldSchema = WorldSchema.merge(NewWorldSchema);
    // else if (softwareData.data.worldCreator == 'source') WorldSchema = WorldSchema.merge(SourceWorldSchema);

    // const worldData = WorldSchema.safeParse(formData);
    // if (!worldData.success) return fail(400, { errors: worldData.error.flatten().fieldErrors });

    // const FinalSchema = WorldSchema.merge(AdvancedOptionsSchema);

    // const finalData = FinalSchema.safeParse(formData);
    // if (!finalData.success) return fail(400, { errors: finalData.error.flatten().fieldErrors });

    // throw redirect(303, '/');

    // createNewServer(finalData.data);

    // return { errors: {}, success: true };
  }
};
