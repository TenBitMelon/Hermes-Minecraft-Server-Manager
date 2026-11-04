import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [/* transformLet(),  */ vitePreprocess()],

  kit: {
    adapter: adapter(),
    csrf: {
      checkOrigin: true
    },
    alias: {
      $assets: './src/assets/*'
    }
  }
};

export default config;
