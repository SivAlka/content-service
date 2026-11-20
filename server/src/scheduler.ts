import type { ContentStore } from './store.js';

/** Polls for due scheduled articles and publishes them. Returns a stop function. */
export function startScheduler(store: ContentStore, intervalMs = 15_000): () => void {
  const timer = setInterval(() => {
    const published = store.publishDue();
    if (published.length) console.log(`[scheduler] published ${published.length} article(s)`);
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
