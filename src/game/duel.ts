import { playStrategicTurn, strategicOpponent } from "./strategy";
import type {
  Action,
  Exchange,
  Game,
  Mission,
  Stats,
  Strategy,
} from "./engine";
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export const difficultyNames = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};
export const difficultyRank = (g: Game) =>
  g.difficulty === "advanced" ? 2 : g.difficulty === "intermediate" ? 1 : 0;
export function opponentMove(
  game: Game,
  mission: Mission,
): { strategy: Strategy; index: number } {
  if (game.rulesVersion === 2) return strategicOpponent(game, mission);
  const level = difficultyRank(game);
  const last = game.history.at(-1)?.exchange;
  // Deterministic, saved-state based: the announced BLUE-turn threat cannot change after selection/reload.
  let index = (game.turn + (mission.chapter ?? mission.id) + level) % 3;
  if (game.stats.risk >= 55) index = 2;
  else if (level >= 1 && last) {
    const previous = game.flags.filter((f) => f.startsWith("tactic:")).at(-1);
    if (previous) index = (Number(previous.split(":")[1]) + 1 + game.turn) % 3;
  }
  if (level === 2 && game.turn >= 2)
    index =
      (index +
        game.history.filter((h) => h.exchange?.defenseSucceeded).length) %
      3;
  const legacyAttacks: Record<number, string[]> = {
    1: [
      "노출된 관리 경로의 가상 접근",
      "정상 웹과 섞인 가상 연결 변화",
      "보호되지 않은 관리 서비스의 부담 증가",
    ],
    2: [
      "공유 계정의 가상 로그인 징후",
      "복구 경로와 세션의 이상 징후",
      "과도한 권한을 가진 가상 계정 접근",
    ],
    3: [
      "실패 횟수가 급증한 합성 로그인",
      "느린 분산 실패 패턴",
      "정상 활동과 섞인 의심 계정군",
    ],
    4: [
      "가상 입력·명령 경계의 혼동",
      "검증 조건을 달리한 교육용 입력",
      "최소 권한이 없는 가상 데이터 접근",
    ],
    5: [
      "여러 로그에 흩어진 이상 징후",
      "남아 있는 가상 재발 경로",
      "복구 구간의 가상 서비스 부담",
    ],
  };
  const pool =
    game.role === "blue"
      ? (mission.attacks ??
        legacyAttacks[mission.id]?.map((name) => ({
          name,
          reason: "가상 로그의 근거를 먼저 수집하고 필요한 경로만 보호하세요.",
        })))
      : mission.defenses;
  return {
    index,
    strategy: pool?.[index] ?? {
      name:
        game.role === "blue" ? "가상 노출 경로 접근" : "접근 통제 및 기록 검토",
      reason: "실제 요청 없이 정책과 정상 업무 영향을 비교합니다.",
    },
  };
}
const changes = (before: Stats, after: Stats): Stats =>
  Object.fromEntries(
    Object.keys(before).map((k) => [
      k,
      after[k as keyof Stats] - before[k as keyof Stats],
    ]),
  ) as Stats;
export function playDuel(game: Game, mission: Mission, action: Action): Game {
  if (game.rulesVersion === 2) return playStrategicTurn(game, mission, action);
  const move = opponentMove(game, mission),
    level = difficultyRank(game),
    tactic = action.tactic ?? 0;
  let responseIndex = move.index;
  // RED's loud or repeated approaches give BLUE evidence to adapt its defense.
  if (game.role === "red") {
    const prior = game.flags.filter((f) => f.startsWith("tactic:")).at(-1);
    if (game.stats.risk >= 55) responseIndex = 2;
    else if (level > 0 && prior)
      responseIndex = Number(prior.split(":")[1]) % 3;
    if (level === 2 && tactic === 1) responseIndex = 1;
  }
  const strategy = (game.role === "red" ? mission.defenses : mission.attacks)![
    responseIndex
  ];
  const defenseSucceeded =
    game.role === "red"
      ? responseIndex === tactic || tactic === 3
      : responseIndex === tactic && tactic !== 3;
  const playerSuccess =
    game.role === "blue" ? defenseSucceeded : !defenseSucceeded;
  const attackDelta =
    game.role === "red" ? (playerSuccess ? 18 : 6) : defenseSucceeded ? 5 : 18;
  const defenseDelta =
    game.role === "blue" ? (playerSuccess ? 18 : 6) : defenseSucceeded ? 18 : 5;
  const stats = {
    ...game.stats,
    progress: Math.min(100, (game.turn + 1) * 20),
    intel: clamp(game.stats.intel + 12),
  };
  stats.risk = clamp(
    stats.risk +
      (playerSuccess ? -3 : 7 + level * 3) +
      (tactic === 1 && game.role === "red" ? 8 : 0) +
      (tactic === 3 ? 9 : 0),
  );
  stats.health = clamp(
    stats.health -
      (playerSuccess ? 1 : 5 + level * 2) -
      (tactic === 1 && game.role === "red" ? 3 : 0) -
      (tactic === 3 ? 7 : 0),
  );
  stats.security = clamp(stats.security + (defenseSucceeded ? 10 : 3));
  const attackScore = (game.attackScore ?? 0) + attackDelta,
    defenseScore = (game.defenseScore ?? 0) + defenseDelta;
  const stage = mission.stages![game.turn];
  const reason = `${strategy.reason} ${defenseSucceeded ? "이번 선택에서는 방어가 위험 경로에 맞아 효과를 보였습니다." : "이번 선택에서는 방어와 위험 유형이 충분히 맞지 않아 일부 위험이 남았습니다."} ${stage.evidence}`;
  const exchange: Exchange = {
    opponent: strategy.name,
    opponentRole: game.role === "red" ? "blue" : "red",
    defenseSucceeded,
    verdict: defenseSucceeded
      ? "방어 성공 · 방어 우세"
      : "방어 미흡 · 공격 우세",
    reason,
    delta: changes(game.stats, stats),
    attackDelta,
    defenseDelta,
  };
  const turn = game.turn + 1;
  const done = turn >= mission.stages!.length;
  const own = game.role === "red" ? attackScore : defenseScore,
    enemy = game.role === "red" ? defenseScore : attackScore;
  const won = own >= enemy && stats.health >= 25 && stats.risk < 95;
  return {
    ...game,
    turn,
    stats,
    attackScore,
    defenseScore,
    phase: "response",
    flags: [
      ...game.flags,
      ...(action.flags ?? []),
      `used:${action.id}`,
      `tactic:${tactic}`,
    ],
    status: done ? (won ? "won" : "lost") : "playing",
    reason: done
      ? won
        ? "다섯 상황을 검토하고 상대 점수 이상의 결과와 안전 조건을 충족했습니다."
        : "다섯 상황을 마쳤지만 점수 또는 안전 조건을 충족하지 못했습니다."
      : "",
    history: [
      ...game.history,
      {
        turn,
        action: action.name,
        result: stage.evidence,
        ai: `${strategy.name}: ${reason}`,
        stats: { ...stats },
        exchange,
      },
    ],
  };
}
export function addLegacyExchange(
  before: Game,
  after: Game,
  mission: Mission,
  action: Action,
): Game {
  if (before === after) return before;
  const pools: Record<number, string[]> = {
    1: [
      "관리 경로 접근 제한",
      "연결 로그 대조와 허용 규칙 점검",
      "관리망 분리와 정상 웹 유지",
    ],
    2: [
      "다중요소 인증 강화 및 로그인 시도 제한",
      "기존 세션·복구 경로 점검",
      "과도한 권한 회수와 세션 종료",
    ],
    3: [
      "맥락 기반 경보 규칙 적용",
      "로그 시간·계정 간격 대조",
      "의심 출발지만 제한",
    ],
    4: [
      "매개변수화와 최소 DB 권한",
      "입력·출력·쿼리 경계 점검",
      "위험 기능만 분리",
    ],
    5: [
      "영향 경로 격리와 자격 갱신",
      "시간선과 복구 근거 점검",
      "단계 복구와 재발 확인",
    ],
  };
  const index =
    before.stats.risk >= 55
      ? 2
      : (before.turn + (action.effect.risk ?? 0) >= 15
          ? before.turn + 1
          : before.turn) % 3;
  const defenseSucceeded =
    before.role === "red"
      ? after.stats.security > before.stats.security ||
        after.stats.progress <= before.stats.progress
      : after.flags.includes("contain") || after.flags.includes("harden");
  const attackDelta = defenseSucceeded ? 5 : 15,
    defenseDelta = defenseSucceeded ? 15 : 5;
  const move = opponentMove(before, mission);
  const opponent =
    before.role === "red" ? pools[mission.id][index] : move.strategy.name;
  const exchange: Exchange = {
    opponent,
    opponentRole: before.role === "red" ? "blue" : "red",
    defenseSucceeded,
    verdict: defenseSucceeded
      ? "방어 성공 · 방어 우세"
      : "방어 미흡 · 공격 우세",
    reason: `${after.history.at(-1)!.ai} ${mission[before.role].feedback}`,
    delta: changes(before.stats, after.stats),
    attackDelta,
    defenseDelta,
  };
  return {
    ...after,
    phase: "response",
    attackScore: (before.attackScore ?? 0) + attackDelta,
    defenseScore: (before.defenseScore ?? 0) + defenseDelta,
    history: after.history.map((h, i) =>
      i === after.history.length - 1 ? { ...h, exchange } : h,
    ),
  };
}
