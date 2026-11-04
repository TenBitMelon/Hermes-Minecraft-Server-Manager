import { env as privateEnv } from '$env/dynamic/private';
import { canHostLocalWorker } from '$lib/runtime';
import { Result, err, ok } from 'neverthrow';

const MINECRAFT_DEFAULT_PORT = 25565;

export type PortRange = {
  portMin: number;
  portMax: number;
  avoidDefaultPort: boolean;
  usedPorts: ReadonlySet<number>;
};

function isUsable(port: number, range: PortRange) {
  if (port < range.portMin || port > range.portMax) return false;
  if (range.avoidDefaultPort && port === MINECRAFT_DEFAULT_PORT) return false;
  return !range.usedPorts.has(port);
}

function isUsableRange(range: PortRange) {
  return Number.isFinite(range.portMin) && Number.isFinite(range.portMax) && range.portMin <= range.portMax;
}

export function countAvailablePorts(range: PortRange) {
  if (!isUsableRange(range)) return 0;
  let available = 0;
  for (let port = range.portMin; port <= range.portMax; port += 1) if (isUsable(port, range)) available += 1;
  return available;
}

export function findFirstAvailablePort(range: PortRange): Result<number, Error> {
  if (!isUsableRange(range)) return err(new Error('No Ports Available'));
  for (let port = range.portMin; port <= range.portMax; port += 1) if (isUsable(port, range)) return ok(port);
  return err(new Error('No Ports Available'));
}

/**
 * Reads a flag that arrives as a string from the environment.
 */
export function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function localPortRangeFromEnv(usedPorts: ReadonlySet<number>): PortRange | null {
  if (!canHostLocalWorker()) return null;

  return {
    portMin: Number(privateEnv.PORT_MIN),
    portMax: Number(privateEnv.PORT_MAX),
    avoidDefaultPort: parseBooleanFlag(privateEnv.AVOID_DEFAULT_PORT, true),
    usedPorts
  };
}

export function workerPortRange(portMin: number, portMax: number, avoidDefaultPort: boolean, usedPorts: ReadonlySet<number>): PortRange {
  return { portMin, portMax, avoidDefaultPort, usedPorts };
}

export { MINECRAFT_DEFAULT_PORT };
