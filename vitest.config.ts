import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $assets: path.resolve('./src/assets'),
      '$env/dynamic/public': path.resolve('./tests/stubs/public-env.ts'),
      '$env/dynamic/private': path.resolve('./tests/stubs/private-env.ts'),
      '$app/environment': path.resolve('./tests/stubs/app-environment.ts')
    }
  },
  test: {
    include: ['tests/*.test.ts'],
    environment: 'node',
    testTimeout: 180_000,
    hookTimeout: 180_000
  }
});
