import { test } from "node:test";
import assert from "node:assert/strict";
import { dataset, metrics, defaults, predict } from "../src/research.ts";
import {
  terminal,
  unlocked,
  emptyProgress,
  finish,
  loadProgress,
  saveProgress,
  STORAGE_KEY,
} from "../src/game/storage.ts";
import { startGame, takeTurn } from "../src/game/engine.ts";
import { missions } from "../src/game/missions.ts";
test("시드 재현과 조정/평가 분리", () => {
  assert.deepEqual(dataset(42), dataset(42));
  assert.notDeepEqual(dataset(42), dataset(42 ^ 0x9e3779b9));
  const d = dataset(42);
  assert.ok(d.some((e) => e.pattern === "느린 분산 공격"));
  assert.ok(d.some((e) => !e.attack));
});
test("혼동행렬과 지표를 실제 예제로 계산", () => {
  const d = [
    {
      id: 0,
      attack: true,
      pattern: "급격한 공격",
      failures: 10,
      interval: 3,
      accounts: 2,
      offHours: false,
    },
    {
      id: 1,
      attack: false,
      pattern: "정상",
      failures: 10,
      interval: 3,
      accounts: 2,
      offHours: false,
    },
    {
      id: 2,
      attack: false,
      pattern: "정상",
      failures: 0,
      interval: 30,
      accounts: 1,
      offHours: false,
    },
    {
      id: 3,
      attack: true,
      pattern: "느린 분산 공격",
      failures: 2,
      interval: 40,
      accounts: 5,
      offHours: false,
    },
  ] as const;
  assert.deepEqual(metrics([...d], "A", defaults), {
    tp: 1,
    fp: 1,
    tn: 1,
    fn: 1,
    precision: 0.5,
    recall: 0.5,
    fpr: 0.5,
    f1: 0.5,
  });
  assert.deepEqual(metrics([], "A", defaults), {
    tp: 0,
    fp: 0,
    tn: 0,
    fn: 0,
    precision: 0,
    recall: 0,
    fpr: 0,
    f1: 0,
  });
  assert.equal(
    predict({ ...d[0], failures: 7 }, "A", { ...defaults, a: 8 }),
    false,
  );
  for (const r of ["A", "B", "C"] as const) {
    const m = metrics(dataset(42), r, defaults);
    assert.equal(m.tp + m.fp + m.tn + m.fn, 120);
  }
});
test("완료는 같은 역할의 다음 단계만 해제한다", () => {
  let p = emptyProgress();
  assert.ok(unlocked(p, "red", 1));
  assert.ok(!unlocked(p, "red", 2));
  let g = startGame(missions[0], "red");
  for (const a of ["map", "rules", "probe", "report"])
    g = takeTurn(g, missions[0], a);
  p = finish(p, g);
  assert.ok(unlocked(p, "red", 2));
  assert.ok(!unlocked(p, "blue", 2));
  assert.ok(!unlocked(p, "red", 3));
});
test("모의 터미널은 허용된 명령만 처리한다", () => {
  const g = startGame(missions[0], "red");
  assert.match(terminal(g, "status"), /턴 0/);
  assert.match(terminal(g, "map"), /방화벽/);
  assert.match(terminal(g, "rm -rf /"), /지원하지/);
  assert.match(terminal(g, "fetch https://example.com"), /지원하지/);
  assert.equal(g.turn, 0);
});
test("저장 복원, 손상 데이터와 저장 실패 처리", () => {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
    },
  });
  const p = emptyProgress();
  p.active = startGame(missions[0], "blue");
  p.quizzes.logs = 2;
  assert.equal(saveProgress(p), "");
  assert.deepEqual(loadProgress().data, p);
  map.set(STORAGE_KEY, "broken");
  assert.ok(loadProgress().error);
  map.set(
    STORAGE_KEY,
    JSON.stringify({ ...p, active: { ...p.active, stats: { risk: 8 } } }),
  );
  assert.ok(loadProgress().error);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("quota");
      },
    },
  });
  assert.ok(saveProgress(p));
  assert.ok(loadProgress().error);
});
test("로그 특징은 실제 생성한 가상 이벤트와 일치한다", () => {
  for (const row of dataset(42)) {
    assert.ok(row.events && row.events.length >= 2);
    const events = row.events!;
    assert.ok(events.at(-1)!.second - events[0].second <= 300);
    assert.equal(events.filter((e) => !e.success).length, row.failures);
    assert.equal(new Set(events.map((e) => e.account)).size, row.accounts);
    assert.equal(
      (events.at(-1)!.second - events[0].second) / (events.length - 1),
      row.interval,
    );
    assert.ok(events.every((e) => e.attack === row.attack));
  }
});
