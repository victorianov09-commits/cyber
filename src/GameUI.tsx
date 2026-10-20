import React from "react";
import { SqlLab } from "./SqlLab";
import { missions } from "./game/missions";
import { lessons } from "./lessons";
import {
  available,
  score,
  startGame,
  takeTurn,
  type Game,
  type Role,
  type Stats,
} from "./game/engine";
import { finish, terminal, unlocked, type Progress } from "./game/storage";
const roleName = (r: Role) =>
  r === "red" ? "RED TEAM · 공격 관찰" : "BLUE TEAM · 방어 대응";
const labels: Record<keyof Stats, string> = {
  risk: "위험도",
  health: "서비스 가용성",
  security: "보안 수준",
  intel: "수집한 단서",
  progress: "목표 진행도",
};
function StatsView({ game }: { game: Game }) {
  return (
    <div className="stat-grid">
      {(Object.keys(labels) as (keyof Stats)[]).map((k) => (
        <div className="stat" key={k}>
          <span>{labels[k]}</span>
          <strong>
            {game.stats[k]}
            <small> / 100</small>
          </strong>
          <meter
            min="0"
            max="100"
            value={game.stats[k]}
            aria-label={labels[k]}
          />
        </div>
      ))}
    </div>
  );
}
function Terminal({ game }: { game: Game }) {
  const [command, setCommand] = React.useState(""),
    [lines, setLines] = React.useState<string[]>([
      "메모리 속 모의 터미널입니다. help를 입력하세요. 실제 OS·네트워크 요청은 실행하지 않습니다.",
    ]);
  return (
    <section className="panel">
      <h2>
        가상 터미널 <span className="outline-badge">모의 명령만 허용</span>
      </h2>
      <pre className="terminal-output" role="log" aria-live="polite">
        {lines.join("\n\n")}
      </pre>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (command.trim()) {
            setLines((v) => [
              ...v.slice(-12),
              `sim > ${command}\n${terminal(game, command)}`,
            ]);
            setCommand("");
          }
        }}
      >
        <label className="sr-only" htmlFor="sim-command">
          모의 명령
        </label>
        <input
          id="sim-command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          maxLength={120}
          autoComplete="off"
          placeholder="help, status, map, logs, rules"
        />
        <button className="button secondary" type="submit">
          입력
        </button>
      </form>
    </section>
  );
}
export function GameHub({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (p: Progress) => void;
}) {
  const [role, setRole] = React.useState<Role | null>(
    progress.active?.role ?? null,
  );
  const [screen, setScreen] = React.useState<"select" | "brief" | "play">(
    progress.active ? "play" : "select",
  );
  const [selected, setSelected] = React.useState(1),
    [result, setResult] = React.useState<Game | null>(null),
    [hint, setHint] = React.useState(false);
  React.useEffect(() => {
    const h = document.querySelector<HTMLElement>(".game-area h1");
    if (h) {
      h.tabIndex = -1;
      h.focus();
    }
  }, [screen, result]);
  const game = progress.active,
    mission =
      missions[(screen === "play" && game ? game.mission : selected) - 1];
  const choose = (r: Role) => {
    setRole(r);
    setScreen("select");
    setResult(null);
  };
  const prepare = (id: number) => {
    setSelected(id);
    setScreen("brief");
    setResult(null);
    setHint(false);
  };
  const begin = () => {
    if (role && unlocked(progress, role, selected)) {
      onChange({ ...progress, active: startGame(mission, role) });
      setResult(null);
      setHint(false);
      setScreen("play");
    }
  };
  if (result) {
    const m = missions[result.mission - 1];
    return (
      <div className="game-area">
        <div className="page-heading">
          <div>
            <div className="eyebrow">MISSION DEBRIEF</div>
            <h1 tabIndex={-1}>
              {result.status === "won" ? "목표 달성" : "이번 시도는 목표 미달"}{" "}
              · {m.id}단계
            </h1>
            <p>{result.reason} 실패 기록도 다음 선택에 도움이 됩니다.</p>
          </div>
          <span className="outline-badge">{roleName(result.role)}</span>
        </div>
        <section className="panel">
          <h2>
            {m.title} · {score(result)}점
          </h2>
          <p>
            점수는 목표 달성, 진행도, 가용성, 단서, 위험도와 남은 턴을 반영한
            게임 내 지표입니다.
          </p>
          <p className="feedback">{m[result.role].feedback}</p>
          <p>개선 팁: {m.hint}</p>
          <p>
            다음 시도에서는 행동의 비용과 선행 조건을 비교하고, 전체 차단이나
            무리한 반복 대신 필요한 증거를 먼저 모아 보세요.
          </p>
          <StatsView game={result} />
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => {
                setRole(result.role);
                prepare(result.mission);
              }}
            >
              다시 도전
            </button>
            {result.status === "won" && result.mission < 5 && (
              <button
                className="button primary"
                onClick={() => {
                  setRole(result.role);
                  prepare(result.mission + 1);
                }}
              >
                다음 단계
              </button>
            )}
            <button
              className="button secondary"
              onClick={() => {
                setResult(null);
                setScreen("select");
              }}
            >
              단계 선택
            </button>
            <a className="button secondary" href="#/research">
              학습·연구 대시보드
            </a>
          </div>
        </section>
        <section className="panel">
          <h2>선택과 결과 돌아보기</h2>
          <ol className="event-log">
            {result.history.map((h) => (
              <li key={h.turn}>
                <strong>
                  {h.turn}턴 · {h.action}
                </strong>
                <p>{h.result}</p>
                <p>{h.ai}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }
  if (screen === "play" && game) {
    const m = missions[game.mission - 1],
      plan = m[game.role];
    return (
      <div className="game-area">
        <div className="page-heading">
          <div>
            <div className="eyebrow">TURN-BASED SIMULATION</div>
            <h1>
              {m.id}단계 · {m.title}
            </h1>
            <p>
              턴 {game.turn} / {m.turns} · 모든 노드와 행동은 메모리 속 교육
              모형입니다.
            </p>
          </div>
          <span className={`role-label ${game.role}`}>
            {roleName(game.role)}
          </span>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            onClick={() => setScreen("select")}
          >
            일시 정지 · 단계 선택
          </button>
          <a
            className="button secondary"
            href={`#/academy?lesson=${m.concepts[0]}`}
          >
            관련 개념 학습
          </a>
          {m.id === 3 && (
            <a className="button secondary" href="#/research">
              탐지 규칙 연구실
            </a>
          )}
        </div>
        <section className="panel">
          <h2>현재 목표</h2>
          <p>{plan.objective}</p>
          <p className="small-text">
            성공: 필수 증거와 보고 완료, 진행도 70 이상, 단서 30 이상, 가용성 25
            이상{game.role === "red" ? ", 위험도 95 미만" : ", 보안 60 이상"}.
            실패: 위험도 100, 가용성 0 또는 제한 턴 초과.
          </p>
          <div className="goal-list">
            {plan.win.map((f) => (
              <span key={f}>
                {game.flags.includes(f) ? "✓" : "○"}{" "}
                {
                  (
                    {
                      contain: "경로 보호",
                      proof: "효과·증거 검증",
                      report: "개선안 보고",
                    } as Record<string, string>
                  )[f]
                }
              </span>
            ))}
          </div>
        </section>
        <StatsView game={game} />
        {m.id === 4 && game.flags.includes("query") && <SqlLab />}
        <section className="panel">
          <h2>가상 시스템 지도</h2>
          <div className="network-map">
            {m.nodes.map((node, i) => (
              <div className="network-node" key={node}>
                <span className="eyebrow">NODE 0{i + 1}</span>
                <strong>{node}</strong>
                <span>
                  {i === 0
                    ? "관찰 지점"
                    : i === m.nodes.length - 1
                      ? `기록 ${game.history.length}건`
                      : game.flags.includes("contain")
                        ? "보호 정책 적용"
                        : game.stats.intel >= 30
                          ? "조사한 구성 요소"
                          : "조사 대기"}
                </span>
              </div>
            ))}
          </div>
          <p className="small-text">
            지도는 구성 요소와 현재 관찰 상태를 요약합니다. 실제 호스트에
            접속하지 않습니다.
          </p>
        </section>
        <div className="play-grid">
          <section className="panel">
            <h2>이번 턴의 행동</h2>
            <p className="small-text">
              행동 카드 하나가 한 턴입니다. 회색 카드는 선행 행동이 필요하거나
              이미 사용했습니다.
            </p>
            <div className="action-grid">
              {plan.actions.map((a) => (
                <button
                  className="action-card"
                  key={a.id}
                  aria-label={a.name}
                  disabled={!available(game, a)}
                  onClick={() => {
                    const next = takeTurn(game, m, a.id);
                    if (next === game) return;
                    if (next.status !== "playing") {
                      onChange(finish(progress, next));
                      setResult(next);
                    } else onChange({ ...progress, active: next });
                  }}
                >
                  <strong>{a.name}</strong>
                  <span>{a.description}</span>
                  {!available(game, a) && (
                    <small>
                      {game.flags.includes(`used:${a.id}`) && a.once
                        ? "이미 완료"
                        : "선행 단계 필요"}
                    </small>
                  )}
                </button>
              ))}
            </div>
            <details className="help-box">
              <summary>AI 상대의 규칙 보기</summary>
              <p>{plan.ai}</p>
            </details>
            <button
              className="button secondary"
              aria-expanded={hint}
              onClick={() => setHint(!hint)}
            >
              학습 힌트 {hint ? "닫기" : "보기"}
            </button>
            {hint && <p className="feedback">{m.hint}</p>}
          </section>
          <div>
            <section className="panel">
              <h2>AI 반응 · 이벤트 로그</h2>
              <div aria-live="polite" role="status" className="feedback">
                {game.history.at(-1)?.ai ??
                  "아직 행동하지 않았습니다. 먼저 구성과 단서를 살펴보세요."}
              </div>
              <ol className="event-log" aria-label="턴별 이벤트">
                {game.history.map((h) => (
                  <li key={h.turn}>
                    <strong>
                      {h.turn}턴 · {h.action}
                    </strong>
                    <p>{h.result}</p>
                    <small>
                      위험 {h.stats.risk} · 가용성 {h.stats.health} · 진행{" "}
                      {h.stats.progress}
                    </small>
                  </li>
                ))}
              </ol>
            </section>
            <Terminal key={`${game.mission}-${game.role}`} game={game} />
          </div>
        </div>
      </div>
    );
  }
  if (screen === "brief" && role) {
    return (
      <div className="game-area">
        <div className="page-heading">
          <div>
            <div className="eyebrow">MISSION BRIEFING</div>
            <h1>
              {mission.id}단계 · {mission.title}
            </h1>
            <p>학습 안내 → 역할 목표 → 행동 선택 → AI 반응 → 결과 해설</p>
          </div>
        </div>
        <section className="panel">
          <span className={`role-label ${role}`}>{roleName(role)}</span>
          <h2>먼저 알아볼 개념</h2>
          <p>{mission.intro}</p>
          <h2>역할별 목표</h2>
          <p>{mission[role].objective}</p>
          <p>
            제한 {mission.turns}턴 · 단서와 진행도를 쌓고 정상 서비스도 보존해야
            합니다. 게임 중 힌트를 볼 수 있습니다.
          </p>
          {progress.active && (
            <p className="feedback">
              새 미션을 시작하면 이전에 일시 정지한 게임은 대체됩니다. 완료
              기록과 학습 진도는 유지됩니다.
            </p>
          )}
          <div className="button-row">
            <button className="button primary" onClick={begin}>
              이 목표로 시뮬레이션 시작
            </button>
            <button
              className="button secondary"
              onClick={() => setScreen("select")}
            >
              돌아가기
            </button>
            {mission.concepts.map((id) => (
              <a
                key={id}
                className="button secondary"
                href={`#/academy?lesson=${id}`}
              >
                {lessons.find((l) => l.id === id)?.title}
              </a>
            ))}
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="game-area">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CHOOSE YOUR PERSPECTIVE</div>
          <h1>같은 시스템, 두 가지 관점</h1>
          <p>
            역할마다 1단계부터 순서대로 해제합니다. 완료한 단계는 다시 플레이할
            수 있습니다.
          </p>
        </div>
      </div>
      {progress.active && (
        <div className="notice">
          <div>
            <strong>
              {progress.active.mission}단계 · {roleName(progress.active.role)} ·{" "}
              {progress.active.turn}턴 저장됨
            </strong>
            <div className="button-row">
              <button
                className="button primary"
                onClick={() => {
                  setRole(progress.active!.role);
                  setScreen("play");
                }}
              >
                이어서 플레이
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="role-grid">
        {(["red", "blue"] as Role[]).map((r) => (
          <button
            className={`panel role-card ${role === r ? "selected" : ""}`}
            key={r}
            onClick={() => choose(r)}
            aria-pressed={role === r}
          >
            <span className={`role-label ${r}`}>
              {r === "red" ? "RED TEAM" : "BLUE TEAM"}
            </span>
            <h2>
              {r === "red"
                ? "허점을 관찰하고 증명하기"
                : "위험을 줄이고 서비스를 지키기"}
            </h2>
            <p>
              {r === "red"
                ? "허가된 모형에서 약점을 찾아 최소 영향으로 검증하고 개선안을 보고합니다. 무리한 시도는 위험을 높입니다."
                : "증거를 모으고 필요한 경로만 보호합니다. 공격을 막아도 정상 서비스가 중단되면 좋은 대응이 아닙니다."}
            </p>
          </button>
        ))}
      </div>
      {role && (
        <section aria-label="단계 선택">
          <h2>{roleName(role)} · 다섯 단계</h2>
          <div className="mission-list">
            {missions.map((m) => {
              const open = unlocked(progress, role, m.id),
                records = progress.records.filter(
                  (r) => r.role === role && r.mission === m.id,
                ),
                best = Math.max(0, ...records.map((r) => r.score));
              return (
                <article className="mission-row" key={m.id}>
                  <div className="mission-number">0{m.id}</div>
                  <div>
                    <span className="eyebrow">
                      {records.some((r) => r.won)
                        ? "완료 ✓"
                        : open
                          ? "플레이 가능"
                          : "이전 단계 완료 필요"}
                    </span>
                    <h2>{m.title}</h2>
                    <p>{m.intro}</p>
                    {records.length > 0 && (
                      <p>
                        최고 {best}점 · {records.length}회 도전
                      </p>
                    )}
                  </div>
                  <button
                    className="button secondary"
                    disabled={!open}
                    onClick={() => prepare(m.id)}
                  >
                    {open ? "학습 안내" : "잠김"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
