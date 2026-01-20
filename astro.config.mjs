// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jessegeron.github.io',
  base: import.meta.env.PROD ? '/jessegeron.com' : '/',
  vite: {
    plugins: [tailwindcss()]
  }
});