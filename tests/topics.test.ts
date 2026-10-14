import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { getQuestions } from '../shared/questions';
import { answersSchema } from '../shared/validation';
import { topicAnswersSchema, topicRequest, topicResponse } from '../shared/topics';
import { seeds } from '../shared/seeds';
import { BrowserAi } from '../src/browser-ai';
import { Store } from '../server/database';
import { createApp } from '../server/app';
import { detailedAnswers as answers, topic, topicPayload } from './topic-fixtures';
const key = 'sk-test-topics-only-not-a-real-key';

test('세분 설문은 11~14문항이며 목적에 맞춰 측정·반복 질문을 붙인다', () => {
  assert.equal(getQuestions({ field: 'any', goal: 'observe' }).length, 11);
  assert.equal(getQuestions(answers).length, 12);
  const quantitative = {
    ...answers,
    goal: 'compare' as const,
    measurement: 'manual' as const,
    repetitions: '3' as const,
  };
  assert.equal(getQuestions(quantitative).length, 14);
  assert.ok(topicAnswersSchema.safeParse(quantitative).success);
  assert.ok(!answersSchema.safeParse({ ...quantitative, measurement: 'instrument' }).success);
  assert.ok(!answersSchema.safeParse({ ...answers, repetitions: '3' }).success);
  const legacy = { ...answers };
  delete legacy.supervision;
  assert.ok(answersSchema.safeParse(legacy).success);
  assert.ok(!topicAnswersSchema.safeParse(legacy).success);
});
test('GPT 요청은 세부 답변·한글 선택지·전체 등록 목록을 포함하는 strict JSON 형식이다', () => {
  const body = topicRequest(answers, seeds, 'gpt-4.1-mini');
  const input = JSON.parse(body.input);
  assert.deepEqual(input.answers, answers);
  assert.equal(input.selectedConditions.length, 12);
  assert.equal(input.registeredExperimentsToExclude.length, seeds.length);
  assert.equal(input.registeredExperimentsToExclude.at(-1).title, seeds.at(-1)!.title);
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.type, 'json_schema');
  assert.match(body.instructions, /제목만 바꾼/);
});
test('새 주제는 기존 제목·복사한 과정·후보 간 중복을 제외한다', () => {
  const duplicate = { ...topic, title: ` ${seeds[0].title}! ` };
  const response = topicResponse(topicPayload([duplicate, topic, { ...topic }]), answers, seeds);
  assert.equal(response.topics.length, 1);
  assert.equal(response.excludedCount, 2);
  assert.equal(response.source, 'gpt');
  assert.throws(
    () => topicResponse(topicPayload([{ ...topic, steps: seeds[0].steps }]), answers, seeds),
    /겹치거나/,
  );
  assert.throws(
    () =>
      topicResponse(
        topicPayload([{ ...topic, researchQuestion: seeds[0].summary }]),
        answers,
        seeds,
      ),
    /겹치거나/,
  );
});
test('시간·예산·장비·분야·지도·기록 등 선택 조건을 벗어난 응답은 보여주지 않는다', () => {
  for (const change of [
    { duration: 31 },
    { budget: 5001 },
    { equipment: ['scale'] },
    { supervision: 'teacher' },
    { materialsPolicy: 'general' },
    { recording: 'graph' },
    { output: 'report' },
    { goal: 'compare' },
    { level: 'advanced' },
    { location: 'school' },
    { field: 'physics', focus: 'motion' },
    { focus: 'solution' },
    { measurement: 'manual' },
    { repetitions: 3 },
    { equipment: ['household', 'household'] },
  ])
    assert.throws(
      () => topicResponse(topicPayload([{ ...topic, ...change } as typeof topic]), answers, seeds),
      /겹치거나/,
    );
  const quantitative = {
    ...answers,
    goal: 'measure' as const,
    measurement: 'manual' as const,
    repetitions: '3' as const,
  };
  assert.equal(
    topicResponse(
      topicPayload([{ ...topic, goal: 'measure', measurement: 'manual', repetitions: 3 }]),
      quantitative,
      seeds,
    ).topics.length,
    1,
  );
  assert.equal(
    topicResponse(
      topicPayload([{ ...topic, field: 'physics', focus: 'motion' }]),
      { ...answers, field: 'any', focus: undefined },
      seeds,
    ).topics.length,
    1,
  );
});
test('잘못된 JSON·추가 점수·거절 응답은 추천으로 해석하지 않는다', () => {
  assert.throws(() =>
    topicResponse(topicPayload([{ ...topic, match: 100 } as typeof topic]), answers, seeds),
  );
  assert.throws(() =>
    topicResponse(
      { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'declined' }] }] },
      answers,
      seeds,
    ),
  );
  assert.throws(() =>
    topicResponse(
      { output: [{ type: 'message', content: [{ type: 'output_text', text: 'not json' }] }] },
      answers,
      seeds,
    ),
  );
});
test('개인 키로 새 주제를 직접 요청하고 설명과 동일한 한도를 공유한다', async () => {
  let calls = 0;
  const ai = new BrowserAi(async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal((init!.headers as Record<string, string>).Authorization, `Bearer ${key}`);
    assert.equal(init!.credentials, 'omit');
    assert.ok(!String(init!.body).includes(key));
    return new Response(JSON.stringify(topicPayload()));
  });
  await assert.rejects(ai.topics(answers, seeds), /첫 화면/);
  ai.setKey(key);
  const result = await ai.topics(answers, seeds);
  assert.equal(result.topics[0].title, topic.title);
  assert.ok(!JSON.stringify(result).includes(key));
  for (let i = 0; i < 4; i++) await ai.explain(seeds[0], '');
  await assert.rejects(ai.topics(answers, seeds), /분당 5회/);
  assert.equal(calls, 5);
});
test('새 주제 생성 중 키 삭제는 취소하고 늦은 응답을 무시한다', async () => {
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  const ai = new BrowserAi(async (_url, init) => {
    signal = init!.signal;
    return new Promise((r) => {
      resolve = r;
    });
  });
  ai.setKey(key);
  const pending = ai.topics(answers, seeds);
  ai.clearKey();
  assert.equal(signal!.aborted, true);
  resolve(new Response(JSON.stringify(topicPayload())));
  await assert.rejects(pending, /설정이 변경/);
});
test('서버 새 주제 API는 입력 검증·전체 목록 제외·키 미설정·오류를 처리하고 자동 등록하지 않는다', async () => {
  const store = new Store(':memory:');
  let calls = 0;
  try {
    const fetcher: typeof fetch = async (_url, init) => {
      calls++;
      const input = JSON.parse(JSON.parse(init!.body as string).input);
      assert.equal(input.registeredExperimentsToExclude.length, store.list().length);
      return new Response(JSON.stringify(topicPayload()));
    };
    const app = createApp(store, { apiKey: key, fetcher, disableRateLimit: true });
    const response = await request(app).post('/api/topics').send(answers).expect(200);
    assert.equal(response.body.topics[0].title, topic.title);
    assert.equal(store.list().length, seeds.length);
    const legacy = { ...answers };
    delete legacy.recording;
    await request(app).post('/api/topics').send(legacy).expect(400);
    await request(app)
      .post('/api/topics')
      .send({ ...answers, apiKey: key })
      .expect(400);
    assert.equal(calls, 1);
    await request(createApp(store, { disableRateLimit: true }))
      .post('/api/topics')
      .send(answers)
      .expect(503);
    const fail = createApp(store, {
      apiKey: key,
      fetcher: async () => new Response(key, { status: 401 }),
      disableRateLimit: true,
    });
    const error = await request(fail).post('/api/topics').send(answers).expect(503);
    assert.ok(!JSON.stringify(error.body).includes(key));
  } finally {
    store.close();
  }
});
