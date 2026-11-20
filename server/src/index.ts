import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { ContentStore } from './store.js';
import { seed } from './seed.js';
import { startScheduler } from './scheduler.js';

const port = Number(process.env.PORT ?? 3001);
const store = new ContentStore();
if (process.env.SEED !== 'false') seed(store);
startScheduler(store, Number(process.env.SCHEDULER_INTERVAL_MS ?? 15_000));

const app = createApp(store);

// After `npm run build`, serve the built UI from the same port (single-process mode).
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.listen(port, () => console.log(`content-service listening on http://localhost:${port}`));
