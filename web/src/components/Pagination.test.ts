import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Pagination from './Pagination.vue';

describe('Pagination', () => {
  it('disables prev on first page and emits next', async () => {
    const w = mount(Pagination, { props: { page: 1, totalPages: 3 } });
    const [prev, next] = w.findAll('button');
    expect(prev!.attributes('disabled')).toBeDefined();
    await next!.trigger('click');
    expect(w.emitted('change')![0]).toEqual([2]);
  });
});
