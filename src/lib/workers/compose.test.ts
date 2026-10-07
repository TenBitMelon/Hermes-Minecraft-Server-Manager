import { describe, expect, it } from 'vitest';
import { ComposeBuilder } from './localRuntime';

/**
 * Captured from a docker-compose.yml that the previous implementation wrote, before
 * ComposeBuilder moved out of src/lib/docker.ts into this module. It is inlined rather
 * than read from servers/ because that directory is gitignored, so a test that read it
 * would pass only on the machine that happened to have a server on disk and would fail
 * everywhere else, including CI.
 *
 * Port, MOTD, icon URL and whitelist are neutralised so the fixture carries no
 * deployment detail. Everything else is verbatim, because the point is the exact
 * formatting: quoting, indentation, the block scalar for list variables, and the
 * trailing newline.
 */
const LEGACY_COMPOSE = `version: "3.9"
services:
  minecraft:
    image: itzg/minecraft-server:latest
    ports:
      - "30000:25565"
    volumes:
      - ./server-files:/data
    environment:
      USE_AIKAR_FLAGS: 'true'
      EULA: 'true'
      MEMORY: '2G'
      MAX_TICK_TIME: '-1'
      TYPE: 'FABRIC'
      VERSION: '1.20.6'
      MOTD: 'Test Server'
      ICON: 'https://example.com/api/file?collectionID=80olb9b23s3qall&recordID=srv_abc123&filename=icon.png'
      DIFFICULTY: 'NORMAL'
      MODE: 'survival'
      MAX_PLAYERS: '10'
      ALLOW_NETHER: 'true'
      ENABLE_COMMAND_BLOCK: 'true'
      HARDCORE: 'false'
      PVP: 'true'
      ALLOW_FLIGHT: 'true'
      SPAWN_PROTECTION: '0'
      VIEW_DISTANCE: '16'
      SIMULATION_DISTANCE: '10'
      SEED: '0'
      LEVEL_TYPE: 'normal'
      WHITELIST: |
        testplayer
      ENABLE_AUTOPAUSE: 'true'
      AUTOPAUSE_TIMEOUT_EST: '3600'
    restart: "no"
    healthcheck:
      test: mc-health
      start_period: 1m
      interval: 5s
      retries: 20
`;

function buildLegacyCompose() {
  const builder = new ComposeBuilder('servers/srv_abc123/docker-compose.yml');
  builder.setPort(30000);

  builder.addVariable('USE_AIKAR_FLAGS', 'true');
  builder.addVariable('EULA', 'true');
  builder.addVariable('MEMORY', '2G');
  builder.addVariable('MAX_TICK_TIME', '-1');
  builder.addVariable('TYPE', 'FABRIC');
  builder.addVariable('VERSION', '1.20.6');
  builder.addVariable('MOTD', 'Test Server');
  builder.addVariable('ICON', 'https://example.com/api/file?collectionID=80olb9b23s3qall&recordID=srv_abc123&filename=icon.png');
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
  builder.addListVariable('WHITELIST', ['testplayer']);
  builder.addVariable('ENABLE_AUTOPAUSE', 'true');
  builder.addVariable('AUTOPAUSE_TIMEOUT_EST', '3600');

  return builder.build();
}

describe('ComposeBuilder still emits what the previous implementation emitted', () => {
  it('matches the captured output byte for byte', () => {
    expect(buildLegacyCompose()).toBe(LEGACY_COMPOSE);
  });

  it('ends with a single trailing newline', () => {
    const built = buildLegacyCompose();

    expect(built.endsWith('retries: 20\n')).toBe(true);
    expect(built.endsWith('\n\n')).toBe(false);
  });

  it('quotes the published port and leaves 25565 as the container port', () => {
    expect(buildLegacyCompose()).toContain('      - "30000:25565"\n');
  });

  it('quotes scalar values and writes list values as a block scalar', () => {
    const built = buildLegacyCompose();

    expect(built).toContain("      MOTD: 'Test Server'\n");
    expect(built).toContain('      WHITELIST: |\n        testplayer\n');
  });

  it('ignores the cwd it is constructed with, which no longer means anything', () => {
    // The compose file is now generated on the control plane and shipped to the worker
    // as content, so there is no local path for the builder to be told about.
    const builder = new ComposeBuilder('/some/path/that/is/ignored/docker-compose.yml');
    builder.setPort(30000);

    expect(builder.build()).not.toContain('/some/path/that/is/ignored');
  });
});
