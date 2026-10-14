import type { Experiment } from '../shared/types';
import { explanationRequest, explanationText } from '../shared/ai';
import { DomainError } from './database';
export async function explain(
  experiment: Experiment,
  question: string,
  key: string | undefined,
  model: string,
  fetcher: typeof fetch = fetch,
) {
  if (!key)
    return {
      text: experiment.principle,
      source: 'guide' as const,
      message: 'GPT API 키가 설정되지 않아 기본 실험 가이드를 보여드려요.',
    };
  let response: Response;
  try {
    response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify(explanationRequest(experiment, question, model)),
    });
  } catch {
    throw new DomainError(
      503,
      'AI 설명을 가져오지 못했어요. 기본 원리를 확인하거나 잠시 후 다시 시도하세요.',
    );
  }
  if (!response.ok)
    throw new DomainError(
      503,
      'AI 연결을 확인해 주세요. 기본 실험 가이드는 계속 이용할 수 있어요.',
    );
  try {
    return {
      text: explanationText(await response.json()),
      source: 'gpt' as const,
      message: 'AI가 작성한 설명이에요. 실제 실험 전에는 교사와 내용을 확인하세요.',
    };
  } catch {
    throw new DomainError(503, 'AI 응답을 읽지 못했어요. 잠시 후 다시 시도하세요.');
  }
}
