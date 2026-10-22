import React from "react";
import { lessons } from "./lessons";
import { SecurityTutor } from "./SecurityTutor";
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
  const [selected, setSelected] = React.useState(fromHash);
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
      <SecurityTutor />
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
