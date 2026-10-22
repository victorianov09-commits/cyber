import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const base = process.env.TEST_URL || "http://127.0.0.1:4173/cyber/";
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const button = (name: string) =>
  page.getByRole("button", { name, exact: true });
let apiCalls = 0;
const fakeKey = "test-browser-key-not-a-real-secret";
let status = 200;
let delay = 0;
await page.route(
  "https://generativelanguage.googleapis.com/**",
  async (route) => {
    apiCalls++;
    assert.equal(route.request().headers()["x-goog-api-key"], fakeKey);
    assert.ok(!route.request().url().includes(fakeKey));
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await route
      .fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "Gemini 테스트 응답: 컴퓨터 개념을 설명해요." },
                ],
              },
            },
          ],
        }),
      })
      .catch(() => {});
  },
);
try {
  await page.goto(`${base}#/tutor`);
  await page
    .getByRole("heading", { name: "AI 학습 도우미", exact: true })
    .waitFor();
  await context.setOffline(true);
  await button("CPU와 RAM의 차이는?").click();
  await page
    .getByRole("log")
    .getByText(/학습 자료: CPU/)
    .waitFor();
  assert.match(await page.getByRole("log").innerText(), /RAM과 저장장치/);
  await page.getByLabel("보안·컴퓨터·정보 학습 질문").fill("파이썬은 뭐야?");
  await button("질문하기").click();
  await page
    .getByRole("log")
    .getByText(/들여쓰기/)
    .waitFor();
  assert.equal(apiCalls, 0, "기본 도우미는 외부 API 요청 없음");
  await context.setOffline(false);
  status = 403;
  await page.getByLabel("개인 Gemini API 키").fill(fakeKey);
  await button("연결 확인하고 사용하기").click();
  await page
    .locator(".gemini-panel")
    .getByRole("alert")
    .getByText(/권한/)
    .waitFor();
  assert.ok(await button("Gemini · 연결 필요").isDisabled());
  status = 200;
  await page.getByLabel("개인 Gemini API 키").fill(fakeKey);
  await button("연결 확인하고 사용하기").click();
  await page
    .getByRole("status")
    .getByText(/연결을 확인했어요/)
    .waitFor();
  assert.equal(await page.getByLabel("개인 Gemini API 키").inputValue(), "");
  assert.equal(await button("Gemini").getAttribute("aria-pressed"), "true");
  await button("DNS가 뭐야?").click();
  await page
    .getByRole("log")
    .getByText(/Gemini 테스트 응답/)
    .waitFor();
  assert.equal(apiCalls, 3);
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  assert.ok(!storage.includes(fakeKey), "키는 브라우저 저장소에 없음");
  await page.screenshot({
    path: "/tmp/cyber-tutor-desktop.png",
    fullPage: true,
  });
  status = 429;
  await button("DNS가 뭐야?").click();
  await page.getByRole("alert").getByText(/한도/).waitFor();
  await page
    .getByRole("log")
    .getByText(/학습 자료: DNS와 도메인/)
    .waitFor();
  assert.equal(await button("기본 지식").getAttribute("aria-pressed"), "true");
  status = 200;
  delay = 2000;
  await button("Gemini").click();
  await button("DNS가 뭐야?").click();
  await page.getByRole("log").getByText("답변을 준비하고 있어요…").waitFor();
  await button("연결 해제 · 키 지우기").click();
  assert.ok(await button("Gemini · 연결 필요").isDisabled());
  // Let the mocked in-flight request finish; it must not restore a disconnected session.
  await page.waitForTimeout(2200);
  assert.ok(await button("Gemini · 연결 필요").isDisabled());
  delay = 0;
  await page.getByLabel("개인 Gemini API 키").fill(fakeKey);
  await button("연결 확인하고 사용하기").click();
  await page
    .getByRole("status")
    .getByText(/연결을 확인했어요/)
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "AI 학습 도우미", exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("개인 Gemini API 키").inputValue(), "");
  assert.ok(await button("Gemini · 연결 필요").isDisabled());
  const startCalls = apiCalls;
  await page
    .getByLabel("보안·컴퓨터·정보 학습 질문")
    .fill('<script>alert("test")</script>');
  await button("질문하기").click();
  await page
    .getByRole("log")
    .getByText(/찾지 못했어요/)
    .waitFor();
  assert.equal(apiCalls, startCalls);
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await button("메뉴 열기").click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "보안 아카데미", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "AI 학습 도우미", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await button("메뉴 열기").waitFor();
  assert.equal(await page.locator("aside").evaluate((el) => el.inert), true);
  await page.goto(`${base}#/tutor`);
  await page
    .getByRole("heading", { name: "AI 학습 도우미", exact: true })
    .waitFor();
  await page.screenshot({
    path: "/tmp/cyber-tutor-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS offline answers without API, Gemini mock connection/answer/quota fallback, disconnect abort, key not persisted, reload, literal text, mobile routes; no JS errors",
  );
  console.log(
    "Gemini API responses were mocked; no real key or live provider was used.",
  );
} finally {
  await browser.close();
}
