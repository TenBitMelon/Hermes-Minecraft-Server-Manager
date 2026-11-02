import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env as privateEnv } from './stubs/private-env';
import { env as publicEnv } from './stubs/public-env';

/**
 * Loads .env.local into the env stubs so real application code can be exercised
 * against the developer's own database and Docker.
 *
 * Both stubs are populated, not just the private one. Application code reads
 * PUBLIC_* variables through $env/dynamic/public, and a missing one does not throw,
 * it silently becomes undefined: stopContainer turns an unset
 * PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN into +undefined, then new Date(NaN), then
 * a RangeError out of toISOString(). A harness that only filled the private stub makes
 * every public variable look unset.
 *
 * $lib/database authenticates to PocketBase with a top-level await at import time, so
 * this has to run before anything imports it. That is why callers use a dynamic
 * import after awaiting loadLocalEnvironment() rather than a static one.
 */
export async function loadLocalEnvironment() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  for (const name of ['.env.local', '.env']) {
    const file = path.join(repoRoot, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, '');
      privateEnv[match[1]] = value;
      publicEnv[match[1]] = value;
    }
  }
  return { privateEnv, publicEnv };
}

/**
 * Integration tests talk to the developer's real PocketBase and Docker and mutate
 * real server records, so they stay opt-in. Run them with:
 *
 *   HERMES_INTEGRATION=1 pnpm exec vitest run src/lib/workers/integration.test.ts
 */
export function integrationEnabled() {
  return process.env.HERMES_INTEGRATION === '1';
}
