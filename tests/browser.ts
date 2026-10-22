import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.TEST_URL || "http://127.0.0.1:4173/cyber/";
const button = (name: string) =>
  page.getByRole("button", { name, exact: true });
const nav = async (hash: string) => {
  await page.goto(`${url}#/${hash}`);
  await page.locator("main h1").waitFor();
};
const actions = {
  red: [
    [
      "가상 서비스 지도 조사",
      "허용 규칙 비교",
      "제한된 연결 검증",
      "증거와 개선안 보고",
    ],
    [
      "가상 계정 정책 조사",
      "테스트 세션 권한 조사",
      "읽기 전용 권한 증명",
      "증거와 개선안 보고",
    ],
    [
      "레이블 로그 조사",
      "느린 분산 패턴 재생",
      "라벨과 경보 대조",
      "증거와 개선안 보고",
    ],
    [
      "가상 쿼리 모형 조사",
      "입력 경계 비교",
      "모의 데이터 노출 확인",
      "증거와 개선안 보고",
    ],
    [
      "로그·규칙·계정 연결",
      "최소 영향 경로 선택",
      "연결 증거와 대응안 검증",
      "증거와 개선안 보고",
    ],
  ],
  blue: [
    [
      "방화벽 규칙 조사",
      "관리 포트만 제한",
      "정상 웹과 차단 검증",
      "증거와 개선안 보고",
    ],
    [
      "계정·권한 감사",
      "MFA와 최소 권한 적용",
      "정상 로그인·권한 검증",
      "증거와 개선안 보고",
    ],
    [
      "로그 표본과 시간 조사",
      "맥락 기반 규칙 적용",
      "정상·공격 표본 대조",
      "증거와 개선안 보고",
    ],
    [
      "데이터 흐름 조사",
      "매개변수화·최소 권한",
      "정상·위험 입력 검증",
      "증거와 개선안 보고",
    ],
    [
      "증거 보존·시간선 조사",
      "영향 경로만 격리",
      "안전한 복구·자격 갱신",
      "재발 여부·정상 업무 검증",
      "증거와 개선안 보고",
    ],
  ],
};
try {
  await nav("");
  assert.match(await page.title(), /CYBER DUEL/);
  await nav("missions");
  for (const role of ["red", "blue"] as const) {
    await page
      .getByRole("button", { name: new RegExp(`${role.toUpperCase()} TEAM`) })
      .click();
    assert.equal(await button("잠김").count(), 4, "새 역할은 1단계만 해제");
    await button("학습 안내").click();
    for (let i = 0; i < 5; i++) {
      await button("이 목표로 시뮬레이션 시작").click();
      assert.ok(await button("증거와 개선안 보고").isDisabled());
      for (let j = 0; j < actions[role][i].length; j++) {
        await button(actions[role][i][j]).click();
        if (j === 0) {
          await page.reload();
          await page
            .getByRole("button", { name: actions[role][i][1], exact: true })
            .waitFor();
          assert.match(await page.locator("main").innerText(), /턴 1/);
          if (i === 3) {
            await button("교육용 조건 토큰").click();
            assert.match(
              await page.locator(".mini-panel").nth(0).innerText(),
              /반환된 모의 행 2개/,
            );
            assert.match(
              await page.locator(".mini-panel").nth(1).innerText(),
              /반환된 모의 행 0개/,
            );
          }
        }
      }
      assert.match(await page.locator("main h1").innerText(), /목표 달성/);
      console.log(`PASS browser ${role} mission ${i + 1} + reload`);
      if (i < 4) await button("다음 단계").click();
    }
    await button("단계 선택").click();
    assert.equal(await button("잠김").count(), 0);
  }
  // Persisted records and independent role unlocks.
  await page.reload();
  assert.equal(await page.locator(".role-card").count(), 2);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cyber-duel:v1")!),
  );
  assert.equal(saved.records.filter((r: { won: boolean }) => r.won).length, 10);
  // Failure and retry through actual controls for both roles.
  for (const role of ["RED", "BLUE"]) {
    await page
      .getByRole("button", { name: new RegExp(`${role} TEAM`) })
      .click();
    await page
      .locator(".mission-row")
      .first()
      .getByRole("button", { name: "학습 안내" })
      .click();
    await button("이 목표로 시뮬레이션 시작").click();
    const action = role === "RED" ? "무리한 반복 시도" : "다음 로그 기다리기";
    for (let i = 0; i < 11 && (await button(action).count()); i++)
      await button(action).click();
    assert.match(await page.locator("main h1").innerText(), /목표 미달/);
    await button("다시 도전").click();
    await button("이 목표로 시뮬레이션 시작").click();
    assert.match(await page.locator("main").innerText(), /턴 0/);
    // Pause keeps current game. Return to selection to choose next role.
    await button("일시 정지 · 단계 선택").click();
  }
  await nav("");
  await page.getByRole("link", { name: /이어하기/ }).click();
  assert.match(await page.locator("main").innerText(), /턴 0/);
  await page.locator("#sim-command").fill("rm -rf /");
  await button("입력").click();
  assert.match(
    await page.locator(".terminal-output").innerText(),
    /지원하지 않는 입력/,
  );
  await nav("academy?lesson=network");
  await button("2. IP와 포트는 비밀번호다").click();
  assert.match(await page.getByRole("status").innerText(), /주소와 통신/);
  await button("1. IP는 기기, 포트는 통신 끝점을 구분한다").click();
  await page.reload();
  assert.match(await page.locator("main").innerText(), /학습 완료 1 \/ 12/);
  await button("MFA가 무엇인가요?").click();
  assert.match(await page.locator(".chat-log").innerText(), /서로 다른 종류/);
  await nav("research");
  assert.equal(await page.getByLabel("평가 결과").count(), 0);
  await button("임계값 확정 · 별도 평가 실행").click();
  assert.ok(await page.getByLabel("평가 결과").isVisible());
  assert.ok(await page.getByLabel("규칙 A 임계값").isDisabled());
  await page.screenshot({
    path: "/tmp/cyber-research-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const hash of ["", "missions", "academy", "research", "tutor", "about"]) {
    await nav(hash);
    const dims = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    assert.ok(
      dims.scroll <= dims.width,
      `mobile overflow ${hash}: ${JSON.stringify(dims)}`,
    );
    assert.equal(await page.locator("aside").evaluate((el) => el.inert), true);
    await button("메뉴 열기").click();
    assert.ok(await page.getByRole("navigation").isVisible());
    await button("메뉴 닫기").click();
  }
  await nav("missions");
  await page.screenshot({ path: "/tmp/cyber-play-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS persistence, independent unlocks, failure/retry, quiz, tutor, research, mobile layouts; no JS errors",
  );
} finally {
  await browser.close();
}
