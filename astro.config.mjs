import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://photos.ehsan.bz',
  output: 'static',
  integrations: [sitemap()],
  redirects: { '/albums/documentry/': '/albums/documentary/' },
  trailingSlash: 'always',
});
