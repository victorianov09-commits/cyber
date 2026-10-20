import { score, type Game, type Role } from "./engine";
import { missions } from "./missions";
export type RecordEntry = {
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
function validGame(x: unknown): x is Game {
  if (
    !object(x) ||
    !Number.isInteger(x.mission) ||
    Number(x.mission) < 1 ||
    Number(x.mission) > 5 ||
    !["red", "blue"].includes(String(x.role)) ||
    x.status !== "playing" ||
    !Number.isInteger(x.turn) ||
    Number(x.turn) < 0 ||
    Number(x.turn) > 11 ||
    !validStats(x.stats) ||
    !Array.isArray(x.flags) ||
    !x.flags.every((f) => typeof f === "string") ||
    !Array.isArray(x.history) ||
    typeof x.reason !== "string"
  )
    return false;
  return (
    x.history.length === x.turn &&
    x.history.every(
      (h, i) =>
        object(h) &&
        h.turn === i + 1 &&
        typeof h.action === "string" &&
        typeof h.result === "string" &&
        typeof h.ai === "string" &&
        validStats(h.stats),
    )
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
          Number(r.mission) >= 1 &&
          Number(r.mission) <= 5 &&
          ["red", "blue"].includes(String(r.role)) &&
          typeof r.won === "boolean" &&
          typeof r.score === "number" &&
          Number.isFinite(r.score) &&
          typeof r.turns === "number" &&
          typeof r.at === "string",
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
  return (
    id === 1 ||
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
        mission: game.mission,
        role: game.role,
        score: score(game),
        won: game.status === "won",
        turns: game.turn,
        at: new Date().toISOString(),
      },
    ],
  };
}
export function terminal(game: Game, command: string): string {
  const c = command.trim().toLowerCase(),
    m = missions[game.mission - 1];
  if (c === "help")
    return "허용된 모의 명령: help · status · map · logs · rules. 행동 카드를 선택해야 턴이 진행됩니다.";
  if (c === "status")
    return `턴 ${game.turn}/${m.turns} | 위험 ${game.stats.risk} | 가용성 ${game.stats.health} | 보안 ${game.stats.security} | 단서 ${game.stats.intel} | 진행 ${game.stats.progress}`;
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
