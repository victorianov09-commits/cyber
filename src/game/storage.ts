import { score, type Game, type Role, type Turn } from "./engine";
import { allMissions, getMission } from "./missions";
import { configuredTurns, turnLimit } from "./strategy";
import type { StrategyState, Difficulty } from "./engine";
export type RecordEntry = {
  rulesVersion?: 2;
  turnLimit?: number;
  strategy?: StrategyState;
  history?: Turn[];
  attackScore?: number;
  defenseScore?: number;
  difficulty?: Difficulty;
  mission: number;
  role: Role;
  score: number;
  won: boolean;
  turns: number;
  at: string;
};
export type Progress = {
  version: 1;
  active: Game | null;
  records: RecordEntry[];
  quizzes: Record<string, number>;
};
export const STORAGE_KEY = "cyber-duel:v1";
export const emptyProgress = (): Progress => ({
  version: 1,
  active: null,
  records: [],
  quizzes: {},
});
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
function validStats(x: unknown): boolean {
  return (
    object(x) &&
    ["risk", "health", "security", "intel", "progress"].every(
      (k) =>
        typeof x[k] === "number" &&
        Number.isFinite(x[k]) &&
        Number(x[k]) >= 0 &&
        Number(x[k]) <= 100,
    )
  );
}
function validStrategy(x: unknown): boolean {
  if (!object(x)) return false;
  return (
    ["resources", "pressure", "preparedness", "exposure", "fatigue"].every(
      (k) =>
        typeof x[k] === "number" &&
        Number.isFinite(x[k]) &&
        Number(x[k]) >= 0 &&
        Number(x[k]) <= 100,
    ) &&
    Number.isInteger(x.unresolved) &&
    Number(x.unresolved) >= 0 &&
    Number(x.unresolved) <= 10
  );
}
function validSessionMeta(x: Record<string, unknown>): boolean {
  if (x.rulesVersion === undefined) return true;
  if (
    x.rulesVersion !== 2 ||
    !["beginner", "intermediate", "advanced"].includes(String(x.difficulty))
  )
    return false;
  const m = allMissions.find((m) => m.id === x.mission);
  return (
    !!m?.chapter &&
    x.turnLimit === configuredTurns(m, x.difficulty as Difficulty) &&
    validStrategy(x.strategy)
  );
}
function validExchange(x: unknown): boolean {
  if (x === undefined) return true; // v1 history predates structured results.
  if (!object(x) || !object(x.delta)) return false;
  const delta = x.delta;
  return (
    (x.resourcesDelta === undefined ||
      (typeof x.resourcesDelta === "number" &&
        Number.isFinite(x.resourcesDelta) &&
        Math.abs(x.resourcesDelta) <= 100)) &&
    (x.quality === undefined ||
      (typeof x.quality === "number" &&
        Number.isFinite(x.quality) &&
        x.quality >= 0 &&
        x.quality <= 100)) &&
    typeof x.opponent === "string" &&
    ["red", "blue"].includes(String(x.opponentRole)) &&
    typeof x.defenseSucceeded === "boolean" &&
    typeof x.verdict === "string" &&
    typeof x.reason === "string" &&
    ["risk", "health", "security", "intel", "progress"].every(
      (k) =>
        typeof delta[k] === "number" &&
        Number.isFinite(delta[k]) &&
        Math.abs(Number(delta[k])) <= 100,
    ) &&
    ["attackDelta", "defenseDelta"].every(
      (k) =>
        typeof x[k] === "number" &&
        Number.isFinite(x[k]) &&
        Number(x[k]) >= 0 &&
        Number(x[k]) <= 100,
    )
  );
}
function validTurn(h: unknown, i: number): boolean {
  return (
    object(h) &&
    h.turn === i + 1 &&
    (h.strategy === undefined || validStrategy(h.strategy)) &&
    (h.tactic === undefined ||
      (Number.isInteger(h.tactic) &&
        Number(h.tactic) >= 0 &&
        Number(h.tactic) <= 4)) &&
    typeof h.action === "string" &&
    typeof h.result === "string" &&
    typeof h.ai === "string" &&
    validStats(h.stats) &&
    validExchange(h.exchange)
  );
}
function validScores(x: Record<string, unknown>): boolean {
  return ["attackScore", "defenseScore"].every(
    (k) =>
      x[k] === undefined ||
      (typeof x[k] === "number" &&
        Number.isFinite(x[k]) &&
        Number(x[k]) >= 0 &&
        Number(x[k]) <= 1000),
  );
}
function validGame(x: unknown): x is Game {
  if (
    !object(x) ||
    !Number.isInteger(x.mission) ||
    !allMissions.some((m) => m.id === x.mission) ||
    !["red", "blue"].includes(String(x.role)) ||
    !["playing", "won", "lost"].includes(String(x.status)) ||
    !Number.isInteger(x.turn) ||
    Number(x.turn) < 0 ||
    !validSessionMeta(x) ||
    Number(x.turn) >
      (x.rulesVersion === 2
        ? Number(x.turnLimit)
        : getMission(Number(x.mission)).turns) ||
    (x.phase !== undefined &&
      !["choice", "response"].includes(String(x.phase))) ||
    (x.difficulty !== undefined &&
      !["beginner", "intermediate", "advanced"].includes(
        String(x.difficulty),
      )) ||
    !validScores(x) ||
    !validStats(x.stats) ||
    !Array.isArray(x.flags) ||
    !x.flags.every((f) => typeof f === "string") ||
    !Array.isArray(x.history) ||
    (x.phase === "response" && x.history.length === 0) ||
    typeof x.reason !== "string"
  )
    return false;
  return (
    x.history.length === x.turn &&
    x.history.every(validTurn) &&
    (!getMission(Number(x.mission)).chapter ||
      (["beginner", "intermediate", "advanced"].includes(
        String(x.difficulty),
      ) &&
        (x.status !== "playing" ||
          Number(x.turn) < (x.rulesVersion === 2 ? Number(x.turnLimit) : 5)) &&
        (x.rulesVersion !== 2 ||
          x.history.every(
            (h) =>
              object(h) &&
              validStrategy(h.strategy) &&
              Number.isInteger(h.tactic),
          )) &&
        Array.from(
          { length: Number(x.turn) },
          (_, i) => `stage:${i + 1}`,
        ).every((f) => (x.flags as string[]).includes(f))))
  );
}
export function loadProgress(): { data: Progress; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyProgress(), error: "" };
    const p: unknown = JSON.parse(raw);
    if (
      !object(p) ||
      p.version !== 1 ||
      !Array.isArray(p.records) ||
      !object(p.quizzes) ||
      (p.active !== null && !validGame(p.active))
    )
      throw new Error("invalid");
    if (
      !p.records.every(
        (r) =>
          object(r) &&
          Number.isInteger(r.mission) &&
          allMissions.some((m) => m.id === r.mission) &&
          (r.difficulty === undefined ||
            ["beginner", "intermediate", "advanced"].includes(
              String(r.difficulty),
            )) &&
          ["red", "blue"].includes(String(r.role)) &&
          typeof r.won === "boolean" &&
          typeof r.score === "number" &&
          Number.isFinite(r.score) &&
          typeof r.turns === "number" &&
          typeof r.at === "string" &&
          validScores(r) &&
          validSessionMeta(r) &&
          (r.history === undefined ||
            (Array.isArray(r.history) &&
              r.history.length === r.turns &&
              r.history.every(validTurn))),
      )
    )
      throw new Error("invalid");
    if (
      !Object.values(p.quizzes).every(
        (v) => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 2,
      )
    )
      throw new Error("invalid");
    return { data: p as unknown as Progress, error: "" };
  } catch {
    return {
      data: emptyProgress(),
      error:
        "저장 기록을 읽을 수 없어 새 세션으로 시작합니다. 브라우저 저장소 설정을 확인하세요.",
    };
  }
}
export function saveProgress(p: Progress): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    return "";
  } catch {
    return "진행도를 저장하지 못했습니다. 저장 공간이나 브라우저 설정을 확인하세요. 현재 탭에서는 계속 플레이할 수 있습니다.";
  }
}
export function unlocked(p: Progress, role: Role, id: number): boolean {
  if (!allMissions.some((m) => m.id === id)) return false;
  return (
    id === 1 ||
    id === 101 ||
    p.records.some((r) => r.role === role && r.mission === id - 1 && r.won)
  );
}
export function finish(p: Progress, game: Game): Progress {
  return {
    ...p,
    active: null,
    records: [
      ...p.records,
      {
        ...(game.difficulty ? { difficulty: game.difficulty } : {}),
        ...(game.rulesVersion === 2
          ? {
              rulesVersion: 2 as const,
              turnLimit: game.turnLimit,
              strategy: game.strategy,
            }
          : {}),
        mission: game.mission,
        role: game.role,
        score: score(game),
        won: game.status === "won",
        turns: game.turn,
        history: game.history,
        ...(game.attackScore !== undefined
          ? { attackScore: game.attackScore, defenseScore: game.defenseScore }
          : {}),
        at: new Date().toISOString(),
      },
    ],
  };
}
export function terminal(game: Game, command: string): string {
  const c = command.trim().toLowerCase(),
    m = getMission(game.mission);
  if (c === "help")
    return "허용된 모의 명령: help · status · map · logs · rules. 행동 카드를 선택해야 턴이 진행됩니다.";
  if (c === "status")
    return `턴 ${game.turn}/${turnLimit(game, m)} | 위험 ${game.stats.risk} | 가용성 ${game.stats.health} | 보안 ${game.stats.security} | 단서 ${game.stats.intel} | 진행 ${game.stats.progress}`;
  if (c === "map") return m.nodes.join(" → ");
  if (c === "logs")
    return (
      game.history
        .slice(-3)
        .map((h) => `T${h.turn} ${h.action}: ${h.result}`)
        .join("\n") || "아직 행동 기록이 없습니다."
    );
  if (c === "rules")
    return `${m[game.role].objective}\n상대 규칙: ${m[game.role].ai}`;
  return "지원하지 않는 입력입니다. help로 허용된 모의 명령을 확인하세요. 실제 시스템 명령은 실행하지 않습니다.";
}
