import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  EQUIPMENT,
  FIELD_LABELS,
  FIELDS,
  LEVEL_LABELS,
  type Equipment,
  type Experiment,
  type Field,
  type Level,
  type Submission,
} from '../../shared/types';
import { FOCUS_OPTIONS } from '../../shared/questions';
import { api } from '../api';
export default function Submit({
  onCreated,
  onExit,
}: {
  onCreated: (e: Experiment) => void;
  onExit: () => void;
}) {
  const [stage, setStage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    field: 'chemistry' as Field,
    level: 'beginner' as Level,
    goal: 'observe' as Submission['goal'],
    duration: 30,
    budget: 5000,
    equipment: ['household'] as Equipment[],
    locations: ['home', 'school'] as Submission['locations'],
    focus: 'color',
    materials: '',
    steps: '',
    safety: '',
    principle: '',
    author: '',
    references: '',
  });
  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }
  const lines = (s: string) =>
    s
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
  async function submit() {
    if (lines(form.materials).length < 2) {
      setError('준비물은 한 줄에 하나씩, 2개 이상 입력해 주세요.');
      return;
    }
    if (lines(form.steps).length < 3) {
      setError('실험 순서는 한 줄에 한 단계씩, 3단계 이상 입력해 주세요.');
      return;
    }
    if (
      !lines(form.references).every((url) => {
        try {
          return new URL(url).protocol === 'https:';
        } catch {
          return false;
        }
      })
    ) {
      setError('참고 출처는 https://로 시작하는 올바른 주소를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api<{ experiment: Experiment }>('/experiments', {
        ...form,
        materials: lines(form.materials),
        steps: lines(form.steps),
        references: lines(form.references),
      });
      onCreated(result.experiment);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="submit-page">
      <button className="text-button" onClick={onExit}>
        <ArrowLeft size={16} />
        실험 찾기로 돌아가기
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SHARE YOUR DISCOVERY</span>
          <h1>나의 발견을, 모두의 실험으로</h1>
          <p>직접 해본 실험을 나누고 함께 더 좋은 가이드를 만들어 가요.</p>
        </div>
        <div className="submit-icon">
          <ClipboardList size={30} />
        </div>
      </div>
      <div className="submit-notice">
        <SparkleIcon />
        <div>
          <strong>등록 후에는 어떻게 되나요?</strong>
          <p>
            비슷한 실험의 배점을 참고해 임시 점수를 만들어요. 이후 추천 만족도에 따라 배점과
            신뢰도가 조정됩니다. 등록은 안전성 검증을 뜻하지 않아요.
          </p>
        </div>
      </div>
      <div className="submit-steps">
        <span className={stage === 0 ? 'active' : ''}>
          <b>1</b>실험 기본 정보
        </span>
        <div />
        <span className={stage === 1 ? 'active' : ''}>
          <b>2</b>과정과 원리
        </span>
      </div>
      <form
        className="submit-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (stage === 0) setStage(1);
          else void submit();
        }}
      >
        {stage === 0 ? (
          <>
            <h2>어떤 실험을 공유하나요?</h2>
            <div className="form-grid">
              <label className="full">
                실험 이름 <span>필수</span>
                <input
                  required
                  minLength={4}
                  maxLength={80}
                  placeholder="예: 빛의 방향에 따라 자라는 식물"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </label>
              <label className="full">
                한 줄 소개 <span>필수</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={240}
                  placeholder="무엇을 관찰하거나 비교하는 실험인가요?"
                  value={form.summary}
                  onChange={(e) => update('summary', e.target.value)}
                />
              </label>
              <label>
                과학 분야
                <select
                  value={form.field}
                  onChange={(e) => {
                    const field = e.target.value as Field;
                    setForm((prev) => ({ ...prev, field, focus: FOCUS_OPTIONS[field][0].value }));
                  }}
                >
                  {FIELDS.map((x) => (
                    <option key={x} value={x}>
                      {FIELD_LABELS[x]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                세부 관심사
                <select value={form.focus} onChange={(e) => update('focus', e.target.value)}>
                  {FOCUS_OPTIONS[form.field].map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                난이도
                <select
                  value={form.level}
                  onChange={(e) => update('level', e.target.value as Level)}
                >
                  {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                탐구 목적
                <select
                  value={form.goal}
                  onChange={(e) => update('goal', e.target.value as Submission['goal'])}
                >
                  <option value="observe">관찰</option>
                  <option value="measure">측정</option>
                  <option value="compare">조건 비교</option>
                </select>
              </label>
              <label>
                예상 시간 (분)
                <input
                  required
                  type="number"
                  min={5}
                  max={120}
                  value={form.duration}
                  onChange={(e) => update('duration', Number(e.target.value))}
                />
                <small>현재 5~120분 실험을 지원해요.</small>
              </label>
              <label>
                소모품 예산 (원)
                <input
                  required
                  type="number"
                  min={0}
                  max={30000}
                  value={form.budget}
                  onChange={(e) => update('budget', Number(e.target.value))}
                />
                <small>이미 보유한 도구의 가격은 제외해요.</small>
              </label>
              <fieldset className="full">
                <legend>
                  필요한 도구 <span>1개 이상</span>
                </legend>
                <div className="issue-options">
                  {Object.entries(EQUIPMENT).map(([v, l]) => (
                    <button
                      type="button"
                      aria-pressed={form.equipment.includes(v as Equipment)}
                      className={form.equipment.includes(v as Equipment) ? 'selected' : ''}
                      key={v}
                      onClick={() =>
                        update(
                          'equipment',
                          form.equipment.includes(v as Equipment)
                            ? form.equipment.filter((x) => x !== v)
                            : [...form.equipment, v as Equipment],
                        )
                      }
                    >
                      {form.equipment.includes(v as Equipment) && <Check size={13} />} {l}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="full">
                <legend>
                  가능한 실험 장소 <span>1개 이상</span>
                </legend>
                <div className="issue-options">
                  {(['home', 'school'] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      aria-pressed={form.locations.includes(v)}
                      className={form.locations.includes(v) ? 'selected' : ''}
                      onClick={() =>
                        update(
                          'locations',
                          form.locations.includes(v)
                            ? form.locations.filter((x) => x !== v)
                            : [...form.locations, v],
                        )
                      }
                    >
                      {v === 'home' ? '집' : '학교'}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </>
        ) : (
          <>
            <h2>누구나 따라 할 수 있게 알려주세요</h2>
            <div className="form-grid">
              <label className="full">
                준비물 <span>필수 · 2개 이상</span>
                <textarea
                  required
                  rows={3}
                  placeholder={'한 줄에 하나씩 작성해 주세요\n예: 투명한 컵 2개\n물 100mL'}
                  value={form.materials}
                  onChange={(e) => update('materials', e.target.value)}
                  maxLength={2000}
                />
              </label>
              <label className="full">
                실험 순서 <span>필수 · 3단계 이상</span>
                <textarea
                  required
                  rows={5}
                  placeholder="한 줄에 한 단계씩, 양과 시간·통제 변인을 구체적으로 적어 주세요."
                  value={form.steps}
                  onChange={(e) => update('steps', e.target.value)}
                  maxLength={7500}
                />
              </label>
              <label className="full">
                안전 주의사항 <span>필수 · 15자 이상</span>
                <textarea
                  required
                  minLength={15}
                  maxLength={2000}
                  placeholder="재료 취급, 교사 감독 필요 여부, 폐기 방법 등을 적어 주세요."
                  value={form.safety}
                  onChange={(e) => update('safety', e.target.value)}
                />
              </label>
              <label className="full">
                과학 원리와 해석 <span>필수 · 20자 이상</span>
                <textarea
                  required
                  minLength={20}
                  maxLength={4000}
                  rows={4}
                  placeholder="실험의 원리, 예상 관찰 결과와 한계를 설명해 주세요."
                  value={form.principle}
                  onChange={(e) => update('principle', e.target.value)}
                />
              </label>
              <label>
                작성자 닉네임 <span>필수</span>
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  placeholder="실명 대신 닉네임을 사용하세요"
                  value={form.author}
                  onChange={(e) => update('author', e.target.value)}
                />
              </label>
              <label>
                참고 출처 <span>필수</span>
                <textarea
                  required
                  placeholder="https://로 시작하는 출처를 한 줄에 하나씩"
                  value={form.references}
                  onChange={(e) => update('references', e.target.value)}
                  maxLength={2500}
                />
              </label>
            </div>
            <label className="accept-label">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
              />
              <span>
                안전 주의사항을 작성했으며, 등록 후 검토 전 커뮤니티 실험으로 표시됨을 이해했어요.
              </span>
            </label>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => (stage === 0 ? onExit() : setStage(0))}
          >
            <ArrowLeft size={16} />
            {stage === 0 ? '취소' : '이전'}
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={
              busy || (stage === 0 ? !form.equipment.length || !form.locations.length : !accepted)
            }
          >
            {busy ? '등록하고 있어요…' : stage === 0 ? '과정 작성하기' : '실험 등록하기'}
            {stage === 0 ? <ArrowRight size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </form>
      <p className="submit-bottom">
        <ShieldCheck size={15} />
        위험 물질, 고전압, 가압 또는 미확인 생물 배양을 포함하는 실험은 등록하지 마세요.
      </p>
    </section>
  );
}
function SparkleIcon() {
  return <CheckCircle2 size={24} />;
}
