import type { Locator, Page } from '@playwright/test';

export class ArticleListPage {
  readonly search: Locator;
  readonly statusFilter: Locator;
  readonly rows: Locator;
  readonly resultCount: Locator;
  readonly pageInfo: Locator;
  readonly next: Locator;
  readonly prev: Locator;

  constructor(private page: Page) {
    this.search = page.getByTestId('search-input');
    this.statusFilter = page.getByTestId('status-filter');
    this.rows = page.getByTestId('article-row');
    this.resultCount = page.getByTestId('result-count');
    this.pageInfo = page.getByTestId('page-info');
    this.next = page.getByTestId('next-page');
    this.prev = page.getByTestId('prev-page');
  }

  async goto(query = '') {
    await this.page.goto(`/articles${query}`);
  }

  row(title: string) {
    return this.rows.filter({ hasText: title });
  }

  async open(title: string) {
    await this.row(title).getByTestId('article-link').click();
  }
}
