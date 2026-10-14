import { ArrowUpRight, Bookmark, Clock3, Coins, FlaskConical } from 'lucide-react';
import type { Experiment } from '../../shared/types';
import { FIELD_LABELS, LEVEL_LABELS } from '../../shared/types';
import { ExperimentArt } from './Art';
export default function ExperimentCard({
  experiment: e,
  saved,
  onSave,
  onOpen,
}: {
  experiment: Experiment;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="experiment-card">
      <div className="card-art">
        <button className="art-open" onClick={onOpen} aria-label={`${e.title} 자세히 보기`}>
          <ExperimentArt field={e.field} id={e.id} />
        </button>
        <span className="image-label">
          <FlaskConical size={12} />
          {e.source === 'community' ? '커뮤니티 · 임시 배점' : '실험 가이드'}
        </span>
        <button
          className={`save-button ${saved ? 'saved' : ''}`}
          onClick={onSave}
          aria-label={`${e.title} ${saved ? '저장 취소' : '저장'}`}
          aria-pressed={saved}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <div className="card-tags">
          <span className={`field-tag ${e.field}`}>{FIELD_LABELS[e.field]}</span>
          <span>{LEVEL_LABELS[e.level]}</span>
        </div>
        <button className="card-title" onClick={onOpen}>
          {e.title}
          <ArrowUpRight size={18} />
        </button>
        <p>{e.summary}</p>
        <div className="card-meta">
          <span>
            <Clock3 size={14} />
            {e.duration}분
          </span>
          <span>
            <Coins size={14} />
            {e.budget.toLocaleString('ko-KR')}원 내외
          </span>
        </div>
      </div>
    </article>
  );
}
