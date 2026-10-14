import {
  CRITERIA,
  CRITERION_LABELS,
  EQUIPMENT,
  type Answers,
  type Criterion,
  type Experiment,
  type Profile,
  type Recommendation,
} from '../shared/types';
import { FOCUS_OPTIONS } from '../shared/questions';
export const WEIGHTS: Record<Criterion, number> = {
  field: 5,
  goal: 4,
  level: 3,
  time: 3,
  budget: 2,
  equipment: 4,
  location: 4,
  focus: 2,
};
export type Evidence = Record<string, { positive: number; negative: number }>;
export const answerKey = (answers: Answers, criterion: Criterion): string =>
  criterion === 'equipment'
    ? [...answers.equipment].sort().join('|')
    : String(answers[criterion] ?? '');
const levels = ['beginner', 'intermediate', 'advanced'];
export function baseProfile(e: Experiment): Profile {
  const tools = Object.keys(EQUIPMENT);
  const equipment: Record<string, number> = {};
  for (let mask = 1; mask < 1 << tools.length; mask++) {
    const available = tools.filter((_, i) => mask & (1 << i));
    equipment[available.sort().join('|')] =
      e.equipment.filter((x) => available.includes(x)).length / e.equipment.length;
  }
  return {
    field: Object.fromEntries(
      ['chemistry', 'physics', 'biology', 'earth', 'any'].map((x) => [
        x,
        x === 'any' || x === e.field ? 1 : 0.1,
      ]),
    ),
    goal: Object.fromEntries(
      ['observe', 'measure', 'compare'].map((x) => [x, x === e.goal ? 1 : 0.45]),
    ),
    level: Object.fromEntries(
      levels.map((x, i) => [x, Math.max(0.2, 1 - Math.abs(i - levels.indexOf(e.level)) * 0.4)]),
    ),
    time: Object.fromEntries(
      ['30', '60', '120'].map((x) => [x, Math.min(1, Number(x) / e.duration)]),
    ),
    budget: Object.fromEntries(
      ['5000', '15000', '30000'].map((x) => [x, Math.min(1, Number(x) / e.budget)]),
    ),
    equipment,
    location: Object.fromEntries(
      ['home', 'school'].map((x) => [x, e.locations.includes(x as Answers['location']) ? 1 : 0]),
    ),
    focus: Object.fromEntries(
      Object.values(FOCUS_OPTIONS)
        .flat()
        .map((x) => [x.value, x.value === e.focus ? 1 : 0.2]),
    ),
  };
}
export function provisionalProfile(
  e: Experiment,
  existing: { experiment: Experiment; profile: Profile }[],
): Profile {
  const own = baseProfile(e);
  const neighbors = existing
    .map((x) => ({
      ...x,
      distance:
        Number(x.experiment.field !== e.field) * 5 +
        Number(x.experiment.goal !== e.goal) * 2 +
        Math.abs(levels.indexOf(x.experiment.level) - levels.indexOf(e.level)) +
        Math.abs(x.experiment.duration - e.duration) / 60,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  for (const key of CRITERIA)
    for (const option of Object.keys(own[key])) {
      if (neighbors.length)
        own[key][option] =
          own[key][option] * 0.85 +
          (neighbors.reduce((sum, n) => sum + (n.profile[key][option] ?? own[key][option]), 0) /
            neighbors.length) *
            0.15;
    }
  return own;
}
export function activeCriteria(answers: Answers): Criterion[] {
  return CRITERIA.filter((key) => key !== 'focus' || answers.field !== 'any');
}
export function rank(
  experiment: Experiment,
  profile: Profile,
  evidence: Evidence,
  answers: Answers,
  feedbackCount: number,
): Recommendation {
  const prior =
    experiment.source === 'curated' ? { positive: 3, negative: 1 } : { positive: 1, negative: 1 };
  const criteria = activeCriteria(answers).map((key) => {
    const option = answerKey(answers, key),
      seen = evidence[`${key}:${option}`] ?? { positive: 0, negative: 0 };
    return {
      key,
      label: CRITERION_LABELS[key],
      weight: WEIGHTS[key],
      score: profile[key][option] ?? 0,
      confidence:
        (prior.positive + seen.positive) /
        (prior.positive + prior.negative + seen.positive + seen.negative),
    };
  });
  const denominator = criteria.reduce((s, c) => s + c.weight, 0);
  const reasons = criteria
    .filter((c) => c.score >= 0.85)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => `${c.label}이 희망 조건과 잘 맞아요`);
  const cautions: string[] = [];
  if (experiment.duration > Number(answers.time))
    cautions.push(`예상 시간 ${experiment.duration}분으로 선택한 시간을 초과해요`);
  if (experiment.budget > Number(answers.budget))
    cautions.push(`소모품 예산 약 ${experiment.budget.toLocaleString('ko-KR')}원이 필요해요`);
  const missing = experiment.equipment.filter((x) => !answers.equipment.includes(x));
  if (missing.length) cautions.push(`추가 준비물: ${missing.map((x) => EQUIPMENT[x]).join(', ')}`);
  if (!experiment.locations.includes(answers.location))
    cautions.push('선택한 장소에서는 권장하지 않아요. 학교에서 교사와 함께 진행하세요');
  return {
    experiment,
    match: Math.round((criteria.reduce((s, c) => s + c.score * c.weight, 0) / denominator) * 100),
    confidence: Math.round(
      (criteria.reduce((s, c) => s + c.confidence * c.weight, 0) / denominator) * 100,
    ),
    criteria,
    reasons,
    cautions,
    feedbackCount,
  };
}
export function learn(
  profile: Profile,
  evidence: Evidence,
  answers: Answers,
  satisfied: boolean,
  issues: Criterion[],
): void {
  for (const key of satisfied ? activeCriteria(answers) : issues) {
    const option = answerKey(answers, key),
      cell = `${key}:${option}`,
      current = profile[key][option] ?? 0;
    profile[key][option] = satisfied
      ? Math.min(1, current + 0.08 * (1 - current))
      : Math.max(0, current * 0.85);
    const seen = evidence[cell] ?? { positive: 0, negative: 0 };
    if (satisfied) seen.positive++;
    else seen.negative++;
    evidence[cell] = seen;
  }
}
