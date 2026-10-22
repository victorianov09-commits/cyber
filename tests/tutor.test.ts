import { test } from "node:test";
import assert from "node:assert/strict";
import { localTutor } from "../src/tutor.ts";
test("데모 질문이 한국어 어미를 인가 개념으로 오인하지 않는다", async () => {
  assert.match(
    await localTutor.answer("MFA가 무엇인가요?"),
    /학습 자료: 비밀번호와 MFA/,
  );
  assert.match(
    await localTutor.answer("오탐과 미탐의 차이는?"),
    /학습 자료: 로그/,
  );
  assert.match(
    await localTutor.answer("SQL 인젝션은 어떻게 막나요?"),
    /매개변수화/,
  );
  assert.match(
    await localTutor.answer("인증과 인가는 어떻게 다른가요?"),
    /학습 자료: 인증과 인가/,
  );
  assert.match(
    await localTutor.answer("점심 메뉴 추천"),
    /실제 생성형 AI 답변이 아닙니다/,
  );
});

import { knowledgeTopics, searchKnowledge } from "../src/knowledge.ts";
import {
  askGemini,
  DEFAULT_GEMINI_MODEL,
  validateConnection,
} from "../src/tutor.ts";

test("보안뿐 아니라 컴퓨터·웹·프로그래밍 개념과 비교 질문을 검색한다", async () => {
  for (const [question, expected] of [
    ["CPU와 RAM의 차이는?", /학습 자료: CPU[\s\S]*학습 자료: RAM과 저장장치/],
    ["DNS가 뭐야?", /도메인/],
    ["파이썬을 설명해 줘", /들여쓰기/],
    ["쿠키랑 세션은?", /세션 식별자/],
    ["개인정보 익명화가 뭐야?", /가명화/],
    ["유니코드와 UTF-8", /코드 포인트/],
  ] as const)
    assert.match(await localTutor.answer(question), expected);
});

test("모든 주제가 용어 목록의 제목으로 검색되며 모르는 질문을 지어내지 않는다", async () => {
  assert.ok(knowledgeTopics.length >= 60);
  for (const topic of knowledgeTopics)
    assert.ok(
      searchKnowledge(topic.title).some((t) => t.id === topic.id),
      topic.title,
    );
  assert.match(
    await localTutor.answer("양자 워크플로 2099년 최신 발표"),
    /찾지 못했어요/,
  );
});

test("짧은 영어 약어와 한국어 접두어를 다른 개념으로 오인하지 않는다", () => {
  assert.equal(searchKnowledge("javascript")[0].title, "JavaScript");
  assert.equal(searchKnowledge("자바스크립트")[0].title, "JavaScript");
  assert.ok(!searchKnowledge("자바스크립트").some((t) => t.title === "Java"));
  assert.equal(searchKnowledge("https")[0].title, "HTTPS와 TLS");
  assert.ok(
    !searchKnowledge("github pages").some((t) => t.title === "Git과 GitHub"),
  );
  assert.equal(searchKnowledge("relationship").length, 0);
});

test("Gemini 요청은 키를 URL이나 질문에 넣지 않고 검증된 텍스트만 반환한다", async (t) => {
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      calls++;
      assert.ok(!url.includes("test-key-not-a-secret"));
      assert.equal(options.credentials, "omit");
      assert.equal(
        new Headers(options.headers).get("x-goog-api-key"),
        "test-key-not-a-secret",
      );
      const body = JSON.parse(options.body as string);
      assert.equal(body.contents[0].parts[0].text, "DNS 설명해 줘");
      assert.ok(!JSON.stringify(body).includes("test-key-not-a-secret"));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: "숨은 생각", thought: true },
                  { text: "DNS는 이름을 주소로 연결해요." },
                ],
              },
            },
          ],
        }),
      );
    },
  );
  assert.equal(
    await askGemini(
      { apiKey: "test-key-not-a-secret", model: DEFAULT_GEMINI_MODEL },
      "DNS 설명해 줘",
    ),
    "DNS는 이름을 주소로 연결해요.",
  );
  assert.equal(calls, 1);
});

test("Gemini의 인증·모델·할당량·서버 오류를 키 유출 없이 설명한다", async (t) => {
  let status = 400;
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("test-key-not-a-secret", { status }),
  );
  for (const [code, expected] of [
    [400, /API 키/],
    [401, /인증/],
    [403, /권한/],
    [404, /모델/],
    [429, /한도/],
    [503, /서비스 오류/],
  ] as const) {
    status = code;
    await assert.rejects(
      askGemini(
        { apiKey: "test-key-not-a-secret", model: DEFAULT_GEMINI_MODEL },
        "CPU",
      ),
      (error: Error) =>
        expected.test(error.message) &&
        !error.message.includes("test-key-not-a-secret"),
    );
  }
});

test("빈 응답·잘못된 JSON·안전 차단·길이 제한을 처리한다", async (t) => {
  let value = "{}";
  t.mock.method(globalThis, "fetch", async () => new Response(value));
  const call = () =>
    askGemini(
      { apiKey: "test-key-not-a-secret", model: DEFAULT_GEMINI_MODEL },
      "CPU",
    );
  await assert.rejects(call(), /표시할 답변/);
  value = "null";
  await assert.rejects(call(), /형식/);
  value = "not-json";
  await assert.rejects(call(), /형식/);
  value = JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } });
  await assert.rejects(call(), /제한/);
  value = JSON.stringify({
    candidates: [
      { finishReason: "MAX_TOKENS", content: { parts: [{ text: "CPU는" }] } },
    ],
  });
  assert.match(await call(), /길이 제한/);
});

test("네트워크 오류·취소를 안내하고 잘못된 설정은 요청 전에 거부한다", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new TypeError("private request details");
  });
  const config = {
    apiKey: "test-key-not-a-secret",
    model: DEFAULT_GEMINI_MODEL,
  };
  await assert.rejects(askGemini(config, "CPU"), /인터넷 연결/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(askGemini(config, "CPU", controller.signal), /취소/);
  const count = calls;
  assert.throws(() => validateConnection({ ...config, apiKey: "" }), /API 키/);
  await assert.rejects(
    askGemini({ ...config, model: "../invalid?key=bad" }, "CPU"),
    /모델 ID/,
  );
  await assert.rejects(askGemini(config, ""), /질문/);
  assert.equal(calls, count);
});
