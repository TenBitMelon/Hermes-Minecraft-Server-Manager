import { latestUpdateResults } from '$lib/servers';
import { Err, Ok } from 'neverthrow';
import type { PageServerLoadEvent } from './$types';

type ExtractErrorType<T> = T extends Err<infer V, infer E> ? E : never;
type ExtractOkType<T> = T extends Ok<infer V, infer E> ? V : never;

export async function load({}: PageServerLoadEvent) {
  return {
    update: latestUpdateResults.map((serverUpdate) => ({
      server: serverUpdate.server,
      updates: serverUpdate.updates.map((r) => {
        if (r.hasError) r.error = r.error.json();
        return r;
      })
    }))
  };
}
