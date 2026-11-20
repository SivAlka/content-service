import { test, expect } from '../../support/fixtures';
import { LONG_BODY } from '../../support/api';

/**
 * REFERENCE TEST — shows the conventions used in this suite:
 *  - fixtures reset data, page objects own locators, specs read like scenarios
 *  - web-first assertions (no sleeps), data-testid locators
 */
test.describe('editorial workflow', () => {
  test('author creates an article and takes it from draft to published', async ({ editorPage, page }) => {
    await editorPage.gotoNew();
    await editorPage.fillNew({ title: 'Reference scenario', brand: 'demo', author: 'QA', tags: 'qa, smoke', body: LONG_BODY });
    await editorPage.save.click();

    await expect(page).toHaveURL(/\/articles\/[0-9a-f-]{36}$/);
    await expect(editorPage.status).toHaveText('draft');
    await expect(editorPage.version).toContainText('v1');

    for (const [step, expected] of [['in_review', 'in review'], ['approved', 'approved'], ['published', 'published']] as const) {
      await editorPage.moveTo(step);
      await expect(editorPage.status).toHaveText(expected);
    }
    await expect(page.getByTestId('transition-archived')).toBeVisible();
  });
});
