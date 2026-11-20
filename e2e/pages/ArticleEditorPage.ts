import type { Locator, Page } from '@playwright/test';

export class ArticleEditorPage {
  readonly title: Locator;
  readonly brand: Locator;
  readonly author: Locator;
  readonly tags: Locator;
  readonly body: Locator;
  readonly save: Locator;
  readonly version: Locator;
  readonly status: Locator;
  readonly alert: Locator;
  readonly guardProblems: Locator;
  readonly revisions: Locator;

  constructor(private page: Page) {
    this.title = page.getByTestId('title-input');
    this.brand = page.getByTestId('brand-input');
    this.author = page.getByTestId('author-input');
    this.tags = page.getByTestId('tags-input');
    this.body = page.getByTestId('body-input');
    this.save = page.getByTestId('save-button');
    this.version = page.getByTestId('version-label');
    this.status = page.getByTestId('status-badge');
    this.alert = page.getByTestId('error-alert');
    this.guardProblems = page.getByTestId('guard-problems');
    this.revisions = page.getByTestId('revision-row');
  }

  async gotoNew() {
    await this.page.goto('/articles/new');
  }

  async goto(id: string) {
    await this.page.goto(`/articles/${id}`);
  }

  async fillNew(a: { title: string; brand: string; author: string; tags?: string; body?: string }) {
    await this.title.fill(a.title);
    await this.brand.fill(a.brand);
    await this.author.fill(a.author);
    if (a.tags) await this.tags.fill(a.tags);
    if (a.body) await this.body.fill(a.body);
  }

  /** Click a workflow button, e.g. moveTo('in_review'). */
  async moveTo(status: string) {
    await this.page.getByTestId(`transition-${status}`).click();
  }
}
