import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// $env/dynamic resolves unknown keys to undefined rather than failing to compile, so
// a renamed or misspelled variable is not a build error. It is a blank value at
// runtime, in the place that needed it: the app origin for the CSRF check, the DNS
// suffix for every Cloudflare record. svelte-check cannot see this because the
// generated module has an index signature returning string | undefined.
//
// These tests tie the variables the code reads to the ones .env.example documents,
// so a rename has to update both or fail here.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const srcRoot = path.join(repoRoot, 'src');
const examplePath = path.join(repoRoot, '.env.example');

const sourceExtensions = new Set(['.ts', '.svelte', '.js']);

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.svelte-kit') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (sourceExtensions.has(path.extname(entry))) found.push(full);
  }
  return found;
}

// The identifiers the codebase aliases the env modules to. Anything reading
// $env/dynamic has to pick one of these names, so matching them all is exhaustive.
const envAccess = /\b(?:publicENV|publicEnv|privateENV|privateEnv)\.([A-Z][A-Z0-9_]*)/g;

function documentedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const line of readFileSync(examplePath, 'utf8').split('\n')) {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line.trim());
    if (match) keys.add(match[1]);
  }
  return keys;
}

const documented = documentedKeys();

const accessed = new Map<string, Set<string>>();

for (const file of walk(srcRoot)) {
  const contents = readFileSync(file, 'utf8');
  for (const match of contents.matchAll(envAccess)) {
    const key = match[1];
    if (!accessed.has(key)) accessed.set(key, new Set());
    accessed.get(key)!.add(path.relative(repoRoot, file));
  }
}

describe('environment variable contract', () => {
  it('documents every variable the code reads', () => {
    const undocumented = [...accessed.entries()].filter(([key]) => !documented.has(key)).map(([key, files]) => `${key} (read in ${[...files].join(', ')})`);

    expect(undocumented, `These variables are read but missing from .env.example:\n  ${undocumented.join('\n  ')}`).toEqual([]);
  });

  it('no longer reads the retired PUBLIC_ROOT_DOMAIN', () => {
    // It was split into PUBLIC_APP_ORIGIN (scheme included) and
    // PUBLIC_SERVER_BASE_DOMAIN (bare suffix). A leftover read would resolve to
    // undefined and quietly break every DNS record.
    expect(accessed.has('PUBLIC_ROOT_DOMAIN')).toBe(false);
  });

  it('finds the env modules to be worth checking', () => {
    // Guards against the scanner silently matching nothing, e.g. if the aliases get
    // renamed, which would make every assertion above vacuously true.
    expect(accessed.size).toBeGreaterThan(10);
  });
});

describe('documented but unused variables', () => {
  // Not a failure: unused config is harmless and may be intentional. Listed so the
  // list stays deliberate rather than drifting unnoticed.
  const knownUnused = ['PUBLIC_REQUIRE_WHITELIST'];

  it('only lists variables that really are unused', () => {
    const stale = knownUnused.filter((key) => accessed.has(key));

    expect(stale, `These were listed as unused but are now read: ${stale.join(', ')}`).toEqual([]);
  });
});
