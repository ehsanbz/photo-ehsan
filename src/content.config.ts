import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const essays = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/essays' }),
  schema: z.object({
    subtitle: z.string().optional(),
    location: z.string().optional(),
    date: z.string().optional(),
    closingNote: z.string().optional(),
    sections: z.array(z.object({ afterPhotoId: z.string(), text: z.string() })).default([]),
  }),
});

export const collections = { essays };
