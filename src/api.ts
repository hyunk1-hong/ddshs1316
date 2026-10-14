import { BrowserStore } from './local-store';
import { browserAi } from './browser-ai';
import { explanationQuestionSchema } from '../shared/ai';
import type { Experiment } from '../shared/types';
let mode: 'server' | 'browser' = 'server';
let localStore: BrowserStore | undefined;
export function configureBackend(next: 'server' | 'browser') {
  mode = next;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const aiPath = path.match(/^\/experiments\/([^/]+)\/explain$/);
  if (aiPath && body !== undefined && browserAi.hasKey()) {
    const parsed = explanationQuestionSchema.safeParse(body);
    if (!parsed.success) throw new Error('질문은 1,000자 이내로 입력해 주세요.');
    const { experiment } = await api<{ experiment: Experiment }>(`/experiments/${aiPath[1]}`);
    return (await browserAi.explain(experiment, parsed.data.question)) as T;
  }
  if (mode === 'browser') {
    localStore ??= new BrowserStore();
    return localStore.handle(path, body) as T;
  }
  let response: Response;
  try {
    response = await fetch(
      `/api${path}`,
      body === undefined
        ? undefined
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    );
  } catch {
    throw new Error('서버에 연결할 수 없어요. 연결 상태를 확인하고 다시 시도하세요.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '요청을 처리하지 못했어요.');
  return data;
}
