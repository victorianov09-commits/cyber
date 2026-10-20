export type Role = "red" | "blue";
export type Stats = {
  risk: number;
  health: number;
  security: number;
  intel: number;
  progress: number;
};
export type Action = {
  id: string;
  name: string;
  description: string;
  effect: Partial<Stats>;
  flags?: string[];
  requires?: string[];
  excludes?: string[];
  once?: boolean;
  cost?: number;
  result: string;
};
export type OpponentRules = {
  loudProgress: number;
  loudRisk: number;
  surveillance: number;
  cautious: number;
  repeatPenalty: number;
  unprotectedDamage: number;
  observedDamage: number;
  protectedDamage: number;
  hardenedSecurity: number;
  progressPenalty: number;
};
export type RolePlan = {
  aiRules: OpponentRules;
  objective: string;
  win: string[];
  actions: Action[];
  ai: string;
  feedback: string;
  initial: Stats;
};
export type Mission = {
  id: number;
  title: string;
  intro: string;
  concepts: string[];
  hint: string;
  nodes: string[];
  turns: number;
  red: RolePlan;
  blue: RolePlan;
};
export type Turn = {
  turn: number;
  action: string;
  result: string;
  ai: string;
  stats: Stats;
};
export type Game = {
  mission: number;
  role: Role;
  stats: Stats;
  flags: string[];
  turn: number;
  history: Turn[];
  status: "playing" | "won" | "lost";
  reason: string;
};
export const initialStats: Stats = {
  risk: 15,
  health: 90,
  security: 35,
  intel: 0,
  progress: 0,
};
export function startGame(mission: Mission, role: Role): Game {
  return {
    mission: mission.id,
    role,
    stats: { ...mission[role].initial },
    flags: [],
    turn: 0,
    history: [],
    status: "playing",
    reason: "",
  };
}
export function available(game: Game, action: Action): boolean {
  return (
    game.status === "playing" &&
    (!action.once || !game.flags.includes(`used:${action.id}`)) &&
    (action.requires ?? []).every((f) => game.flags.includes(f)) &&
    !(action.excludes ?? []).some((f) => game.flags.includes(f))
  );
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function takeTurn(game: Game, mission: Mission, id: string): Game {
  const plan = mission[game.role],
    rules = plan.aiRules,
    action = plan.actions.find((a) => a.id === id);
  if (!action || !available(game, action)) return game;
  const stats = { ...game.stats };
  for (const key of Object.keys(stats) as (keyof Stats)[])
    stats[key] = clamp(stats[key] + (action.effect[key] ?? 0));
  const flags = [
    ...new Set([...game.flags, ...(action.flags ?? []), `used:${id}`]),
  ];
  const turn = game.turn + (action.cost ?? 1);
  const repeated = game.history.at(-1)?.action === action.name;
  let ai: string;
  // Opponent adapts to the preceding action and current simulated state. No network or shell execution.
  if (game.role === "red") {
    const noise =
      (action.effect.progress ?? 0) >= rules.loudProgress ||
      (action.effect.risk ?? 0) >= rules.loudRisk;
    stats.risk = clamp(
      stats.risk +
        (noise ? rules.surveillance : rules.cautious) +
        (repeated ? rules.repeatPenalty : 0),
    );
    if (noise) {
      stats.security = clamp(stats.security + 12);
      ai = "방어 AI: 큰 변화를 감지해 감시와 접근 제한을 강화했습니다.";
    } else if (stats.intel >= 40) {
      ai =
        "방어 AI: 정기 점검을 수행했습니다. 수집한 단서로 허가 범위 안에서 다음 행동을 고르세요.";
    } else {
      ai = "방어 AI: 기본 접근 통제를 유지하고 연결 기록을 남겼습니다.";
    }
    if (stats.security >= rules.hardenedSecurity) {
      stats.progress = clamp(stats.progress - rules.progressPenalty);
      ai += ` 강화된 통제로 검증 진행도 ${rules.progressPenalty} 감소.`;
    }
  } else {
    const protectedNow = flags.includes("contain") || flags.includes("harden");
    const damage = protectedNow
      ? rules.protectedDamage
      : stats.intel >= 30
        ? rules.observedDamage
        : rules.unprotectedDamage;
    stats.health = clamp(stats.health - damage);
    stats.risk = clamp(
      stats.risk +
        (protectedNow ? -3 : 8) +
        (repeated ? rules.repeatPenalty : 0),
    );
    ai = protectedNow
      ? "공격 AI: 차단된 경로 대신 다른 접근을 시도했습니다. 보호 조치가 피해를 줄였습니다."
      : stats.intel >= 30
        ? "공격 AI: 조사 중인 경로를 피해 시도를 분산했습니다. 아직 서비스에 피해가 생깁니다."
        : "공격 AI: 노출된 경로를 이용해 서비스에 부담을 주었습니다.";
    if (action.id === "restore" && !flags.includes("contain")) {
      stats.health = clamp(stats.health - 15);
      ai += " 원인 차단 전 복구로 문제가 재발했습니다.";
    }
  }
  let status: Game["status"] = "playing",
    reason = "";
  const success =
    plan.win.every((f) => flags.includes(f)) &&
    stats.progress >= 70 &&
    stats.intel >= 30 &&
    stats.health >= 25 &&
    (game.role === "red" ? stats.risk < 95 : stats.security >= 60);
  if (stats.health <= 0 || stats.risk >= 100) {
    status = "lost";
    reason =
      stats.health <= 0
        ? "서비스 가용성이 소진되었습니다."
        : "위험도가 한계에 도달했습니다.";
  } else if (success) {
    status = "won";
    reason = "필수 목표를 달성하고 안전 조건을 충족했습니다.";
  } else if (turn >= mission.turns) {
    status = "lost";
    reason = "제한 턴 안에 목표와 안전 조건을 함께 달성하지 못했습니다.";
  }
  return {
    ...game,
    stats,
    flags,
    turn,
    status,
    reason,
    history: [
      ...game.history,
      {
        turn,
        action: action.name,
        result: action.result,
        ai,
        stats: { ...stats },
      },
    ],
  };
}
export function score(game: Game): number {
  return Math.max(
    0,
    Math.round(
      (game.status === "won" ? 400 : 0) +
        game.stats.progress * 2 +
        game.stats.health +
        game.stats.intel +
        (100 - game.stats.risk) +
        Math.max(0, 12 - game.turn) * 10,
    ),
  );
}
