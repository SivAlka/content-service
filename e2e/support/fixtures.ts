import { test as base, expect } from '@playwright/test';
import { ArticleListPage } from '../pages/ArticleListPage';
import { ArticleEditorPage } from '../pages/ArticleEditorPage';
import { resetData } from './api';

interface Fixtures {
  listPage: ArticleListPage;
  editorPage: ArticleEditorPage;
}

export const test = base.extend<Fixtures>({
  // Every UI test starts from an empty store; tests create exactly the data they need.
  page: async ({ page, request }, use) => {
    await resetData(request, false);
    await use(page);
  },
  listPage: async ({ page }, use) => use(new ArticleListPage(page)),
  editorPage: async ({ page }, use) => use(new ArticleEditorPage(page)),
});

export { expect };
