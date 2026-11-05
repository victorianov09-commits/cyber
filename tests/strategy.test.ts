import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chapters } from "../src/game/missions.ts";
import {
  startGame,
  actionsFor,
  available,
  chooseAction,
  nextChoice,
  type Game,
  type Difficulty,
} from "../src/game/engine.ts";
import {
  configuredTurns,
  difficultyConfig,
  failureDetails,
  strategicOpponent,
  strategicStages,
} from "../src/game/strategy.ts";
import {
  emptyProgress,
  saveProgress,
  loadProgress,
  finish,
  STORAGE_KEY,
} from "../src/game/storage.ts";

import { viableGame } from "./strategy-planner.ts";
for (const m of chapters)
  for (const role of ["red", "blue"] as const)
    for (const difficulty of [
      "beginner",
      "intermediate",
      "advanced",
    ] as Difficulty[])
      test(`${m.chapter} ${role} ${difficulty}: 턴·선택지·완주와 상태 보존`, () => {
        const solved = viableGame(m, role, difficulty);
        assert.equal(solved.status, "won", JSON.stringify(solved.strategy));
        const limit = configuredTurns(m, difficulty);
        assert.equal(
          limit,
          difficulty === "beginner"
            ? 5
            : difficulty === "intermediate"
              ? 8
              : limit,
        );
        if (difficulty === "advanced") assert.ok(limit >= 12 && limit <= 15);
        assert.equal(solved.history.length, limit);
        let g = startGame(m, role, difficulty);
        for (const h of solved.history) {
          const choices = actionsFor(g, m).filter((a) => available(g, a));
          assert.equal(choices.length, difficultyConfig[difficulty].choices);
          assert.ok(choices.every((a) => a.id.startsWith(`step-${g.turn}-`)));
          const announced = strategicOpponent(g, m);
          const before = structuredClone(g);
          const next = chooseAction(g, m, `step-${g.turn}-${h.tactic}`);
          assert.equal(next.turn, g.turn + 1);
          assert.equal(next.phase, "response");
          assert.equal(chooseAction(next, m, `step-${next.turn}-0`), next);
          assert.equal(chooseAction(g, m, "step-99-0"), g);
          assert.equal(
            next.history.at(-1)!.exchange!.opponent,
            announced.strategy.name,
          );
          assert.equal(
            next.attackScore,
            g.attackScore! + next.history.at(-1)!.exchange!.attackDelta,
          );
          assert.equal(
            next.defenseScore,
            g.defenseScore! + next.history.at(-1)!.exchange!.defenseDelta,
          );
          assert.equal(
            next.strategy!.resources - g.strategy!.resources,
            next.history.at(-1)!.exchange!.resourcesDelta,
          );
          assert.deepEqual(g, before);
          for (const n of Object.values(next.stats))
            assert.ok(n >= 0 && n <= 100);
          assert.ok(
            next.strategy!.resources >= 0 && next.strategy!.resources <= 100,
          );
          g = nextChoice(next);
        }
        assert.equal(g.stats.progress, 100);
        assert.equal(g.status, "won");
      });
test("중·고급의 사건은 반복이 아니라 챕터별 후속 사건으로 이어진다", () => {
  assert.equal(chapters.length, 12);
  const followups = new Set<string>();
  const limits = new Set<number>();
  for (const m of chapters) {
    const stages = strategicStages(m).slice(0, configuredTurns(m, "advanced"));
    limits.add(stages.length);
    assert.equal(new Set(stages.map((s) => s.situation)).size, stages.length);
    for (const s of stages.slice(5)) {
      assert.ok(!followups.has(s.situation));
      followups.add(s.situation);
    }
  }
  assert.deepEqual([...limits].sort(), [12, 13, 14, 15]);
});
test("같은 턴도 이전 선택과 자원에 따라 상대·판정·점수·위험이 바뀐다", () => {
  const m = chapters[0],
    g = startGame(m, "blue", "advanced");
  const first = nextChoice(chooseAction(g, m, "step-0-0")),
    second = nextChoice(chooseAction(g, m, "step-0-1"));
  assert.notEqual(
    strategicOpponent(first, m).strategy.name,
    strategicOpponent(second, m).strategy.name,
  );
  assert.notDeepEqual(first.strategy, second.strategy);
  const rich = chooseAction(first, m, "step-1-2");
  const poor = chooseAction(
    { ...first, strategy: { ...first.strategy!, resources: 0 } },
    m,
    "step-1-2",
  );
  assert.notEqual(
    rich.history.at(-1)!.exchange!.quality,
    poor.history.at(-1)!.exchange!.quality,
  );
  assert.notEqual(rich.defenseScore, poor.defenseScore);
  assert.notEqual(rich.stats.risk, poor.stats.risk);
  assert.ok(poor.strategy!.fatigue > rich.strategy!.fatigue);
});
test("고급의 그럴듯한 선택 하나를 반복하면 실패하고 실제 턴에 근거한 피드백을 제공한다", (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw Error("대결은 API를 사용하지 않습니다");
  });
  const m = chapters[11];
  let g = startGame(m, "blue", "advanced");
  for (let i = 0; i < g.turnLimit!; i++)
    g = nextChoice(chooseAction(g, m, `step-${i}-3`));
  assert.equal(g.status, "lost");
  const notes = failureDetails(g);
  assert.ok(notes.some((n) => n.includes("턴")));
  assert.ok(notes.some((n) => n.includes("미해결 위험")));
  assert.ok(notes.some((n) => g.history.some((h) => n.includes(h.action))));
});
test("새 규칙 중간·최종 상태와 기존 5턴 세션·기록을 함께 저장해도 의미가 유지된다", () => {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
    },
  });
  const p = emptyProgress(),
    m = chapters[11];
  const old = startGame(m, "blue", "advanced");
  delete old.rulesVersion;
  delete old.turnLimit;
  delete old.strategy;
  old.stats = { ...m.blue.initial };
  p.active = nextChoice(chooseAction(old, m, "step-0-0"));
  p.records = [
    {
      mission: 1,
      role: "red",
      won: true,
      score: 999,
      turns: 4,
      at: "2026-10-20",
    },
    {
      mission: 112,
      role: "blue",
      difficulty: "advanced",
      won: true,
      score: 933,
      turns: 5,
      at: "2026-11-05",
    },
  ];
  p.quizzes = { logs: 2 };
  saveProgress(p);
  assert.deepEqual(loadProgress(), { data: p, error: "" });
  assert.equal(loadProgress().data.active!.rulesVersion, undefined);
  const solved = viableGame(m, "blue", "advanced");
  for (const turn of [1, 8, 14]) {
    let g = startGame(m, "blue", "advanced");
    for (const h of solved.history.slice(0, turn))
      g = nextChoice(chooseAction(g, m, `step-${g.turn}-${h.tactic}`));
    g = { ...g, phase: "response" };
    p.active = g;
    saveProgress(p);
    assert.deepEqual(loadProgress(), { data: p, error: "" });
  }
  p.active = solved;
  saveProgress(p);
  assert.deepEqual(loadProgress().data.active, solved);
  const ended = finish(p, solved);
  saveProgress(ended);
  assert.deepEqual(loadProgress().data.records.slice(0, 2), p.records);
  assert.deepEqual(loadProgress().data.quizzes, p.quizzes);
  assert.equal(loadProgress().data.records.at(-1)!.turns, 15);
  assert.equal(loadProgress().data.records.at(-1)!.rulesVersion, 2);
  const bad = { ...p, active: { ...solved, turnLimit: 99 } };
  map.set(STORAGE_KEY, JSON.stringify(bad));
  assert.ok(loadProgress().error);
});

test("메인 시작 화면의 소스·기존 스타일·경로 파일은 최신 main과 동일하다", () => {
  assert.equal(
    createHash("sha256").update(readFileSync("src/main.tsx")).digest("hex"),
    "c24ef18fd06d35c4599faad59e6f2ee5e9c6530b9ae959554fd2ecb7de9a1635",
    "src/main.tsx",
  );
  assert.equal(
    createHash("sha256").update(readFileSync("src/style.css")).digest("hex"),
    "25d927c7d138dff9e29dcbdc8912fd0cd159f8900d68e63096dd6cb8a4e34faa",
    "src/style.css",
  );
  assert.equal(
    createHash("sha256").update(readFileSync("src/game.css")).digest("hex"),
    "82c6358916a523a94748ee22c44e8bb9883a1cc43fcbd612a94c24b44772ea1a",
    "src/game.css",
  );
  assert.equal(
    createHash("sha256").update(readFileSync("index.html")).digest("hex"),
    "5fcd84d3d2417f833031389ca97dd253cd24f52839aa3b0c626f2060dc149f68",
    "index.html",
  );
  assert.equal(
    createHash("sha256").update(readFileSync("vite.config.ts")).digest("hex"),
    "e9147f2fa018b928acc12b8207106a43c347bc433b98b95542001a791cf582a8",
    "vite.config.ts",
  );
});
