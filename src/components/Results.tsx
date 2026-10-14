import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  CRITERION_LABELS,
  FIELD_LABELS,
  LEVEL_LABELS,
  type Criterion,
  type Experiment,
  type Recommendation,
  type RecommendationResponse,
} from '../../shared/types';
import { ExperimentArt } from './Art';
import { api } from '../api';
function FeedbackPanel({ result, sessionId }: { result: Recommendation; sessionId: string }) {
  const [negative, setNegative] = useState(false),
    [issues, setIssues] = useState<Criterion[]>([]),
    [comment, setComment] = useState(''),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function send(satisfied: boolean) {
    setBusy(true);
    setError('');
    try {
      await api('/feedback', {
        sessionId,
        experimentId: result.experiment.id,
        satisfied,
        issues: satisfied ? [] : issues,
        comment,
      });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="feedback-done" role="status">
        <CheckCircle2 size={17} />
        고마워요! 다음 추천에 의견을 반영할게요.
      </div>
    );
  return (
    <div className="feedback-panel">
      <div className="feedback-bar">
        <span>
          <MessageCircle size={15} />이 추천, 마음에 드나요?
        </span>
        <div>
          <button disabled={busy} onClick={() => send(true)}>
            <ThumbsUp size={14} />
            만족해요
          </button>
          <button disabled={busy} onClick={() => setNegative(!negative)} aria-expanded={negative}>
            <ThumbsDown size={14} />
            아쉬워요
          </button>
        </div>
      </div>
      {negative && (
        <div className="feedback-form">
          <p>어떤 조건이 맞지 않았나요? 해당 항목의 배점만 조정해요.</p>
          <div className="issue-options">
            {result.criteria.map((c) => (
              <button
                key={c.key}
                className={issues.includes(c.key) ? 'selected' : ''}
                aria-pressed={issues.includes(c.key)}
                onClick={() =>
                  setIssues((prev) =>
                    prev.includes(c.key) ? prev.filter((x) => x !== c.key) : [...prev, c.key],
                  )
                }
              >
                {CRITERION_LABELS[c.key]}
              </button>
            ))}
          </div>
          <textarea
            aria-label="아쉬운 점 상세 의견"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder="더 자세히 알려주셔도 좋아요 (선택)"
          />
          <div className="feedback-form-actions">
            <button className="text-button" onClick={() => setNegative(false)}>
              <X size={14} />
              취소
            </button>
            <button
              className="primary-button small"
              disabled={!issues.length || busy}
              onClick={() => send(false)}
            >
              {busy ? '반영 중…' : '의견 보내기'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export default function Results({
  data,
  onOpen,
  onRestart,
}: {
  data: RecommendationResponse;
  onOpen: (e: Experiment) => void;
  onRestart: () => void;
}) {
  return (
    <section className="results-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR DISCOVERY</span>
          <h1>당신의 호기심에 맞는 실험</h1>
          <p>답변을 바탕으로 질문별 가중치를 적용해 일치율 순으로 추천했어요.</p>
        </div>
        <button className="secondary-button" onClick={onRestart}>
          <RotateCcw size={15} />
          다시 찾기
        </button>
      </div>
      <div className="result-explainer">
        <Sparkles size={19} />
        <span>
          일치율은 <strong>조건의 적합도</strong>예요. 피드백 신뢰도는 의견에 따른 지표이며, 실험의
          안전성이나 성공 확률을 뜻하지 않아요.
        </span>
      </div>
      <div className="results-list">
        {data.recommendations.map((r, i) => (
          <article className="result-card" key={`${data.sessionId}-${r.experiment.id}`}>
            <div className="result-body">
              <div className="result-art">
                <ExperimentArt field={r.experiment.field} id={r.experiment.id} />
                <span className="rank-badge">
                  {String(i + 1).padStart(2, '0')}
                  {i === 0 ? ' · 가장 잘 맞아요' : ''}
                </span>
              </div>
              <div className="result-info">
                <div className="card-tags">
                  <span className={`field-tag ${r.experiment.field}`}>
                    {FIELD_LABELS[r.experiment.field]}
                  </span>
                  <span>
                    {LEVEL_LABELS[r.experiment.level]} · {r.experiment.duration}분
                  </span>
                  {r.experiment.source === 'community' && (
                    <span className="provisional-tag">임시 배점</span>
                  )}
                </div>
                <h2>{r.experiment.title}</h2>
                <p>{r.experiment.summary}</p>
                <div className="match-reasons">
                  {r.reasons.map((s) => (
                    <span key={s}>
                      <CheckCircle2 size={13} />
                      {s}
                    </span>
                  ))}
                </div>
                {r.cautions.length > 0 && (
                  <ul className="cautions">
                    {r.cautions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
                <details className="score-details">
                  <summary>배점과 피드백 신뢰도 보기</summary>
                  <div className="criteria-table">
                    {r.criteria.map((c) => (
                      <div key={c.key}>
                        <span>
                          {c.label} <small>가중치 {c.weight}</small>
                        </span>
                        <meter min="0" max="100" value={c.score * 100} />
                        <strong>{Math.round(c.score * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                  <p>
                    피드백 신뢰도 {r.confidence}% · 누적 의견 {r.feedbackCount}개<br />
                    편집 실험은 사전값 3:1, 커뮤니티는 1:1에서 시작해 항목별 만족/불만족 의견으로
                    갱신해요.
                  </p>
                </details>
              </div>
              <div className="result-match">
                <div>
                  <strong>
                    {r.match}
                    <span>%</span>
                  </strong>
                  <small>조건 일치율</small>
                </div>
                <button className="primary-button small" onClick={() => onOpen(r.experiment)}>
                  실험 보기
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <FeedbackPanel result={r} sessionId={data.sessionId} />
          </article>
        ))}
      </div>
    </section>
  );
}
