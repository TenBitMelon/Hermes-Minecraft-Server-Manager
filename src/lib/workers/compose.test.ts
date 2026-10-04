import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ComposeBuilder } from './localRuntime';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * ComposeBuilder moved out of src/lib/docker.ts into this module when the worker
 * split landed, and the docker-compose.yml files already sitting in servers/ were
 * all written by the old implementation. Rebuilding one of those servers from the
 * recorded inputs and diffing it against the file on disk is the check that the move
 * changed where the code lives and nothing about what it emits.
 */
function buildLegacyCompose(port: number) {
  const builder = new ComposeBuilder(`servers/legacy/docker-compose.yml`);
  builder.setPort(port);

  builder.addVariable('USE_AIKAR_FLAGS', 'true');
  builder.addVariable('EULA', 'true');
  builder.addVariable('MEMORY', '2G');
  builder.addVariable('MAX_TICK_TIME', '-1');
  builder.addVariable('TYPE', 'FABRIC');
  builder.addVariable('VERSION', '1.20.6');
  builder.addVariable('MOTD', '§rA §r§l§n§cBRAIN');
  builder.addVariable('ICON', 'https://servers.craftingcomrades.net/api/file?collectionID=80olb9b23s3qall&recordID=dw99c2ygbdi156w&filename=faviococo_Be4JJfJc2g.png');
  builder.addVariable('DIFFICULTY', 'NORMAL');
  builder.addVariable('MODE', 'survival');
  builder.addVariable('MAX_PLAYERS', '10');
  builder.addVariable('ALLOW_NETHER', 'true');
  builder.addVariable('ENABLE_COMMAND_BLOCK', 'true');
  builder.addVariable('HARDCORE', 'false');
  builder.addVariable('PVP', 'true');
  builder.addVariable('ALLOW_FLIGHT', 'true');
  builder.addVariable('SPAWN_PROTECTION', '0');
  builder.addVariable('VIEW_DISTANCE', '16');
  builder.addVariable('SIMULATION_DISTANCE', '10');
  builder.addVariable('SEED', '0');
  builder.addVariable('LEVEL_TYPE', 'normal');
  builder.addListVariable('WHITELIST', ['melonboy10']);
  builder.addVariable('ENABLE_AUTOPAUSE', 'true');
  builder.addVariable('AUTOPAUSE_TIMEOUT_EST', '3600');

  return builder.build();
}

describe('ComposeBuilder reproduces files written by the previous implementation', () => {
  const onDisk = readFileSync(path.join(repoRoot, 'servers/dw99c2ygbdi156w/docker-compose.yml'), 'utf8');

  it('matches a real server byte for byte', () => {
    expect(buildLegacyCompose(25550)).toBe(onDisk);
  });

  it('quotes the published port and leaves 25565 as the container port', () => {
    expect(buildLegacyCompose(25550)).toContain('      - "25550:25565"\n');
  });

  it('writes the list variable as a block scalar', () => {
    expect(buildLegacyCompose(25550)).toContain('      WHITELIST: |\n        melonboy10\n');
  });
});
