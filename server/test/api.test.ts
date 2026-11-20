import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ContentStore } from '../src/store.js';

const BODY = Array.from({ length: 25 }, (_, i) => `word${i}`).join(' ');
const valid = { title: 'Hello World', body: BODY, tags: ['Intro'], brand: 'demo', author: 'Tester' };

let clock = new Date('2026-01-01T00:00:00Z');
let store: ContentStore;
let api: ReturnType<typeof request>;

beforeEach(() => {
  clock = new Date('2026-01-01T00:00:00Z');
  store = new ContentStore(() => clock);
  api = request(createApp(store));
});

const create = async (over = {}) => (await api.post('/api/articles').send({ ...valid, ...over })).body;

describe('articles CRUD', () => {
  it('creates with defaults, normalised tags and unique slugs', async () => {
    const a = await create();
    const b = await create();
    expect(a).toMatchObject({ status: 'draft', version: 1, slug: 'hello-world', tags: ['intro'] });
    expect(b.slug).toBe('hello-world-2');
  });

  it('rejects invalid payloads with field details', async () => {
    const res = await api.post('/api/articles').send({ title: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('requires If-Match on update (428) and detects stale versions (409)', async () => {
    const a = await create();
    expect((await api.patch(`/api/articles/${a.id}`).send({ title: 'New title' })).status).toBe(428);
    const ok = await api.patch(`/api/articles/${a.id}`).set('If-Match', '"1"').send({ title: 'New title' });
    expect(ok.status).toBe(200);
    expect(ok.body.version).toBe(2);
    const stale = await api.patch(`/api/articles/${a.id}`).set('If-Match', '"1"').send({ title: 'Other' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.details.currentVersion).toBe(2);
  });
});

describe('workflow', () => {
  it('walks draft -> in_review -> approved -> published', async () => {
    let a = await create();
    for (const to of ['in_review', 'approved', 'published']) {
      const res = await api.post(`/api/articles/${a.id}/transitions`).set('If-Match', String(a.version)).send({ to });
      expect(res.status).toBe(200);
      a = res.body;
    }
    expect(a.status).toBe('published');
    expect(a.publishedAt).toBe(clock.toISOString());
  });

  it('rejects illegal transitions and failed guards', async () => {
    const a = await create({ body: 'too short', tags: [] });
    const bad = await api.post(`/api/articles/${a.id}/transitions`).set('If-Match', '1').send({ to: 'published' });
    expect(bad.status).toBe(409);
    const guard = await api.post(`/api/articles/${a.id}/transitions`).set('If-Match', '1').send({ to: 'in_review' });
    expect(guard.status).toBe(422);
    expect(guard.body.error.details.problems).toHaveLength(2);
  });

  it('scheduler publishes due articles only', async () => {
    const a = await create();
    let v = a.version;
    for (const to of ['in_review', 'approved']) v = store.transition(a.id, v, to as never).version;
    store.transition(a.id, v, 'scheduled', '2026-01-01T01:00:00.000Z');
    expect(store.publishDue()).toHaveLength(0);
    clock = new Date('2026-01-01T01:00:01Z');
    const published = store.publishDue();
    expect(published).toHaveLength(1);
    expect(published[0]!.status).toBe('published');
  });
});

describe('list / search', () => {
  it('filters, paginates and ranks by relevance', async () => {
    await create({ title: 'Index funds explained', tags: ['investing'] });
    await create({ title: 'Cooking pasta', body: `${BODY} index`, tags: ['recipes'] });
    await create({ title: 'Travel tips', tags: ['travel'] });

    const search = await api.get('/api/articles?q=index');
    expect(search.body.items.map((i: { title: string }) => i.title)).toEqual(['Index funds explained', 'Cooking pasta']);

    const tag = await api.get('/api/articles?tag=travel');
    expect(tag.body.total).toBe(1);

    const paged = await api.get('/api/articles?pageSize=2&page=2&sort=title&order=asc');
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.totalPages).toBe(2);
  });
});

describe('revisions', () => {
  it('records history and restores an older revision as a new one', async () => {
    const a = await create();
    await api.patch(`/api/articles/${a.id}`).set('If-Match', '1').send({ title: 'Second title' });
    const revs = (await api.get(`/api/articles/${a.id}/revisions`)).body;
    expect(revs.map((r: { revision: number }) => r.revision)).toEqual([2, 1]);
    const restored = await api.post(`/api/articles/${a.id}/revisions/1/restore`).set('If-Match', '2');
    expect(restored.body.title).toBe('Hello World');
    expect(restored.body.version).toBe(3);
    const after = (await api.get(`/api/articles/${a.id}/revisions`)).body;
    expect(after[0].note).toBe('Restored from revision 1');
  });
});

describe('stats', () => {
  it('aggregates by status, brand and tag', async () => {
    await create();
    await create({ brand: 'other', tags: ['intro', 'extra'] });
    const { body } = await api.get('/api/stats');
    expect(body.total).toBe(2);
    expect(body.byStatus.draft).toBe(2);
    expect(body.topTags[0]).toEqual({ tag: 'intro', count: 2 });
  });
});
