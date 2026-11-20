import type { Article } from './types.js';

const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Naive relevance score: every query token must match somewhere (AND semantics).
 * Weights: title 5, tag 3, body 1 (per occurrence, capped).
 */
export function score(article: Article, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  const title = tokenize(article.title);
  const tags = article.tags.flatMap(tokenize);
  const body = tokenize(article.body);
  let total = 0;
  for (const t of tokens) {
    const inTitle = title.filter((w) => w.startsWith(t)).length;
    const inTags = tags.filter((w) => w.startsWith(t)).length;
    const inBody = Math.min(body.filter((w) => w.startsWith(t)).length, 5);
    const s = inTitle * 5 + inTags * 3 + inBody;
    if (s === 0) return 0;
    total += s;
  }
  return total;
}
