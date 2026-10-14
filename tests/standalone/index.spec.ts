import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const fileUrl = pathToFileURL(resolve('index.html')).href;
let server: Server, pagesUrl: string;
test.beforeAll(async () => {
  const html = await readFile('index.html');
  server = createServer((req, res) => {
    if (req.url === '/ddshs1316/' || req.url === '/ddshs1316/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end('not found');
    }
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
async function answerQuiz(page: Page) {
  await page.getByRole('button', { name: '나에게 맞는 실험 찾기' }).click();
  const choices = [
    '화학',
    '변화를 직접 관찰하기',
    '입문 · 처음이어도 괜찮아요',
    '30분 이내',
    '집에서',
    '생활 속 준비물',
    '5,000원 이내',
    '색의 변화',
  ];
  for (let i = 0; i < choices.length; i++) {
    await page.getByRole('button', { name: choices[i], exact: true }).click();
    await page
      .getByRole('button', {
        name: i === choices.length - 1 ? '맞춤 실험 보기' : '다음 질문',
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole('heading', { name: '당신의 호기심에 맞는 실험' })).toBeVisible();
}

test('index.html 파일을 직접 열어 인터넷 없이 추천·피드백·가이드를 사용할 수 있다', async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    network: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  await context.setOffline(true);
  await page.goto(fileUrl);
  await expect(page.getByRole('note')).toContainText('이 브라우저에만 저장');
  await answerQuiz(page);
  const first = page.locator('.result-card').first();
  await expect(first.locator('.result-match strong')).toContainText('100');
  const title = await first.locator('h2').innerText();
  await first.getByRole('button', { name: '아쉬워요' }).click();
  await first.getByRole('button', { name: '실험 시간', exact: true }).click();
  await first.getByRole('button', { name: '의견 보내기' }).click();
  await expect(first.getByRole('status')).toContainText('반영');
  await page.reload();
  await answerQuiz(page);
  const changed = page
    .locator('.result-card')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await changed.locator('summary').click();
  await expect(changed.locator('.score-details')).toContainText('누적 의견 1개');
  await expect(changed.locator('.criteria-table').getByText('85%', { exact: true })).toBeVisible();
  await changed.getByRole('button', { name: '실험 보기' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('textbox', { name: 'GPT에게 실험 질문' })).toBeDisabled();
  await modal.getByRole('button', { name: '기본 가이드 보기' }).click();
  await expect(modal.getByRole('status')).toContainText('기본 가이드');
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
});
test('파일 실행에서 등록한 실험과 책갈피가 새로 열어도 유지된다', async ({ page }) => {
  await page.goto(fileUrl);
  await page.getByRole('button', { name: '실험 등록하기', exact: false }).first().click();
  await page.getByLabel('실험 이름').fill('단독 파일 종이 꽃 실험');
  await page
    .getByLabel('한 줄 소개')
    .fill('종이가 물을 흡수하며 펼쳐지는 모습을 비교하고 관찰하는 실험이에요.');
  await page.getByRole('button', { name: '과정 작성하기' }).click();
  await page.getByLabel('준비물', { exact: false }).fill('종이 1장\n물과 투명한 접시');
  await page
    .getByLabel('실험 순서')
    .fill(
      '종이에 꽃 모양을 그리고 잘라 줍니다.\n꽃잎을 접어 물 위에 띄워 줍니다.\n꽃잎이 펼쳐지는 시간을 관찰합니다.',
    );
  await page
    .getByRole('textbox', { name: '안전 주의사항', exact: false })
    .fill('가위 사용 시 보호자의 도움을 받고 실험한 물은 마시지 마세요.');
  await page
    .getByLabel('과학 원리와 해석')
    .fill(
      '종이 섬유가 물을 흡수하면 팽창하여 접힌 부분이 펴집니다. 종이 두께와 물의 양을 같게 유지해 주세요.',
    );
  await page.getByLabel('작성자 닉네임').fill('파일탐구자');
  await page.getByLabel('참고 출처').fill('https://www.rsc.org/education/');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '실험 등록하기', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('heading', { name: '단독 파일 종이 꽃 실험' })).toBeVisible();
  await modal.getByRole('button', { name: '저장하기', exact: true }).click();
  await modal.getByRole('button', { name: '실험 상세 닫기' }).click();
  await page.reload();
  await page.getByRole('button', { name: '저장한 실험' }).click();
  await expect(page.locator('.card-title')).toContainText('단독 파일 종이 꽃 실험');
});
test('GitHub Pages처럼 하위 경로에 index만 배포해도 외부 파일·API 요청 없이 동작한다', async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pagesUrl);
  await expect(page.getByRole('note')).toContainText('내 브라우저의 실험실');
  await page.getByRole('button', { name: '모든 실험 보기' }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(9);
  await page.getByRole('button', { name: '생명과학', exact: true }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(2);
  await page.getByRole('textbox', { name: '실험 검색' }).fill('감자');
  await expect(page.locator('.experiment-card')).toHaveCount(1);
  expect(requests).toEqual([pagesUrl]);
  expect(errors).toEqual([]);
});
test('모바일에서도 직접 연 index로 설문을 진행할 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fileUrl);
  await answerQuiz(page);
  await expect(page.locator('.result-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
