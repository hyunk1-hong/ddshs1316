import { z } from 'zod';
import {
  CRITERIA,
  type Answers,
  type Experiment,
  type Feedback,
  type Health,
  type Profile,
  type Submission,
} from '../shared/types';
import { seeds } from '../shared/seeds';
import {
  activeCriteria,
  baseProfile,
  learn,
  provisionalProfile,
  rank,
  type Evidence,
} from '../shared/scoring';
import { answersSchema, feedbackSchema, submissionSchema } from '../shared/validation';

export const STORAGE_KEY = 'lab-browser-database-v1';
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;
type LocalRecord = {
  experiment: Experiment;
  profile: Profile;
  evidence: Evidence;
  feedbackCount: number;
};
type Session = {
  id: string;
  answers: Answers;
  experiments: string[];
  createdAt: number;
  rated: string[];
};
type State = {
  version: 1;
  records: LocalRecord[];
  sessions: Session[];
  feedback: (Feedback & { createdAt: number })[];
};
const profileSchema = z
  .object(
    Object.fromEntries(
      CRITERIA.map((key) => [key, z.record(z.string(), z.number().min(0).max(1))]),
    ),
  )
  .strict();
const stateSchema = z
  .object({
    version: z.literal(1),
    records: z.array(
      z.object({
        experiment: submissionSchema.safeExtend({
          id: z.string().min(1).max(80),
          source: z.enum(['curated', 'community']),
          createdAt: z.iso.datetime(),
        }),
        profile: profileSchema,
        evidence: z.record(
          z.string(),
          z.object({ positive: z.number().int().min(0), negative: z.number().int().min(0) }),
        ),
        feedbackCount: z.number().int().min(0),
      }),
    ),
    sessions: z.array(
      z.object({
        id: z.uuid(),
        answers: answersSchema,
        experiments: z.array(z.string()),
        createdAt: z.number(),
        rated: z.array(z.string()),
      }),
    ),
    feedback: z.array(feedbackSchema.safeExtend({ createdAt: z.number() })),
  })
  .strict();
const freshState = (): State => ({
  version: 1,
  records: seeds.map((experiment) => ({
    experiment: structuredClone(experiment),
    profile: baseProfile(experiment),
    evidence: {},
    feedbackCount: 0,
  })),
  sessions: [],
  feedback: [],
});
function decode(raw: string): State {
  try {
    return stateSchema.parse(JSON.parse(raw)) as State;
  } catch {
    throw new Error(
      '저장된 실험 데이터를 읽지 못했어요. 브라우저 데이터를 지우기 전에 기존 정보를 백업해 주세요.',
    );
  }
}
function browserStorage(): StorageAdapter | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

// The standalone file uses the same validation and scoring as the server, with personal browser storage.
export class BrowserStore {
  private state: State;
  private storage: StorageAdapter | undefined;
  constructor(storage: StorageAdapter | undefined = browserStorage()) {
    this.storage = storage;
    let raw: string | null = null;
    try {
      raw = storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      this.storage = undefined;
    }
    this.state = raw === null ? freshState() : decode(raw);
    // Detect blocked file:// storage up front so the UI can explain session-only operation.
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      this.storage = undefined;
    }
  }
  private current(): State {
    if (this.storage) {
      let raw: string | null;
      try {
        raw = this.storage.getItem(STORAGE_KEY);
      } catch {
        throw new Error('브라우저 저장소에 접근하지 못했어요. 저장소 설정을 확인해 주세요.');
      }
      if (raw !== null) this.state = decode(raw);
    }
    return this.state;
  }
  private save(next: State) {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        '브라우저 저장 공간이 부족하거나 저장이 차단되었어요. 입력 내용은 반영하지 않았습니다.',
      );
    }
    this.state = next;
  }
  health(): Health {
    return {
      status: 'ok',
      aiEnabled: false,
      experimentCount: this.current().records.length,
      storage: 'browser',
      persistent: !!this.storage,
    };
  }
  list() {
    return this.current().records.map((r) => ({
      ...structuredClone(r.experiment),
      feedbackCount: r.feedbackCount,
    }));
  }
  get(id: string): Experiment {
    const row = this.current().records.find((r) => r.experiment.id === id);
    if (!row) throw new Error('실험을 찾을 수 없어요.');
    return structuredClone(row.experiment);
  }
  recommend(input: unknown) {
    const answers = answersSchema.parse(input),
      next = structuredClone(this.current());
    const recommendations = next.records
      .map((r) => rank(r.experiment, r.profile, r.evidence, answers, r.feedbackCount))
      .sort(
        (a, b) =>
          b.match - a.match ||
          b.confidence - a.confidence ||
          a.experiment.id.localeCompare(b.experiment.id),
      )
      .slice(0, 6);
    const sessionId = crypto.randomUUID();
    next.sessions = next.sessions
      .filter((s) => s.createdAt >= Date.now() - 7 * 86400000)
      .slice(-99);
    next.sessions.push({
      id: sessionId,
      answers,
      experiments: recommendations.map((r) => r.experiment.id),
      createdAt: Date.now(),
      rated: [],
    });
    this.save(next);
    return { sessionId, answers, recommendations };
  }
  feedback(input: unknown) {
    const feedback = feedbackSchema.parse(input),
      next = structuredClone(this.current());
    const session = next.sessions.find((s) => s.id === feedback.sessionId);
    if (!session || session.createdAt < Date.now() - 7 * 86400000)
      throw new Error('추천이 만료되었어요. 설문을 다시 진행해 주세요.');
    if (!session.experiments.includes(feedback.experimentId))
      throw new Error('이 추천 결과에 포함된 실험만 평가할 수 있어요.');
    if (session.rated.includes(feedback.experimentId))
      throw new Error('이미 이 실험에 대한 의견을 남겼어요.');
    if (feedback.issues.some((key) => !activeCriteria(session.answers).includes(key)))
      throw new Error('응답한 질문에 대해서만 의견을 남길 수 있어요.');
    const record = next.records.find((r) => r.experiment.id === feedback.experimentId)!;
    learn(record.profile, record.evidence, session.answers, feedback.satisfied, feedback.issues);
    record.feedbackCount++;
    session.rated.push(feedback.experimentId);
    next.feedback.push({ ...feedback, createdAt: Date.now() });
    this.save(next);
    return { message: '이 브라우저의 다음 추천에 의견을 반영했어요.' };
  }
  submit(input: unknown) {
    const submission: Submission = submissionSchema.parse(input),
      next = structuredClone(this.current());
    const experiment: Experiment = {
      ...submission,
      id: crypto.randomUUID(),
      source: 'community',
      createdAt: new Date().toISOString(),
    };
    const profile = provisionalProfile(experiment, next.records);
    next.records.push({ experiment, profile, evidence: {}, feedbackCount: 0 });
    this.save(next);
    return structuredClone(experiment);
  }
  handle(path: string, body?: unknown): unknown {
    try {
      if (path === '/health' && body === undefined) return this.health();
      if (path === '/experiments' && body === undefined) return { experiments: this.list() };
      if (path === '/experiments' && body !== undefined) return { experiment: this.submit(body) };
      if (path === '/recommendations' && body !== undefined) return this.recommend(body);
      if (path === '/feedback' && body !== undefined) return this.feedback(body);
      const match = path.match(/^\/experiments\/([^/]+)(\/explain)?$/);
      if (match) {
        const experiment = this.get(match[1]);
        if (match[2] && body !== undefined) {
          z.object({ question: z.string().trim().max(1000).default('') })
            .strict()
            .parse(body);
          return {
            text: experiment.principle,
            source: 'guide',
            message:
              '개인 API 키가 없어 기본 실험 가이드를 제공합니다. 첫 화면에서 개인 GPT API 키를 입력하면 질문할 수 있어요.',
          };
        }
        if (!match[2] && body === undefined) return { experiment };
      }
      throw new Error('요청한 기능을 찾을 수 없어요.');
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new Error('입력 내용을 확인해 주세요. 필수 항목과 답변 조합이 올바른지 확인하세요.');
      throw error;
    }
  }
}
