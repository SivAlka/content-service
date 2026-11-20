import { ref, watch, type Ref } from 'vue';

/** Returns a ref that follows `source` after `ms` of quiet. */
export function useDebounced<T>(source: Ref<T>, ms = 300): Ref<T> {
  const out = ref(source.value) as Ref<T>;
  let t: ReturnType<typeof setTimeout> | undefined;
  watch(source, (v) => {
    clearTimeout(t);
    t = setTimeout(() => (out.value = v), ms);
  });
  return out;
}
