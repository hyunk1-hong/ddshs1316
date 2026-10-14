import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { BrowserAi, OPENAI_RESPONSES_URL } from '../src/browser-ai';
import { seeds } from '../shared/seeds';
import { Store } from '../server/database';
import { createApp } from '../server/app';
const key = 'sk-test-only-memory-key-not-a-real-credential';
const payload = {
  output: [
    {
      type: 'message',
      content: [{ type: 'output_text', text: '산성도에 따라 안토시아닌의 구조가 변해요.' }],
    },
  ],
};
const answer = () => new Response(JSON.stringify(payload), { status: 200 });

test('키 설정은 요청을 보내지 않고 키 삭제 후 사용할 수 없다', async () => {
  let calls = 0;
  const ai = new BrowserAi(async () => {
    calls++;
    return answer();
  });
  let notifications = 0;
  const unsubscribe = ai.subscribe(() => notifications++);
  ai.setKey(` ${key} `);
  assert.equal(ai.hasKey(), true);
  assert.equal(calls, 0);
  assert.ok(!JSON.stringify(ai).includes(key));
  ai.clearKey();
  assert.equal(ai.hasKey(), false);
  assert.equal(notifications, 2);
  unsubscribe();
  await assert.rejects(ai.explain(seeds[0], ''), /첫 화면/);
  assert.equal(calls, 0);
});
test('개인 키를 고정된 OpenAI 인증 헤더에만 보내고 답변을 읽는다', async () => {
  let called = false;
  const ai = new BrowserAi(async (url, init) => {
    called = true;
    assert.equal(url, OPENAI_RESPONSES_URL);
    assert.equal((init!.headers as Record<string, string>).Authorization, `Bearer ${key}`);
    assert.equal(init!.credentials, 'omit');
    assert.equal(init!.redirect, 'error');
    assert.equal(init!.cache, 'no-store');
    assert.equal(init!.referrerPolicy, 'no-referrer');
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.equal(body.max_output_tokens, 900);
    assert.ok(!JSON.stringify(body).includes(key));
    return answer();
  });
  ai.setKey(key);
  const result = await ai.explain(seeds[0], '색이 변하는 이유는?');
  assert.equal(called, true);
  assert.equal(result.source, 'gpt');
  assert.match(result.text, /안토시아닌/);
});
test('잘못된 키 형식이나 긴 질문은 전송 전에 거부한다', async () => {
  let calls = 0;
  const ai = new BrowserAi(async () => {
    calls++;
    return answer();
  });
  assert.throws(() => ai.setKey('https://api.openai.com'), /sk-/);
  assert.throws(() => ai.setKey(`${key}\nheader`), /sk-/);
  ai.setKey(key);
  await assert.rejects(ai.explain(seeds[0], '가'.repeat(1001)), /1,000/);
  assert.equal(calls, 0);
});
test('401·403·429·서버 오류를 구분하고 키가 포함된 업스트림 본문은 노출하지 않는다', async () => {
  const messages = new Map([
    [401, /유효하지/],
    [403, /권한/],
    [429, /한도/],
    [500, /처리하지/],
  ]);
  for (const [status, pattern] of messages) {
    const ai = new BrowserAi(async () => new Response(`provider error ${key}`, { status }));
    ai.setKey(key);
    await assert.rejects(
      ai.explain(seeds[0], ''),
      (error) =>
        error instanceof Error && pattern.test(error.message) && !error.message.includes(key),
    );
  }
});
test('응답 파싱·네트워크·타임아웃 오류를 안전하게 안내한다', async () => {
  const malformed = new BrowserAi(async () => new Response('invalid json ' + key, { status: 200 }));
  malformed.setKey(key);
  await assert.rejects(malformed.explain(seeds[0], ''), /응답을 읽지/);
  const offline = new BrowserAi(async () => {
    throw new Error(key);
  });
  offline.setKey(key);
  await assert.rejects(
    offline.explain(seeds[0], ''),
    (error) =>
      error instanceof Error && /연결하지/.test(error.message) && !error.message.includes(key),
  );
  const timeout = new BrowserAi(
    async (_url, init) =>
      new Promise((_resolve, reject) =>
        init!.signal!.addEventListener('abort', () => reject(new Error(key)), { once: true }),
      ),
    Date.now,
    5,
  );
  timeout.setKey(key);
  await assert.rejects(timeout.explain(seeds[0], ''), /시간이 초과/);
});
test('키 삭제는 진행 중 요청을 중단하고 뒤늦은 응답을 무시한다', async () => {
  let resolveResponse!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  const ai = new BrowserAi(async (_url, init) => {
    signal = init!.signal;
    return new Promise((resolve) => {
      resolveResponse = resolve;
    });
  });
  ai.setKey(key);
  const pending = ai.explain(seeds[0], '');
  ai.clearKey();
  assert.equal(signal?.aborted, true);
  resolveResponse(answer());
  await assert.rejects(pending, /설정이 변경/);
  assert.equal(ai.hasKey(), false);
});
test('키를 바꾸면 이전 요청을 취소하고 다음 요청은 새 키만 사용한다', async () => {
  let resolveResponse!: (response: Response) => void;
  const authorization: string[] = [];
  const ai = new BrowserAi(async (_url, init) => {
    authorization.push((init!.headers as Record<string, string>).Authorization);
    if (authorization.length === 1)
      return new Promise((resolve) => {
        resolveResponse = resolve;
      });
    return answer();
  });
  ai.setKey(key);
  const pending = ai.explain(seeds[0], '');
  const nextKey = 'sk-test-only-replacement-not-a-real-key';
  ai.setKey(nextKey);
  resolveResponse(answer());
  await assert.rejects(pending, /설정이 변경/);
  await ai.explain(seeds[0], '');
  assert.deepEqual(authorization, [`Bearer ${key}`, `Bearer ${nextKey}`]);
});
test('한 페이지의 GPT 호출을 분당 5회로 제한한다', async () => {
  let now = 100000,
    calls = 0;
  const ai = new BrowserAi(
    async () => {
      calls++;
      return answer();
    },
    () => now,
  );
  ai.setKey(key);
  for (let i = 0; i < 5; i++) await ai.explain(seeds[0], '');
  await assert.rejects(ai.explain(seeds[0], ''), /분당 5회/);
  assert.equal(calls, 5);
  now += 60001;
  await ai.explain(seeds[0], '');
  assert.equal(calls, 6);
});
test('서버 배포 화면의 CSP는 브라우저 OpenAI 연결만 추가로 허용한다', async () => {
  const store = new Store(':memory:');
  try {
    const res = await request(createApp(store, { disableRateLimit: true }))
      .get('/api/health')
      .expect(200);
    assert.match(
      res.headers['content-security-policy'],
      /connect-src 'self' https:\/\/api.openai.com/,
    );
  } finally {
    store.close();
  }
});
