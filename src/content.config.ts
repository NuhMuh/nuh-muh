import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works' }),
  schema: z.object({
    title: z.string(),
    number: z.string(),
    tag: z.string(),
    color: z.enum(['warm', 'deep', 'cold', 'rust', 'mossy', 'ash']),
    status: z.string().optional(),
    kicker: z.string().optional(),
    coverImage: z.string().optional(),
    isSpotlight: z.boolean().default(false),
    isComing: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    work: z.string(),
    date: z.string(),
    excerpt: z.string().optional(),
    isLead: z.boolean().default(false),
  }),
});

export const collections = { works, articles };
