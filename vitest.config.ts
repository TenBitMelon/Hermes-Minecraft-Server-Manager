import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests run outside the SvelteKit build, so the framework-provided module
// aliases have to be supplied here. The env and app/environment stubs are plain
// modules so a test can set the values it needs.
export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $assets: path.resolve('./src/assets'),
      '$env/dynamic/public': path.resolve('./src/test/stubs/public-env.ts'),
      '$env/dynamic/private': path.resolve('./src/test/stubs/private-env.ts'),
      // Application code asks whether it is in dev and whether a build is running.
      // The integration tests import that code for real, so it has to resolve.
      '$app/environment': path.resolve('./src/test/stubs/app-environment.ts')
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // The integration suite starts and stops real containers.
    testTimeout: 180_000,
    hookTimeout: 180_000
  }
});
