import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chapters } from "../src/game/missions.ts";
import { viableGame } from "./strategy-planner.ts";
import { configuredTurns, roleLabel } from "../src/game/strategy.ts";
import type { Difficulty } from "../src/game/engine.ts";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.TEST_URL || "http://127.0.0.1:4176/cyber/";
const baseline = process.env.BASELINE_URL || "http://127.0.0.1:4175/cyber/";
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
let apiCalls = 0;
await page.route("https://generativelanguage.googleapis.com/**", (r) => {
  apiCalls++;
  return r.abort();
});
const button = (name: string) =>
  page.getByRole("button", { name, exact: true });
const saved = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("cyber-duel:v1")!));
try {
  // Fresh browser state for both captures; no changes to a user's stored progress.
  const before = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await before.goto(baseline);
  await before
    .getByRole("heading", { name: "CYBER DUEL", exact: true })
    .waitFor();
  await before.evaluate(() => document.fonts.ready);
  const homeBefore = await before.screenshot();
  await writeFile("/tmp/cyber-home-before.png", homeBefore);
  await page.goto(base);
  await page
    .getByRole("heading", { name: "CYBER DUEL", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  const homeAfter = await page.screenshot();
  await writeFile("/tmp/cyber-home-after.png", homeAfter);
  assert.ok(
    homeBefore.equals(homeAfter),
    "메인 시작 화면의 기준/수정본 PNG가 완전히 동일해야 합니다",
  );
  await before.close();
  console.log("PASS home screenshot byte-for-byte identical to main baseline");
  await page.goto(`${base}#/missions`);
  const legacyRecords = [
    {
      mission: 1,
      role: "red",
      won: true,
      score: 999,
      turns: 4,
      at: "2026-10-20",
    },
  ];
  await page.evaluate(
    (records) =>
      localStorage.setItem(
        "cyber-duel:v1",
        JSON.stringify({
          version: 1,
          active: null,
          records,
          quizzes: { logs: 2 },
        }),
      ),
    legacyRecords,
  );
  await page.reload();
  for (const role of ["red", "blue"] as const)
    for (const d of ["beginner", "intermediate", "advanced"] as Difficulty[]) {
      await page.locator(`.role-card:has(.role-label.${role})`).click();
      await button(
        d === "beginner" ? "초급" : d === "intermediate" ? "중급" : "고급",
      ).click();
      await page
        .locator('[data-chapter="1"]')
        .getByRole("button", { name: "학습 안내", exact: true })
        .click();
      await button("이 목표로 시뮬레이션 시작").click();
      const m = chapters[0],
        plan = viableGame(m, role, d);
      assert.equal(plan.turnLimit, configuredTurns(m, d));
      for (const h of plan.history) {
        const g = (await saved()).active;
        assert.equal(
          await page.locator(".duel-actions .action-card").count(),
          d === "beginner" ? 3 : d === "intermediate" ? 4 : 5,
        );
        assert.ok(
          !(await page.locator(".game-area").innerText()).match(
            /RED|BLUE|TEAM/,
          ),
        );
        if (d === "advanced")
          assert.equal(
            await page.getByRole("button", { name: /학습 힌트/ }).count(),
            0,
          );
        await page
          .locator(`[data-action-id="step-${g.turn}-${h.tactic}"]`)
          .click();
        await page
          .getByRole("heading", { name: "AI 대응 결과", exact: true })
          .waitFor();
        assert.equal(await page.locator(".duel-actions").count(), 0);
        assert.ok((await saved()).active.strategy);
        if (h.turn === 2 || h.turn === plan.turnLimit) {
          const old = (await saved()).active;
          await page.reload();
          await page
            .getByRole("heading", { name: "AI 대응 결과", exact: true })
            .waitFor();
          assert.deepEqual((await saved()).active, old);
        }
        if (h.turn === 3 && d === "advanced")
          await page.screenshot({
            path: `/tmp/cyber-strategy-${role}.png`,
            fullPage: true,
          });
        await page
          .getByRole("button", { name: /다음 턴 선택하기|최종 학습 요약 보기/ })
          .click();
      }
      await page.getByRole("heading", { name: /^목표 달성/ }).waitFor();
      assert.equal((await saved()).records.at(-1).turns, plan.turnLimit);
      await button("단계 선택").click();
      console.log(
        `PASS UI ${roleLabel(role)} ${d}: ${plan.turnLimit}턴, 선택·결과·복원·자원 저장`,
      );
    }
  await page.locator(".role-card:has(.role-label.blue)").click();
  await button("고급").click();
  await page
    .locator('[data-chapter="1"]')
    .getByRole("button", { name: "학습 안내" })
    .click();
  await button("이 목표로 시뮬레이션 시작").click();
  for (let i = 0; i < 12; i++) {
    await page.locator(`[data-action-id="step-${i}-3"]`).click();
    await page
      .getByRole("button", { name: /다음 턴 선택하기|최종 학습 요약 보기/ })
      .click();
  }
  await page.getByRole("heading", { name: /목표 미달/ }).waitFor();
  await page.getByLabel("실패 분석").waitFor();
  assert.match(await page.getByLabel("실패 분석").innerText(), /턴/);
  assert.match(await page.getByLabel("실패 분석").innerText(), /미해결 위험/);
  assert.equal((await saved()).records[0].score, 999);
  assert.equal((await saved()).quizzes.logs, 2);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.goto(`${base}#/research`);
  await page
    .getByRole("heading", { name: "학습·연구 대시보드", exact: true })
    .waitFor();
  assert.ok(!(await page.locator("main").innerText()).match(/RED|BLUE|TEAM/));
  assert.equal(apiCalls, 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS detailed failure feedback, old records retained, Korean roles, mobile, 0 API calls, 0 JS errors",
  );
} finally {
  await browser.close();
}
