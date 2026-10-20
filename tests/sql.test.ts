import { test } from "node:test";
import assert from "node:assert/strict";
import { queryModel, teachingToken } from "../src/game/sqlModel.ts";
test("가상 쿼리: 정상 입력, 모의 위험 입력, 검증과 매개변수화 차이", () => {
  assert.equal(queryModel("학습자 A", false).rows.length, 1);
  assert.equal(queryModel("학습자 A", true).rows.length, 1);
  assert.equal(queryModel(teachingToken, false).rows.length, 2);
  assert.equal(queryModel(teachingToken, false, true).rows.length, 2);
  assert.equal(queryModel(teachingToken, true, true).rows.length, 0);
  assert.equal(queryModel("긴입력".repeat(20), false, true).rows.length, 0);
  assert.equal(queryModel("<script>alert(1)</script>", true).rows.length, 0);
});
