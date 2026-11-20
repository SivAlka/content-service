import type { Article, ListParams, Page, Revision, Stats, Status } from '../types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { version?: number } = {}): Promise<T> {
  const { version, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(version !== undefined && { 'If-Match': `"${version}"` }),
      ...rest.headers,
    },
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? 'unknown', e?.message ?? res.statusText, e?.details);
  }
  return data as T;
}

const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  list: (p: ListParams = {}) => call<Page<Article>>(`/articles${qs({ ...p })}`),
  get: (id: string) => call<Article>(`/articles/${id}`),
  create: (body: Pick<Article, 'title' | 'body' | 'tags' | 'brand' | 'author'>) =>
    call<Article>('/articles', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, version: number, patch: Partial<Pick<Article, 'title' | 'body' | 'tags'>>) =>
    call<Article>(`/articles/${id}`, { method: 'PATCH', version, body: JSON.stringify(patch) }),
  transition: (id: string, version: number, to: Status, publishAt?: string) =>
    call<Article>(`/articles/${id}/transitions`, { method: 'POST', version, body: JSON.stringify({ to, publishAt }) }),
  revisions: (id: string) => call<Revision[]>(`/articles/${id}/revisions`),
  restore: (id: string, version: number, revision: number) =>
    call<Article>(`/articles/${id}/revisions/${revision}/restore`, { method: 'POST', version }),
  stats: () => call<Stats>('/stats'),
};
