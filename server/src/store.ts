import { randomUUID } from 'node:crypto';
import type { Article, Page, Revision, Status } from './types.js';
import { conflict, notFound } from './errors.js';
import { slugify, uniqueSlug } from './slug.js';
import { score } from './search.js';
import { assertTransition } from './workflow.js';

export interface ListQuery {
  status?: Status;
  brand?: string;
  tag?: string;
  q?: string;
  sort?: 'updatedAt' | 'createdAt' | 'title' | 'relevance';
  order?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface CreateInput {
  title: string;
  body: string;
  tags: string[];
  brand: string;
  author: string;
}
export type UpdateInput = Partial<Pick<CreateInput, 'title' | 'body' | 'tags'>>;

/** In-memory store. State resets on restart by design (no DB needed to run the exercise). */
export class ContentStore {
  private articles = new Map<string, Article>();
  private revisions = new Map<string, Revision[]>();
  private now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  private ts() {
    return this.now().toISOString();
  }

  get(id: string): Article {
    const a = this.articles.get(id);
    if (!a) throw notFound('Article');
    return a;
  }

  list(q: ListQuery): Page<Article> {
    let items = [...this.articles.values()];
    if (q.status) items = items.filter((a) => a.status === q.status);
    if (q.brand) items = items.filter((a) => a.brand === q.brand);
    if (q.tag) items = items.filter((a) => a.tags.includes(q.tag!));

    const scores = new Map<string, number>();
    if (q.q?.trim()) {
      items = items.filter((a) => {
        const s = score(a, q.q!);
        scores.set(a.id, s);
        return s > 0;
      });
    }

    const sort = q.sort ?? (q.q?.trim() ? 'relevance' : 'updatedAt');
    const dir = (q.order ?? 'desc') === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      let cmp: number;
      if (sort === 'relevance') cmp = (scores.get(a.id) ?? 0) - (scores.get(b.id) ?? 0);
      else if (sort === 'title') cmp = a.title.localeCompare(b.title);
      else cmp = a[sort].localeCompare(b[sort]);
      return cmp * dir || a.id.localeCompare(b.id);
    });

    const total = items.length;
    const start = (q.page - 1) * q.pageSize;
    return {
      items: items.slice(start, start + q.pageSize),
      total,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    };
  }

  create(input: CreateInput): Article {
    const taken = new Set([...this.articles.values()].map((a) => a.slug));
    const ts = this.ts();
    const article: Article = {
      id: randomUUID(),
      ...input,
      tags: normalizeTags(input.tags),
      slug: uniqueSlug(slugify(input.title), taken),
      status: 'draft',
      version: 1,
      publishAt: null,
      publishedAt: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.articles.set(article.id, article);
    this.revisions.set(article.id, []);
    this.snapshot(article, 'Created');
    return article;
  }

  /** Optimistic concurrency: caller must supply the version it last saw. */
  update(id: string, expectedVersion: number, patch: UpdateInput): Article {
    const current = this.get(id);
    this.assertVersion(current, expectedVersion);
    const next: Article = {
      ...current,
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.body !== undefined && { body: patch.body }),
      ...(patch.tags !== undefined && { tags: normalizeTags(patch.tags) }),
      version: current.version + 1,
      updatedAt: this.ts(),
    };
    this.articles.set(id, next);
    this.snapshot(next);
    return next;
  }

  transition(id: string, expectedVersion: number, to: Status, publishAt?: string): Article {
    const current = this.get(id);
    this.assertVersion(current, expectedVersion);
    const candidate: Article = { ...current, publishAt: publishAt ?? current.publishAt };
    assertTransition(candidate, to);
    const ts = this.ts();
    const next: Article = {
      ...candidate,
      status: to,
      version: current.version + 1,
      updatedAt: ts,
      publishedAt: to === 'published' ? ts : candidate.publishedAt,
      publishAt: to === 'scheduled' ? candidate.publishAt : to === 'published' ? null : candidate.publishAt,
    };
    this.articles.set(id, next);
    return next;
  }

  revisionsOf(id: string): Revision[] {
    this.get(id);
    return [...(this.revisions.get(id) ?? [])].reverse();
  }

  restore(id: string, expectedVersion: number, revision: number): Article {
    const rev = (this.revisions.get(this.get(id).id) ?? []).find((r) => r.revision === revision);
    if (!rev) throw notFound('Revision');
    const updated = this.update(id, expectedVersion, { title: rev.title, body: rev.body, tags: rev.tags });
    const list = this.revisions.get(id)!;
    list[list.length - 1]!.note = `Restored from revision ${revision}`;
    return updated;
  }

  /** Publishes every scheduled article whose publishAt <= now. Returns the ones published. */
  publishDue(): Article[] {
    const nowIso = this.ts();
    const due = [...this.articles.values()].filter(
      (a) => a.status === 'scheduled' && a.publishAt !== null && a.publishAt <= nowIso,
    );
    return due.map((a) => this.transition(a.id, a.version, 'published'));
  }

  stats() {
    const byStatus = Object.fromEntries(
      ['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'].map((s) => [s, 0]),
    ) as Record<Status, number>;
    const byBrand: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    for (const a of this.articles.values()) {
      byStatus[a.status]++;
      byBrand[a.brand] = (byBrand[a.brand] ?? 0) + 1;
      for (const t of a.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
    return { total: this.articles.size, byStatus, byBrand, topTags };
  }

  clear() {
    this.articles.clear();
    this.revisions.clear();
  }

  /** Test/seed helper: insert a fully-formed article. */
  insertRaw(article: Article, revs: Revision[] = []) {
    this.articles.set(article.id, article);
    this.revisions.set(article.id, revs);
  }

  private assertVersion(a: Article, expected: number) {
    if (a.version !== expected) {
      throw conflict(`Version mismatch: expected ${expected}, current is ${a.version}`, {
        currentVersion: a.version,
        current: a,
      });
    }
  }

  private snapshot(a: Article, note?: string) {
    const list = this.revisions.get(a.id)!;
    list.push({
      articleId: a.id,
      revision: list.length + 1,
      title: a.title,
      body: a.body,
      tags: a.tags,
      author: a.author,
      savedAt: a.updatedAt,
      ...(note && { note }),
    });
  }
}

const normalizeTags = (tags: string[]) => [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
