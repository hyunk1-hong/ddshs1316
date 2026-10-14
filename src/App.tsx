import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Atom,
  Beaker,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  FlaskConical,
  Globe2,
  Leaf,
  Lightbulb,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  FIELD_LABELS,
  FIELDS,
  type Experiment,
  type Field,
  type Health,
  type RecommendationResponse,
} from '../shared/types';
import { api } from './api';
import { HeroArt } from './components/Art';
import ExperimentCard from './components/ExperimentCard';
import Quiz from './components/Quiz';
import Results from './components/Results';
import Detail from './components/Detail';
import Submit from './components/Submit';
type View = 'home' | 'explore' | 'saved' | 'quiz' | 'results' | 'submit';
const fieldIcons = { chemistry: FlaskConical, physics: Atom, biology: Leaf, earth: Globe2 };
function readSaved(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('lab-saved') ?? '[]');
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [view, setView] = useState<View>('home'),
    [experiments, setExperiments] = useState<Experiment[]>([]),
    [health, setHealth] = useState<Health | null>(null),
    [loadError, setLoadError] = useState(''),
    [loading, setLoading] = useState(true),
    [field, setField] = useState<Field | 'all'>('all'),
    [query, setQuery] = useState(''),
    [saved, setSaved] = useState<string[]>(readSaved),
    [detail, setDetail] = useState<Experiment | null>(null),
    [results, setResults] = useState<RecommendationResponse | null>(null),
    [toast, setToast] = useState(''),
    [mobileMenu, setMobileMenu] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mainRef = useRef<HTMLElement>(null);
  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [data, h] = await Promise.all([
        api<{ experiments: Experiment[] }>('/experiments'),
        api<Health>('/health'),
      ]);
      setExperiments(data.experiments);
      setHealth(h);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('lab-saved', JSON.stringify(saved));
    } catch {
      /* Saving remains available in this session when storage is unavailable. */
    }
  }, [saved]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [view]);
  function notify(s: string) {
    setToast(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3500);
  }
  function toggleSave(e: Experiment) {
    setSaved((prev) => (prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]));
    notify(
      saved.includes(e.id)
        ? '저장한 실험에서 삭제했어요.'
        : '실험을 저장했어요. 저장한 실험에서 다시 볼 수 있어요.',
    );
  }
  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    if (next === 'home' || next === 'explore') {
      setQuery('');
      setField('all');
    }
  }
  const filtered = experiments.filter(
    (e) =>
      (field === 'all' || e.field === field) &&
      (view !== 'saved' || saved.includes(e.id)) &&
      `${e.title} ${e.summary} ${e.materials.join(' ')} ${FIELD_LABELS[e.field]}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const visible = view === 'home' && !query && field === 'all' ? filtered.slice(0, 3) : filtered;
  const nav = [
    { view: 'home' as View, label: '실험 찾기', icon: Compass },
    { view: 'explore' as View, label: '실험 둘러보기', icon: BookOpen },
    { view: 'saved' as View, label: '저장한 실험', icon: Bookmark },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <button className="brand" onClick={() => navigate('home')} aria-label="실험실 홈">
          <span className="brand-symbol">
            <FlaskConical size={25} />
          </span>
          <span>
            실험실<small>호기심을 발견으로</small>
          </span>
        </button>
        <button
          className="mobile-close icon-button"
          onClick={() => setMobileMenu(false)}
          aria-label="메뉴 닫기"
        >
          <X size={20} />
        </button>
        <div className="sidebar-group-label">나의 탐구 공간</div>
        <nav>
          {nav.map(({ view: v, label, icon: Icon }) => (
            <button
              key={v}
              className={`nav-item ${view === v || (v === 'home' && (view === 'quiz' || view === 'results')) ? 'active' : ''}`}
              onClick={() => navigate(v)}
            >
              <Icon size={19} />
              {label}
              {v === 'saved' && saved.length > 0 && <small>{saved.length}</small>}
            </button>
          ))}
        </nav>
        <div className="nav-divider" />
        <button
          className={`nav-item ${view === 'submit' ? 'active' : ''}`}
          onClick={() => navigate('submit')}
        >
          <Plus size={19} />
          실험 등록하기<span className="new-label">NEW</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-icon">
              <Lightbulb size={22} />
              <span>✦</span>
            </div>
            <h3>
              작은 질문에서
              <br />큰 발견이 시작돼요.
            </h3>
            <p>
              당신의 실험이 누군가의
              <br />
              새로운 영감이 될 수 있어요.
            </p>
            <button onClick={() => navigate('submit')}>
              나의 실험 나누기
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" />
            함께 만드는 과학의 공간
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="sidebar-overlay"
          aria-label="메뉴 닫기"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="메뉴 열기"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span>실험실</span>
            <ChevronRight size={13} />
            <strong>
              {view === 'home'
                ? '실험 찾기'
                : view === 'explore'
                  ? '실험 둘러보기'
                  : view === 'saved'
                    ? '저장한 실험'
                    : view === 'submit'
                      ? '실험 등록하기'
                      : view === 'quiz'
                        ? '맞춤 질문'
                        : '추천 결과'}
            </strong>
          </div>
          <div className="topbar-right">
            <form
              className="top-search"
              onSubmit={(e) => {
                e.preventDefault();
                setView('explore');
              }}
            >
              <Search size={16} />
              <input
                aria-label="실험 검색"
                placeholder="궁금한 실험을 검색해 보세요"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (view !== 'home' && view !== 'explore' && view !== 'saved') setView('explore');
                }}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="검색 지우기">
                  <X size={13} />
                </button>
              )}
            </form>
            <div className="user-avatar" title="모두를 위한 실험실">
              S<span />
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} ref={mainRef}>
          {view === 'quiz' ? (
            <Quiz
              onExit={() => navigate('home')}
              onComplete={(data) => {
                setResults(data);
                setView('results');
              }}
            />
          ) : view === 'results' && results ? (
            <Results data={results} onOpen={setDetail} onRestart={() => navigate('quiz')} />
          ) : view === 'submit' ? (
            <Submit
              onExit={() => navigate('home')}
              onCreated={(e) => {
                setExperiments((prev) => [e, ...prev]);
                setView('explore');
                setQuery('');
                setField('all');
                notify('실험을 등록했어요! 임시 배점으로 추천에 참여합니다.');
                setDetail(e);
              }}
            />
          ) : (
            <>
              {view === 'home' && (
                <>
                  <div className="greeting">
                    <span className="eyebrow">A LITTLE CURIOSITY, A NEW DISCOVERY</span>
                    <p>
                      오늘은 어떤 발견을 해볼까요?<span className="greeting-spark">✦</span>
                    </p>
                  </div>
                  <section className="hero">
                    <div className="hero-copy">
                      <div className="hero-kicker">
                        <span />
                        <span>모두를 위한 과학 실험 플랫폼</span>
                      </div>
                      <h1>
                        나의 호기심이,
                        <br />
                        <em>실험이 되는 곳.</em>
                      </h1>
                      <p>
                        관심사부터 준비물까지, 몇 가지 질문에 답하면
                        <br className="desktop-break" /> 지금 나에게 딱 맞는 실험을 찾아드려요.
                      </p>
                      <button
                        className="primary-button hero-button"
                        onClick={() => navigate('quiz')}
                      >
                        나에게 맞는 실험 찾기
                        <ArrowRight size={18} />
                      </button>
                      <div className="hero-footnote">
                        <span>
                          <Check size={13} />약 2분이면 충분해요
                        </span>
                        <span>회원가입 없이 시작</span>
                      </div>
                    </div>
                    <HeroArt />
                    <span className="hero-corner-label">LET’S EXPERIMENT.</span>
                  </section>
                  <section className="how-it-works" aria-label="추천 이용 방법">
                    <div>
                      <span className="how-icon">
                        <SlidersHorizontal size={20} />
                      </span>
                      <p>
                        <strong>
                          01 <b>나의 조건 알려주기</b>
                        </strong>
                        <small>관심 분야와 탐구 환경을 선택해요</small>
                      </p>
                    </div>
                    <ChevronRight className="how-arrow" size={17} />
                    <div>
                      <span className="how-icon">
                        <Sparkles size={20} />
                      </span>
                      <p>
                        <strong>
                          02 <b>꼭 맞는 실험 발견하기</b>
                        </strong>
                        <small>조건 일치율 순으로 실험을 만나봐요</small>
                      </p>
                    </div>
                    <ChevronRight className="how-arrow" size={17} />
                    <div>
                      <span className="how-icon">
                        <Beaker size={20} />
                      </span>
                      <p>
                        <strong>
                          03 <b>실험하고 함께 성장하기</b>
                        </strong>
                        <small>후기가 쌓일수록 추천도 발전해요</small>
                      </p>
                    </div>
                  </section>
                </>
              )}
              <section className="catalog">
                <div className="section-heading">
                  <div>
                    {view === 'home' ? (
                      <h2>
                        어떤 실험부터 시작할까요?<span className="tiny-spark">✳</span>
                      </h2>
                    ) : (
                      <>
                        <span className="eyebrow">
                          {view === 'saved' ? 'MY COLLECTION' : 'EXPLORE THE POSSIBILITIES'}
                        </span>
                        <h1>
                          {view === 'saved'
                            ? '다시 만나고 싶은 실험'
                            : '호기심을 따라, 실험 둘러보기'}
                        </h1>
                      </>
                    )}
                    <p>
                      {view === 'saved'
                        ? '저장한 실험은 이 브라우저에서 언제든 다시 볼 수 있어요.'
                        : '작은 준비물로 시작하는 흥미로운 과학 이야기'}
                    </p>
                  </div>
                  {view === 'home' && (
                    <button className="text-button" onClick={() => navigate('explore')}>
                      모든 실험 보기
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
                <div className="catalog-toolbar">
                  <div className="field-filters" role="group" aria-label="과학 분야 필터">
                    <button
                      className={field === 'all' ? 'active' : ''}
                      onClick={() => setField('all')}
                    >
                      <span>✦</span>전체
                    </button>
                    {FIELDS.map((f) => {
                      const Icon = fieldIcons[f];
                      return (
                        <button
                          key={f}
                          className={field === f ? 'active' : ''}
                          onClick={() => setField(f)}
                        >
                          <Icon size={15} />
                          {FIELD_LABELS[f]}
                        </button>
                      );
                    })}
                  </div>
                  <span className="catalog-count">
                    {loading ? '불러오는 중…' : `${filtered.length}개의 실험`}{' '}
                    <ArrowDown size={12} />
                  </span>
                </div>
                {loadError ? (
                  <div className="empty-state" role="alert">
                    <FlaskConical size={36} />
                    <h3>실험을 불러오지 못했어요</h3>
                    <p>{loadError}</p>
                    <button className="primary-button" onClick={() => void load()}>
                      다시 시도
                    </button>
                  </div>
                ) : loading ? (
                  <div className="cards-grid" aria-label="실험 불러오는 중">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="skeleton-card" />
                    ))}
                  </div>
                ) : visible.length ? (
                  <div className="cards-grid">
                    {visible.map((e) => (
                      <ExperimentCard
                        key={e.id}
                        experiment={e}
                        saved={saved.includes(e.id)}
                        onSave={() => toggleSave(e)}
                        onOpen={() => setDetail(e)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Search size={32} />
                    <h3>
                      {view === 'saved' && !query
                        ? '아직 저장한 실험이 없어요'
                        : '조건에 맞는 실험이 없어요'}
                    </h3>
                    <p>
                      {view === 'saved' && !query
                        ? '실험 카드의 책갈피를 눌러 나만의 탐구 목록을 만들어 보세요.'
                        : '다른 검색어를 입력하거나 분야 필터를 바꿔 보세요.'}
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setField('all');
                        setQuery('');
                        if (view === 'saved') navigate('explore');
                      }}
                    >
                      {view === 'saved' ? '실험 둘러보기' : '필터 초기화'}
                    </button>
                  </div>
                )}
              </section>
              {view === 'home' && (
                <div className="community-strip">
                  <div className="community-strip-icon">
                    <Leaf size={23} />
                  </div>
                  <div>
                    <strong>과학은 함께할 때 더 재미있으니까.</strong>
                    <p>당신이 해본 실험을 나누고, 다음 탐구자의 시작을 도와주세요.</p>
                  </div>
                  <button className="text-button" onClick={() => navigate('submit')}>
                    실험 공유하기
                    <ArrowUpRightIcon />
                  </button>
                </div>
              )}
              <footer className="page-footer">
                <span>
                  실험실 <b>·</b> 누구나 탐구자가 되는 곳
                </span>
                <span>
                  <ShieldIcon />
                  실험 전 안전 수칙을 꼭 확인하세요
                </span>
              </footer>
            </>
          )}
        </main>
        <div className="bottom-status">
          <span>
            <span className="status-dot" />
            {health?.aiEnabled ? 'GPT 학습 도우미 연결됨' : '실험 가이드와 함께 탐구해요'}
          </span>
          <span>MADE FOR CURIOUS MINDS</span>
        </div>
      </div>
      {detail && (
        <Detail
          key={detail.id}
          experiment={detail}
          saved={saved.includes(detail.id)}
          onSave={() => toggleSave(detail)}
          onClose={() => setDetail(null)}
        />
      )}
      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast && (
          <>
            <Check size={16} />
            {toast}
          </>
        )}
      </div>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} style={{ transform: 'rotate(-35deg)' }} />;
}
function ShieldIcon() {
  return <FlaskConical size={12} />;
}
