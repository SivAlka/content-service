import type { Article, Status } from './types.js';
import { HttpError } from './errors.js';

/** Allowed transitions: from -> [to, ...]. */
export const TRANSITIONS: Record<Status, Status[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'approved'],
  approved: ['draft', 'scheduled', 'published'],
  scheduled: ['approved', 'published'],
  published: ['archived'],
  archived: ['draft'],
};

export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Guard rules that must hold before an article may enter a status.
 * Returns a list of human-readable problems (empty = OK).
 */
export function guardProblems(article: Article, to: Status): string[] {
  const problems: string[] = [];
  if (to === 'in_review' || to === 'approved' || to === 'scheduled' || to === 'published') {
    if (wordCount(article.body) < 20) problems.push('Body must contain at least 20 words');
    if (article.tags.length === 0) problems.push('At least one tag is required');
  }
  if (to === 'scheduled' && !article.publishAt) problems.push('publishAt is required to schedule');
  return problems;
}

export function assertTransition(article: Article, to: Status): void {
  const allowed = TRANSITIONS[article.status];
  if (!allowed.includes(to)) {
    throw new HttpError(409, 'invalid_transition', `Cannot move from ${article.status} to ${to}`, { allowed });
  }
  const problems = guardProblems(article, to);
  if (problems.length) {
    throw new HttpError(422, 'guard_failed', `Cannot move to ${to}`, { problems });
  }
}
