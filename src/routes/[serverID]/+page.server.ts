import { getContainerLogs, getContainerUsageStats, sendCommandToContainer, startContainer, stopContainer } from '$lib/docker';
import { requireServerCapability } from '$lib/server/auth';
import type { CustomError } from '$lib/types';
import { fail, type ActionFailure } from '@sveltejs/kit';
import type { Actions, PageServerLoadEvent } from './$types';

export async function load({ params, locals }: PageServerLoadEvent) {
  const { server, access } = await requireServerCapability(params.serverID, { user: locals.user }, 'canViewDashboard');

  const stats = getContainerUsageStats(params.serverID).then((r) => {
    if (r.isErr()) return { value: null, error: r.error.json() };
    return { value: r.value, error: null };
  });
  const logs = getContainerLogs(params.serverID, 'all').then((r) => {
    if (r.isErr()) return { value: null, error: r.error.json() };
    return { value: r.value, error: null };
  });
  return {
    server,
    access,
    logs,
    stats
  };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Result<N, S, E> = Promise<
  | ActionFailure<{
      error: E;
      action: N;
    }>
  | {
      value: S;
      action: N;
    }
>;

export const actions = {
  start: async ({ params, locals }): Result<'start', void, CustomError> => {
    await requireServerCapability(params.serverID, { user: locals.user }, 'canStartStop');
    const result = await startContainer(params.serverID);
    await pause(1000);
    if (result.isErr()) return fail(400, { error: result.error.json(), action: 'start' });
    // return result.value;
    return { value: result.value, action: 'start' };
  },
  stop: async ({ params, locals }): Result<'stop', void, CustomError> => {
    await requireServerCapability(params.serverID, { user: locals.user }, 'canStartStop');
    const result = await stopContainer(params.serverID);
    await pause(1000);
    if (result.isErr()) return fail(400, { error: result.error.json(), action: 'stop' });
    // return result.value;
    return { value: result.value, action: 'stop' };
  },
  command: async ({ params, request, locals }): Result<'command', string[], CustomError> => {
    await requireServerCapability(params.serverID, { user: locals.user }, 'canSendConsole');
    const command = (await (await request.formData()).get('command')?.toString()) ?? '';
    const result = await sendCommandToContainer(params.serverID, command);
    if (result.isErr()) return fail(400, { error: result.error.json(), action: 'command' });
    // return result.value;
    return { value: result.value, action: 'command' };
  },
  logs: async (): Result<'logs', string[], CustomError> => {
    return { action: 'logs', value: [] };
    // It reloads the page on the client side, this is here so incase it does gwt sent
  }
} satisfies Actions;
