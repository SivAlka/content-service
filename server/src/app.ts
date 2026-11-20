import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import type { ContentStore } from './store.js';
import { createSchema, listSchema, transitionSchema, updateSchema } from './schemas.js';
import { HttpError, badRequest } from './errors.js';
import type { Article } from './types.js';

/** Version comes from the If-Match header (ETag style: "3" or W/"3"). */
function expectedVersion(req: Request): number {
  const raw = req.header('If-Match');
  if (!raw) throw new HttpError(428, 'precondition_required', 'If-Match header with the article version is required');
  const n = Number(raw.replace(/^W\//, '').replace(/"/g, ''));
  if (!Number.isInteger(n) || n < 1) throw badRequest('If-Match must be a version number');
  return n;
}

function send(res: Response, article: Article, status = 200) {
  res.status(status).setHeader('ETag', `"${article.version}"`).json(article);
}

export interface AppOptions {
  /** When provided, mounts POST /api/test/reset (never enable in production). */
  onReset?: (opts: { seed: boolean }) => void;
}

export function createApp(store: ContentStore, options: AppOptions = {}) {
  const app = express();
  app.use(cors({ exposedHeaders: ['ETag'] })); // open access: any origin, no auth
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  if (options.onReset) {
    // Test support: deterministic state for automation. Body: { "seed": boolean } (default true).
    app.post('/api/test/reset', (req, res) => {
      options.onReset!({ seed: req.body?.seed !== false });
      res.json({ ok: true, total: store.stats().total });
    });
  }

  app.get('/api/stats', (_req, res) => res.json(store.stats()));

  app.get('/api/articles', (req, res) => {
    res.json(store.list(listSchema.parse(req.query)));
  });

  app.post('/api/articles', (req, res) => {
    send(res, store.create(createSchema.parse(req.body)), 201);
  });

  app.get('/api/articles/:id', (req, res) => send(res, store.get(req.params.id)));

  app.patch('/api/articles/:id', (req, res) => {
    send(res, store.update(req.params.id, expectedVersion(req), updateSchema.parse(req.body)));
  });

  app.post('/api/articles/:id/transitions', (req, res) => {
    const { to, publishAt } = transitionSchema.parse(req.body);
    send(res, store.transition(req.params.id, expectedVersion(req), to, publishAt));
  });

  app.get('/api/articles/:id/revisions', (req, res) => res.json(store.revisionsOf(req.params.id)));

  app.post('/api/articles/:id/revisions/:revision/restore', (req, res) => {
    send(res, store.restore(req.params.id, expectedVersion(req), Number(req.params.revision)));
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'not_found', 'Unknown route')));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: { code: 'validation_error', message: 'Invalid request', details: err.flatten() } });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: { code: 'bad_json', message: 'Malformed JSON body' } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
  });

  return app;
}
