import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { newTopicFlow } from '../topics-browser-flow';
let server: Server, pagesUrl: string;
test.beforeAll(async () => {
  const html = await readFile('index.html');
  server = createServer((req, res) => {
    if (req.url !== '/ddshs1316/') {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server unavailable');
  pagesUrl = `http://127.0.0.1:${address.port}/ddshs1316/`;
});
test.afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()));
});
test('Pages 하위 경로에서 개인 키로 새 주제를 생성한다', async ({ page }) => {
  await newTopicFlow(page, pagesUrl);
});
test('직접 연 index에서도 개인 키로 새 주제를 생성한다', async ({ page }) => {
  await newTopicFlow(page, pathToFileURL(resolve('index.html')).href);
});
test('모바일에서 새 주제와 세부 조건이 화면 안에 표시된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await newTopicFlow(page, pagesUrl);
  await page.locator('.topic-conditions summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
