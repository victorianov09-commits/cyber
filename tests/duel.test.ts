import { test } from "node:test";
import assert from "node:assert/strict";
import { chapters, missions } from "../src/game/missions.ts";
import {
  startGame as startModernGame,
  available,
  takeTurn,
  chooseAction,
  nextChoice,
  type Difficulty,
  type Game,
} from "../src/game/engine.ts";
import { opponentMove } from "../src/game/duel.ts";
import {
  emptyProgress,
  finish,
  loadProgress,
  saveProgress,
  unlocked,
  STORAGE_KEY,
} from "../src/game/storage.ts";

// Archived sessions have no rulesVersion. Keep their original five-turn behavior under test.
function startGame(
  m: (typeof chapters)[number],
  role: "red" | "blue",
  difficulty?: Difficulty,
): Game {
  const game = startModernGame(m, role, difficulty);
  delete game.rulesVersion;
  delete game.turnLimit;
  delete game.strategy;
  game.stats = { ...m[role].initial };
  return game;
}

for (const m of chapters)
  for (const role of ["red", "blue"] as const)
    for (const difficulty of [
      "beginner",
      "intermediate",
      "advanced",
    ] as Difficulty[]) {
      test(`이전 규칙 ${m.chapter}챕터 ${role} ${difficulty}: 5턴과 적합한 전략으로 완주·점수 보존`, () => {
        let g = startGame(m, role, difficulty);
        for (let i = 0; i < 5; i++) {
          const actions = m[role].actions.filter((a) => available(g, a));
          assert.equal(actions.length, difficulty === "advanced" ? 4 : 3);
          assert.ok(actions.every((a) => a.id.startsWith(`step-${i}-`)));
          const announced = opponentMove(g, m);
          const possible = actions.map((a) => ({
            a,
            next: chooseAction(g, m, a.id),
          }));
          const chosen =
            role === "blue"
              ? possible.find((p) => p.a.tactic === announced.index)!
              : possible
                  .filter(
                    (p) => !p.next.history.at(-1)!.exchange!.defenseSucceeded,
                  )
                  .sort((a, b) => a.next.stats.risk - b.next.stats.risk)[0];
          assert.ok(chosen, "안전한 대응 경로가 있어야 합니다");
          const next = chosen.next,
            h = next.history.at(-1)!,
            ex = h.exchange!;
          assert.equal(next.turn, i + 1);
          assert.equal(next.phase, "response");
          assert.equal(
            chooseAction(next, m, actions[0].id),
            next,
            "응답 확인 전에는 추가 행동 불가",
          );
          if (role === "blue")
            assert.equal(
              ex.opponent,
              announced.strategy.name,
              "공개한 공격과 결과의 공격 일치",
            );
          assert.equal(next.attackScore, (g.attackScore ?? 0) + ex.attackDelta);
          assert.equal(
            next.defenseScore,
            (g.defenseScore ?? 0) + ex.defenseDelta,
          );
          for (const key of [
            "risk",
            "health",
            "security",
            "intel",
            "progress",
          ] as const) {
            assert.equal(next.stats[key] - g.stats[key], ex.delta[key]);
            assert.ok(next.stats[key] >= 0 && next.stats[key] <= 100);
          }
          assert.ok(ex.reason.includes(m.stages![i].evidence));
          assert.ok(ex.opponent.length > 0);
          assert.equal(next.stats.progress, (i + 1) * 20);
          assert.equal(g.turn, i, "원본 상태 불변");
          g = nextChoice(next);
        }
        assert.equal(g.status, "won");
        assert.equal(g.history.length, 5);
        assert.equal(chooseAction(g, m, "step-4-0"), g);
      });
    }
test("난이도는 상대 전략·고급 선택지·오판 비용을 바꾸며 과신한 선택은 실패한다", () => {
  const m = chapters[2];
  const seen = new Set<string>();
  for (const difficulty of [
    "beginner",
    "intermediate",
    "advanced",
  ] as Difficulty[]) {
    let g = startGame(m, "blue", difficulty);
    seen.add(opponentMove(g, m).strategy.name);
    for (let i = 0; i < 5; i++) {
      const threat = opponentMove(g, m);
      g = nextChoice(chooseAction(g, m, `step-${i}-${(threat.index + 1) % 3}`));
    }
    assert.equal(g.status, "lost");
  }
  assert.ok(seen.size >= 2);
  const base = startGame(m, "red", "intermediate");
  const quiet = chooseAction(base, m, "step-0-0"),
    broad = chooseAction(base, m, "step-0-1");
  assert.notEqual(quiet.stats.risk, broad.stats.risk);
  const high = { ...nextChoice(quiet), stats: { ...quiet.stats, risk: 65 } };
  const adapted = chooseAction(high, m, "step-1-2");
  assert.equal(adapted.history.at(-1)!.exchange!.defenseSucceeded, true);
});
test("반복 전술에 적응하며 외부 API가 없어도 상대가 작동한다", (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw Error("게임에서 API를 사용하면 안 됩니다");
  });
  const m = chapters[1];
  let g = startGame(m, "red", "advanced");
  g = nextChoice(chooseAction(g, m, "step-0-0"));
  g = chooseAction(g, m, "step-1-0");
  assert.equal(g.history.at(-1)!.exchange!.defenseSucceeded, true);
  assert.match(g.history.at(-1)!.exchange!.opponent, /비밀번호|복구|로그인/);
  assert.equal(
    opponentMove(g, m).strategy.name,
    opponentMove(JSON.parse(JSON.stringify(g)), m).strategy.name,
  );
});
test("기존 5단계 저장·퀴즈·점수 기록을 재해석 없이 보존하고 새 결과도 저장한다", () => {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
    },
  });
  for (const m of missions) {
    const p = emptyProgress(),
      g = startGame(m, "red");
    const first = m.red.actions.find((a) => available(g, a))!;
    const old = takeTurn(g, m, first.id);
    delete old.phase;
    delete old.attackScore;
    delete old.defenseScore;
    old.history.forEach((h) => delete h.exchange);
    p.active = old;
    p.quizzes.logs = 2;
    p.records = [
      {
        mission: m.id,
        role: "red",
        score: 900,
        won: true,
        turns: 4,
        at: "2026-10-20T00:00:00Z",
      },
    ];
    map.set(STORAGE_KEY, JSON.stringify(p));
    assert.deepEqual(loadProgress(), { data: p, error: "" });
    assert.equal(saveProgress(loadProgress().data), "");
    assert.deepEqual(JSON.parse(map.get(STORAGE_KEY)!), p);
  }
  let p = loadProgress().data;
  const oldRecords = structuredClone(p.records),
    oldQuiz = { ...p.quizzes };
  const m = chapters[0];
  let g = startGame(m, "blue", "advanced");
  for (let i = 0; i < 5; i++)
    g = nextChoice(chooseAction(g, m, `step-${i}-${opponentMove(g, m).index}`));
  g = { ...g, phase: "response" };
  p = { ...p, active: g };
  saveProgress(p);
  assert.deepEqual(loadProgress().data.active, g, "최종 결과 화면 저장 복원");
  p = finish(p, g);
  saveProgress(p);
  assert.deepEqual(p.records.slice(0, -1), oldRecords);
  assert.deepEqual(p.quizzes, oldQuiz);
  assert.equal(loadProgress().data.records.at(-1)!.difficulty, "advanced");
  assert.deepEqual(loadProgress().data.records.at(-1)!.history, g.history);
  assert.equal(
    loadProgress().data.records.at(-1)!.defenseScore,
    g.defenseScore,
  );
  assert.ok(unlocked(p, "blue", 102));
  assert.ok(!unlocked(p, "red", 102));
  assert.equal(unlocked(p, "blue", 103), false);
  const broken = { ...p, active: { ...g, attackScore: "NaN" } };
  map.set(STORAGE_KEY, JSON.stringify(broken));
  assert.ok(loadProgress().error);
});
