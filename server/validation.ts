import { z } from 'zod';
import { CRITERIA, FIELDS, type Answers } from '../shared/types';
import { FOCUS_OPTIONS } from '../shared/questions';
const cleanText = (min: number, max: number) => z.string().trim().min(min).max(max);
export const answersSchema = z
  .object({
    field: z.enum([...FIELDS, 'any']),
    goal: z.enum(['observe', 'measure', 'compare']),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    time: z.enum(['30', '60', '120']),
    budget: z.enum(['5000', '15000', '30000']),
    equipment: z
      .array(z.enum(['household', 'scale', 'thermometer', 'meter', 'microscope']))
      .min(1)
      .max(5)
      .refine((x) => new Set(x).size === x.length),
    location: z.enum(['home', 'school']),
    focus: z.string().max(30).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.field === 'any' && data.focus !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['focus'],
        message: '전체 분야에는 추가 답변이 필요하지 않아요.',
      });
    if (data.field !== 'any' && !FOCUS_OPTIONS[data.field].some((o) => o.value === data.focus))
      ctx.addIssue({
        code: 'custom',
        path: ['focus'],
        message: '분야에 맞는 세부 관심사를 선택하세요.',
      });
  });
export const feedbackSchema = z
  .object({
    sessionId: z.uuid(),
    experimentId: cleanText(1, 80),
    satisfied: z.boolean(),
    issues: z
      .array(z.enum(CRITERIA))
      .max(8)
      .refine((x) => new Set(x).size === x.length),
    comment: cleanText(0, 1000).optional(),
  })
  .strict()
  .refine((d) => (d.satisfied ? d.issues.length === 0 : d.issues.length > 0), {
    message: '불만족한 항목을 하나 이상 선택하세요.',
  });
export const submissionSchema = z
  .object({
    title: cleanText(4, 80),
    summary: cleanText(10, 240),
    field: z.enum(FIELDS),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    goal: z.enum(['observe', 'measure', 'compare']),
    duration: z.number().int().min(5).max(120),
    budget: z.number().int().min(0).max(30000),
    equipment: z
      .array(z.enum(['household', 'scale', 'thermometer', 'meter', 'microscope']))
      .min(1)
      .max(5)
      .refine((x) => new Set(x).size === x.length),
    locations: z
      .array(z.enum(['home', 'school']))
      .min(1)
      .max(2)
      .refine((x) => new Set(x).size === x.length),
    focus: cleanText(1, 30),
    materials: z.array(cleanText(1, 100)).min(2).max(20),
    steps: z.array(cleanText(5, 500)).min(3).max(15),
    safety: cleanText(15, 2000),
    principle: cleanText(20, 4000),
    author: cleanText(2, 40),
    references: z
      .array(
        z
          .url()
          .max(500)
          .refine((s) => s.startsWith('https://'), { message: 'HTTPS 출처를 입력하세요.' }),
      )
      .min(1)
      .max(5),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (!FOCUS_OPTIONS[d.field].some((o) => o.value === d.focus))
      ctx.addIssue({
        code: 'custom',
        path: ['focus'],
        message: '분야에 맞는 관심사를 선택하세요.',
      });
  });
export function hasAnswers(d: unknown): d is Answers {
  return answersSchema.safeParse(d).success;
}
