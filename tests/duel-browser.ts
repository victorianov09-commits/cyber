import { viableGame } from "./strategy-planner.ts";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { chapters, missions } from "../src/game/missions.ts";
import {
  available,
  actionsFor,
  takeTurn,
  startGame,
  nextChoice,
  type Game,
} from "../src/game/engine.ts";
import { opponentMove } from "../src/game/duel.ts";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const base = process.env.TEST_URL || "http://127.0.0.1:4173/cyber/";
const button = (name: string) =>
  page.getByRole("button", { name, exact: true });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let apiCalls = 0;
await page.route("https://generativelanguage.googleapis.com/**", (r) => {
  apiCalls++;
  return r.abort();
});
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("cyber-duel:v1")!));
try {
  await page.goto(`${base}#/missions`);
  // Restore an actual v1-shaped legacy session without new fields, and keep its records/quiz.
  let old = takeTurn(startGame(missions[0], "red"), missions[0], "map");
  delete old.phase;
  delete old.attackScore;
  delete old.defenseScore;
  old.history.forEach((h) => delete h.exchange);
  await page.evaluate(
    (g) =>
      localStorage.setItem(
        "cyber-duel:v1",
        JSON.stringify({
          version: 1,
          active: g,
          records: [
            {
              mission: 1,
              role: "red",
              score: 900,
              won: true,
              turns: 4,
              at: "2026-10-20T00:00:00Z",
            },
          ],
          quizzes: { logs: 2 },
        }),
      ),
    old,
  );
  await page.reload();
  await page.locator('[data-action-id="rules"]').waitFor();
  assert.equal(await page.locator('[data-action-id="map"]').count(), 0);
  assert.equal(await page.locator('[data-action-id="report"]').count(), 0);
  await page.locator('[data-action-id="rules"]').click();
  await page
    .getByRole("heading", { name: "AI 대응 결과", exact: true })
    .waitFor();
  await page.reload();
  assert.equal((await saved()).active.phase, "response");
  await page.getByRole("button", { name: /다음 턴 선택하기/ }).click();
  assert.equal((await saved()).records[0].score, 900);
  assert.equal((await saved()).quizzes.logs, 2);
  await button("일시 정지 · 단계 선택").click();
  await page.getByRole("button", { name: /^공격/ }).click();
  await button("새 12챕터").click();
  for (const role of ["red", "blue"] as const) {
    await page
      .getByRole("button", {
        name: new RegExp(role === "red" ? "^공격" : "^방어"),
      })
      .click();
    assert.equal(await page.locator(".chapter-card").count(), 12);
    assert.equal(
      await page.locator(".chapter-card button:disabled").count(),
      11,
    );
    await page
      .locator(".chapter-card")
      .first()
      .getByRole("button", { name: "학습 안내" })
      .click();
    for (const mission of chapters) {
      const plan = viableGame(mission, role, "beginner");
      await button("이 목표로 시뮬레이션 시작").click();
      for (let turn = 0; turn < 5; turn++) {
        const g: Game = (await saved()).active;
        assert.equal(g.mission, mission.id);
        const threat = opponentMove(g, mission);
        const actions = actionsFor(g, mission).filter((a) => available(g, a));
        assert.equal(
          await page.locator(".duel-actions .action-card").count(),
          3,
        );
        if (role === "blue")
          assert.match(
            await page.getByLabel("이번 턴 상대 공격").innerText(),
            new RegExp(threat.strategy.name),
          );
        const action = actions.find(
          (a) => a.tactic === plan.history[turn].tactic,
        )!;
        await page.locator(`[data-action-id="${action.id}"]`).click();
        await page
          .getByRole("heading", { name: "AI 대응 결과", exact: true })
          .waitFor();
        assert.equal(
          await page.locator(".duel-actions").count(),
          0,
          "결과 화면에서는 선택지 숨김",
        );
        const state = await saved(),
          ex = state.active.history.at(-1).exchange;
        assert.ok(
          await page
            .getByRole("heading", { name: ex.opponent, exact: true })
            .isVisible(),
        );
        assert.match(
          await page.getByLabel("이번 턴 점수 변화").innerText(),
          /공격 점수/,
        );
        if (turn === 0 || turn === 4) {
          await page.reload();
          await page
            .getByRole("heading", { name: "AI 대응 결과", exact: true })
            .waitFor();
          assert.deepEqual((await saved()).active, state.active);
        }
        if (mission.chapter === 3 && turn === 1) {
          await page
            .locator(".duel-transition")
            .evaluate((el) =>
              Promise.all(el.getAnimations().map((a) => a.finished)),
            );
          await page.screenshot({
            path: `/tmp/cyber-duel-${role}-response.png`,
            fullPage: true,
          });
        }
        if (turn === 4)
          await page
            .getByRole("button", { name: /최종 학습 요약 보기/ })
            .click();
        else
          await page.getByRole("button", { name: /다음 턴 선택하기/ }).click();
      }
      await page.getByRole("heading", { name: /^목표 달성/ }).waitFor();
      const p = await saved();
      assert.equal(p.records.at(-1).mission, mission.id);
      assert.equal(p.records.at(-1).difficulty, "beginner");
      if (mission.chapter! < 12) await button("다음 단계").click();
      console.log(
        `PASS browser ${role} chapter ${mission.chapter}: 5 turns, response reload, summary/save`,
      );
    }
    await button("단계 선택").click();
  }
  await button("고급").click();
  await page
    .locator('[data-chapter="12"]')
    .getByRole("button", { name: "학습 안내" })
    .click();
  await button("이 목표로 시뮬레이션 시작").click();
  assert.equal(await page.locator(".duel-actions .action-card").count(), 5);
  await page.reload();
  assert.equal((await saved()).active.difficulty, "advanced");
  await page.getByText("대결 기록 · 0턴", { exact: true }).click();
  await page.screenshot({
    path: "/tmp/cyber-duel-choice-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "/tmp/cyber-duel-choice-mobile.png",
    fullPage: true,
  });
  await button("일시 정지 · 단계 선택").click();
  await page.getByRole("button", { name: /^방어/ }).click();
  assert.equal(await page.locator(".chapter-card button:disabled").count(), 0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/tmp/cyber-chapters-desktop.png",
    fullPage: true,
  });
  const p = await saved();
  assert.equal(p.records.length, 25);
  assert.equal(p.quizzes.logs, 2);
  assert.equal(p.records.at(-1).history.length, 5);
  await page.goto(`${base}#/research`);
  await page
    .getByRole("heading", { name: "저장된 대결 기록", exact: true })
    .waitFor();
  await page
    .getByText(/AI 모델 보안: 프롬프트 인젝션과 정보 유출 방지 · 방어/)
    .click();
  assert.ok((await page.getByText(/5턴 ·/).count()) > 0);
  assert.equal(apiCalls, 0, "API 키 없이 모든 대결 작동");
  assert.deepEqual(errors, []);
  console.log(
    "PASS 24 campaign routes, legacy v1 resume, hidden future/completed actions, score/save, advanced choices, chapter unlocks, desktop/mobile; 0 Gemini calls, 0 JS errors",
  );
} finally {
  await browser.close();
}
