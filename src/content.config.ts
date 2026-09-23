import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contentSchema = ({ image }: SchemaContext) => z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string(),
  date: z.coerce.date(),
  location: z.string().optional(),
  cover: image(),
  coverAlt: z.string(),
  tags: z.array(z.string()).default([]),
  camera: z.string().optional(),
  lens: z.string().optional(),
  sample: z.boolean().default(false),
  draft: z.boolean().default(false),
  photos: z.array(z.object({
    image: image(),
    alt: z.string().min(8),
    caption: z.string().optional(),
    location: z.string().optional(),
    date: z.string().optional(),
    camera: z.string().optional(),
    lens: z.string().optional(),
    category: z.enum(['Street', 'Architecture', 'Urban', 'Travel', 'People', 'Details']).optional(),
    showInGallery: z.boolean().default(true),
    textAfter: z.string().optional(),
  })).min(1),
});

const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: contentSchema,
});
const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: contentSchema,
});

export const collections = { stories, journal };
