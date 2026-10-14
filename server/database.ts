import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Answers, Experiment, Feedback, Profile, Submission } from '../shared/types';
import {
  activeCriteria,
  baseProfile,
  learn,
  provisionalProfile,
  rank,
  type Evidence,
} from './scoring';
import { seeds } from './seeds';
export class DomainError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Row = {
  id: string;
  document: string;
  profile: string;
  evidence: string;
  feedback_count: number;
};
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS experiments(id TEXT PRIMARY KEY, document TEXT NOT NULL, profile TEXT NOT NULL, evidence TEXT NOT NULL DEFAULT '{}', feedback_count INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, answers TEXT NOT NULL, experiments TEXT NOT NULL, created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), experiment_id TEXT NOT NULL REFERENCES experiments(id), satisfied INTEGER NOT NULL, issues TEXT NOT NULL, comment TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(session_id,experiment_id));`);
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO experiments(id,document,profile) VALUES(?,?,?)',
    );
    for (const e of seeds) insert.run(e.id, JSON.stringify(e), JSON.stringify(baseProfile(e)));
  }
  private rows() {
    return this.db.prepare('SELECT * FROM experiments').all() as unknown as Row[];
  }
  list() {
    return this.rows().map((r) => ({
      ...(JSON.parse(r.document) as Experiment),
      feedbackCount: r.feedback_count,
    }));
  }
  get(id: string) {
    const row = this.db.prepare('SELECT * FROM experiments WHERE id=?').get(id) as Row | undefined;
    if (!row) throw new DomainError(404, '실험을 찾을 수 없어요.');
    return JSON.parse(row.document) as Experiment;
  }
  recommend(answers: Answers) {
    const recommendations = this.rows()
      .map((r) =>
        rank(
          JSON.parse(r.document),
          JSON.parse(r.profile),
          JSON.parse(r.evidence),
          answers,
          r.feedback_count,
        ),
      )
      .sort(
        (a, b) =>
          b.match - a.match ||
          b.confidence - a.confidence ||
          a.experiment.id.localeCompare(b.experiment.id),
      )
      .slice(0, 6);
    const sessionId = randomUUID();
    this.db
      .prepare(
        'DELETE FROM sessions WHERE created_at < ? AND id NOT IN (SELECT session_id FROM feedback)',
      )
      .run(Date.now() - 7 * 86400000);
    this.db
      .prepare('INSERT INTO sessions VALUES(?,?,?,?)')
      .run(
        sessionId,
        JSON.stringify(answers),
        JSON.stringify(recommendations.map((r) => r.experiment.id)),
        Date.now(),
      );
    return { sessionId, recommendations };
  }
  feedback(input: Feedback) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const session = this.db.prepare('SELECT * FROM sessions WHERE id=?').get(input.sessionId) as
        { answers: string; experiments: string; created_at: number } | undefined;
      if (!session || session.created_at < Date.now() - 7 * 86400000)
        throw new DomainError(404, '추천이 만료되었어요. 설문을 다시 진행해 주세요.');
      if (!JSON.parse(session.experiments).includes(input.experimentId))
        throw new DomainError(400, '이 추천 결과에 포함된 실험만 평가할 수 있어요.');
      if (
        this.db
          .prepare('SELECT id FROM feedback WHERE session_id=? AND experiment_id=?')
          .get(input.sessionId, input.experimentId)
      )
        throw new DomainError(409, '이미 이 실험에 대한 의견을 남겼어요.');
      const answers = JSON.parse(session.answers) as Answers;
      if (input.issues.some((k) => !activeCriteria(answers).includes(k)))
        throw new DomainError(400, '응답한 질문에 대해서만 의견을 남길 수 있어요.');
      const row = this.db
        .prepare('SELECT * FROM experiments WHERE id=?')
        .get(input.experimentId) as Row;
      const profile = JSON.parse(row.profile) as Profile,
        evidence = JSON.parse(row.evidence) as Evidence;
      learn(profile, evidence, answers, input.satisfied, input.issues);
      this.db
        .prepare('INSERT INTO feedback VALUES(?,?,?,?,?,?,?)')
        .run(
          randomUUID(),
          input.sessionId,
          input.experimentId,
          Number(input.satisfied),
          JSON.stringify(input.issues),
          input.comment ?? '',
          Date.now(),
        );
      this.db
        .prepare(
          'UPDATE experiments SET profile=?,evidence=?,feedback_count=feedback_count+1 WHERE id=?',
        )
        .run(JSON.stringify(profile), JSON.stringify(evidence), input.experimentId);
      this.db.exec('COMMIT');
      return { message: '의견을 반영했어요. 다음 추천에 도움이 됩니다.' };
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  submit(input: Submission) {
    const experiment: Experiment = {
      ...input,
      id: randomUUID(),
      source: 'community',
      createdAt: new Date().toISOString(),
    };
    const profile = provisionalProfile(
      experiment,
      this.rows().map((r) => ({
        experiment: JSON.parse(r.document),
        profile: JSON.parse(r.profile),
      })),
    );
    this.db
      .prepare('INSERT INTO experiments(id,document,profile) VALUES(?,?,?)')
      .run(experiment.id, JSON.stringify(experiment), JSON.stringify(profile));
    return experiment;
  }
  close() {
    this.db.close();
  }
}
