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
