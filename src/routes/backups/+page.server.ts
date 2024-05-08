import { resultToPromise } from '$lib';
import { ResultAsync } from 'neverthrow';
import type { PageServerLoad } from './$types';
import { serverPB } from '$lib/database';
import { Collections } from '$lib/database/types';
import { CustomError } from '$lib/types';
import { error } from '@sveltejs/kit';

export const load = (async () => {
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
