import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '../src/slug.js';

describe('slug', () => {
  it('slugifies accents and punctuation', () => {
    expect(slugify('  Café — Crème Brûlée!! ')).toBe('cafe-creme-brulee');
    expect(slugify('***')).toBe('untitled');
  });
  it('de-duplicates', () => {
    expect(uniqueSlug('a', new Set(['a', 'a-2']))).toBe('a-3');
  });
});
