import { serverPB } from '$lib/database';
import { Collections, WorkerStatus } from '$lib/database/types';
import { removeContainer } from '$lib/docker';
import { getUserDirectory, requireAdministrator } from '$lib/server/auth';
import { deriveWorkerStatus, hashWorkerToken } from '$lib/workers';
import { workerAdminView } from '$lib/workers/view';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

const maxOwnedServerLimit = 1000;

export async function load({ locals }) {
  requireAdministrator({ user: locals.user });

  const [users, servers, workers] = await Promise.all([getUserDirectory(), serverPB.collection(Collections.Servers).getFullList(), serverPB.collection(Collections.Workers).getFullList()]);

  return {
    users,
    servers,
    workers: workers.map((worker) => workerAdminView({ ...worker, derivedStatus: deriveWorkerStatus(worker) }))
  };
}

export const actions = {
  updateUser: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();
    const administrator = formData.get('administrator') === 'true';
    const ownedServerLimit = Number(formData.get('ownedServerLimit')?.toString() ?? '0');

    if (!userId) return fail(400, { message: 'Missing required user profile values.' });

    if (!Number.isInteger(ownedServerLimit) || ownedServerLimit < 0 || ownedServerLimit > maxOwnedServerLimit) {
      return fail(400, { message: `Owned server limit must be a whole number between 0 and ${maxOwnedServerLimit}.` });
    }

    await serverPB.collection(Collections.Users).update(userId, {
      administrator,
      ownedServerLimit
    });

    return { success: true };
  },
  transferOwner: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const serverId = formData.get('serverId')?.toString();
    const ownerUserId = formData.get('ownerUserId')?.toString();
    if (!serverId || !ownerUserId) return fail(400, { message: 'Missing server transfer fields.' });

    await serverPB.collection(Collections.Servers).update(serverId, {
      owner: ownerUserId
    });

    return { success: true };
  },
  saveWorker: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const workerId = formData.get('workerId')?.toString();
    const name = formData.get('name')?.toString() ?? '';
    const baseUrl = formData.get('baseUrl')?.toString() ?? '';
    const publicAddress = formData.get('publicAddress')?.toString() ?? '';
    const portMin = Number(formData.get('portMin')?.toString() ?? '0');
    const portMax = Number(formData.get('portMax')?.toString() ?? '0');
    const serverCapacity = Number(formData.get('serverCapacity')?.toString() ?? '0');
    const status = (formData.get('status')?.toString() as WorkerStatus | undefined) ?? WorkerStatus.Online;
    const token = formData.get('apiToken')?.toString() ?? '';
    const avoidDefaultPort = formData.get('avoidDefaultPort') === 'true';

    if (!name || !baseUrl || !publicAddress || Number.isNaN(portMin) || Number.isNaN(portMax) || Number.isNaN(serverCapacity)) {
      return fail(400, { message: 'Missing required worker fields.' });
    }
    if (!workerId && !token) return fail(400, { message: 'A new worker needs an API token.' });

    const payload: Record<string, unknown> = {
      name,
      baseUrl,
      publicAddress,
      portMin,
      portMax,
      serverCapacity,
      status,
      avoidDefaultPort
    };
    if (token) {
      payload.apiToken = token;
      payload.apiTokenHash = hashWorkerToken(token);
    }

    if (workerId) await serverPB.collection(Collections.Workers).update(workerId, payload);
    else
      await serverPB.collection(Collections.Workers).create({
        ...payload,
        apiToken: token,
        apiTokenHash: hashWorkerToken(token),
        runningServerCount: 0,
        totalServerCount: 0,
        lastHeartbeatAt: null,
        lastHeartbeatVersion: '',
        lastHeartbeatError: ''
      });

    return { success: true, message: 'Worker saved.' };
  },
  deleteWorker: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const workerId = formData.get('workerId')?.toString();
    if (!workerId) return fail(400, { message: 'Missing worker to delete.' });

    await serverPB.collection(Collections.Workers).delete(workerId);
    return { success: true, message: 'Worker deleted.' };
  },
  deleteServer: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const serverId = formData.get('serverId')?.toString();
    if (!serverId) return fail(400, { message: 'Missing server to delete.' });

    const removeResult = await removeContainer(serverId, true);
    if (removeResult.isErr()) return fail(500, { message: removeResult.error.message });

    return { success: true, message: 'Server deleted.' };
  }
} satisfies Actions;
