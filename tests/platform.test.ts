import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { createApp } from '../server/app';
import { Store } from '../server/database';
import { baseProfile, learn, rank } from '../server/scoring';
import { seeds } from '../server/seeds';
import { getQuestions } from '../shared/questions';
import type { Answers, RecommendationResponse, Submission } from '../shared/types';
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
function harness() {
  const store = new Store(':memory:');
  return { store, app: createApp(store, { disableRateLimit: true }) };
}
const submission: Submission = {
  title: '물에 떠오르는 종이 꽃',
  summary: '물에 닿은 종이가 펴지는 현상을 관찰하는 간단한 실험입니다.',
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

test('분야별 추가 질문과 전체 분야의 질문 수가 달라진다', () => {
  assert.equal(getQuestions({ field: 'any' }).length, 11);
  const q = getQuestions({ field: 'physics' });
  assert.equal(q.length, 12);
  assert.equal(q.find((question) => question.key === 'focus')?.options[1].value, 'electricity');
});
test('완벽한 조건은 100점이고 가중치에 따라 분야 불일치를 크게 반영한다', () => {
  const e = seeds[0],
    profile = baseProfile(e);
  assert.equal(rank(e, profile, {}, answers, 0).match, 100);
  assert.ok(
    rank(e, profile, {}, { ...answers, field: 'physics', focus: 'motion' }, 0).match <
      rank(e, profile, {}, { ...answers, goal: 'compare' }, 0).match,
  );
});
test('부족한 장비·시간·장소를 경고하고 적합도를 낮춘다', () => {
  const e = seeds.find((e) => e.id === 'low-voltage-circuit')!;
  const result = rank(e, baseProfile(e), {}, answers, 0);
  assert.equal(result.cautions.length, 4);
  assert.ok(result.match < 70);
});
test('불만족은 지정 항목의 현재 답변만 조정한다', () => {
  const profile = baseProfile(seeds[0]),
    before = structuredClone(profile),
    evidence = {};
  learn(profile, evidence, answers, false, ['time']);
  assert.equal(profile.time['30'], 0.85);
  assert.equal(profile.time['60'], before.time['60']);
  assert.deepEqual(profile.field, before.field);
});
test('만족 의견은 항목 신뢰도를 높이고 배점 범위를 유지한다', () => {
  const e = seeds[0],
    profile = baseProfile(e),
    evidence = {};
  const before = rank(e, profile, evidence, answers, 0);
  learn(profile, evidence, answers, true, []);
  const after = rank(e, profile, evidence, answers, 1);
  assert.ok(after.confidence > before.confidence);
  assert.equal(after.match, 100);
});
test('추천 API는 세션을 만들고 실제 실험을 일치율 순서로 반환한다', async () => {
  const { app, store } = harness();
  try {
    const res = await request(app).post('/api/recommendations').send(answers).expect(200);
    const data = res.body as RecommendationResponse;
    assert.match(data.sessionId, /^[\da-f-]{36}$/);
    assert.equal(data.recommendations.length, 6);
    assert.equal(data.recommendations[0].match, 100);
    assert.ok(
      data.recommendations.every((r, i) => i === 0 || data.recommendations[i - 1].match >= r.match),
    );
  } finally {
    store.close();
  }
});
test('분야와 맞지 않는 추가 답변 및 빠진 공통 질문을 거부한다', async () => {
  const { app, store } = harness();
  try {
    await request(app)
      .post('/api/recommendations')
      .send({ ...answers, focus: 'electricity' })
      .expect(400);
    const { equipment: _, ...missing } = answers;
    await request(app).post('/api/recommendations').send(missing).expect(400);
    await request(app)
      .post('/api/recommendations')
      .send({ ...answers, field: 'any' })
      .expect(400);
    const { focus: __, ...all } = answers;
    await request(app)
      .post('/api/recommendations')
      .send({ ...all, field: 'any' })
      .expect(200);
  } finally {
    store.close();
  }
});
test('피드백을 저장하고 중복 제출·해당 세션에 없는 실험 평가를 거부한다', async () => {
  const { app, store } = harness();
  try {
    const { body } = await request(app).post('/api/recommendations').send(answers);
    const id = body.recommendations[0].experiment.id;
    const input = {
      sessionId: body.sessionId,
      experimentId: id,
      satisfied: false,
      issues: ['time'],
      comment: '실제 준비 시간이 더 길어요.',
    };
    await request(app).post('/api/feedback').send(input).expect(201);
    await request(app).post('/api/feedback').send(input).expect(409);
    assert.equal(store.list().find((e) => e.id === id)!.feedbackCount, 1);
    const after = store.recommend(answers).recommendations.find((r) => r.experiment.id === id)!;
    assert.equal(after.criteria.find((c) => c.key === 'time')!.score, 0.85);
    const absent = store
      .list()
      .find(
        (e) =>
          !body.recommendations.some(
            (r: { experiment: { id: string } }) => r.experiment.id === e.id,
          ),
      )!;
    await request(app)
      .post('/api/feedback')
      .send({ ...input, experimentId: absent.id })
      .expect(400);
  } finally {
    store.close();
  }
});
test('불만족 항목 누락·응답하지 않은 추가 질문에 대한 피드백을 거부한다', async () => {
  const { app, store } = harness();
  try {
    const { focus: _, ...all } = answers;
    const { body } = await request(app)
      .post('/api/recommendations')
      .send({ ...all, field: 'any' });
    const input = {
      sessionId: body.sessionId,
      experimentId: body.recommendations[0].experiment.id,
      satisfied: false,
    };
    await request(app)
      .post('/api/feedback')
      .send({ ...input, issues: [] })
      .expect(400);
    await request(app)
      .post('/api/feedback')
      .send({ ...input, issues: ['focus'] })
      .expect(400);
  } finally {
    store.close();
  }
});
test('모든 필수 항목이 있는 커뮤니티 실험을 등록하고 추천에 반영한다', async () => {
  const { app, store } = harness();
  try {
    const { body } = await request(app).post('/api/experiments').send(submission).expect(201);
    assert.equal(body.experiment.source, 'community');
    assert.equal(store.list().length, 10);
    const result = store
      .recommend({ ...answers, field: 'physics', focus: 'motion' })
      .recommendations.find((r) => r.experiment.id === body.experiment.id)!;
    assert.ok(result);
    assert.equal(result.confidence, 50);
    assert.ok(result.match > 85);
    await request(app)
      .post('/api/experiments')
      .send({ ...submission, safety: '주의' })
      .expect(400);
    await request(app)
      .post('/api/experiments')
      .send({ ...submission, references: ['javascript:alert(1)'] })
      .expect(400);
    await request(app)
      .post('/api/experiments')
      .send({ ...submission, source: 'curated' })
      .expect(400);
  } finally {
    store.close();
  }
});
test('SQLite 재시작 후 등록 실험과 피드백이 유지된다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lab-test-')),
    path = join(dir, 'lab.sqlite');
  let store = new Store(path);
  try {
    const e = store.submit(submission);
    const session = store.recommend({ ...answers, field: 'physics', focus: 'motion' });
    store.feedback({
      sessionId: session.sessionId,
      experimentId: e.id,
      satisfied: true,
      issues: [],
    });
    store.close();
    store = new Store(path);
    assert.equal(store.get(e.id).title, submission.title);
    assert.equal(store.list().find((x) => x.id === e.id)!.feedbackCount, 1);
    assert.equal(store.list().length, 10);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('설정되지 않은 GPT 키는 명시적으로 기본 가이드를 반환한다', async () => {
  const { app, store } = harness();
  try {
    const res = await request(app)
      .post('/api/experiments/cabbage-ph/explain')
      .send({ question: '원리가 뭐야?' })
      .expect(200);
    assert.equal(res.body.source, 'guide');
    assert.equal(res.body.text, seeds[0].principle);
    assert.equal((await request(app).get('/api/health')).body.aiEnabled, false);
  } finally {
    store.close();
  }
});
test('GPT 키는 서버 요청에만 포함되고 Responses API의 답변을 읽는다', async () => {
  const store = new Store(':memory:');
  let called = false;
  const key = 'test-server-secret';
  const fetcher: typeof fetch = async (_url, init) => {
    called = true;
    assert.equal((init!.headers as Record<string, string>).Authorization, `Bearer ${key}`);
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.ok(body.instructions);
    return new Response(
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: '안토시아닌의 분자 구조가 바뀌기 때문이에요.' }],
          },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    const app = createApp(store, { apiKey: key, fetcher, disableRateLimit: true });
    const res = await request(app)
      .post('/api/experiments/cabbage-ph/explain')
      .send({ question: '색이 변하는 이유는?' })
      .expect(200);
    assert.ok(called);
    assert.equal(res.body.source, 'gpt');
    assert.ok(!JSON.stringify(res.body).includes(key));
  } finally {
    store.close();
  }
});
test('GPT 연결 실패에서 비밀 키·업스트림 오류를 노출하지 않는다', async () => {
  const store = new Store(':memory:');
  try {
    const app = createApp(store, {
      apiKey: 'private-key',
      disableRateLimit: true,
      fetcher: async () => new Response('private-key upstream details', { status: 401 }),
    });
    const res = await request(app)
      .post('/api/experiments/cabbage-ph/explain')
      .send({ question: '' })
      .expect(503);
    assert.ok(!JSON.stringify(res.body).includes('private-key'));
    assert.equal(store.get('cabbage-ph').id, 'cabbage-ph');
  } finally {
    store.close();
  }
});
test('교차 사이트 쓰기·잘못된 JSON·없는 API를 처리한다', async () => {
  const { app, store } = harness();
  try {
    await request(app)
      .post('/api/recommendations')
      .set('Origin', 'https://other.example')
      .send(answers)
      .expect(403);
    await request(app)
      .post('/api/recommendations')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    await request(app).get('/api/no-such-path').expect(404);
  } finally {
    store.close();
  }
});
