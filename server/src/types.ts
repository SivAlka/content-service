export const STATUSES = ['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'] as const;
export type Status = (typeof STATUSES)[number];

export interface Article {
  id: string;
  title: string;
  slug: string;
  body: string;
  tags: string[];
  brand: string;
  author: string;
  status: Status;
  /** Optimistic-concurrency token. Incremented on every successful mutation. */
  version: number;
  publishAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Revision {
  articleId: string;
  revision: number;
  title: string;
  body: string;
  tags: string[];
  author: string;
  savedAt: string;
  note?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
