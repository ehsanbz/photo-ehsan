import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://photo.ehsan.bz',
  output: 'static',
  integrations: [sitemap()],
  trailingSlash: 'always',
});
