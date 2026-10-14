import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { EQUIPMENT, FIELD_LABELS, LEVEL_LABELS, type Answers } from '../../shared/types';
import { getQuestions } from '../../shared/questions';
import type { Topic, TopicResponse } from '../../shared/topics';
import { browserAi } from '../browser-ai';
import { api } from '../api';
import GptKey from './GptKey';
function TopicCard({ topic }: { topic: Topic }) {
  return (
    <article className="topic-card">
      <div className="card-tags">
        <span className={`field-tag ${topic.field}`}>{FIELD_LABELS[topic.field]}</span>
        <span>GPT 제안 · 검토 전</span>
      </div>
      <h3>{topic.title}</h3>
      <p className="topic-question">{topic.researchQuestion}</p>
      <div className="topic-meta">
        <span>
          {LEVEL_LABELS[topic.level]} · 총 {topic.duration}분
        </span>
        <span>소모품 약 {topic.budget.toLocaleString('ko-KR')}원</span>
        <span>{topic.equipment.map((e) => EQUIPMENT[e]).join(' · ')}</span>
      </div>
      <ul className="topic-fit">
        {topic.fitReasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <details className="topic-details">
        <summary>가설·준비물·진행 방법 보기</summary>
        <h4>가설과 변인</h4>
        <p>{topic.hypothesis}</p>
        <dl>
          <div>
            <dt>조작 변인</dt>
            <dd>{topic.variables.independent}</dd>
          </div>
          <div>
            <dt>종속 변인</dt>
            <dd>{topic.variables.dependent}</dd>
          </div>
          <div>
            <dt>통제 변인</dt>
            <dd>{topic.variables.controlled.join(' · ')}</dd>
          </div>
        </dl>
        <h4>준비물</h4>
        <ul>
          {topic.materials.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        <h4>진행 방법</h4>
        {topic.measurement !== null && (
          <p>
            각 조건을 {topic.repetitions}회씩 반복해요. 반복과 정리 시간을 총 시간에 포함했어요.
          </p>
        )}
        <ol>
          {topic.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <h4>기록과 결과 해석</h4>
        <p>{topic.analysis}</p>
        <h4>안전 주의사항</h4>
        <p>{topic.safety}</p>
      </details>
    </article>
  );
}
export default function TopicPanel({
  answers,
  serverAiEnabled,
}: {
  answers: Answers;
  serverAiEnabled: boolean;
}) {
  const personalAi = useSyncExternalStore(browserAi.subscribe, browserAi.hasKey, () => false);
  const [result, setResult] = useState<TopicResponse | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function generate() {
    if (busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await api<TopicResponse>('/topics', answers);
      if (active.current) setResult(response);
    } catch (e) {
      if (active.current) setError((e as Error).message);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  const available = personalAi || serverAiEnabled;
  return (
    <section className="topic-panel" aria-labelledby="topic-panel-title" aria-busy={busy}>
      <div className="topic-panel-heading">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} /> NEW IDEAS WITH GPT
          </span>
          <h2 id="topic-panel-title">등록된 실험 밖에서, 새로운 탐구 찾기</h2>
          <p>
            선택한 조건과 기존 실험 목록을 GPT에 전달해, 다른 탐구 대상·변인의 주제를 최대 3개
            제안받아요.
          </p>
        </div>
        <button className="primary-button" onClick={generate} disabled={busy || !available}>
          {result ? <RefreshCw size={16} /> : <Sparkles size={16} />}
          {busy
            ? '새 주제를 설계하고 있어요…'
            : result
              ? '다른 새 주제 추천받기'
              : 'GPT로 새 주제 추천받기'}
          {!busy && <ArrowRight size={16} />}
        </button>
      </div>
      <details className="topic-conditions">
        <summary>추천에 사용할 조건 보기</summary>
        <dl>
          {getQuestions(answers).map((q) => (
            <div key={q.key}>
              <dt>{q.title}</dt>
              <dd>
                {q.options
                  .filter((o) =>
                    Array.isArray(answers[q.key])
                      ? (answers[q.key] as string[]).includes(o.value)
                      : answers[q.key] === o.value,
                  )
                  .map((o) => o.label)
                  .join(' · ')}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      {!available && <GptKey />}
      <p className="topic-note">
        버튼을 누를 때 GPT 요청과 사용 비용이 발생할 수 있어요. 새 주제는 실행 전 검토가 필요한
        설계안이며, 일치율·피드백 신뢰도 없이 표시해요. 제목 중복과 조건 수치를 확인하지만 의미상
        유사성·절차의 타당성은 교사와 확인해 주세요.
      </p>
      {busy && (
        <p className="topic-status" role="status">
          답변과 기존 목록을 바탕으로 새 주제를 만들고 있어요. 최대 1분 정도 걸릴 수 있어요.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <p className="topic-status" role="status">
            {result.topics.length}개의 새 주제를 제안받았어요.{' '}
            {result.excludedCount > 0 &&
              `기존 제목과 겹치거나 조건을 벗어난 후보 ${result.excludedCount}개는 제외했어요.`}
          </p>
          <p className="topic-note">{result.message}</p>
          <div className="topic-grid">
            {result.topics.map((t) => (
              <TopicCard key={t.title} topic={t} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
