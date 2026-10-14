import { explanationQuestionSchema, explanationRequest, explanationText } from '../shared/ai';
import type { Experiment } from '../shared/types';
export const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

// Personal credentials stay in this object, never in application data or browser storage.
export class BrowserAi {
  #key = '';
  #generation = 0;
  #listeners = new Set<() => void>();
  #requests = new Set<AbortController>();
  #requestTimes: number[] = [];
  constructor(
    private fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
    private now: () => number = Date.now,
    private timeoutMs = 20000,
  ) {}
  hasKey = () => this.#key.length > 0;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  private changed() {
    this.#generation++;
    for (const controller of this.#requests) controller.abort();
    for (const listener of this.#listeners) listener();
  }
  setKey(value: string) {
    const key = value.trim();
    if (!/^sk-[A-Za-z0-9_-]{16,509}$/.test(key))
      throw new Error(
        'sk-로 시작하는 OpenAI API 키를 입력해 주세요. 주소나 모델 이름은 입력하지 마세요.',
      );
    this.#key = key;
    this.changed();
  }
  clearKey = () => {
    this.#key = '';
    this.changed();
  };
  async explain(experiment: Experiment, question: string) {
    if (!this.#key) throw new Error('첫 화면에서 개인 GPT API 키를 입력해 주세요.');
    const parsed = explanationQuestionSchema.safeParse({ question });
    if (!parsed.success) throw new Error('질문은 1,000자 이내로 입력해 주세요.');
    const now = this.now();
    this.#requestTimes = this.#requestTimes.filter((t) => now - t < 60000);
    if (this.#requestTimes.length >= 5)
      throw new Error(
        '이 페이지에서는 GPT 질문을 분당 5회까지 보낼 수 있어요. 잠시 후 다시 시도하세요.',
      );
    this.#requestTimes.push(now);
    const controller = new AbortController(),
      generation = this.#generation;
    this.#requests.add(controller);
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.#key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(explanationRequest(experiment, parsed.data.question, 'gpt-4.1-mini')),
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
      if (generation !== this.#generation) throw new Error('cancelled');
      // Never display provider error bodies: they may contain sensitive request information.
      if (!response.ok) {
        if (response.status === 401)
          throw new BrowserAiError(
            'API 키가 유효하지 않아요. 첫 화면에서 키를 삭제한 뒤 다시 입력해 주세요.',
          );
        if (response.status === 403)
          throw new BrowserAiError(
            '이 키로 GPT 모델에 접근할 권한이 없어요. OpenAI 프로젝트의 키 권한을 확인해 주세요.',
          );
        if (response.status === 429)
          throw new BrowserAiError(
            'OpenAI 사용 한도나 요청 제한에 도달했어요. 결제·사용 한도를 확인하거나 잠시 후 다시 시도하세요.',
          );
        throw new BrowserAiError(
          'GPT 서비스가 요청을 처리하지 못했어요. 기본 원리를 확인하거나 잠시 후 다시 시도하세요.',
        );
      }
      let text: string;
      try {
        text = explanationText(await response.json());
      } catch {
        throw new BrowserAiError('GPT 응답을 읽지 못했어요. 잠시 후 다시 시도하세요.');
      }
      if (generation !== this.#generation) throw new Error('cancelled');
      return {
        text,
        source: 'gpt' as const,
        message:
          '개인 API 키로 GPT가 작성한 설명이에요. 실제 실험 전에는 교사와 내용을 확인하세요.',
      };
    } catch (error) {
      if (generation !== this.#generation)
        throw new Error('키 설정이 변경되어 요청을 취소했어요. 다시 질문해 주세요.');
      if (error instanceof BrowserAiError) throw error;
      if (controller.signal.aborted)
        throw new Error('GPT 응답 시간이 초과됐어요. 잠시 후 다시 시도하세요.');
      throw new Error(
        'OpenAI에 연결하지 못했어요. 인터넷 연결이나 브라우저의 네트워크 차단 설정을 확인해 주세요.',
      );
    } finally {
      clearTimeout(timer);
      this.#requests.delete(controller);
    }
  }
}
class BrowserAiError extends Error {}
export const browserAi = new BrowserAi();
