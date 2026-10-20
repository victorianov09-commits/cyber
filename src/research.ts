export type LoginEvent = {
  second: number;
  account: string;
  success: boolean;
  attack: boolean;
};
export type EventWindow = {
  events?: LoginEvent[];
  id: number;
  attack: boolean;
  pattern: "정상" | "급격한 공격" | "느린 분산 공격";
  failures: number;
  interval: number;
  accounts: number;
  offHours: boolean;
};
export type Thresholds = { a: number; b: number; c: number };
export const defaults: Thresholds = { a: 8, b: 5, c: 6 };
export function dataset(seed: number, count = 120): EventWindow[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const int = (a: number, b: number) => Math.floor(random() * (b - a + 1)) + a;
  return Array.from({ length: count }, (_, id) => {
    const t = random(),
      pattern: EventWindow["pattern"] =
        t < 0.6 ? "정상" : t < 0.8 ? "급격한 공격" : "느린 분산 공격";
    const attack = pattern !== "정상",
      busy = random() < 0.22;
    const sampled = {
      failures:
        pattern === "급격한 공격"
          ? int(7, 18)
          : pattern === "느린 분산 공격"
            ? int(2, 7)
            : busy
              ? int(5, 11)
              : int(0, 5),
      interval:
        pattern === "급격한 공격"
          ? int(1, 9)
          : pattern === "느린 분산 공격"
            ? int(25, 110)
            : busy
              ? int(3, 20)
              : int(12, 120),
      accounts:
        pattern === "급격한 공격"
          ? int(1, 4)
          : pattern === "느린 분산 공격"
            ? int(4, 12)
            : busy
              ? int(1, 5)
              : int(1, 2),
      offHours: random() < (attack ? 0.65 : 0.25),
    };
    const attempts = Math.max(2, sampled.failures, sampled.accounts);
    const gap = Math.min(sampled.interval, Math.floor(300 / (attempts - 1)));
    const events: LoginEvent[] = Array.from({ length: attempts }, (_, i) => ({
      second: (sampled.offHours ? 2 : 14) * 3600 + i * gap,
      account: `가상계정-${(i % sampled.accounts) + 1}`,
      success: i >= sampled.failures,
      attack,
    }));
    return {
      id,
      attack,
      pattern,
      events,
      failures: events.filter((e) => !e.success).length,
      interval:
        (events.at(-1)!.second - events[0].second) / (events.length - 1),
      accounts: new Set(events.map((e) => e.account)).size,
      offHours: events[0].second < 6 * 3600,
    };
  });
}
export function predict(
  e: EventWindow,
  rule: "A" | "B" | "C",
  t: Thresholds,
): boolean {
  if (rule === "A") return e.failures >= t.a;
  if (rule === "B")
    return e.failures >= t.b && (e.interval <= 10 || e.accounts >= 4);
  const score =
    e.failures * 0.45 +
    e.accounts * 0.65 +
    (e.interval <= 10 ? 2 : 0) +
    (e.offHours ? 1 : 0);
  return score >= t.c;
}
export function metrics(
  data: EventWindow[],
  rule: "A" | "B" | "C",
  t: Thresholds,
) {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (const e of data) {
    const p = predict(e, rule, t);
    if (e.attack) {
      if (p) tp++;
      else fn++;
    } else {
      if (p) fp++;
      else tn++;
    }
  }
  const ratio = (a: number, b: number) => (b ? a / b : 0);
  const precision = ratio(tp, tp + fp),
    recall = ratio(tp, tp + fn),
    fpr = ratio(fp, fp + tn),
    f1 = ratio(2 * precision * recall, precision + recall);
  return { tp, fp, tn, fn, precision, recall, fpr, f1 };
}
