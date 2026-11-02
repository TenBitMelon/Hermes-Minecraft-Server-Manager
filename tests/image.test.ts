import { afterEach, expect, it } from 'vitest';

import { ComposeBuilder } from '$lib/docker';
import { env, resetEnv } from './stubs/private-env';

afterEach(resetEnv);
it('allows an explicit Minecraft image without changing the default', () => {
  expect(new ComposeBuilder('').build()).toContain('image: itzg/minecraft-server:latest');
  env.HERMES_MINECRAFT_IMAGE = 'hermes-minecraft:acceptance';
  expect(new ComposeBuilder('').build()).toContain('image: hermes-minecraft:acceptance');
});
