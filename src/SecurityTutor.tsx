import React from "react";
import { BookOpen, MessageSquareText, Plug, Send, Unplug } from "lucide-react";
import { knowledgeTopics } from "./knowledge";
import {
  askGemini,
  DEFAULT_GEMINI_MODEL,
  localTutor,
  type GeminiConnection,
  type TutorMessage,
} from "./tutor";
import "./tutor.css";

const categories = [...new Set(knowledgeTopics.map((t) => t.category))];
export function SecurityTutor() {
  const [question, setQuestion] = React.useState("");
  const [messages, setMessages] = React.useState<TutorMessage[]>([
    {
      role: "assistant",
      source: "local",
      text: `안녕하세요! 보안·컴퓨터·정보 학습 도우미예요. API 없이 ${knowledgeTopics.length}개 주제의 기본 자료를 찾아 쉬운 비유와 예시를 보여드려요. 모든 질문을 이해하는 생성형 AI는 아니에요. CPU와 RAM, DNS, Python처럼 궁금한 용어를 물어보세요.`,
    },
  ]);
  const [mode, setMode] = React.useState<"local" | "gemini">("local");
  const [connection, setConnection] = React.useState<GeminiConnection | null>(
    null,
  );
  const [keyDraft, setKeyDraft] = React.useState("");
  const [model, setModel] = React.useState(DEFAULT_GEMINI_MODEL);
  const [busy, setBusy] = React.useState<"answer" | "connect" | null>(null);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [connectionError, setConnectionError] = React.useState("");
  const [category, setCategory] = React.useState(categories[0]);
  const pending = React.useRef<AbortController | null>(null);
  const log = React.useRef<HTMLDivElement>(null);
  React.useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );
  React.useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy]);
  const disconnect = () => {
    pending.current?.abort();
    pending.current = null;
    setConnection(null);
    setKeyDraft("");
    setMode("local");
    setBusy(null);
    setError("");
    setConnectionError("");
    setNotice(
      "연결을 해제하고 이 탭의 API 키를 지웠어요. 기본 지식 도우미를 사용할 수 있어요.",
    );
  };
  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const next = { apiKey: keyDraft.trim(), model: model.trim() };
    setBusy("connect");
    setConnectionError("");
    setError("");
    setNotice("");
    try {
      await askGemini(
        next,
        "연결 확인입니다. 한국어로 준비됐다고 한 문장만 답해주세요.",
        controller.signal,
      );
      if (pending.current !== controller) return;
      setConnection(next);
      setKeyDraft("");
      setMode("gemini");
      setNotice(
        `${next.model} 연결을 확인했어요. 이제 질문을 보내면 Gemini가 답합니다.`,
      );
    } catch (e) {
      if (pending.current === controller)
        setConnectionError(
          e instanceof Error ? e.message : "연결을 확인하지 못했어요.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(null);
      }
    }
  };
  const ask = async (value: string) => {
    const q = value.trim();
    if (!q || q.length > 2000 || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy("answer");
    setQuestion("");
    setError("");
    setNotice("");
    setMessages((v) => [...v.slice(-18), { role: "user", text: q }]);
    try {
      const source = mode === "gemini" && connection ? "gemini" : "local";
      const text =
        source === "gemini"
          ? await askGemini(connection!, q, controller.signal)
          : await localTutor.answer(q);
      if (pending.current === controller)
        setMessages((v) => [...v, { role: "assistant", text, source }]);
    } catch (e) {
      if (pending.current !== controller) return;
      const text = await localTutor.answer(q);
      if (pending.current !== controller) return;
      setError(
        `${e instanceof Error ? e.message : "답변을 불러오지 못했어요."} 기본 지식으로 전환했어요.`,
      );
      setMode("local");
      setMessages((v) => [...v, { role: "assistant", source: "local", text }]);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(null);
      }
    }
  };
  return (
    <div className="tutor-workspace">
      <section className="panel tutor-panel" aria-labelledby="tutor-title">
        <div className="tutor-heading">
          <div>
            <span className="eyebrow">ASK. UNDERSTAND. GROW.</span>
            <h2 id="tutor-title">
              <MessageSquareText size={22} /> AI 학습 도우미
            </h2>
          </div>
          <span className="outline-badge">
            <span className="status-dot" />
            {mode === "local" ? "기본 지식 · API 불필요" : "Gemini 연결됨"}
          </span>
        </div>
        <p className="tutor-description">
          보안부터 컴퓨터 기초, 프로그래밍까지. 어려운 용어를 쉬운 말로 함께
          알아봐요.
        </p>
        <div className="tutor-mode" role="group" aria-label="답변 방식">
          <button
            type="button"
            className={`button secondary ${mode === "local" ? "selected" : ""}`}
            aria-pressed={mode === "local"}
            disabled={!!busy}
            onClick={() => {
              setMode("local");
              setNotice("");
            }}
          >
            기본 지식
          </button>
          <button
            type="button"
            className={`button secondary ${mode === "gemini" ? "selected" : ""}`}
            aria-pressed={mode === "gemini"}
            disabled={!connection || !!busy}
            onClick={() => {
              setMode("gemini");
              setNotice("");
            }}
          >
            Gemini{!connection && " · 연결 필요"}
          </button>
          <span className="small-text">
            {mode === "local"
              ? "질문을 외부로 보내지 않고 준비된 자료에서 답해요."
              : "입력한 질문 한 개를 Google Gemini로 전송해요."}
          </span>
        </div>
        <div className="button-row tutor-prompts">
          {[
            "MFA가 무엇인가요?",
            "CPU와 RAM의 차이는?",
            "DNS가 뭐야?",
            "SQL 인젝션은 어떻게 막나요?",
          ].map((q) => (
            <button
              type="button"
              className="button secondary"
              key={q}
              disabled={!!busy}
              onClick={() => void ask(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <div
          role="log"
          aria-label="학습 도우미 대화"
          aria-live="polite"
          className="chat-log"
          ref={log}
          aria-busy={busy === "answer"}
        >
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              <strong>
                {m.role === "user"
                  ? "내 질문"
                  : m.source === "gemini"
                    ? "Gemini · 생성형 답변"
                    : "기본 지식 도우미 · 학습 자료"}
              </strong>
              <p>{m.text}</p>
            </div>
          ))}
          {busy === "answer" && (
            <p className="small-text">답변을 준비하고 있어요…</p>
          )}
        </div>
        <form
          className="inline-form tutor-form"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <label className="sr-only" htmlFor="tutor-question">
            보안·컴퓨터·정보 학습 질문
          </label>
          <textarea
            id="tutor-question"
            rows={2}
            maxLength={2000}
            value={question}
            placeholder="예: CPU와 RAM은 어떻게 달라?"
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className="button primary"
            disabled={!!busy || !question.trim()}
          >
            <Send size={16} />
            질문하기
          </button>
        </form>
        <p className="small-text">
          기본 답변은 자료 요약이며 모든 질문·최신 정보·이전 대화의 맥락을
          이해하지는 못해요. Gemini 답변도 틀릴 수 있으니 중요한 내용은 공식
          자료로 확인해요. 대화는 페이지를 떠나거나 새로고침하면 초기화돼요.
        </p>
        {error && (
          <p className="tutor-error" role="alert">
            {error}
          </p>
        )}
        <details className="tutor-library">
          <summary>
            <BookOpen size={16} />
            기본 지식에서 다루는 {knowledgeTopics.length}개 주제 보기
          </summary>
          <div className="button-row" aria-label="지식 분야">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className="button secondary"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="topic-buttons">
            {knowledgeTopics
              .filter((t) => t.category === category)
              .map((t) => (
                <button
                  type="button"
                  key={t.id}
                  disabled={!!busy}
                  onClick={() => void ask(`${t.title} 설명해 줘`)}
                >
                  {t.title}
                  <span>↗</span>
                </button>
              ))}
          </div>
        </details>
      </section>
      <section className="panel gemini-panel" aria-labelledby="gemini-title">
        <div className="tutor-heading">
          <div>
            <span className="eyebrow">OPTIONAL CONNECTION</span>
            <h2 id="gemini-title">
              <Plug size={21} />
              Gemini API 연결
            </h2>
          </div>
          <span className="outline-badge">
            {connection
              ? `연결 확인됨 · ${connection.model}`
              : "선택 사항 · 현재 미연결"}
          </span>
        </div>
        <p className="tutor-description">
          더 자유롭게 질문하고 싶다면 내 Gemini API 키로 연결하세요. 연결하지
          않아도 기본 도우미와 게임은 계속 사용할 수 있어요.
        </p>
        <div className="gemini-notes">
          <span>01 · 개인 키 입력</span>
          <span>02 · 연결 확인</span>
          <span>03 · 위에서 질문하기</span>
        </div>
        <form className="gemini-form" onSubmit={(e) => void connect(e)}>
          <label>
            개인 Gemini API 키
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={256}
              placeholder={
                connection ? "다른 키로 변경하려면 입력" : "API 키를 입력하세요"
              }
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              required
              disabled={!!busy}
            />
          </label>
          <label>
            Gemini 모델 ID
            <input
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              placeholder={DEFAULT_GEMINI_MODEL}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              disabled={!!busy}
            />
          </label>
          <div className="button-row">
            <button
              className="button primary"
              disabled={!!busy || !keyDraft.trim() || !model.trim()}
            >
              <Plug size={16} />
              {busy === "connect" ? "연결 확인 중…" : "연결 확인하고 사용하기"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={disconnect}
              disabled={!connection && !keyDraft && !busy}
            >
              <Unplug size={16} />
              연결 해제 · 키 지우기
            </button>
          </div>
        </form>
        {connectionError && (
          <p className="tutor-error" role="alert">
            {connectionError}
          </p>
        )}
        <p className="small-text">
          키는 이 탭의 메모리에서만 사용하고 코드·브라우저 저장소에 저장하지
          않아요. 페이지를 떠나거나 새로고침하면 다시 연결해야 해요. 키와 질문은
          Google API로 직접 전송됩니다. 연결 확인도 짧은 API 요청 1회를 사용하며
          Google의 사용량 제한·요금이 적용될 수 있어요.
        </p>
        <p className="small-text">
          개인 테스트용 연결입니다. 공용 서비스 키를 여러 사용자에게 제공하려면
          별도 서버에서 관리해야 해요. 모델 사용 가능 여부는 계정에 따라
          다르므로 오류가 나면 지원되는 모델 ID를 입력하세요.
        </p>
        <a
          className="text-link tutor-key-link"
          href="https://aistudio.google.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google AI Studio에서 내 API 키 관리 ↗
        </a>
        {notice && (
          <p className="feedback" role="status">
            {notice}
          </p>
        )}
        {busy === "connect" && (
          <p className="small-text" role="status">
            Gemini에 실제 요청을 보내 연결을 확인하고 있어요…
          </p>
        )}
      </section>
    </div>
  );
}
