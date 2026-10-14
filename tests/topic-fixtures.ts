import type { Answers } from '../shared/types';
import type { Topic } from '../shared/topics';
export const detailedAnswers: Answers = {
  field: 'chemistry',
  goal: 'observe',
  level: 'beginner',
  time: '30',
  budget: '5000',
  equipment: ['household'],
  location: 'home',
  focus: 'color',
  supervision: 'none',
  materialsPolicy: 'food-only',
  recording: 'notes',
  output: 'principle',
};
export const topic: Topic = {
  title: '차 희석 배수에 따른 빛의 통과 관찰',
  field: 'chemistry',
  focus: 'color',
  goal: 'observe',
  level: 'beginner',
  location: 'home',
  duration: 25,
  budget: 2000,
  equipment: ['household'],
  supervision: 'none',
  materialsPolicy: 'food-only',
  recording: 'notes',
  output: 'principle',
  measurement: null,
  repetitions: 1,
  researchQuestion: '차를 물로 희석하면 흰 종이 위에서 보이는 색의 진하기가 어떻게 달라질까요?',
  hypothesis: '같은 두께로 관찰하면 희석한 차의 색이 더 옅게 보일 것으로 예상해요.',
  variables: {
    independent: '차의 희석 비율',
    dependent: '관찰한 색의 진하기',
    controlled: ['용기 모양', '관찰하는 빛과 위치'],
  },
  materials: ['미리 식힌 차와 물', '같은 모양의 투명 컵 3개', '흰 종이'],
  steps: [
    '미리 식힌 차를 같은 용기에 같은 높이로 나누어 담아요.',
    '차와 물의 비율을 다르게 하되 최종 높이는 같게 맞춰요.',
    '같은 조명에서 흰 종이 위에 놓고 색을 그림과 글로 기록해요.',
  ],
  safety:
    '가열하거나 날카로운 도구를 사용하지 않아요. 관찰에 쓴 차는 마시지 말고 물이 흐르면 바로 닦아요.',
  fitReasons: [
    '생활 속 컵과 식재료만 사용하므로 선택한 장비로 준비할 수 있어요.',
    '30분 안에 색의 변화를 관찰하며 원리를 이해할 수 있어요.',
  ],
  analysis:
    '희석 비율별 관찰 일지를 비교하고 빛의 흡수와 연결해요. 눈으로 본 색은 조명과 사람마다 달라 정밀한 농도 측정값으로 해석할 수 없어요.',
};
export const topicPayload = (topics: Topic[] = [topic]) => ({
  output: [
    { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ topics }) }] },
  ],
});
