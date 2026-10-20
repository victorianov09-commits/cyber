import React from "react";
import { lessons } from "./lessons";
import { localTutor, type TutorMessage } from "./tutor";
import type { Progress } from "./game/storage";
const fromHash = () => {
  const id = new URLSearchParams(location.hash.split("?")[1] ?? "").get(
    "lesson",
  );
  return lessons.some((l) => l.id === id) ? id! : "network";
};
export function Academy({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (p: Progress) => void;
}) {
  const [selected, setSelected] = React.useState(fromHash),
    [question, setQuestion] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const [messages, setMessages] = React.useState<TutorMessage[]>([
    {
      role: "assistant",
      text: "로컬 데모 튜터입니다. 아래 예시 질문이나 보안 용어를 입력하면 미리 작성한 학습 자료를 찾아드립니다. 실제 생성형 AI에 연결되어 있지 않습니다.",
    },
  ]);
  React.useEffect(() => {
    const update = () => setSelected(fromHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const lesson = lessons.find((l) => l.id === selected)!,
    answer = progress.quizzes[lesson.id],
    completed = lessons.filter(
      (l) => progress.quizzes[l.id] === l.answer,
    ).length;
  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setQuestion("");
    setMessages((v) => [...v.slice(-18), { role: "user", text: q }]);
    try {
      const text = await localTutor.answer(q);
      setMessages((v) => [...v, { role: "assistant", text }]);
    } catch {
      setMessages((v) => [
        ...v,
        {
          role: "assistant",
          text: "답변을 표시하지 못했습니다. 다시 시도하세요.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SECURITY ACADEMY</div>
          <h1>보안 아카데미</h1>
          <p>
            쉬운 비유 → 정확한 개념 → 게임 사례 → 짧은 퀴즈. 이해한 만큼 한
            걸음씩.
          </p>
        </div>
        <span className="outline-badge">
          학습 완료 {completed} / {lessons.length}
        </span>
      </div>
      <section className="panel">
        <label htmlFor="learning-progress">
          학습 진도 · 정답을 맞힌 개념 {completed}개
        </label>
        <progress
          id="learning-progress"
          max={lessons.length}
          value={completed}
        />
        <div className="lesson-tabs" aria-label="개념 선택">
          {lessons.map((l) => (
            <button
              key={l.id}
              className={`button secondary ${selected === l.id ? "selected" : ""}`}
              aria-pressed={selected === l.id}
              onClick={() => {
                setSelected(l.id);
                history.replaceState(null, "", `#/academy?lesson=${l.id}`);
              }}
            >
              {progress.quizzes[l.id] === l.answer ? "✓ " : ""}
              {l.title}
            </button>
          ))}
        </div>
      </section>
      <div className="academy-grid">
        <article className="academy-card" key={lesson.id}>
          <span className="eyebrow">LEARN / {lesson.id.toUpperCase()}</span>
          <h2>{lesson.title}</h2>
          <h3>쉬운 비유</h3>
          <p>{lesson.analogy}</p>
          <h3>정확한 개념</h3>
          <p>{lesson.concept}</p>
          <div className="lesson-tip">
            <p>게임에서는? {lesson.example}</p>
          </div>
          <a className="button secondary back-link" href="#/missions">
            미션에서 적용하기
          </a>
        </article>
        <section className="academy-card" aria-labelledby="quiz-title">
          <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
          <h2 id="quiz-title">짧은 확인 퀴즈</h2>
          <p>{lesson.question}</p>
          <div className="quiz-options">
            {lesson.options.map((option, i) => (
              <button
                key={`${lesson.id}-${i}`}
                className={`action-card ${answer === i ? "selected" : ""}`}
                aria-pressed={answer === i}
                onClick={() =>
                  onChange({
                    ...progress,
                    quizzes: { ...progress.quizzes, [lesson.id]: i },
                  })
                }
              >
                {i + 1}. {option}
              </button>
            ))}
          </div>
          {answer !== undefined && (
            <div className="feedback" role="status">
              <strong>
                {answer === lesson.answer
                  ? "정답이에요."
                  : "다시 생각해 보세요."}
              </strong>
              <p>{lesson.explanations[answer]}</p>
            </div>
          )}
          <p className="small-text">
            오답도 이유를 확인한 뒤 다시 선택할 수 있습니다. 답변과 학습 진도는
            이 브라우저에 저장됩니다.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>
          AI 튜터 영역{" "}
          <span className="outline-badge">로컬 데모 · API 미연결</span>
        </h2>
        <p>
          미리 작성한 학습 자료를 검색합니다. 실제 생성형 AI의 답변이 아닙니다.
          계정·비밀 키 입력은 필요하지 않습니다.
        </p>
        <div className="button-row">
          {[
            "MFA가 무엇인가요?",
            "오탐과 미탐의 차이는?",
            "SQL 인젝션은 어떻게 막나요?",
          ].map((q) => (
            <button
              className="button secondary"
              key={q}
              disabled={busy}
              onClick={() => void ask(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <div role="log" aria-live="polite" className="chat-log">
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              <strong>
                {m.role === "user" ? "내 질문" : "데모 학습 도우미"}
              </strong>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <label className="sr-only" htmlFor="tutor-question">
            보안 학습 질문
          </label>
          <input
            id="tutor-question"
            value={question}
            maxLength={500}
            placeholder="궁금한 보안 개념을 물어보세요"
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className="button primary"
            disabled={busy || !question.trim()}
          >
            질문하기
          </button>
        </form>
        <p className="small-text">
          향후 Gemini 연결은 인증·사용량 제한·비밀 관리가 있는 백엔드를 통해
          구현해야 합니다. 이 공개 사이트는 API 키를 수집하거나 저장하지
          않습니다.
        </p>
      </section>
      <section className="panel">
        <h2>용어 사전</h2>
        <dl className="glossary">
          {[
            ["IP", "통신에서 기기를 식별하는 주소"],
            ["포트", "같은 기기 안의 통신 끝점을 구분하는 번호"],
            ["가용성", "필요할 때 정상적으로 서비스를 사용할 수 있는 성질"],
            ["최소 권한", "업무에 필요한 자원과 작업만 허용하는 원칙"],
            ["TP / FP", "실제 공격을 맞게 탐지 / 정상을 공격으로 잘못 탐지"],
            ["TN / FN", "정상을 정상으로 판단 / 실제 공격을 놓침"],
            ["정밀도 · Precision", "경보 중 실제 공격의 비율. TP / (TP + FP)"],
            ["재현율 · Recall", "실제 공격 중 탐지한 비율. TP / (TP + FN)"],
          ].map(([term, meaning]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
