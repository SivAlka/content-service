import { test, expect } from '@playwright/test';
import { API_URL, createArticle, resetData } from '../../support/api';

/** REFERENCE TEST — API checks using Playwright's APIRequestContext (status, headers, body shape). */
test.beforeEach(async ({ request }) => resetData(request, false));

test('optimistic concurrency: stale If-Match returns 409 with the current article', async ({ request }) => {
  const a = await createArticle(request, { title: 'Concurrency check' });

  const first = await request.patch(`${API_URL}/articles/${a.id}`, {
    headers: { 'If-Match': `"${a.version}"` },
    data: { title: 'Edited once' },
  });
  expect(first.status()).toBe(200);
  expect(first.headers()['etag']).toBe('"2"');

  const stale = await request.patch(`${API_URL}/articles/${a.id}`, {
    headers: { 'If-Match': `"${a.version}"` },
    data: { title: 'Edited from stale copy' },
  });
  expect(stale.status()).toBe(409);
  const body = await stale.json();
  expect(body.error).toMatchObject({ code: 'conflict', details: { currentVersion: 2 } });
});
