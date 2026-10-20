import React from "react";
import { queryModel, teachingToken } from "./game/sqlModel";
export function SqlLab() {
  const [input, setInput] = React.useState("학습자 A"),
    [validate, setValidate] = React.useState(false);
  return (
    <section className="panel">
      <h2>입력과 명령의 경계 · 가상 쿼리 비교</h2>
      <p>
        학습 보조도구이며 턴을 소모하지 않습니다. 실제 SQL 문법이나 DB 엔진 대신
        교육용 토큰을 해석하는 작은 모형입니다.
      </p>
      <label htmlFor="sql-input">가상 검색값</label>
      <input
        id="sql-input"
        className="model-input"
        value={input}
        maxLength={100}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="button-row">
        <button
          className="button secondary"
          onClick={() => setInput("학습자 A")}
        >
          정상 입력
        </button>
        <button
          className="button secondary"
          onClick={() => setInput(teachingToken)}
        >
          교육용 조건 토큰
        </button>
        <label>
          <input
            type="checkbox"
            checked={validate}
            onChange={(e) => setValidate(e.target.checked)}
          />{" "}
          길이 검증 추가 (20자)
        </label>
      </div>
      <div className="role-grid">
        {[false, true].map((safe) => {
          const result = queryModel(input, safe, validate);
          return (
            <section className="mini-panel" key={String(safe)}>
              <h3>
                {safe ? "안전 모형 · 매개변수 분리" : "취약 모형 · 문자열 결합"}
              </h3>
              <pre className="terminal-output">
                {safe
                  ? "구조: 이름 = ?\n별도 데이터: " + JSON.stringify(input)
                  : "조건 문자열: 이름 = " + input}
              </pre>
              <p>{result.explanation}</p>
              <p>반환된 모의 행 {result.rows.length}개</p>
              <ul>
                {result.rows.map((row) => (
                  <li key={row.id}>
                    {row.name} · {row.note}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="small-text">
        길이 검증만 켜도 짧은 조건 토큰은 통과합니다. 입력 검증이 매개변수화를
        대체하지 않는 이유를 비교해 보세요.
      </p>
    </section>
  );
}
