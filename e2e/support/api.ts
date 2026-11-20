import type { APIRequestContext } from '@playwright/test';

export const API_URL = `http://localhost:${process.env.E2E_API_PORT ?? 3101}/api`;

export const LONG_BODY = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');

export interface ArticleDto {
  id: string;
  title: string;
  status: string;
  version: number;
  [k: string]: unknown;
}

/** Wipe server state. `seed: true` loads the ~32 sample articles. */
export async function resetData(request: APIRequestContext, seed = false) {
  const res = await request.post(`${API_URL}/test/reset`, { data: { seed } });
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`);
}

export async function createArticle(request: APIRequestContext, over: Record<string, unknown> = {}): Promise<ArticleDto> {
  const res = await request.post(`${API_URL}/articles`, {
    data: { title: `Article ${Date.now()}`, body: LONG_BODY, tags: ['qa'], brand: 'demo', author: 'E2E Bot', ...over },
  });
  if (res.status() !== 201) throw new Error(`create failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

/** Create an article and walk it through the given statuses via the API (fast test setup). */
export async function createArticleInStatus(
  request: APIRequestContext,
  path: string[],
  over: Record<string, unknown> = {},
): Promise<ArticleDto> {
  let article = await createArticle(request, over);
  for (const to of path) {
    const res = await request.post(`${API_URL}/articles/${article.id}/transitions`, {
      headers: { 'If-Match': `"${article.version}"` },
      data: { to },
    });
    if (!res.ok()) throw new Error(`transition to ${to} failed: ${await res.text()}`);
    article = await res.json();
  }
  return article;
}
