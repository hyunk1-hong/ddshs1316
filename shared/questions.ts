import type { Answers, Criterion, Field } from './types';
export type Question = {
  key: Criterion;
  title: string;
  description: string;
  options: { value: string; label: string; hint: string; icon?: string }[];
  multiple?: boolean;
};
const common: Question[] = [
  {
    key: 'field',
    title: '어떤 과학이 궁금한가요?',
    description: '지금 가장 호기심이 가는 분야를 선택해 주세요.',
    options: [
      { value: 'chemistry', label: '화학', hint: '물질이 만나 만드는 변화', icon: 'flask' },
      { value: 'physics', label: '물리', hint: '움직임과 에너지의 원리', icon: 'atom' },
      { value: 'biology', label: '생명과학', hint: '살아 있는 것들의 비밀', icon: 'leaf' },
      { value: 'earth', label: '지구과학', hint: '우리 행성과 자연의 흐름', icon: 'globe' },
      {
        value: 'any',
        label: '어떤 분야든 좋아요',
        hint: '새로운 발견에 열려 있어요',
        icon: 'sparkles',
      },
    ],
  },
  {
    key: 'goal',
    title: '실험으로 무엇을 해보고 싶나요?',
    description: '탐구 목적에 따라 어울리는 실험이 달라져요.',
    options: [
      { value: 'observe', label: '변화를 직접 관찰하기', hint: '눈으로 보고 과학 원리 이해하기' },
      { value: 'measure', label: '데이터를 측정하기', hint: '숫자와 그래프로 원리 확인하기' },
      { value: 'compare', label: '조건을 바꾸어 비교하기', hint: '변인 통제로 가설 검증하기' },
    ],
  },
  {
    key: 'level',
    title: '어느 정도 난이도를 원하나요?',
    description: '나에게 맞는 속도로 탐구를 시작해 보세요.',
    options: [
      { value: 'beginner', label: '입문 · 처음이어도 괜찮아요', hint: '간단한 준비물과 쉬운 과정' },
      {
        value: 'intermediate',
        label: '기초 · 원리까지 알고 싶어요',
        hint: '기본 개념과 변인 다루기',
      },
      { value: 'advanced', label: '심화 · 더 깊이 탐구할래요', hint: '정량 분석과 확장 탐구' },
    ],
  },
  {
    key: 'time',
    title: '실험에 얼마나 시간을 쓸 수 있나요?',
    description: '준비와 관찰을 포함한 시간을 알려 주세요.',
    options: [
      { value: '30', label: '30분 이내', hint: '짧고 집중적인 탐구' },
      { value: '60', label: '1시간 이내', hint: '차근차근 해볼 시간' },
      { value: '120', label: '2시간 이내', hint: '충분히 관찰하고 기록하기' },
    ],
  },
  {
    key: 'location',
    title: '어디에서 실험할 예정인가요?',
    description: '장소에 맞는 준비와 안전 안내를 드릴게요.',
    options: [
      { value: 'home', label: '집에서', hint: '일상 속 공간에서 안전하게' },
      { value: 'school', label: '학교에서', hint: '선생님과 함께하는 탐구' },
    ],
  },
  {
    key: 'equipment',
    title: '어떤 준비물을 사용할 수 있나요?',
    description:
      '사용 가능한 도구를 모두 선택해 주세요. 필요한 도구는 추천 결과에서 다시 안내해요.',
    multiple: true,
    options: [
      { value: 'household', label: '생활 속 준비물', hint: '컵, 종이, 식재료 등' },
      { value: 'scale', label: '전자저울', hint: '질량을 정밀하게 측정' },
      { value: 'thermometer', label: '온도계', hint: '온도 변화 측정' },
      { value: 'meter', label: '멀티미터', hint: '저전압 전기 회로 측정' },
      { value: 'microscope', label: '현미경', hint: '미세한 구조 관찰' },
    ],
  },
  {
    key: 'budget',
    title: '준비물 예산은 어느 정도인가요?',
    description: '이미 가지고 있는 도구의 가격은 제외한 대략적인 소모품 비용이에요.',
    options: [
      { value: '5000', label: '5,000원 이내', hint: '부담 없이 시작하기' },
      { value: '15000', label: '15,000원 이내', hint: '조금 더 다양한 준비물' },
      { value: '30000', label: '30,000원 이내', hint: '탐구에 필요한 만큼' },
    ],
  },
];
export const FOCUS_OPTIONS: Record<Field, Question['options']> = {
  chemistry: [
    { value: 'color', label: '색의 변화', hint: '눈으로 확인하는 물질의 성질' },
    { value: 'solution', label: '용액과 농도', hint: '물질이 녹는 과정 탐구' },
  ],
  physics: [
    { value: 'motion', label: '운동과 힘', hint: '물체의 움직임 이해하기' },
    { value: 'electricity', label: '전기와 회로', hint: '전압과 전류의 관계' },
  ],
  biology: [
    { value: 'cells', label: '세포와 물질 이동', hint: '생명 활동의 작은 단위' },
    { value: 'organisms', label: '생물의 활동', hint: '식물과 미생물의 변화' },
  ],
  earth: [
    { value: 'water', label: '물의 순환', hint: '증발과 응결의 과정' },
    { value: 'soil', label: '토양과 지형', hint: '땅과 물이 만드는 변화' },
  ],
};
export function getQuestions(answers: Partial<Answers>): Question[] {
  return answers.field && answers.field !== 'any'
    ? [
        ...common,
        {
          key: 'focus',
          title: `${({ chemistry: '화학', physics: '물리', biology: '생명과학', earth: '지구과학' } as const)[answers.field]}에서 더 궁금한 것은?`,
          description: '선택한 분야에 맞춰 한 가지 더 여쭤볼게요.',
          options: FOCUS_OPTIONS[answers.field],
        },
      ]
    : common;
}
