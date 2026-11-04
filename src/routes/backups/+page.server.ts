import { serverPB } from '$lib/database';
import { Collections, type BackupResponse } from '$lib/database/types';
import { requireAdministrator } from '$lib/server/auth';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
  requireAdministrator({ user: locals.user });

  // TODO: Return a promise instead of awaiting pageload
  const backups = await serverPB.collection(Collections.Backups).getFullList();
  if (!backups) error(404, "This server doesn't exist");

  // TODO: Replace with Object.groupBy once Node 22 is LTS
  function groupBy<K extends PropertyKey, T>(items: Iterable<T>, keySelector: (item: T, index: number) => K): Record<K, T[]> {
    return Array.from(items).reduce(
      (acc, item, index) => {
        const key = keySelector(item, index);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<K, T[]>
    );
  }

  const groupObject = groupBy(backups, (b) => b.serverID);

  return { backups: groupObject };
}) satisfies PageServerLoad;

export const actions = {
  deleteBackup: async ({ request, locals }) => {
    requireAdministrator({ user: locals.user });

    const formData = await request.formData();
    const backupId = formData.get('backupId')?.toString();
    if (!backupId) return fail(400, { message: 'Missing backup to delete.' });

    let backupRecord: BackupResponse;
    try {
      backupRecord = await serverPB.collection(Collections.Backups).getOne<BackupResponse>(backupId);
    } catch {
      return fail(404, { message: 'Backup not found.' });
    }

    await serverPB.collection(Collections.Backups).delete(backupId);
    return {
      success: true,
      message: `Deleted backup ${backupRecord.name}.`
    };
  }
} satisfies Actions;
