import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const key = 'sk-test-only-memory-browser-canary-no-real-key';
const endpoint = 'https://api.openai.com/v1/responses';
const fileUrl = pathToFileURL(resolve('index.html')).href;
const reply = {
  output: [
    {
      type: 'message',
      content: [{ type: 'output_text', text: 'GPT 모의 설명: 안토시아닌의 구조가 달라져요.' }],
    },
  ],
};
let server: Server, pagesUrl: string;
test.beforeAll(async () => {
  const html = await readFile('index.html');
  server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server unavailable');
  pagesUrl = `http://127.0.0.1:${address.port}/ddshs1316/`;
});
test.afterAll(async () => {
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
});
async function enterKey(page: Page) {
  await page.getByLabel('GPT API 키', { exact: true }).fill(key);
  await page.getByRole('button', { name: 'GPT 사용하기', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '개인 키 설정됨' })).toBeVisible();
}
async function openExperiment(page: Page) {
  await page.getByRole('button', { name: '보랏빛 양배추의 색깔 실험 자세히 보기' }).click();
  return page.getByRole('dialog');
}
async function assertNoKeyStored(page: Page) {
  expect(
    await page.evaluate((secret) => {
      const values = (store: Storage) =>
        Array.from({ length: store.length }, (_, i) => store.getItem(store.key(i)!)).join(' ');
      return (
        values(localStorage).includes(secret) ||
        values(sessionStorage).includes(secret) ||
        document.documentElement.outerHTML.includes(secret)
      );
    }, key),
  ).toBe(false);
}
async function personalFlow(page: Page, url: string) {
  let calls = 0;
  const requests: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'authorization,content-type',
        },
      });
      return;
    }
    calls++;
    const headers = route.request().headers();
    expect(headers.authorization).toBe(`Bearer ${key}`);
    const body = route.request().postDataJSON();
    expect(body.store).toBe(false);
    expect(JSON.stringify(body)).not.toContain(key);
    expect(body.model).toBe('gpt-4.1-mini');
    await route.fulfill({ json: reply, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'GPT와 더 깊이 탐구하기' })).toBeVisible();
  expect(calls).toBe(0);
  await enterKey(page);
  expect(calls).toBe(0);
  await assertNoKeyStored(page);
  const modal = await openExperiment(page);
  await expect(modal.getByRole('textbox', { name: 'GPT에게 실험 질문' })).toBeEnabled();
  await modal
    .getByRole('textbox', { name: 'GPT에게 실험 질문' })
    .fill('색이 달라지는 이유는 무엇인가요?');
  await modal.getByRole('button', { name: '질문하기', exact: true }).click();
  await expect(modal.getByRole('status')).toContainText('GPT 모의 설명');
  expect(calls).toBe(1);
  await assertNoKeyStored(page);
  await modal.getByRole('button', { name: '실험 상세 닫기' }).click();
  await page.getByRole('button', { name: '키 삭제', exact: true }).click();
  await expect(page.getByLabel('GPT API 키', { exact: true })).toHaveValue('');
  const guide = await openExperiment(page);
  await expect(guide.getByRole('textbox', { name: 'GPT에게 실험 질문' })).toBeDisabled();
  await guide.getByRole('button', { name: '기본 가이드 보기' }).click();
  await expect(guide.getByRole('status')).toContainText('기본 가이드');
  expect(calls).toBe(1);
  await guide.getByRole('button', { name: '실험 상세 닫기' }).click();
  await enterKey(page);
  await page.reload();
  await expect(page.getByLabel('GPT API 키', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: '키 삭제', exact: true })).toHaveCount(0);
  await enterKey(page);
  await page.goto('about:blank');
  await page.goBack();
  await expect(page.getByLabel('GPT API 키', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: '키 삭제', exact: true })).toHaveCount(0);
  await assertNoKeyStored(page);
  expect(requests.filter((u) => /^https?:/.test(u) && u !== url && u !== endpoint)).toEqual([]);
  expect(errors).toEqual([]);
}
test('Pages 브라우저 GPT: 메모리 키·직접 요청·삭제·새로고침을 확인한다', async ({ page }) => {
  await personalFlow(page, pagesUrl);
});
test('파일 브라우저 GPT: index 직접 실행에서도 개인 키로 질문한다', async ({ page }) => {
  await personalFlow(page, fileUrl);
});
test('Pages 브라우저 GPT: 401은 키를 노출하지 않고 기본 원리를 유지한다', async ({ page }) => {
  await page.route(endpoint, async (route) => {
    await route.fulfill({
      status: 401,
      json: { error: { message: key } },
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto(pagesUrl);
  await enterKey(page);
  const modal = await openExperiment(page);
  await modal.getByRole('button', { name: '질문하기', exact: true }).click();
  await expect(modal.getByRole('alert')).toContainText('유효하지 않아요');
  await expect(modal.getByRole('heading', { name: '이 실험 속 과학 원리' })).toBeVisible();
  await expect(modal.getByRole('alert')).not.toContainText(key);
  await assertNoKeyStored(page);
});
