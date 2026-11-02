import { getLocalWorkerHealth } from '$lib/workers/localRuntime';
import childProcess from 'node:child_process';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());
it('rejects an empty Docker server result even when the CLI exits successfully', async () => {
  vi.spyOn(childProcess, 'execFile').mockImplementation((...args: unknown[]) => {
    const callback = args.at(-1) as (error: Error | null, stdout: string) => void;
    callback(null, '');
    return {} as ReturnType<typeof childProcess.execFile>;
  });
  const health = await getLocalWorkerHealth(25565, 25566, false);
  expect(health.isErr()).toBe(true);
  expect(health._unsafeUnwrapErr().message).toBe('Docker daemon is unavailable.');
});
