import { lessons } from "./lessons";
export type TutorMessage = { role: "user" | "assistant"; text: string };
// Future providers must use an authenticated backend with quotas and abuse controls.
// No API-key input or storage is exposed by this public, static client.
export interface TutorProvider {
  readonly mode: string;
  answer(question: string): Promise<string>;
}
export const localTutor: TutorProvider = {
  mode: "로컬 데모 · 미리 작성한 학습 자료 검색",
  async answer(question) {
    const q = question.toLowerCase().replace(/인가요/g, "");
    const aliases: Record<string, string[]> = {
      network: ["ip", "포트", "네트워크"],
      services: ["서버", "서비스"],
      firewall: ["방화벽"],
      auth: ["인증", "인가"],
      password: ["mfa", "비밀번호"],
      logs: ["로그", "오탐", "미탐", "탐지"],
      crypto: ["해시", "암호화"],
      sql: ["sql", "쿼리", "인젝션"],
      xss: ["xss"],
      phishing: ["피싱"],
      access: ["권한", "접근"],
      incident: ["사고", "복구", "격리"],
    };
    const lesson = lessons.find((l) =>
      aliases[l.id].some((word) => q.includes(word)),
    );
    return lesson
      ? `[학습 자료: ${lesson.title}] ${lesson.analogy}\n${lesson.concept}\n게임 사례: ${lesson.example}`
      : "로컬 데모는 미리 작성한 학습 자료만 검색합니다. 방화벽, MFA, 오탐, SQL, 사고 대응 같은 주제로 질문해 주세요. 실제 생성형 AI 답변이 아닙니다.";
  },
};
