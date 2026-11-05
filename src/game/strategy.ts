import type {
  Action,
  Difficulty,
  DuelStage,
  Exchange,
  Game,
  Mission,
  Stats,
  StrategyState,
} from "./engine";
import { expertTurns, followUps } from "./escalations";
export const roleLabel = (role: "red" | "blue") =>
  role === "red" ? "공격" : "방어";
export const displayBattleText = (text: string) =>
  text
    .replace(/RED TEAM|RED 우세|RED 공격/g, "공격")
    .replace(/BLUE TEAM|BLUE 우세|BLUE 방어/g, "방어");
export const difficultyConfig = {
  beginner: { turns: 5, choices: 3, threshold: 65 },
  intermediate: { turns: 8, choices: 4, threshold: 69 },
  advanced: { turns: 15, choices: 5, threshold: 72 },
};
export const configuredTurns = (mission: Mission, difficulty: Difficulty) =>
  !mission.chapter
    ? mission.turns
    : difficulty === "advanced"
      ? expertTurns[mission.chapter - 1]
      : difficultyConfig[difficulty].turns;
export const turnLimit = (game: Game, mission: Mission) =>
  game.rulesVersion === 2 ? game.turnLimit! : mission.turns;
export const freshStrategy = (): StrategyState => ({
  resources: 100,
  pressure: 24,
  preparedness: 20,
  exposure: 10,
  unresolved: 0,
  fatigue: 0,
});
export function initializeStrategy(game: Game, mission: Mission): Game {
  const level =
    game.difficulty === "advanced"
      ? 2
      : game.difficulty === "intermediate"
        ? 1
        : 0;
  return {
    ...game,
    rulesVersion: 2,
    turnLimit: configuredTurns(mission, game.difficulty!),
    strategy: { ...freshStrategy(), pressure: 18 + level * 6 },
    stats: { ...game.stats, risk: 20 + level * 5 },
  };
}
export type StrategicStage = DuelStage & {
  focus: string;
  threat: number;
  urgency: number;
};
export function strategicStages(mission: Mission): StrategicStage[] {
  const chapter = mission.chapter!;
  const original = mission.stages!.map((s, i) => ({
    ...s,
    focus: mission.blue.actions.find((a) => a.id === `step-${i}-0`)!.name,
    threat: (chapter + i * 2) % 3,
    urgency: (chapter + i) % 3,
  }));
  return [
    ...original,
    ...followUps[chapter - 1].map(([situation, focus, evidence], i) => ({
      situation,
      focus,
      evidence,
      threat: (chapter + i + 1) % 3,
      urgency: (chapter + i * 2) % 3,
    })),
  ];
}
export const currentSituation = (game: Game, mission: Mission) =>
  game.rulesVersion === 2
    ? strategicStages(mission)[game.turn]?.situation
    : mission.stages?.[game.turn]?.situation;
// Different operating constraints per chapter, not only different prose/turn counts.
const profiles = [
  {
    evidence: 1.15,
    repeat: 7,
    isolation: 2,
    pressure: 0,
    contain: 5,
    review: 9,
  },
  { evidence: 1, repeat: 7, isolation: 3, pressure: 0, contain: 5, review: 9 },
  { evidence: 1, repeat: 9, isolation: 2, pressure: 0, contain: 5, review: 10 },
  {
    evidence: 1.1,
    repeat: 7,
    isolation: 2,
    pressure: 0,
    contain: 5,
    review: 10,
  },
  {
    evidence: 1.2,
    repeat: 7,
    isolation: 2,
    pressure: 0,
    contain: 5,
    review: 9,
  },
  { evidence: 1, repeat: 7, isolation: 2, pressure: 1, contain: 7, review: 9 },
  {
    evidence: 1.1,
    repeat: 7,
    isolation: 4,
    pressure: 0,
    contain: 5,
    review: 9,
  },
  {
    evidence: 1.05,
    repeat: 7,
    isolation: 3,
    pressure: 0,
    contain: 6,
    review: 10,
  },
  {
    evidence: 1.1,
    repeat: 7,
    isolation: 2,
    pressure: 0,
    contain: 5,
    review: 13,
  },
  { evidence: 1, repeat: 9, isolation: 3, pressure: 0, contain: 5, review: 9 },
  {
    evidence: 1.25,
    repeat: 8,
    isolation: 2,
    pressure: 0,
    contain: 5,
    review: 10,
  },
  {
    evidence: 1.15,
    repeat: 8,
    isolation: 2,
    pressure: 1,
    contain: 6,
    review: 11,
  },
];
const costs = [6, 5, 8, 3, 10];
const actionCost = (mission: Mission, tactic: number) =>
  costs[tactic] +
  (tactic === 4 && [4, 8, 9, 12].includes(mission.chapter!) ? 1 : 0);
export function strategicActions(game: Game, mission: Mission): Action[] {
  if (game.status !== "playing" || game.turn >= turnLimit(game, mission))
    return [];
  const stage = strategicStages(mission)[game.turn];
  const originals = mission[game.role].actions
    .filter((a) => a.id.startsWith(`step-${game.turn}-`))
    .slice(0, 3);
  const focus = stage.focus;
  const names =
    game.role === "blue"
      ? [
          `${focus} · 정책 적용`,
          `${focus} · 근거 대조`,
          `${focus} · 영향 경로 분리`,
          `${focus} · 제한 유지와 대응 여력 회복`,
          `${focus} · 독립 검증 뒤 단계 적용`,
        ]
      : [
          `${focus}의 신뢰 경계 비교`,
          `${focus}의 대체 가설 비교`,
          `${focus}의 제한된 조건 비교`,
          `${focus}의 증거 정리와 관찰 여력 회복`,
          `${focus}의 독립 관찰 결과 대조`,
        ];
  return Array.from(
    { length: difficultyConfig[game.difficulty!].choices },
    (_, tactic) => ({
      id: `step-${game.turn}-${tactic}`,
      tactic,
      once: true,
      name:
        tactic < 3 && originals[tactic]
          ? originals[tactic].name
          : names[tactic],
      description:
        [
          "확인한 경계에 직접 조치합니다. 빠른 효과와 업무 영향을 함께 고려합니다.",
          "추가 근거를 모아 판단의 확실성을 높입니다. 조사하는 동안 위험이 남을 수 있습니다.",
          "영향 범위를 분리합니다. 확산은 줄지만 정상 업무와 대응 여력을 사용합니다.",
          "현재 제한을 유지하며 대응 여력을 보충합니다. 긴급한 위험의 해소는 늦어질 수 있습니다.",
          "독립 검토와 단계 적용을 병행합니다. 준비가 충분하면 강하지만 검증 비용이 큽니다.",
        ][tactic] +
        ` 대응 여력 ${actionCost(mission, tactic)} 소모${tactic === 3 ? " · 회복 +9" : ""}.`,
      effect: {},
      result: stage.evidence,
      flags: [`stage:${game.turn + 1}`],
      excludes: [`stage:${game.turn + 1}`],
    }),
  );
}
export function strategicOpponent(game: Game, mission: Mission) {
  const s = game.strategy!,
    stage = strategicStages(mission)[Math.min(game.turn, game.turnLimit! - 1)];
  const level =
    game.difficulty === "advanced"
      ? 2
      : game.difficulty === "intermediate"
        ? 1
        : 0;
  const prior = game.history.slice(-3).map((h) => h.tactic ?? 0);
  let index = (stage.threat + Math.floor(s.pressure / 25) + s.unresolved) % 3;
  if (level > 0 && prior.length)
    index = (index + prior.at(-1)! + game.turn) % 3;
  if (level === 2 && prior.length >= 2 && prior.at(-1) === prior.at(-2))
    index = prior.at(-1)! % 3;
  if (level === 2 && s.resources < 30) index = 2;
  if (game.role === "red" && s.exposure >= 45) index = prior.at(-1)! % 3 || 0;
  const pool = game.role === "blue" ? mission.attacks! : mission.defenses!;
  const context =
    s.resources < 30
      ? " · 대응 공백 집중"
      : s.unresolved >= 2
        ? " · 미해결 경로 재평가"
        : s.exposure >= 45
          ? " · 노출 흔적 집중"
          : prior.length > 1 && prior.at(-1) === prior.at(-2)
            ? " · 반복 전술 재평가"
            : "";
  return {
    index,
    strategy: {
      name: pool[index].name + context,
      reason:
        "현재 사건의 긴급성과 이전 조치의 영향, 남은 대응 여력을 함께 검토해야 합니다.",
    },
  };
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function playStrategicTurn(
  game: Game,
  mission: Mission,
  action: Action,
): Game {
  const level =
    game.difficulty === "advanced"
      ? 2
      : game.difficulty === "intermediate"
        ? 1
        : 0;
  const config = difficultyConfig[game.difficulty!],
    old = game.strategy!,
    tactic = action.tactic!;
  const profile = profiles[mission.chapter! - 1],
    cost = actionCost(mission, tactic);
  const stage = strategicStages(mission)[game.turn],
    move = strategicOpponent(game, mission);
  const previous = game.history.slice(-3).map((h) => h.tactic);
  const repeated = previous.filter((t) => t === tactic).length;
  const insufficient = old.resources < cost;
  const fit =
    game.role === "blue"
      ? [
          [29, 5, 15],
          [7, 28, 10],
          [16, 6, 29],
        ][tactic]?.[move.index]
      : tactic < 3
        ? tactic === move.index
          ? 0
          : 30
        : undefined;
  const preparation =
    (old.preparedness / 6) * profile.evidence + game.stats.intel / 15;
  const support =
    tactic === 3
      ? old.resources < 40 && old.pressure < 60
        ? 28
        : 8
      : tactic === 4
        ? old.preparedness >= 40
          ? 30
          : 16
        : fit!;
  const quality = Math.round(
    clamp(
      48 -
        level * 2 +
        support +
        preparation -
        old.pressure / 8 -
        old.unresolved * 2 -
        stage.urgency * 2 -
        repeated * (level === 2 ? profile.repeat : level === 1 ? 4 : 2) -
        (insufficient ? 22 : 0) -
        old.fatigue / 5,
    ),
  );
  const partial = quality >= 55;
  const playerSuccess = quality >= config.threshold;
  const defenseSucceeded =
    game.role === "blue" ? playerSuccess : !playerSuccess;
  const ownDelta = Math.max(3, Math.min(22, Math.round((quality - 34) / 2)));
  const opposingDelta = playerSuccess
    ? 6
    : Math.min(22, 14 + level * 2 + old.unresolved);
  const attackDelta = game.role === "red" ? ownDelta : opposingDelta,
    defenseDelta = game.role === "blue" ? ownDelta : opposingDelta;
  const next: StrategyState = {
    resources: clamp(old.resources - cost + (tactic === 3 ? 9 : 0)),
    pressure: clamp(
      old.pressure +
        profile.pressure +
        (playerSuccess ? -9 : partial ? 3 : 7 + level) +
        (tactic === 2 ? -profile.contain : 0) +
        (tactic === 1 ? 3 : 0) +
        (tactic === 3 ? stage.urgency * 3 : 0),
    ),
    preparedness: clamp(
      old.preparedness + [0, 12, -2, 4, profile.review][tactic],
    ),
    exposure: clamp(
      old.exposure + [2, 7, 4, -9, 1][tactic] + (repeated ? level * 3 : 0),
    ),
    unresolved: Math.max(
      0,
      Math.min(10, old.unresolved + (playerSuccess ? -1 : partial ? 0 : 1)),
    ),
    fatigue: clamp(
      old.fatigue + (insufficient ? 12 : 0) + (tactic === 3 ? -9 : level + 1),
    ),
  };
  const stats: Stats = {
    ...game.stats,
    risk: clamp(
      game.stats.risk +
        (playerSuccess ? -3 : partial ? 4 : 6 + level * 2) +
        (next.unresolved >= 3 ? 3 : 0) +
        (tactic === 3 && stage.urgency === 2 ? 3 : 0),
    ),
    health: clamp(
      game.stats.health -
        (playerSuccess ? 0 : partial ? 2 : 3 + level) -
        (tactic === 2 ? profile.isolation : 0) -
        (insufficient ? 4 : 0),
    ),
    intel: clamp(game.stats.intel + (tactic === 1 ? 12 : tactic === 4 ? 9 : 3)),
    security: clamp(game.stats.security + (defenseSucceeded ? 6 : 1)),
    progress: Math.round(((game.turn + 1) / game.turnLimit!) * 100),
  };
  const cause = insufficient
    ? "요구한 검증 비용에 비해 대응 여력이 부족했습니다."
    : repeated >= 2
      ? "같은 전술이 반복되어 상대가 패턴에 적응했습니다."
      : tactic === 3 && stage.urgency === 2
        ? "여력은 회복했지만 긴급한 위험 처리가 지연됐습니다."
        : tactic === 4 && old.preparedness < 40
          ? "독립 검증을 활용할 준비가 충분하지 않았습니다."
          : playerSuccess
            ? "현재 위험과 준비 상태에 맞는 조치가 효과를 보였습니다."
            : "선택한 조치만으로 현재 위험과 남은 미해결 경로를 충분히 다루지 못했습니다.";
  const reason = `${cause} ${stage.evidence} 판정 ${quality}/${config.threshold}, 대응 여력 ${old.resources} → ${next.resources}, 미해결 위험 ${old.unresolved} → ${next.unresolved}.`;
  const exchange: Exchange = {
    opponent: move.strategy.name,
    opponentRole: game.role === "red" ? "blue" : "red",
    defenseSucceeded,
    verdict: defenseSucceeded
      ? "방어 성공 · 방어 우세"
      : "방어 미흡 · 공격 우세",
    reason,
    delta: Object.fromEntries(
      Object.keys(stats).map((k) => [
        k,
        stats[k as keyof Stats] - game.stats[k as keyof Stats],
      ]),
    ) as Stats,
    attackDelta,
    defenseDelta,
    resourcesDelta: next.resources - old.resources,
    quality,
  };
  const attackScore = (game.attackScore ?? 0) + attackDelta,
    defenseScore = (game.defenseScore ?? 0) + defenseDelta;
  const turn = game.turn + 1,
    done = turn === game.turnLimit;
  const own = game.role === "red" ? attackScore : defenseScore,
    enemy = game.role === "red" ? defenseScore : attackScore;
  const won =
    own >= enemy &&
    stats.health >= 25 + level * 5 &&
    stats.risk < (level === 2 ? 85 : 95) &&
    next.resources >= (level === 2 ? 8 : 0) &&
    next.unresolved <= (level === 2 ? 2 : 4);
  const reasonEnd = done
    ? `${turn}턴 완료 · 내 점수 ${own} / 상대 ${enemy}, 가용성 ${stats.health}/${25 + level * 5} 이상, 위험도 ${stats.risk}/${level === 2 ? 85 : 95} 미만, 남은 여력 ${next.resources}, 미해결 위험 ${next.unresolved}. ${won ? "종합 조건을 충족했습니다." : "종합 조건을 충족하지 못했습니다."}`
    : "";
  return {
    ...game,
    turn,
    stats,
    strategy: next,
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
    reason: reasonEnd,
    history: [
      ...game.history,
      {
        turn,
        action: action.name,
        tactic,
        result: stage.evidence,
        ai: `${move.strategy.name}: ${reason}`,
        stats: { ...stats },
        strategy: { ...next },
        exchange,
      },
    ],
  };
}
export function failureDetails(game: Game): string[] {
  if (game.status !== "lost" || game.rulesVersion !== 2) return [];
  const state = game.strategy!,
    high = game.difficulty === "advanced";
  const notes = [game.reason];
  if (state.resources < (high ? 8 : 20))
    notes.push(
      `대응 여력이 ${state.resources} 남았습니다. 독립 검증·격리 비용을 비교하고 긴급도가 낮을 때 여력을 회복하도록 순서를 바꿔 보세요.`,
    );
  if (state.unresolved > 2)
    notes.push(
      `미해결 위험이 ${state.unresolved}개입니다. 조사나 복구를 반복하는 동안 남은 경로를 적절히 제한했는지 확인하세요.`,
    );
  if (state.fatigue > 25)
    notes.push(
      `누적 피로가 ${state.fatigue}입니다. 자원이 부족한 상태에서 고비용 조치를 반복하면 검증 효과와 가용성이 떨어집니다.`,
    );
  const failed = game.history
    .filter(
      (h) =>
        (h.exchange?.quality ?? 100) <
        difficultyConfig[game.difficulty!].threshold,
    )
    .slice(-3);
  notes.push(
    ...failed.map((h) => `${h.turn}턴 ‘${h.action}’: ${h.exchange!.reason}`),
  );
  return notes;
}
