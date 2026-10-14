import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  Check,
  FlaskConical,
  Globe2,
  Leaf,
  Sparkles,
} from 'lucide-react';
import type { Answers, RecommendationResponse } from '../../shared/types';
import { getQuestions } from '../../shared/questions';
import { api } from '../api';
const icons = { flask: FlaskConical, atom: Atom, globe: Globe2, leaf: Leaf, sparkles: Sparkles };
export default function Quiz({
  onComplete,
  onExit,
}: {
  onComplete: (r: RecommendationResponse) => void;
  onExit: () => void;
}) {
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const questions = getQuestions(answers),
    q = questions[step];
  const current = answers[q.key];
  const selected = (value: string) =>
    Array.isArray(current) ? current.includes(value as never) : current === value;
  const valid = Array.isArray(current) ? current.length > 0 : !!current;
  function select(value: string) {
    setAnswers((prev) => {
      const next = {
        ...prev,
        [q.key]: q.multiple
          ? selected(value)
            ? (current as string[]).filter((x) => x !== value)
            : [...(Array.isArray(current) ? current : []), value]
          : value,
      };
      if (q.key === 'field') delete next.focus;
      return next as Partial<Answers>;
    });
    setError('');
  }
  async function next() {
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      onComplete(await api<RecommendationResponse>('/recommendations', answers));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="quiz-page">
      <button className="text-button" onClick={onExit}>
        <ArrowLeft size={16} />
        실험 찾기로 돌아가기
      </button>
      <div className="quiz-shell">
        <div className="quiz-top">
          <span className="eyebrow">나를 위한 실험 찾기</span>
          <span>
            {step + 1} / {questions.length}
          </span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
        </div>
        <div className="quiz-heading" key={q.key}>
          <span className="step-label">
            QUESTION {String(step + 1).padStart(2, '0')}
            {q.key === 'focus' && ' · 맞춤 질문'}
          </span>
          <h1>{q.title}</h1>
          <p>{q.description}</p>
        </div>
        <div className="answer-options" role="group" aria-label={q.title}>
          {q.options.map((option) => {
            const Icon = icons[option.icon as keyof typeof icons];
            return (
              <button
                key={option.value}
                className={`answer-option ${selected(option.value) ? 'selected' : ''}`}
                aria-pressed={selected(option.value)}
                aria-label={option.label}
                onClick={() => select(option.value)}
              >
                {Icon && (
                  <span className="option-icon">
                    <Icon size={24} />
                  </span>
                )}
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
                <span className={`option-radio ${q.multiple ? 'square' : ''}`}>
                  {selected(option.value) && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="quiz-actions">
          <button
            className="secondary-button"
            disabled={step === 0 || busy}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} />
            이전
          </button>
          <button className="primary-button" disabled={!valid || busy} onClick={next}>
            {busy
              ? '추천을 찾고 있어요…'
              : step === questions.length - 1
                ? '맞춤 실험 보기'
                : '다음 질문'}
            <ArrowRight size={17} />
          </button>
        </div>
        <p className="quiz-footnote">
          답변은 추천과 피드백 학습에 사용되며, 이름이나 연락처는 수집하지 않아요.
        </p>
      </div>
    </section>
  );
}
