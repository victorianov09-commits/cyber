import { test } from "node:test";
import assert from "node:assert/strict";
import { startGame, takeTurn, available } from "../src/game/engine.ts";
import { missions } from "../src/game/missions.ts";
const paths = [
  {
    red: ["map", "rules", "probe", "report"],
    blue: ["inspect", "restrict", "verify", "report"],
  },
  {
    red: ["audit", "session", "prove", "report"],
    blue: ["audit", "mfa", "verify", "report"],
  },
  {
    red: ["sample", "slow", "compare", "report"],
    blue: ["sample", "context", "verify", "report"],
  },
  {
    red: ["query", "boundary", "prove", "report"],
    blue: ["query", "parameter", "verify", "report"],
  },
  {
    red: ["timeline", "route", "proof", "report"],
    blue: ["timeline", "isolate", "recover", "verify", "report"],
  },
];
for (const mission of missions)
  for (const role of ["red", "blue"] as const) {
    test(`${mission.id}단계 ${role}: 성공 경로와 상태 변화`, () => {
      let game = startGame(mission, role);
      const invalid = takeTurn(game, mission, "report");
      assert.equal(invalid, game);
      for (const id of paths[mission.id - 1][role]) {
        const action = mission[role].actions.find((a) => a.id === id)!;
        assert.ok(available(game, action), id);
        const before = game;
        game = takeTurn(game, mission, id);
        assert.equal(game.history.length, before.history.length + 1);
        assert.ok(game.turn > before.turn);
        assert.ok(game.history.at(-1)!.ai.length > 0);
        for (const value of Object.values(game.stats))
          assert.ok(value >= 0 && value <= 100);
      }
      assert.equal(game.status, "won", JSON.stringify(game));
      assert.equal(takeTurn(game, mission, "wait"), game);
    });
    test(`${mission.id}단계 ${role}: 실패와 재도전`, () => {
      let game = startGame(mission, role);
      for (let i = 0; i < mission.turns; i++)
        game = takeTurn(game, mission, role === "red" ? "rush" : "wait");
      assert.equal(game.status, "lost");
      assert.equal(startGame(mission, role).turn, 0);
    });
  }
test("AI는 큰 변화와 반복 시도에 다르게 반응한다", () => {
  const m = missions[0],
    g = startGame(m, "red");
  const quiet = takeTurn(g, m, "quiet"),
    noisy = takeTurn(g, m, "rush");
  assert.notEqual(quiet.history[0].ai, noisy.history[0].ai);
  assert.ok(noisy.stats.risk > quiet.stats.risk);
  const twice = takeTurn(noisy, m, "rush");
  assert.ok(
    twice.stats.risk - noisy.stats.risk > noisy.stats.risk - g.stats.risk,
  );
});
const alternatives = [
  { role: "red", id: 1, path: ["map", "alternate", "probe", "report"] },
  { role: "blue", id: 1, path: ["inspect", "allowlist", "verify", "report"] },
  { role: "red", id: 2, path: ["audit", "weak", "prove", "report"] },
  { role: "blue", id: 2, path: ["audit", "lock", "verify", "report"] },
  { role: "red", id: 3, path: ["sample", "burst", "compare", "report"] },
  { role: "blue", id: 3, path: ["sample", "strict", "verify", "report"] },
  { role: "red", id: 4, path: ["query", "validation", "prove", "report"] },
  { role: "blue", id: 4, path: ["query", "isolate", "verify", "report"] },
  { role: "red", id: 5, path: ["timeline", "noisy", "proof", "report"] },
] as const;
for (const alt of alternatives)
  test(`${alt.id}단계 ${alt.role}: 대안 경로도 검증 가능`, () => {
    const m = missions[alt.id - 1];
    let g = startGame(m, alt.role);
    for (const id of alt.path) g = takeTurn(g, m, id);
    assert.equal(g.status, "won");
  });
test("원인 차단 전 복구와 전체 중단에는 비용이 있다", () => {
  const m = missions[0],
    g = startGame(m, "blue");
  const restore = takeTurn(g, m, "restore");
  assert.match(restore.history[0].ai, /재발/);
  const panic = takeTurn(g, m, "panic");
  assert.ok(panic.stats.health < g.stats.health - 40);
});
