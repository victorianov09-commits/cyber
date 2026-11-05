import React from "react";
import { missions, chapters, getMission } from "./game/missions";
import { DuelPlay } from "./DuelPlay";
import { difficultyNames } from "./game/duel";
import { lessons } from "./lessons";
import {
  score,
  startGame,
  chooseAction,
  nextChoice,
  type Difficulty,
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
  const [catalog, setCatalog] = React.useState<"campaign" | "legacy">(
    progress.active && progress.active.mission < 100 ? "legacy" : "campaign",
  );
  const [difficulty, setDifficulty] = React.useState<Difficulty>(
    progress.active?.difficulty ?? "beginner",
  );
  const [selected, setSelected] = React.useState(101),
    [result, setResult] = React.useState<Game | null>(null);
  React.useEffect(() => {
    const h = document.querySelector<HTMLElement>(".game-area h1");
    if (h) {
      h.tabIndex = -1;
      h.focus();
    }
  }, [screen, result]);
  const game = progress.active,
    mission = getMission(screen === "play" && game ? game.mission : selected);
  const choose = (r: Role) => {
    setRole(r);
    setScreen("select");
    setResult(null);
  };
  const prepare = (id: number) => {
    setSelected(id);
    setScreen("brief");
    setResult(null);
  };
  const begin = () => {
    if (role && unlocked(progress, role, selected)) {
      onChange({ ...progress, active: startGame(mission, role, difficulty) });
      setResult(null);
      setScreen("play");
    }
  };
  if (result) {
    const m = getMission(result.mission);
    return (
      <div className="game-area">
        <div className="page-heading">
          <div>
            <div className="eyebrow">MISSION DEBRIEF</div>
            <h1 tabIndex={-1}>
              {result.status === "won" ? "목표 달성" : "이번 시도는 목표 미달"}{" "}
              · {m.chapter ?? m.id}
              {m.chapter ? "챕터" : "단계"}
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
          {m.chapter && (
            <p>
              대결 합계: RED 공격 {result.attackScore ?? 0}점 / BLUE 방어{" "}
              {result.defenseScore ?? 0}점 ·{" "}
              {difficultyNames[result.difficulty ?? "beginner"]} · 가용성 25
              이상·위험도 95 미만의 안전 조건과 내 점수 ≥ 상대 점수를 함께
              확인합니다.
            </p>
          )}
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
            {result.status === "won" &&
              result.mission < (m.chapter ? 112 : 5) && (
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
        <details className="panel">
          <summary>대결 기록 · 선택과 결과 돌아보기</summary>
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
        </details>
      </div>
    );
  }
  if (screen === "play" && game) {
    return (
      <DuelPlay
        game={game}
        mission={getMission(game.mission)}
        tools={<Terminal key={`${game.mission}-${game.role}`} game={game} />}
        onPause={() => setScreen("select")}
        onAction={(id) => {
          const next = chooseAction(game, getMission(game.mission), id);
          if (next !== game) onChange({ ...progress, active: next });
        }}
        onNext={() => {
          if (game.status !== "playing") {
            onChange(finish(progress, game));
            setResult(game);
          } else onChange({ ...progress, active: nextChoice(game) });
        }}
      />
    );
  }
  if (screen === "brief" && role) {
    return (
      <div className="game-area">
        <div className="page-heading">
          <div>
            <div className="eyebrow">MISSION BRIEFING</div>
            <h1>
              {mission.chapter ?? mission.id}
              {mission.chapter ? "챕터" : "단계"} · {mission.title}
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
            제한 {mission.turns}턴{" "}
            {mission.chapter
              ? `· ${difficultyNames[difficulty]} · 마지막 턴에 내 점수 ≥ 상대 점수, 위험도 95 미만, 가용성 25 이상이면 성공합니다.`
              : "· 기존 목표와 안전 조건을 충족해야 합니다."}{" "}
            · 단서와 진행도를 쌓고 정상 서비스도 보존해야 합니다. 게임 중 힌트를
            볼 수 있습니다.
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
            새 12챕터와 기존 5단계는 각각 역할별로 순서대로 해제합니다. 완료한
            단계는 다시 플레이할 수 있습니다.
          </p>
        </div>
      </div>
      {progress.active && (
        <div className="notice">
          <div>
            <strong>
              {getMission(progress.active.mission).chapter ??
                progress.active.mission}
              단계 · {roleName(progress.active.role)} · {progress.active.turn}턴
              저장됨
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
          <div
            className="button-row catalog-switch"
            role="group"
            aria-label="챕터 목록"
          >
            <button
              className="button secondary"
              aria-pressed={catalog === "campaign"}
              onClick={() => setCatalog("campaign")}
            >
              새 12챕터
            </button>
            <button
              className="button secondary"
              aria-pressed={catalog === "legacy"}
              onClick={() => setCatalog("legacy")}
            >
              기존 5단계
            </button>
          </div>
          {catalog === "campaign" && (
            <fieldset className="difficulty-picker">
              <legend>학습 난이도</legend>
              <div className="button-row">
                {(["beginner", "intermediate", "advanced"] as Difficulty[]).map(
                  (d) => (
                    <button
                      key={d}
                      className="button secondary"
                      aria-pressed={difficulty === d}
                      onClick={() => setDifficulty(d)}
                    >
                      {difficultyNames[d]}
                    </button>
                  ),
                )}
              </div>
              <p>
                {difficulty === "beginner"
                  ? "초급 · 공격 단서와 대응 유형을 자세히 안내합니다."
                  : difficulty === "intermediate"
                    ? "중급 · 직전 전술에 반응하는 상대와 맥락을 비교합니다."
                    : "고급 · 반복 패턴을 더 적극적으로 읽는 상대, 추가 위험 선택지와 큰 오판 비용을 평가합니다."}
              </p>
            </fieldset>
          )}
          <h2>
            {roleName(role)} ·{" "}
            {catalog === "campaign" ? "12개 챕터" : "기존 다섯 단계"}
          </h2>
          {catalog === "campaign" ? (
            <div className="chapter-grid">
              {chapters.map((m) => {
                const open = unlocked(progress, role, m.id),
                  records = progress.records.filter(
                    (r) => r.role === role && r.mission === m.id,
                  ),
                  completed = records.some((r) => r.won);
                return (
                  <article
                    className="chapter-card"
                    key={m.id}
                    data-chapter={m.chapter}
                  >
                    <div className="chapter-meta">
                      <span>
                        CHAPTER {String(m.chapter).padStart(2, "0")} ·{" "}
                        {m.category}
                      </span>
                      <span className="outline-badge">
                        {difficultyNames[difficulty]} · 5턴
                      </span>
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.intro}</p>
                    <p>학습 목표: {m.hint}</p>
                    <div className="chapter-status">
                      {completed
                        ? "완료 ✓"
                        : open
                          ? "플레이 가능"
                          : "이전 챕터 완료 필요"}
                      {records.length > 0 &&
                        ` · 최고 ${Math.max(...records.map((r) => r.score))}점 · ${records.length}회 도전`}
                      {progress.active?.mission === m.id &&
                      progress.active.role === role
                        ? " · 진행 중"
                        : ""}
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
          ) : (
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
          )}
        </section>
      )}
    </div>
  );
}
