import React from "react";
import { SqlLab } from "./SqlLab";
import {
  available,
  actionsFor,
  turnLimit,
  type Game,
  type Mission,
  type Stats,
} from "./game/engine";
import { difficultyNames, opponentMove } from "./game/duel";
import {
  currentSituation,
  roleLabel,
  displayBattleText,
  strategicStages,
} from "./game/strategy";
import "./duel.css";
const labels: Record<keyof Stats, string> = {
  risk: "위험도",
  health: "가용성",
  security: "보안 수준",
  intel: "단서",
  progress: "진행도",
};
const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;
export function DuelPlay({
  game,
  mission,
  onAction,
  onNext,
  onPause,
  tools,
}: {
  game: Game;
  mission: Mission;
  onAction: (id: string) => void;
  onNext: () => void;
  onPause: () => void;
  tools: React.ReactNode;
}) {
  const response = game.phase === "response" || game.status !== "playing";
  const last = game.history.at(-1),
    exchange = last?.exchange;
  const heading = React.useRef<HTMLHeadingElement>(null);
  const [hint, setHint] = React.useState(false);
  React.useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [game.turn, game.phase]);
  const move = opponentMove(game, mission);
  const level = game.difficulty ?? "beginner";
  const choices = actionsFor(game, mission).filter((a) => available(game, a));
  return (
    <div className={`game-area duel-area role-${game.role}`}>
      <header className="duel-header">
        <div>
          <div className="eyebrow">
            {mission.chapter ? "CHAPTER" : "LEGACY MISSION"}{" "}
            {String(mission.chapter ?? mission.id).padStart(2, "0")} /{" "}
            {roleLabel(game.role)}
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {response
              ? "AI 대응 결과"
              : `${mission.chapter ?? mission.id}${mission.chapter ? "챕터" : "단계"} · ${mission.title}`}
          </h1>
          <p>
            {mission.title} · 턴 {game.turn} / {turnLimit(game, mission)}{" "}
            {mission.chapter
              ? `· ${difficultyNames[level]}`
              : "· 기존 진행 유지"}
          </p>
        </div>
        <button className="button secondary" onClick={onPause}>
          일시 정지 · 단계 선택
        </button>
      </header>
      {mission.chapter && game.rulesVersion !== 2 && (
        <p className="small-text">
          이전 버전에서 시작한 대결입니다. 저장된 5턴 규칙으로 이어갑니다. 새로
          시작하는 대결부터 확장 난이도를 적용합니다.
        </p>
      )}
      <div className="duel-scoreboard" aria-label="현재 대결 상태">
        <div className="attack-score">
          <span>공격 점수</span>
          <strong>{game.attackScore ?? 0}</strong>
        </div>
        <div className="defense-score">
          <span>방어 점수</span>
          <strong>{game.defenseScore ?? 0}</strong>
        </div>
        <div>
          <span>목표 진행도</span>
          <strong>{game.stats.progress}%</strong>
          <progress value={game.stats.progress} max={100} />
        </div>
        <div>
          <span>위험도 / 가용성</span>
          <strong>
            {game.stats.risk} <small>/ {game.stats.health}</small>
          </strong>
        </div>
      </div>
      {game.strategy && (
        <div className="strategy-resources" aria-label="전략 상태">
          <span>
            대응 여력 <strong>{game.strategy.resources}</strong> / 100
          </span>
          <span>누적 압박 {game.strategy.pressure}</span>
          <span>준비도 {game.strategy.preparedness}</span>
          <span>미해결 위험 {game.strategy.unresolved}</span>
          <span>피로 {game.strategy.fatigue}</span>
        </div>
      )}
      <div className="duel-transition" key={`${game.turn}-${response}`}>
        {response && last ? (
          <section
            className="panel duel-response"
            aria-labelledby="exchange-title"
          >
            <div className="duel-result-title">
              <span className="eyebrow">TURN {game.turn} / RESPONSE</span>
              <h2
                id="exchange-title"
                className={
                  exchange?.defenseSucceeded ? "defense-point" : "attack-point"
                }
              >
                {displayBattleText(
                  exchange?.verdict ?? "이번 턴의 대응을 확인하세요",
                )}
              </h2>
            </div>
            <div className="exchange-grid">
              <article>
                <span>01 · 나의 행동</span>
                <h3>{last.action}</h3>
                <p>{last.result}</p>
              </article>
              <article>
                <span>02 · 상대의 {game.role === "red" ? "방어" : "공격"}</span>
                <h3>{displayBattleText(exchange?.opponent ?? last.ai)}</h3>
                <p>
                  {exchange
                    ? `방어 ${exchange.defenseSucceeded ? "성공" : "미흡"} · ${game.role === "red" ? "상대의 방어 효과를 확인하세요." : "나의 방어 효과를 확인하세요."}`
                    : "이전 저장 기록의 반응입니다."}
                </p>
              </article>
            </div>
            <div className="duel-reason">
              <h3>03 · 왜 이런 결과가 나왔나요?</h3>
              <p>{exchange?.reason ?? last.ai}</p>
            </div>
            <div className="duel-deltas" aria-label="이번 턴 점수 변화">
              <span className="attack-point">
                공격 점수 <b>{signed(exchange?.attackDelta ?? 0)}</b>
              </span>
              <span className="defense-point">
                방어 점수 <b>{signed(exchange?.defenseDelta ?? 0)}</b>
              </span>
              {exchange?.resourcesDelta !== undefined && (
                <span>
                  대응 여력 <b>{signed(exchange.resourcesDelta)}</b>
                </span>
              )}
              {exchange &&
                (Object.keys(labels) as (keyof Stats)[]).map((k) => (
                  <span key={k}>
                    {labels[k]} <b>{signed(exchange.delta[k])}</b>
                  </span>
                ))}
            </div>
            <div className="button-row">
              <button className="button primary" onClick={onNext}>
                {game.status === "playing"
                  ? "다음 턴 선택하기"
                  : "최종 학습 요약 보기"}{" "}
                →
              </button>
              <span className="small-text">
                결과 확인 중에는 새 행동을 선택하지 않습니다. 현재 화면도
                저장됩니다.
              </span>
            </div>
          </section>
        ) : (
          <section className="panel duel-choice" aria-labelledby="choice-title">
            <div className="duel-result-title">
              <span className="eyebrow">
                TURN {game.turn + 1} / YOUR CHOICE
              </span>
              <h2 id="choice-title">이번 턴의 행동</h2>
              <p>
                {currentSituation(game, mission) ??
                  mission[game.role].objective}
              </p>
            </div>
            {game.rulesVersion === 2 && (
              <p className="small-text">
                상황 긴급도:{" "}
                {
                  ["낮음", "보통", "높음"][
                    strategicStages(mission)[game.turn].urgency
                  ]
                }{" "}
                · 누적 노출 {game.strategy!.exposure} · 준비도{" "}
                {game.strategy!.preparedness}
              </p>
            )}
            {game.role === "blue" && (
              <div className="incoming-attack" aria-label="이번 턴 상대 공격">
                <span className="eyebrow">상대의 공격 · 먼저 공개</span>
                <h3>{move.strategy.name}</h3>
                <p>
                  {level === "beginner" && game.rulesVersion !== 2
                    ? move.strategy.reason
                    : "직접 보호, 근거 재확인, 영향 범위 제한 중 상황에 맞는 대응을 판단하세요."}
                </p>
              </div>
            )}
            <div className="duel-actions">
              {choices.map((a) => (
                <button
                  className="action-card"
                  aria-label={a.name}
                  key={a.id}
                  data-action-id={a.id}
                  onClick={() => onAction(a.id)}
                >
                  <strong>{a.name}</strong>
                  <span>{a.description}</span>
                  {mission.chapter &&
                    level === "beginner" &&
                    game.rulesVersion !== 2 && (
                      <small>
                        {game.role === "blue"
                          ? [
                              "정책·신원 경계 대응",
                              "출처·맥락 대응",
                              "영향 범위 대응",
                            ][a.tactic ?? 0]
                          : "가상 비교만 수행하며 실제 시스템에 요청하지 않습니다."}
                      </small>
                    )}
                </button>
              ))}
            </div>
            {!choices.length && (
              <p role="alert">
                선택 가능한 행동이 없습니다. 저장 기록을 확인하거나 단계
                선택에서 다시 시작하세요.
              </p>
            )}
            <div className="button-row">
              {level !== "advanced" && (
                <button
                  className="button secondary"
                  onClick={() => setHint(!hint)}
                  aria-expanded={hint}
                >
                  학습 힌트 {hint ? "접기" : "보기"}
                </button>
              )}
              <a
                className="button secondary"
                href={`#/academy?lesson=${mission.concepts[0]}`}
              >
                관련 개념 학습
              </a>
              {mission.id === 3 && (
                <a className="button secondary" href="#/research">
                  탐지 규칙 연구실
                </a>
              )}
            </div>
            {hint && level !== "advanced" && (
              <p className="feedback">{mission.hint}</p>
            )}
          </section>
        )}
      </div>
      <details className="panel duel-history">
        <summary>대결 기록 · {game.history.length}턴</summary>
        {!game.history.length ? (
          <p>아직 행동 기록이 없습니다.</p>
        ) : (
          <ol className="event-log">
            {game.history.map((h) => (
              <li key={h.turn}>
                <strong>
                  {h.turn}턴 · {h.action}
                </strong>
                <p>상대: {displayBattleText(h.exchange?.opponent ?? h.ai)}</p>
                {h.exchange && (
                  <p>
                    {displayBattleText(h.exchange.verdict)} · 공격{" "}
                    {signed(h.exchange.attackDelta)} / 방어{" "}
                    {signed(h.exchange.defenseDelta)}
                    <br />
                    {h.exchange.reason}
                  </p>
                )}
                <small>
                  위험 {h.stats.risk} · 가용성 {h.stats.health} · 진행{" "}
                  {h.stats.progress}
                </small>
              </li>
            ))}
          </ol>
        )}
      </details>
      <details className="panel duel-tools">
        <summary>가상 시스템 · 상태 · 모의 터미널</summary>
        <p>
          모든 행동과 노드는 교육용 모형입니다. 실제 외부 시스템을 공격하거나
          명령을 실행하지 않습니다.
        </p>
        <div className="goal-list">
          {Object.entries(labels).map(([k, label]) => (
            <span key={k}>
              {label} {game.stats[k as keyof Stats]}
            </span>
          ))}
        </div>
        <div className="network-map">
          {mission.nodes.map((n) => (
            <div className="network-node" key={n}>
              {n}
            </div>
          ))}
        </div>
        {mission.id === 4 && game.flags.includes("query") && <SqlLab />}
        {tools}
      </details>
    </div>
  );
}
