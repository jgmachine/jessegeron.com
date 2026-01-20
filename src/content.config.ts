import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    category: z.string(),
    workPlayCategory: z.enum(['Work', 'Play']),
    draft: z.boolean().default(false),
  }),
});

const aiResources = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['book', 'article', 'tool', 'course', 'video', 'thought']),
    topic: z.string(),
    tags: z.array(z.string()),
    url: z.string().url().optional(),
    author: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    rating: z.number().min(1).max(5).optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const boardGames = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    rating: z.number().min(1).max(10).optional(),
    tags: z.array(z.string()),
    players: z.string().optional(),
    playTime: z.string().optional(),
    image: z.string().optional(),
  }),
});

const biking = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()),
    location: z.string().optional(),
    distance: z.string().optional(),
    image: z.string().optional(),
  }),
});

const workDocs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

const books = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    description: z.string(),
    category: z.string(), // Leadership, IT/Tech, AI, Fiction, Non-Fiction, etc.
    workPlayCategory: z.enum(['Work', 'Play']),
    tags: z.array(z.string()),
    status: z.enum(['read', 'reading', 'to-read']).default('read'),
    dateRead: z.coerce.date().optional(),
    coverImage: z.string().optional(),
    amazonLink: z.string().url().optional(),
    isbn: z.string().optional(),
    recommended: z.boolean().default(false),
  }),
});

export const collections = {
  blog,
  'ai-resources': aiResources,
  projects,
  'board-games': boardGames,
  biking,
  'work-docs': workDocs,
  books,
};
