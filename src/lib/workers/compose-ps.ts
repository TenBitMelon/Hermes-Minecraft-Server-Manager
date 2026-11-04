import { CustomError, type ContainerData } from '$lib/types';
import { Result, err } from 'neverthrow';

/**
 * Reads the output of `docker compose ps -a --format json`.
 */
export function parseComposePsOutput(out: string): Result<ContainerData, CustomError> {
  const trimmed = out.trim();
  if (!trimmed) return err(new CustomError('No containers were reported for this server.'));

  return Result.fromThrowable(
    () => {
      const parsed: unknown = JSON.parse(trimmed.split('\n').find((line) => line.trim() !== '') ?? '');

      // Compose v2: a single JSON array of container objects.
      const record = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!record || typeof record !== 'object') throw new Error('no container object in the response');
      return record as ContainerData;
    },
    (error) => CustomError.from(error, 'Failed to parse container data')
  )();
}
