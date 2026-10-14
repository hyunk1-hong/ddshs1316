import { test, expect } from '@playwright/test';

test('조건 설문 → 추천 → 피드백 → 상세 원리 → 저장', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '나의 호기심이, 실험이 되는 곳.' })).toBeVisible();
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
  const first = page.locator('.result-card').first();
  await expect(first.locator('.result-match strong')).toContainText('100');
  await first.getByRole('button', { name: '아쉬워요' }).click();
  await first.getByRole('button', { name: '실험 시간', exact: true }).click();
  await first
    .getByRole('textbox', { name: '아쉬운 점 상세 의견' })
    .fill('준비 시간이 예상보다 오래 걸렸어요.');
  await first.getByRole('button', { name: '의견 보내기' }).click();
  await expect(first.getByRole('status')).toContainText('의견을 반영');
  await first.getByRole('button', { name: '실험 보기' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('heading', { name: '차근차근 실험하기' })).toBeVisible();
  await modal.getByRole('button', { name: '질문하기' }).click();
  await expect(modal.getByRole('status')).toContainText('기본 가이드');
  await modal.getByRole('button', { name: '저장하기', exact: true }).click();
  await modal.getByRole('button', { name: '실험 상세 닫기' }).click();
  await page.getByRole('button', { name: '저장한 실험' }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: '저장한 실험' }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(1);
});
test('실험 검색과 분야 필터를 이용한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '모든 실험 보기' }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(9);
  await page.getByRole('button', { name: '생명과학', exact: true }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(2);
  await page.getByRole('textbox', { name: '실험 검색' }).fill('감자');
  await expect(page.locator('.experiment-card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toContainText('감자');
  await page.getByRole('textbox', { name: '실험 검색' }).fill('검색 결과가 없는 문장');
  await expect(page.getByRole('heading', { name: '조건에 맞는 실험이 없어요' })).toBeVisible();
  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(page.locator('.experiment-card')).toHaveCount(9);
});
test('필수 항목을 작성하면 실험을 등록하고 새 실험을 볼 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '실험 등록하기', exact: false }).first().click();
  await page.getByLabel('실험 이름').fill('종이 꽃의 물 흡수 관찰');
  await page
    .getByLabel('한 줄 소개')
    .fill('종이가 물을 흡수하며 펼쳐지는 모습을 비교하고 관찰하는 실험이에요.');
  await page.getByRole('button', { name: '과정 작성하기' }).click();
  await page.getByLabel('준비물', { exact: false }).fill('종이 1장\n투명한 접시와 물');
  await page
    .getByLabel('실험 순서')
    .fill(
      '종이에 꽃 모양을 그린 후 잘라 줍니다.\n꽃잎을 접어 모양을 만들어 줍니다.\n물 위에 종이를 띄우고 펼쳐지는 모습을 관찰합니다.',
    );
  await page
    .getByRole('textbox', { name: '안전 주의사항', exact: false })
    .fill('가위를 사용할 때 보호자의 도움을 받고 실험한 물은 마시지 마세요.');
  await page
    .getByLabel('과학 원리와 해석')
    .fill(
      '종이가 물을 흡수하면 섬유가 팽창하고 접힌 부분이 펴집니다. 종이의 종류와 두께를 같게 유지해야 해요.',
    );
  await page.getByLabel('작성자 닉네임').fill('호기심학생');
  await page.getByLabel('참고 출처').fill('https://www.rsc.org/education/');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '실험 등록하기', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: '종이 꽃의 물 흡수 관찰' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('임시 배점');
  await page.getByRole('button', { name: '실험 상세 닫기' }).click();
  await page.getByRole('textbox', { name: '실험 검색' }).fill('종이 꽃');
  await expect(page.locator('.experiment-card')).toHaveCount(1);
});
test('모바일 화면에서 메뉴, 질문, 상세 화면을 이용한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await page.getByRole('button', { name: '실험 둘러보기', exact: true }).click();
  await page.getByRole('button', { name: '보랏빛 양배추의 색깔 실험 자세히 보기' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  await page.getByRole('button', { name: '실험 찾기', exact: true }).click();
  await page.getByRole('button', { name: '나에게 맞는 실험 찾기' }).click();
  await page.getByRole('button', { name: '어떤 분야든 좋아요' }).click();
  await expect(page.locator('.quiz-top')).toContainText('1 / 7');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
