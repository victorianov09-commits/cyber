import React from "react";
import {
  dataset,
  metrics,
  defaults,
  type Thresholds,
  type EventWindow,
} from "./research";
import type { Progress } from "./game/storage";
import { missions } from "./game/missions";
const rules = ["A", "B", "C"] as const;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
function Results({
  data,
  thresholds,
}: {
  data: EventWindow[];
  thresholds: Thresholds;
}) {
  return (
    <>
      <div className="table-scroll">
        <table>
          <caption>실행 결과 · 합성 로그 {data.length}件</caption>
          <thead>
            <tr>
              <th scope="col">규칙</th>
              <th scope="col">TP</th>
              <th scope="col">FP</th>
              <th scope="col">TN</th>
              <th scope="col">FN</th>
              <th scope="col">정밀도</th>
              <th scope="col">재현율</th>
              <th scope="col">오탐률</th>
              <th scope="col">F1</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => {
              const m = metrics(data, r, thresholds);
              return (
                <tr key={r}>
                  <th scope="row">{r}</th>
                  <td>{m.tp}</td>
                  <td>{m.fp}</td>
                  <td>{m.tn}</td>
                  <td>{m.fn}</td>
                  <td>{pct(m.precision)}</td>
                  <td>{pct(m.recall)}</td>
                  <td>{pct(m.fpr)}</td>
                  <td>{pct(m.f1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="comparison-grid">
        {rules.map((r) => {
          const m = metrics(data, r, thresholds);
          return (
            <section className="mini-panel" key={r}>
              <h3>규칙 {r} · 혼동행렬</h3>
              <div className="matrix">
                <span>
                  TP 정탐 <strong>{m.tp}</strong>
                </span>
                <span>
                  FN 미탐 <strong>{m.fn}</strong>
                </span>
                <span>
                  FP 오탐 <strong>{m.fp}</strong>
                </span>
                <span>
                  TN 정상 <strong>{m.tn}</strong>
                </span>
              </div>
              <label>
                F1 {pct(m.f1)}
                <meter value={m.f1} min="0" max="1" />
              </label>
            </section>
          );
        })}
      </div>
      <div className="table-scroll">
        <table>
          <caption>공격 패턴별 탐지 비율 · 재현율</caption>
          <thead>
            <tr>
              <th scope="col">패턴</th>
              {rules.map((r) => (
                <th key={r} scope="col">
                  규칙 {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["급격한 공격", "느린 분산 공격"] as const).map((pattern) => (
              <tr key={pattern}>
                <th scope="row">
                  {pattern} ({data.filter((e) => e.pattern === pattern).length}
                  건)
                </th>
                {rules.map((r) => (
                  <td key={r}>
                    {pct(
                      metrics(
                        data.filter((e) => e.pattern === pattern),
                        r,
                        thresholds,
                      ).recall,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function Research({ progress }: { progress: Progress }) {
  const [seed, setSeed] = React.useState(20261021),
    [seedInput, setSeedInput] = React.useState("20261021"),
    [thresholds, setThresholds] = React.useState<Thresholds>({ ...defaults }),
    [evaluated, setEvaluated] = React.useState<Thresholds | null>(null),
    [error, setError] = React.useState("");
  const tuning = React.useMemo(() => dataset(seed), [seed]),
    evaluation = React.useMemo(
      () => dataset((seed ^ 0x9e3779b9) >>> 0),
      [seed],
    );
  const downloadExperiment = () => {
    if (!evaluated) return;
    const result = {
      generator: "cyber-login-v1",
      seed,
      evaluationSeed: (seed ^ 0x9e3779b9) >>> 0,
      thresholds: evaluated,
      ruleCWeights: {
        failures: 0.45,
        accounts: 0.65,
        shortInterval: 2,
        offHours: 1,
      },
      tuning,
      evaluation,
      results: rules.map((rule) => ({
        rule,
        tuning: metrics(tuning, rule, evaluated),
        evaluation: metrics(evaluation, rule, evaluated),
      })),
    };
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `cyber-experiment-${seed}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const [runs, setRuns] = React.useState<
    { seed: number; t: Thresholds; f1: number[] }[]
  >([]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LEARNING & RESEARCH</div>
          <h1>학습·연구 대시보드</h1>
          <p>
            플레이 기록을 돌아보고, 합성 로그인 로그로 탐지 규칙을 비교해
            보세요.
          </p>
        </div>
      </div>
      <div className="role-grid">
        {(["red", "blue"] as const).map((role) => {
          const records = progress.records.filter((r) => r.role === role);
          return (
            <section className="panel" key={role}>
              <span className={`role-label ${role}`}>
                {role.toUpperCase()} TEAM
              </span>
              <h2>
                {
                  missions.filter((m) =>
                    records.some((r) => r.mission === m.id && r.won),
                  ).length
                }{" "}
                / 5 단계 완료
              </h2>
              <p>
                도전 {records.length}회 · 목표 달성{" "}
                {records.filter((r) => r.won).length}회 · 최고{" "}
                {Math.max(0, ...records.map((r) => r.score))}점
              </p>
              <ol>
                {missions.map((m) => (
                  <li key={m.id}>
                    {m.title}:{" "}
                    {records.some((r) => r.mission === m.id && r.won)
                      ? "완료"
                      : "미완료"}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      <section className="panel">
        <h2>로그인 탐지 규칙 실험실</h2>
        <p>
          3단계와 연결된 교육용 실험입니다. 한 행은 출발지별 5분 관측 구간을
          요약합니다. 실제 사용자 데이터나 외부 로그를 사용하지 않습니다.
        </p>
        <details open>
          <summary>데이터 생성 규칙 · 재현 정보</summary>
          <p>
            생성기 v1 · LCG(1664525, 1013904223, 2³²). 각 데이터셋 120행. 정상
            약 60%, 급격한 공격 약 20%, 느린 분산 공격 약 20% 확률로 라벨을 먼저
            뽑고 특징을 생성합니다.
          </p>
          <p>
            급격한 공격: 실패 7~18, 간격 1~9초, 계정 1~4개. 느린 분산 공격: 실패
            2~7, 간격 25~110초, 계정 4~12개. 정상: 실패 0~5, 간격 12~120초, 계정
            1~2개이며 약 22%는 혼잡한 정상 구간(실패 5~11, 간격 3~20초, 계정
            1~5개)입니다. 야간 확률: 공격 65%, 정상 25%.
          </p>
          <p>
            조정 시드 {seed} · 평가 시드 {(seed ^ 0x9e3779b9) >>> 0}. 독립 난수
            스트림으로 두 세트를 분리합니다. 비율은 확률이므로 실제 개수는 매번
            다릅니다.
          </p>
        </details>
        <div className="inline-form">
          <label htmlFor="seed">난수 시드</label>
          <input
            id="seed"
            type="number"
            min="0"
            max="4294967295"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
          />
          <button
            className="button secondary"
            onClick={() => {
              const n = Number(seedInput);
              if (
                !seedInput.trim() ||
                !Number.isInteger(n) ||
                n < 0 ||
                n > 4294967295
              ) {
                setError("시드는 0~4294967295 사이의 정수로 입력하세요.");
                return;
              }
              setSeed(n);
              setEvaluated(null);
              setThresholds({ ...defaults });
              setError("");
            }}
          >
            새 실험 생성
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        <p className="small-text">
          평가 결과를 본 뒤 같은 데이터로 다시 조정하면 평가에 과적합할 수
          있습니다. 새 일반화 성능을 확인할 때는 사전에 정한 새 시드를
          사용하세요. 아래 비교 기록은 탐색용이며 독립적인 성능 보장이 아닙니다.
        </p>
        <fieldset disabled={!!evaluated}>
          <legend>조정 데이터에서 임계값 정하기</legend>
          <p>
            A: 5분 내 실패 ≥ A. B: 실패 ≥ B이고 (평균 간격 ≤ 10초 또는 계정 ≥
            4개). C: 실패×0.45 + 계정×0.65 + 짧은 간격 가점 2 + 야간 가점 1 ≥ C.
          </p>
          {(["a", "b", "c"] as const).map((k) => (
            <label className="slider-label" key={k}>
              규칙 {k.toUpperCase()} 임계값 {thresholds[k]}
              <input
                aria-label={`규칙 ${k.toUpperCase()} 임계값`}
                type="range"
                min="1"
                max={k === "c" ? 15 : 18}
                step={k === "c" ? 0.5 : 1}
                value={thresholds[k]}
                onChange={(e) =>
                  setThresholds({ ...thresholds, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </fieldset>
        <h3>조정용 데이터 · 임계값을 바꾸며 비교하세요</h3>
        <Results data={tuning} thresholds={thresholds} />
        <button
          className="button primary"
          disabled={!!evaluated}
          onClick={() => {
            setEvaluated({ ...thresholds });
            setRuns((v) => [
              ...v.slice(-7),
              {
                seed,
                t: { ...thresholds },
                f1: rules.map((r) => metrics(evaluation, r, thresholds).f1),
              },
            ]);
          }}
        >
          임계값 확정 · 별도 평가 실행
        </button>
        {evaluated && (
          <section className="evaluation" aria-label="평가 결과">
            <h3>평가용 데이터 · 임계값 고정</h3>
            <button className="button secondary" onClick={downloadExperiment}>
              시드·규칙·결과 JSON 저장
            </button>
            <p>
              A={evaluated.a}, B={evaluated.b}, C={evaluated.c} · 조정하지 않은
              120행에서 계산한 결과입니다.
            </p>
            <Results data={evaluation} thresholds={evaluated} />
            <details>
              <summary>원시 가상 로그인 이벤트 예시</summary>
              <p>
                평가 첫 구간의 실제 생성 이벤트입니다. 라벨은 합성 시나리오의
                정답이며 실제 의도의 증거가 아닙니다.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>가상 시각(자정 후 초)</th>
                      <th>계정</th>
                      <th>로그인 결과</th>
                      <th>구간 라벨</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation[0].events?.map((e, i) => (
                      <tr key={i}>
                        <td>{e.second}</td>
                        <td>{e.account}</td>
                        <td>{e.success ? "성공" : "실패"}</td>
                        <td>{e.attack ? "공격 시나리오" : "정상"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <details>
              <summary>평가 표본 8행 확인</summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>라벨</th>
                      <th>실패</th>
                      <th>간격(초)</th>
                      <th>계정 수</th>
                      <th>야간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.slice(0, 8).map((e) => (
                      <tr key={e.id}>
                        <td>{e.pattern}</td>
                        <td>{e.failures}</td>
                        <td>{e.interval}</td>
                        <td>{e.accounts}</td>
                        <td>{e.offHours ? "예" : "아니요"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}
        <details>
          <summary>지표 읽는 법과 한계</summary>
          <p>
            TP: 실제 공격을 탐지, FP: 정상을 공격으로 오탐, TN: 정상을 정상으로
            분류, FN: 공격을 미탐. 행렬 위쪽 행은 실제 공격, 아래쪽 행은 실제
            정상이며 왼쪽 열은 경보, 오른쪽 열은 정상 판정입니다.
          </p>
          <p>
            정밀도(precision) = TP/(TP+FP), 재현율(recall) = TP/(TP+FN),
            오탐률(FPR) = FP/(FP+TN), F1 = 2×정밀도×재현율/(정밀도+재현율).
            분모가 0이면 이 도구에서는 0으로 표시합니다. 전체 정확도(accuracy)와
            정밀도는 다른 지표입니다.
          </p>
          <p>
            합성 라벨은 생성 규칙을 따른 것으로 실제 공격 의도를 증명하지
            않습니다. 특징과 라벨이 인위적으로 연결되어 실제 환경보다 쉬울 수
            있습니다. 작은 표본, 데이터 분포 변화, 정상 사용자 피해와 처리
            비용도 고려해야 합니다. 실제 시스템 성능으로 일반화하지 마세요.
          </p>
        </details>
        {runs.length > 0 && (
          <div className="table-scroll">
            <table>
              <caption>현재 탭의 실험 비교 · 새로고침하면 초기화</caption>
              <thead>
                <tr>
                  <th>시드</th>
                  <th>A/B/C 임계값</th>
                  <th>F1 A / B / C</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i}>
                    <td>{r.seed}</td>
                    <td>
                      {r.t.a} / {r.t.b} / {r.t.c}
                    </td>
                    <td>{r.f1.map(pct).join(" / ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
