import { test, expect } from '@playwright/test';
import { endpoint, key, finishDetailedQuiz, newTopicFlow } from '../topics-browser-flow';
test('개인 키로 조건에 맞는 새로운 GPT 주제를 추천받고 기존 일치율과 구분한다', async ({
  page,
}) => {
  await newTopicFlow(page, '/', 'docs/screenshots/new-topics.png');
});
test('결과에서 키를 설정할 수 있고 GPT 오류가 나도 등록 실험 추천은 유지된다', async ({ page }) => {
  await page.route(endpoint, async (route) =>
    route.fulfill({ status: 401, body: `provider error ${key}` }),
  );
  await page.goto('/');
  await finishDetailedQuiz(page);
  await expect(page.getByRole('button', { name: 'GPT로 새 주제 추천받기' })).toBeDisabled();
  await page.getByLabel('GPT API 키', { exact: true }).fill(key);
  await page.getByRole('button', { name: 'GPT 사용하기', exact: true }).click();
  await page.getByRole('button', { name: 'GPT로 새 주제 추천받기' }).click();
  await expect(page.locator('.topic-panel').getByRole('alert')).toContainText('유효하지');
  await expect(page.locator('.topic-panel')).not.toContainText(key);
  await expect(page.locator('.topic-card')).toHaveCount(0);
  await expect(page.locator('.result-card')).toHaveCount(6);
});
test('이전 질문에서 목적을 바꾸면 측정 추가 질문과 이전 답변을 지운다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '나에게 맞는 실험 찾기' }).click();
  const choices = [
    '화학',
    '조건을 바꾸어 비교하기',
    '입문 · 처음이어도 괜찮아요',
    '30분 이내',
    '집에서',
    '생활 속 준비물',
    '5,000원 이내',
    '색의 변화',
    '혼자 진행해요',
    '물·식재료·종이만 사용할래요',
    '측정 표로 정리하기',
    '탐구 보고서를 쓰고 싶어요',
    '눈금·시간·개수를 직접 기록해요',
  ];
  for (const choice of choices) {
    await page.getByRole('button', { name: choice, exact: true }).click();
    await page.getByRole('button', { name: '다음 질문', exact: true }).click();
  }
  await page.getByRole('button', { name: '조건마다 3회' }).click();
  for (let i = 0; i < 12; i++)
    await page.getByRole('button', { name: '이전', exact: true }).click();
  await page.getByRole('button', { name: '변화를 직접 관찰하기', exact: true }).click();
  await expect(page.locator('.quiz-top')).toContainText('2 / 12');
  for (let i = 0; i < 10; i++)
    await page.getByRole('button', { name: '다음 질문', exact: true }).click();
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/recommendations') && r.method() === 'POST',
  );
  await page.getByRole('button', { name: '맞춤 실험 보기', exact: true }).click();
  const body = (await request).postDataJSON();
  expect(body.goal).toBe('observe');
  expect(body).not.toHaveProperty('measurement');
  expect(body).not.toHaveProperty('repetitions');
  expect(body.output).toBe('report');
  await expect(page.getByRole('heading', { name: '당신의 호기심에 맞는 실험' })).toBeVisible();
});
