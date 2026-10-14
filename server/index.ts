import 'dotenv/config';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Store } from './database';
import { createApp } from './app';
const store = new Store(process.env.DATABASE_PATH ?? './data/lab.sqlite');
const dist = resolve('dist');
const aiKey = process.env.LAB_GPT_API_KEY || process.env.OPENAI_API_KEY;
const app = createApp(store, {
  apiKey: aiKey,
  model: process.env.OPENAI_MODEL,
  staticDir: existsSync(dist) ? dist : undefined,
});
const server = app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () =>
  console.log(
    `실험실 API ready on port ${process.env.PORT ?? 3001}; AI ${aiKey ? 'enabled' : 'guide mode'}`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );
