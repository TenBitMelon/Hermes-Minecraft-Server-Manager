import { afterEach, describe, expect, it } from 'vitest';
import { env, resetEnv } from '../../test/stubs/private-env';
import { MINECRAFT_DEFAULT_PORT, countAvailablePorts, findFirstAvailablePort, localPortRangeFromEnv, parseBooleanFlag, workerPortRange } from './ports';

afterEach(() => resetEnv());

const range = (usedPorts: number[] = [], portMin = 30000, portMax = 30010, avoidDefaultPort = true) => workerPortRange(portMin, portMax, avoidDefaultPort, new Set(usedPorts));

describe('findFirstAvailablePort', () => {
  it('returns the low end of the range when nothing is taken', () => {
    const result = findFirstAvailablePort(range());

    expect(result.isOk() && result.value).toBe(30000);
  });

  it('skips ports already in use', () => {
    const result = findFirstAvailablePort(workerPortRange(30000, 30010, true, new Set([30000, 30001, 30002])));

    expect(result.isOk() && result.value).toBe(30003);
  });

  it('skips the default Minecraft port when asked to avoid it', () => {
    const result = findFirstAvailablePort(workerPortRange(MINECRAFT_DEFAULT_PORT, MINECRAFT_DEFAULT_PORT + 2, true, new Set()));

    expect(result.isOk() && result.value).toBe(MINECRAFT_DEFAULT_PORT + 1);
  });

  it('uses the default Minecraft port when not avoiding it', () => {
    const result = findFirstAvailablePort(workerPortRange(MINECRAFT_DEFAULT_PORT, MINECRAFT_DEFAULT_PORT, false, new Set()));

    expect(result.isOk() && result.value).toBe(MINECRAFT_DEFAULT_PORT);
  });

  it('errors when the range is exhausted', () => {
    const result = findFirstAvailablePort(workerPortRange(30000, 30001, true, new Set([30000, 30001])));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('No Ports Available');
  });

  it('errors rather than looping when the bounds are not numbers', () => {
    // PORT_MIN unset produces NaN. A naive `port++ > portMax` guard never fires when
    // both sides are NaN, so an unset range used to spin forever.
    const result = findFirstAvailablePort(workerPortRange(Number.NaN, Number.NaN, true, new Set()));

    expect(result.isErr()).toBe(true);
  });

  it('errors when the range is inverted', () => {
    expect(findFirstAvailablePort(workerPortRange(30010, 30000, true, new Set())).isErr()).toBe(true);
  });

  it('ignores used ports that fall outside the range', () => {
    const result = findFirstAvailablePort(workerPortRange(30000, 30001, true, new Set([29999, 30002])));

    expect(result.isOk() && result.value).toBe(30000);
  });
});

describe('countAvailablePorts', () => {
  it('counts the whole range when nothing is taken', () => {
    expect(countAvailablePorts(workerPortRange(30000, 30010, true, new Set()))).toBe(11);
  });

  it('subtracts used ports', () => {
    expect(countAvailablePorts(workerPortRange(30000, 30010, true, new Set([30000, 30005])))).toBe(9);
  });

  it('subtracts the avoided default port when it falls inside the range', () => {
    expect(countAvailablePorts(workerPortRange(MINECRAFT_DEFAULT_PORT, MINECRAFT_DEFAULT_PORT + 3, true, new Set()))).toBe(3);
  });

  it('does not double count a port that is both used and avoided', () => {
    expect(countAvailablePorts(workerPortRange(MINECRAFT_DEFAULT_PORT, MINECRAFT_DEFAULT_PORT + 3, true, new Set([MINECRAFT_DEFAULT_PORT])))).toBe(3);
  });

  it('agrees with findFirstAvailablePort about an exhausted range', () => {
    const exhausted = workerPortRange(30000, 30001, true, new Set([30000, 30001]));

    expect(countAvailablePorts(exhausted)).toBe(0);
    expect(findFirstAvailablePort(exhausted).isErr()).toBe(true);
  });
});

describe('a real single-host deployment', () => {
  // Shape taken from a live database: three existing servers on 25550-25552 with the
  // local range set to 25550-25560. This is the case the removed servers.workerPort
  // column broke. That column defaulted to 0 rather than null, so reading it with
  // `workerPort ?? port` yielded 0 for every pre-existing server and the used-set
  // became {0} instead of {25550, 25551, 25552}. The allocator then handed back
  // 25550, which was already bound, and the new server would have failed to bind its
  // port or, worse, collided with an existing container.
  const liveServers = [25550, 25551, 25552];
  const liveRange = workerPortRange(25550, 25560, true, new Set(liveServers));

  it('skips every port an existing server already holds', () => {
    const result = findFirstAvailablePort(liveRange);

    expect(result.isOk() && result.value).toBe(25553);
    expect(liveServers).not.toContain(result.isOk() ? result.value : -1);
  });

  it('reports the remaining capacity accurately', () => {
    // The range is inclusive at both ends, so 25550-25560 is 11 ports, and 25565 is
    // outside it so avoiding the default port costs nothing here.
    expect(countAvailablePorts(liveRange)).toBe(8);
  });

  it('would have collided if the used-set had come back as {0}', () => {
    // Guards the regression itself: the zero default is what made ?? fall through.
    const brokenUsedSet = new Set([0]);
    const result = findFirstAvailablePort(workerPortRange(25550, 25560, true, brokenUsedSet));

    expect(result.isOk() && result.value).toBe(25550);
    expect(liveServers).toContain(result.isOk() ? result.value : -1);
  });
});

describe('parseBooleanFlag', () => {
  // Boolean('false') is true, so a variable explicitly set to false used to read as set.
  it.each([
    ['true', true],
    ['1', true],
    ['yes', true],
    ['on', true],
    ['TRUE', true],
    ['  true  ', true],
    ['false', false],
    ['0', false],
    ['no', false],
    ['off', false],
    ['FALSE', false]
  ])('reads %s as %s', (value, expected) => {
    expect(parseBooleanFlag(value, !expected)).toBe(expected);
  });

  it('falls back when unset', () => {
    expect(parseBooleanFlag(undefined, true)).toBe(true);
    expect(parseBooleanFlag(undefined, false)).toBe(false);
  });

  it('falls back on an unrecognised value rather than guessing', () => {
    expect(parseBooleanFlag('maybe', true)).toBe(true);
    expect(parseBooleanFlag('maybe', false)).toBe(false);
  });
});

describe('localPortRangeFromEnv', () => {
  it('reads the local range from the environment', () => {
    env.PORT_MIN = '25563';
    env.PORT_MAX = '25564';
    env.AVOID_DEFAULT_PORT = 'true';

    const result = localPortRangeFromEnv(new Set([25563]));

    expect(result).toEqual({ portMin: 25563, portMax: 25564, avoidDefaultPort: true, usedPorts: new Set([25563]) });
    expect(countAvailablePorts(result!)).toBe(1);
  });

  it('honours AVOID_DEFAULT_PORT=false rather than reading it as set', () => {
    env.PORT_MIN = '25565';
    env.PORT_MAX = '25565';
    env.AVOID_DEFAULT_PORT = 'false';

    const result = localPortRangeFromEnv(new Set());

    expect(result?.avoidDefaultPort).toBe(false);
    expect(findFirstAvailablePort(result!).isOk()).toBe(true);
  });
});
