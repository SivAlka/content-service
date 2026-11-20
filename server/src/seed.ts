import type { ContentStore } from './store.js';
import type { Status } from './types.js';

const BRANDS = ['allrecipes', 'verywell', 'investopedia', 'travel-guide'];
const AUTHORS = ['Ada Lovelace', 'Grace Hopper', 'Linus Torvalds', 'Margaret Hamilton'];
const TOPICS = [
  ['Slow Cooker Chili', ['recipes', 'dinner', 'comfort-food']],
  ['Understanding Index Funds', ['investing', 'finance', 'beginners']],
  ['Sleep Hygiene Basics', ['health', 'sleep', 'wellness']],
  ['Weekend in Lisbon', ['travel', 'europe', 'city-guide']],
  ['Sourdough for Beginners', ['recipes', 'baking', 'beginners']],
  ['Roth vs Traditional IRA', ['investing', 'retirement', 'finance']],
  ['Managing Seasonal Allergies', ['health', 'allergies', 'wellness']],
  ['Hiking the Dolomites', ['travel', 'hiking', 'europe']],
] as const;

const LOREM =
  'This is placeholder content written to exercise the editorial workflow. It contains enough words to pass the review guard, ' +
  'and mentions topics such as planning, budgeting, flavor, rest, routes and tradeoffs so that search has something to match.';

const STATUS_CYCLE: Status[] = ['draft', 'in_review', 'approved', 'published', 'published', 'archived', 'draft'];

/** Deterministic seed: ~32 articles across statuses, brands and tags. */
export function seed(store: ContentStore, count = 32) {
  for (let i = 0; i < count; i++) {
    const [name, tags] = TOPICS[i % TOPICS.length]!;
    const a = store.create({
      title: `${name}${i >= TOPICS.length ? ` — Part ${Math.floor(i / TOPICS.length) + 1}` : ''}`,
      body: `${LOREM} (${name})`,
      tags: [...tags],
      brand: BRANDS[i % BRANDS.length]!,
      author: AUTHORS[i % AUTHORS.length]!,
    });
    const target = STATUS_CYCLE[i % STATUS_CYCLE.length]!;
    let v = a.version;
    const path: Status[] =
      target === 'draft' ? [] :
      target === 'in_review' ? ['in_review'] :
      target === 'approved' ? ['in_review', 'approved'] :
      target === 'published' ? ['in_review', 'approved', 'published'] :
      ['in_review', 'approved', 'published', 'archived'];
    for (const step of path) v = store.transition(a.id, v, step).version;
  }
  // a couple scheduled a little in the future so the scheduler can be demoed
  const [first, second] = store.list({ status: 'approved', page: 1, pageSize: 2 }).items;
  for (const [idx, a] of [first, second].entries()) {
    if (a) store.transition(a.id, a.version, 'scheduled', new Date(Date.now() + (idx + 1) * 90_000).toISOString());
  }
}
