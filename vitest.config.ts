import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $assets: path.resolve('./src/assets'),
      '$env/dynamic/public': path.resolve('./src/test/stubs/public-env.ts'),
      '$env/dynamic/private': path.resolve('./src/test/stubs/private-env.ts')
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
