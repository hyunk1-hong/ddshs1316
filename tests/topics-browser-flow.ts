import { expect, type Page } from '@playwright/test';
import { topic, topicPayload } from './topic-fixtures';
export const key = 'sk-test-new-topic-browser-canary-not-a-real-key';
export const endpoint = 'https://api.openai.com/v1/responses';
export async function finishDetailedQuiz(page: Page, quantitative = false) {
  await page.getByRole('button', { name: '나에게 맞는 실험 찾기' }).click();
  const choices = [
    '화학',
    quantitative ? '조건을 바꾸어 비교하기' : '변화를 직접 관찰하기',
    '입문 · 처음이어도 괜찮아요',
    '30분 이내',
    '집에서',
    '생활 속 준비물',
    '5,000원 이내',
    '색의 변화',
    '혼자 진행해요',
    '물·식재료·종이만 사용할래요',
    quantitative ? '그래프로 분석하기' : '관찰 일지로 정리하기',
    quantitative ? '탐구 보고서를 쓰고 싶어요' : '과학 원리를 이해하고 싶어요',
    ...(quantitative ? ['눈금·시간·개수를 직접 기록해요', '조건마다 3회'] : []),
  ];
  for (let i = 0; i < choices.length; i++) {
    if (i === 12)
      await expect(
        page.getByRole('button', { name: '선택한 측정 기기를 활용해요' }),
      ).toBeDisabled();
    await page.getByRole('button', { name: choices[i], exact: true }).click();
    await page
      .getByRole('button', {
        name: i === choices.length - 1 ? '맞춤 실험 보기' : '다음 질문',
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: '등록된 실험 밖에서, 새로운 탐구 찾기' }),
  ).toBeVisible();
}
export async function newTopicFlow(page: Page, url: string, screenshot?: string) {
  let calls = 0;
  const ownRequests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (r) => {
    if (r.url() !== endpoint)
      ownRequests.push(JSON.stringify({ url: r.url(), body: r.postData(), headers: r.headers() }));
  });
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
    expect(route.request().headers().authorization).toBe(`Bearer ${key}`);
    const body = route.request().postDataJSON(),
      input = JSON.parse(body.input);
    expect(body.text.format.strict).toBe(true);
    expect(JSON.stringify(body)).not.toContain(key);
    expect(input.answers.goal).toBe('compare');
    expect(input.answers.recording).toBe('graph');
    expect(input.answers.output).toBe('report');
    expect(input.answers.measurement).toBe('manual');
    expect(input.answers.repetitions).toBe('3');
    expect(input.selectedConditions).toHaveLength(14);
    expect(input.registeredExperimentsToExclude.length).toBeGreaterThanOrEqual(9);
    const valid = {
      ...topic,
      goal: 'compare' as const,
      recording: 'graph' as const,
      output: 'report' as const,
      measurement: 'manual' as const,
      repetitions: 3,
      researchQuestion: '차 희석 배수에 따라 글자 무늬를 알아보는 정도는 어떻게 달라질까요?',
      hypothesis: '차를 더 많이 희석하면 컵 뒤의 무늬를 더 많이 알아볼 것으로 예상해요.',
      variables: {
        independent: '차의 희석 비율',
        dependent: '알아본 무늬 개수',
        controlled: ['용기 모양과 액체 높이', '조명·종이·관찰자'],
      },
      fitReasons: [
        '선택한 생활 준비물만 사용하며 30분 안에 반복 측정해요.',
        '희석 조건을 비교해 그래프로 정리하고 탐구 보고서에 활용해요.',
      ],
      steps: [
        '미리 식힌 차와 물을 컵에 같은 높이로 준비해요.',
        '희석 비율별로 컵 뒤에 종이를 놓고 알아본 무늬 개수를 기록해요.',
        '조건마다 3회 반복해 평균을 표와 그래프로 정리해요.',
      ],
      analysis:
        '반복한 값을 평균 내어 그래프로 정리하고 보고서에 관찰 한계를 기록해요. 무늬를 인식하는 정도는 조명과 관찰자에 따라 달라질 수 있어요.',
    };
    await route.fulfill({
      json: topicPayload([
        { ...valid, title: input.registeredExperimentsToExclude[0].title },
        valid,
        { ...valid, title: '시간 조건을 벗어난 모의 후보', duration: 60 },
      ]),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  await page.goto(url);
  await page.getByLabel('GPT API 키', { exact: true }).fill(key);
  await page.getByRole('button', { name: 'GPT 사용하기', exact: true }).click();
  await finishDetailedQuiz(page, true);
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'GPT로 새 주제 추천받기', exact: true }).click();
  const panel = page.locator('.topic-panel');
  await expect(panel.locator('.topic-card')).toHaveCount(1);
  await expect(panel.getByRole('status')).toContainText('후보 2개는 제외');
  await expect(panel.getByRole('heading', { name: topic.title })).toBeVisible();
  await expect(panel.locator('.topic-card')).not.toContainText('일치율');
  await panel.getByText('가설·준비물·진행 방법 보기', { exact: true }).click();
  await expect(panel.getByRole('heading', { name: '기록과 결과 해석' })).toBeVisible();
  await expect(panel).toContainText('각 조건을 3회');
  await expect(panel).toContainText('보고서');
  await expect(page.locator('.result-card')).toHaveCount(6);
  expect(calls).toBe(1);
  expect(ownRequests.join('\n')).not.toContain(key);
  expect(
    await page.evaluate((secret) => {
      const stored = (s: Storage) =>
        Array.from({ length: s.length }, (_, i) => s.getItem(s.key(i)!)).join(' ');
      return (
        stored(localStorage) +
        stored(sessionStorage) +
        document.documentElement.outerHTML
      ).includes(secret);
    }, key),
  ).toBe(false);
  expect(errors).toEqual([]);
  if (screenshot) await panel.screenshot({ path: screenshot });
  await page.reload();
  await finishDetailedQuiz(page);
  await expect(page.getByRole('button', { name: 'GPT로 새 주제 추천받기' })).toBeDisabled();
  await expect(page.locator('.topic-card')).toHaveCount(0);
  expect(calls).toBe(1);
}
