import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserStore, STORAGE_KEY } from '../src/local-store';
import { Store } from '../server/database';
import type { Answers, Submission } from '../shared/types';
const answers: Answers = {
  field: 'chemistry',
  goal: 'observe',
  level: 'beginner',
  time: '30',
  budget: '5000',
  equipment: ['household'],
  location: 'home',
  focus: 'color',
};
const submission: Submission = {
  title: '종이 꽃의 물 흡수 관찰',
  summary: '종이가 물을 흡수하며 펼쳐지는 모습을 비교하고 관찰하는 실험이에요.',
  field: 'physics',
  level: 'beginner',
  goal: 'observe',
  duration: 20,
  budget: 1000,
  equipment: ['household'],
  locations: ['home', 'school'],
  focus: 'motion',
  materials: ['종이', '물과 접시'],
  steps: [
    '종이에 꽃 모양을 그려 잘라 줍니다.',
    '꽃잎을 가운데로 접어서 준비합니다.',
    '접시에 물을 붓고 종이 꽃을 올려 관찰합니다.',
  ],
  safety: '가위는 보호자의 도움을 받아 사용하고 실험한 물은 마시지 마세요.',
  principle:
    '종이가 물을 흡수하면서 팽창하여 접어 둔 부분이 펴집니다. 종이의 두께와 종류, 접는 정도를 같게 통제해야 합니다.',
  author: '과학탐구자',
  references: ['https://www.rsc.org/education/'],
};
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

test('브라우저 추천이 서버의 같은 답변에 대한 순위·배점과 일치한다', () => {
  const adapter = storage(),
    browser = new BrowserStore(adapter),
    server = new Store(':memory:');
  try {
    const local = browser.recommend(answers).recommendations,
      remote = server.recommend(answers).recommendations;
    assert.deepEqual(local, remote);
    assert.equal(browser.health().storage, 'browser');
  } finally {
    server.close();
  }
});
test('브라우저 등록과 선택 항목 피드백이 다시 열어도 유지되고 중복을 막는다', () => {
  const adapter = storage(),
    store = new BrowserStore(adapter);
  const created = store.submit(submission);
  const session = store.recommend(answers),
    first = session.recommendations[0];
  const feedback = {
    sessionId: session.sessionId,
    experimentId: first.experiment.id,
    satisfied: false,
    issues: ['time'],
  };
  store.feedback(feedback);
  const reopened = new BrowserStore(adapter);
  assert.equal(reopened.get(created.id).title, submission.title);
  assert.throws(() => reopened.feedback(feedback), /이미/);
  const updated = reopened
    .recommend(answers)
    .recommendations.find((r) => r.experiment.id === first.experiment.id)!;
  assert.equal(updated.criteria.find((c) => c.key === 'time')!.score, 0.85);
  assert.equal(updated.criteria.find((c) => c.key === 'field')!.score, 1);
  assert.equal(updated.feedbackCount, 1);
  const community = reopened
    .recommend({ ...answers, field: 'physics', focus: 'motion' })
    .recommendations.find((r) => r.experiment.id === created.id)!;
  assert.equal(community.confidence, 50);
  assert.ok(community.match > 85);
});
test('추가 질문·필수 등록 항목·피드백의 세션 범위를 브라우저에서도 검증한다', () => {
  const store = new BrowserStore(storage());
  assert.throws(() => store.recommend({ ...answers, focus: 'electricity' }));
  assert.throws(() => store.submit({ ...submission, safety: '주의' }));
  const session = store.recommend(answers);
  const outside = store
    .list()
    .find((e) => !session.recommendations.some((r) => r.experiment.id === e.id))!;
  assert.throws(
    () =>
      store.feedback({
        sessionId: session.sessionId,
        experimentId: outside.id,
        satisfied: true,
        issues: [],
      }),
    /포함된/,
  );
});
test('손상된 저장 데이터를 자동으로 덮어쓰지 않는다', () => {
  const adapter = storage();
  adapter.values.set(STORAGE_KEY, 'invalid json');
  assert.throws(() => new BrowserStore(adapter), /백업/);
  assert.equal(adapter.values.get(STORAGE_KEY), 'invalid json');
});
test('브라우저 저장이 차단되면 임시 모드를 알리고 현재 창의 기능을 제공한다', () => {
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  const store = new BrowserStore(blocked);
  assert.equal(store.health().persistent, false);
  const created = store.submit(submission);
  assert.equal(store.get(created.id).title, submission.title);
  const next = new BrowserStore(blocked);
  assert.equal(next.list().length, 9);
});
test('저장 공간 초과에서 성공을 보고하거나 등록 데이터를 부분 반영하지 않는다', () => {
  const adapter = storage();
  let full = false;
  const store = new BrowserStore({
    ...adapter,
    setItem: (k, v) => {
      if (full) throw new Error('quota');
      adapter.setItem(k, v);
    },
  });
  full = true;
  assert.throws(() => store.submit(submission), /반영하지 않았/);
  assert.equal(store.list().length, 9);
});
test('단일 파일의 원리 가이드는 GPT 요청을 보내지 않고 출처를 분명히 표시한다', () => {
  const store = new BrowserStore(storage());
  const guide = store.handle('/experiments/cabbage-ph/explain', {
    question: '어떤 원리인가요?',
  }) as { source: string; message: string };
  assert.equal(guide.source, 'guide');
  assert.match(guide.message, /첫 화면/);
});
