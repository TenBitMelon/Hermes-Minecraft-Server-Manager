import { describe, expect, it } from 'vitest';
import { ContainerState } from '$lib/types';
import { parseComposePsOutput } from './compose-ps';

// Captured from `docker-compose ps -a --format json` on this machine, where
// docker-compose is Compose v2.13.0 and emits a single JSON array.
const composeV2Array = '[{"ID":"c06eddffb4b9","Name":"srv-minecraft-1","Command":"/image/scripts/start","Project":"srv","Service":"minecraft","State":"exited","Health":"","ExitCode":1,"Publishers":null}]';

// The Compose v1 shape the parser was originally written against: one object per line.
const composeV1Ndjson = '{"ID":"abc","Project":"srv","State":"running"}\n{"ID":"def","Project":"other","State":"exited"}\n';

describe('parseComposePsOutput', () => {
  it('reads a compose v2 array', () => {
    const result = parseComposePsOutput(composeV2Array);

    expect(result.isOk()).toBe(true);
    const container = result._unsafeUnwrap();
    expect(container.Project).toBe('srv');
    expect(container.State).toBe(ContainerState.Exited);
    expect(container.ExitCode).toBe(1);
  });

  it('reads the first of several containers in a v2 array', () => {
    const result = parseComposePsOutput('[{"Project":"first","State":"running"},{"Project":"second","State":"exited"}]');

    expect(result._unsafeUnwrap().Project).toBe('first');
  });

  it('reads compose v1 newline delimited output', () => {
    const result = parseComposePsOutput(composeV1Ndjson);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().Project).toBe('srv');
  });

  it('reads a lone object', () => {
    const result = parseComposePsOutput('{"ID":"abc","Project":"solo","State":"paused"}');

    expect(result._unsafeUnwrap().Project).toBe('solo');
    expect(result._unsafeUnwrap().State).toBe(ContainerState.Paused);
  });

  it('never returns an array, which is what made state reads undefined', () => {
    // The original parser took the first line and JSON.parse'd it. On a v2 array that
    // produced an array, so .State and .Project were both undefined and state
    // reconciliation silently did nothing.
    for (const output of [composeV2Array, composeV1Ndjson, '{"Project":"solo","State":"running"}']) {
      const container = parseComposePsOutput(output)._unsafeUnwrap();
      expect(Array.isArray(container)).toBe(false);
      expect(container.Project).toBeTypeOf('string');
      expect(container.State).toBeTypeOf('string');
    }
  });

  it('errors on an empty array rather than returning an empty object', () => {
    expect(parseComposePsOutput('[]').isErr()).toBe(true);
  });

  it('errors on empty output', () => {
    expect(parseComposePsOutput('').isErr()).toBe(true);
    expect(parseComposePsOutput('   \n  ').isErr()).toBe(true);
  });

  it('errors on output that is not JSON', () => {
    const result = parseComposePsOutput('Cannot connect to the Docker daemon');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain('Failed to parse container data');
  });
});
