import { useState, useSyncExternalStore, useEffect } from 'react';
import { CheckCircle2, KeyRound, Sparkles, Trash2 } from 'lucide-react';
import { browserAi } from '../browser-ai';
export default function GptKey() {
  const enabled = useSyncExternalStore(browserAi.subscribe, browserAi.hasKey, () => false);
  const [input, setInput] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    const clearDraft = () => {
      setInput('');
      setError('');
    };
    window.addEventListener('pagehide', clearDraft);
    return () => window.removeEventListener('pagehide', clearDraft);
  }, []);
  function connect() {
    try {
      browserAi.setKey(input);
      setInput('');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="gpt-key-card" aria-labelledby="gpt-key-title">
      <div className="gpt-key-intro">
        <span className="gpt-key-icon">
          <KeyRound size={20} />
        </span>
        <div>
          <h2 id="gpt-key-title">
            GPT와 더 깊이 탐구하기 <span>선택</span>
          </h2>
          <p>개인 API 키를 입력하면 실험 상세에서 GPT에게 질문할 수 있어요.</p>
        </div>
      </div>
      {enabled ? (
        <div className="gpt-key-connected" role="status">
          <span>
            <CheckCircle2 size={17} />
            개인 키 설정됨
          </span>
          <button
            className="secondary-button small"
            onClick={() => {
              browserAi.clearKey();
              setInput('');
              setError('');
            }}
          >
            <Trash2 size={14} />키 삭제
          </button>
          <small>질문을 보내면 키와 모델 접근 권한을 확인해요.</small>
        </div>
      ) : (
        <form
          className="gpt-key-form"
          onSubmit={(e) => {
            e.preventDefault();
            connect();
          }}
          autoComplete="off"
        >
          <label htmlFor="personal-gpt-key">GPT API 키</label>
          <div>
            <input
              id="personal-gpt-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={512}
              placeholder="sk-로 시작하는 개인 API 키"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
            />
            <button className="primary-button small" disabled={!input.trim()} type="submit">
              <Sparkles size={14} />
              GPT 사용하기
            </button>
          </div>
        </form>
      )}
      <p className="gpt-key-note">
        키는 현재 페이지의 메모리에만 보관하며 새로고침·페이지 이탈 시 삭제돼요. 질문할 때 OpenAI로
        전송되고 사용 비용이 발생할 수 있어요. 키 없이도 실험 추천은 이용할 수 있어요.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
