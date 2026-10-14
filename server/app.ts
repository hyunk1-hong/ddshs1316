import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { Store, DomainError } from './database';
import { answersSchema, feedbackSchema, submissionSchema } from './validation';
import { explain } from './ai';
export function createApp(
  store: Store,
  options: {
    apiKey?: string;
    model?: string;
    fetcher?: typeof fetch;
    staticDir?: string;
    disableRateLimit?: boolean;
  } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { connectSrc: ["'self'", 'https://api.openai.com'] } },
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  // API writes are same-origin; JSON content type also prevents cross-site form submissions.
  app.use('/api', (req, res, next) => {
    if (req.method === 'POST' && req.get('origin')) {
      try {
        if (new URL(req.get('origin')!).host !== req.get('host'))
          return res.status(403).json({ error: '같은 사이트에서 요청해 주세요.' });
      } catch {
        return res.status(403).json({ error: '잘못된 요청 출처예요.' });
      }
    }
    next();
  });
  if (!options.disableRateLimit)
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 60,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: '요청이 많아요. 잠시 후 다시 시도하세요.' },
      }),
    );
  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', aiEnabled: !!options.apiKey, experimentCount: store.list().length }),
  );
  app.get('/api/experiments', (_req, res) => res.json({ experiments: store.list() }));
  app.get('/api/experiments/:id', (req, res) =>
    res.json({ experiment: store.get(z.string().parse(req.params.id)) }),
  );
  app.post('/api/recommendations', (req, res) =>
    res.json(store.recommend(answersSchema.parse(req.body))),
  );
  app.post('/api/feedback', (req, res) =>
    res.status(201).json(store.feedback(feedbackSchema.parse(req.body))),
  );
  const submitLimit = rateLimit({
    windowMs: 3600000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: '등록은 시간당 10회까지 가능해요. 잠시 후 다시 시도하세요.' },
    skip: () => !!options.disableRateLimit,
  });
  app.post('/api/experiments', submitLimit, (req, res) =>
    res.status(201).json({ experiment: store.submit(submissionSchema.parse(req.body)) }),
  );
  const aiLimit = rateLimit({
    windowMs: 60000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'AI 질문은 분당 5회까지 가능해요. 잠시 후 다시 시도하세요.' },
    skip: () => !!options.disableRateLimit,
  });
  app.post('/api/experiments/:id/explain', aiLimit, async (req, res) => {
    const { question } = z
      .object({ question: z.string().trim().max(1000).default('') })
      .strict()
      .parse(req.body);
    res.json(
      await explain(
        store.get(z.string().parse(req.params.id)),
        question,
        options.apiKey,
        options.model ?? 'gpt-4.1-mini',
        options.fetcher,
      ),
    );
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: '요청한 API를 찾을 수 없어요.' }));
  if (options.staticDir) {
    app.use(express.static(options.staticDir));
    app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: options.staticDir }));
  }
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof z.ZodError)
        return res
          .status(400)
          .json({
            error: '입력 내용을 확인해 주세요.',
            details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          });
      if (err instanceof DomainError) return res.status(err.status).json({ error: err.message });
      if (err instanceof SyntaxError)
        return res.status(400).json({ error: '잘못된 JSON 요청이에요.' });
      if (typeof err === 'object' && err !== null && 'status' in err && err.status === 413)
        return res.status(413).json({ error: '입력 내용이 너무 길어요.' });
      console.error('Request failed:', err instanceof Error ? err.name : 'unknown');
      res.status(500).json({ error: '처리 중 문제가 발생했어요. 잠시 후 다시 시도하세요.' });
    },
  );
  return app;
}
