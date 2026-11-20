import { z } from 'zod';
import { STATUSES } from './types.js';

export const createSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().max(50_000).default(''),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  brand: z.string().trim().min(1).max(40),
  author: z.string().trim().min(1).max(80),
});

export const updateSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    body: z.string().max(50_000),
    tags: z.array(z.string().trim().min(1).max(30)).max(10),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const transitionSchema = z.object({
  to: z.enum(STATUSES),
  publishAt: z.string().datetime().optional(),
});

export const listSchema = z.object({
  status: z.enum(STATUSES).optional(),
  brand: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(['updatedAt', 'createdAt', 'title', 'relevance']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
