export const FIELDS = ['chemistry', 'physics', 'biology', 'earth'] as const;
export type Field = (typeof FIELDS)[number];
export const FIELD_LABELS: Record<Field, string> = {
  chemistry: '화학',
  physics: '물리',
  biology: '생명과학',
  earth: '지구과학',
};
export const LEVEL_LABELS = { beginner: '입문', intermediate: '기초', advanced: '심화' } as const;
export type Level = keyof typeof LEVEL_LABELS;
export const EQUIPMENT = {
  household: '생활 속 준비물',
  scale: '전자저울',
  thermometer: '온도계',
  meter: '멀티미터',
  microscope: '현미경',
} as const;
export type Equipment = keyof typeof EQUIPMENT;
export const CRITERIA = [
  'field',
  'goal',
  'level',
  'time',
  'budget',
  'equipment',
  'location',
  'focus',
] as const;
export type Criterion = (typeof CRITERIA)[number];
export const CRITERION_LABELS: Record<Criterion, string> = {
  field: '관심 분야',
  goal: '탐구 목적',
  level: '난이도',
  time: '실험 시간',
  budget: '예산',
  equipment: '준비물',
  location: '실험 장소',
  focus: '세부 관심사',
};
export type Answers = {
  field: Field | 'any';
  goal: 'observe' | 'measure' | 'compare';
  level: Level;
  time: '30' | '60' | '120';
  budget: '5000' | '15000' | '30000';
  equipment: Equipment[];
  location: 'home' | 'school';
  focus?: string;
};
export type Experiment = {
  id: string;
  title: string;
  summary: string;
  field: Field;
  level: Level;
  goal: Answers['goal'];
  duration: number;
  budget: number;
  equipment: Equipment[];
  locations: Answers['location'][];
  focus: string;
  materials: string[];
  steps: string[];
  safety: string;
  principle: string;
  author: string;
  source: 'curated' | 'community';
  references: string[];
  createdAt: string;
};
export type Profile = Record<Criterion, Record<string, number>>;
export type CriterionMatch = {
  key: Criterion;
  label: string;
  score: number;
  weight: number;
  confidence: number;
};
export type Recommendation = {
  experiment: Experiment;
  match: number;
  confidence: number;
  criteria: CriterionMatch[];
  reasons: string[];
  cautions: string[];
  feedbackCount: number;
};
export type RecommendationResponse = { sessionId: string; recommendations: Recommendation[] };
export type Feedback = {
  sessionId: string;
  experimentId: string;
  satisfied: boolean;
  issues: Criterion[];
  comment?: string;
};
export type Submission = Omit<Experiment, 'id' | 'createdAt' | 'source'>;
export type Health = { status: string; aiEnabled: boolean; experimentCount: number };
