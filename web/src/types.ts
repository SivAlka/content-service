export type Status = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'archived';
export const STATUSES: Status[] = ['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'];

export interface Article {
  id: string;
  title: string;
  slug: string;
  body: string;
  tags: string[];
  brand: string;
  author: string;
  status: Status;
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

export interface Stats {
  total: number;
  byStatus: Record<Status, number>;
  byBrand: Record<string, number>;
  topTags: { tag: string; count: number }[];
}

export interface ListParams {
  q?: string;
  status?: Status | '';
  brand?: string;
  tag?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
