import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Clock3,
  Coins,
  ExternalLink,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { Experiment } from '../../shared/types';
import { EQUIPMENT, FIELD_LABELS, LEVEL_LABELS } from '../../shared/types';
import { api } from '../api';
import { ExperimentArt } from './Art';
export default function Detail({
  experiment: e,
  saved,
  onSave,
  onClose,
}: {
  experiment: Experiment;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [question, setQuestion] = useState(''),
    [reply, setReply] = useState<{ text: string; source: string; message: string } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  async function ask() {
    setBusy(true);
    setError('');
    try {
      setReply(await api(`/experiments/${e.id}/explain`, { question }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="detail-modal"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="detail-title"
    >
      <div className="detail-banner">
        <ExperimentArt field={e.field} id={`${e.id}-detail`} />
        <button className="modal-close" onClick={onClose} aria-label="실험 상세 닫기">
          <X size={20} />
        </button>
      </div>
      <div className="detail-content">
        <div className="card-tags">
          <span className={`field-tag ${e.field}`}>{FIELD_LABELS[e.field]}</span>
          <span>{LEVEL_LABELS[e.level]}</span>
          <span>{e.source === 'community' ? '커뮤니티 등록 · 검토 전' : '편집 가이드'}</span>
        </div>
        <h1 id="detail-title">{e.title}</h1>
        <p className="detail-summary">{e.summary}</p>
        <div className="detail-meta">
          <span>
            <Clock3 size={16} />
            {e.duration}분
          </span>
          <span>
            <Coins size={16} />
            {e.budget.toLocaleString('ko-KR')}원 내외
          </span>
          <button className="text-button" onClick={onSave}>
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            {saved ? '저장됨' : '저장하기'}
          </button>
        </div>
        {e.source === 'community' && (
          <div className="community-note">
            사용자가 등록한 실험이에요. 유사 실험을 참고한 임시 배점을 사용하며, 실행 전 교사에게
            내용과 안전성을 확인해 주세요.
          </div>
        )}
        <div className="safety-box">
          <ShieldCheck size={21} />
          <div>
            <h3>실험 전, 안전부터 확인해요</h3>
            <p>{e.safety}</p>
          </div>
        </div>
        <section>
          <h2>
            준비물 <small>한 번에 챙겨요</small>
          </h2>
          <ul className="material-list">
            {e.materials.map((m, i) => (
              <li key={i}>
                <Check size={14} />
                {m}
              </li>
            ))}
          </ul>
          <p className="muted">
            필요 도구: {e.equipment.map((t) => EQUIPMENT[t]).join(', ')} ·{' '}
            {e.locations.map((x) => (x === 'home' ? '집' : '학교')).join(' / ')}
          </p>
        </section>
        <section>
          <h2>차근차근 실험하기</h2>
          <ol className="steps-list">
            {e.steps.map((s, i) => (
              <li key={i}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <p>{s}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="principle-box">
          <h2>
            이 실험 속 과학 원리
            <ArrowUpRight size={19} />
          </h2>
          <p>{e.principle}</p>
        </section>
        <section className="ai-box">
          <div className="ai-heading">
            <Sparkles size={20} />
            <h2>원리가 더 궁금하다면</h2>
            <span>AI 학습 도우미</span>
          </div>
          <p>GPT에게 실험 원리나 통제 변인을 물어보세요. 키가 없으면 기본 가이드로 안내해요.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <input
              aria-label="GPT에게 실험 질문"
              placeholder="예: 어떤 변인을 일정하게 유지해야 하나요?"
              value={question}
              maxLength={1000}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button className="primary-button small" disabled={busy} type="submit">
              <Send size={15} />
              {busy ? '생각하는 중…' : '질문하기'}
            </button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {reply && (
            <div className="ai-reply" role="status">
              <strong>{reply.source === 'gpt' ? 'GPT 설명' : '기본 가이드'}</strong>
              <p>{reply.text}</p>
              <small>{reply.message}</small>
            </div>
          )}
        </section>
        <footer className="detail-footer">
          <span>등록: {e.author}</span>
          <div>
            {e.references.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                참고 출처 {i + 1}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
