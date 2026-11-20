import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDebounced } from './useDebounced';

describe('useDebounced', () => {
  it('updates only after the quiet period', async () => {
    vi.useFakeTimers();
    const src = ref('a');
    const out = useDebounced(src, 300);
    src.value = 'ab';
    await nextTick();
    vi.advanceTimersByTime(299);
    expect(out.value).toBe('a');
    vi.advanceTimersByTime(1);
    expect(out.value).toBe('ab');
    vi.useRealTimers();
  });
});
