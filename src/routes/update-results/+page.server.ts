import { latestUpdateResults } from '$lib/servers';
import { Err, Ok, Result, ResultAsync } from 'neverthrow';
import type { PageServerLoad, PageServerLoadEvent } from './$types';

type ExtractErrorType<T> = T extends Err<infer V, infer E> ? E : never;
type ExtractOkType<T> = T extends Ok<infer V, infer E> ? V : never;

export async function load({}: PageServerLoadEvent) {
  return {
    update: latestUpdateResults.map((update) => ({
      server: update.server,
      result: update.result.map((r) =>
        r.match<{ isErr: false; value: ExtractOkType<typeof r> } | { isErr: true; error: ExtractErrorType<typeof r> }>(
          (s) => {
            return { isErr: false, value: s } as { isErr: false; value: typeof s };
          },
          (e) => {
            return { isErr: true, error: e.json() } as { isErr: true; error: typeof e };
          }
        )
      )
    }))
  };
}
