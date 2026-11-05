import { searchKnowledge } from "./knowledge";
export type TutorMessage = {
  role: "user" | "assistant";
  text: string;
  source?: "local" | "gemini";
};
export interface TutorProvider {
  readonly mode: string;
  answer(question: string): Promise<string>;
}
export const localTutor: TutorProvider = {
  mode: "기본 지식 · API 없이 자료 검색",
  async answer(question) {
    const topics = searchKnowledge(question);
    if (!topics.length)
      return "이 질문과 맞는 기본 자료를 찾지 못했어요. 모든 개념이나 질문에 답할 수는 없습니다. 실제 생성형 AI 답변이 아닙니다.\n\nCPU, RAM, DNS, Python, 개인정보, SQL 인젝션처럼 구체적인 용어로 다시 물어보세요. 두 개념의 차이를 알고 싶다면 두 용어를 함께 입력해 보세요. 더 자유로운 질문은 아래에서 Gemini를 연결해 사용할 수 있어요.";
    return topics
      .map(
        (topic) =>
          `[학습 자료: ${topic.title}]\n\n쉬운 비유: ${topic.analogy}\n\n핵심 개념: ${topic.concept}\n\n예시와 기억할 점: ${topic.example}`,
      )
      .join("\n\n──────────\n\n");
  },
};

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export type GeminiConnection = { apiKey: string; model: string };
export function validateConnection({ apiKey, model }: GeminiConnection) {
  if (
    !apiKey.trim() ||
    apiKey.trim().length > 256 ||
    /[^\x21-\x7e]/.test(apiKey.trim())
  )
    throw new Error("API 키를 공백 없이 입력해 주세요.");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(model.trim()))
    throw new Error("모델 ID는 영문·숫자·점·밑줄·하이픈으로 입력해 주세요.");
}
export async function askGemini(
  connection: GeminiConnection,
  question: string,
  signal?: AbortSignal,
): Promise<string> {
  validateConnection(connection);
  if (!question.trim() || question.length > 2000)
    throw new Error("질문은 1~2,000자로 입력해 주세요.");
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${connection.model.trim()}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": connection.apiKey.trim(),
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: "너는 한국 고등학생을 위한 CYBER DUEL 보안·컴퓨터·정보 교육 도우미다. 한국어로 쉬운 비유, 정확한 개념, 짧은 예시 순서로 설명하라. 모르는 사실은 추측하지 말고 불확실함을 밝혀라. 보안 실습은 허가된 교육용 환경에 한정하여 설명하라. 개인정보나 비밀 키를 요구하지 마라. 답변은 간결하게 작성하라.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: question.trim() }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1600 },
        }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
          : AbortSignal.timeout(25000),
        credentials: "omit",
        referrerPolicy: "strict-origin-when-cross-origin",
      },
    );
  } catch (error) {
    if (signal?.aborted) throw new Error("요청을 취소했습니다.");
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new Error(
        "응답 시간이 길어 요청을 중단했어요. 잠시 후 다시 시도해 주세요.",
      );
    throw new Error(
      "Gemini에 연결하지 못했어요. 인터넷 연결과 API 접근 설정을 확인해 주세요.",
    );
  }
  // Do not expose raw provider errors, request headers, or keys in the UI/logs.
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "API 키·모델·요청 설정을 확인해 주세요.",
      401: "API 키 인증에 실패했어요. 키를 확인해 주세요.",
      403: "이 키로 API를 사용할 수 없어요. 키의 권한과 사용 지역·API 제한을 확인해 주세요.",
      404: "모델을 찾지 못했어요. 계정에서 지원되는 모델 ID로 바꿔 주세요.",
      429: "사용량 한도에 도달했어요. 할당량·요금 설정을 확인하거나 잠시 후 다시 시도해 주세요.",
    };
    throw new Error(
      messages[response.status] ??
        "Gemini 서비스 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    );
  }
  let data: {
    candidates?: {
      content?: { parts?: { text?: string; thought?: boolean }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };
  try {
    data = await response.json();
  } catch {
    throw new Error("Gemini 응답 형식을 읽지 못했어요.");
  }
  if (!data || typeof data !== "object")
    throw new Error("Gemini 응답 형식을 읽지 못했어요.");
  const candidate = Array.isArray(data.candidates)
    ? data.candidates[0]
    : undefined;
  if (data.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY")
    throw new Error(
      "이 질문은 Gemini에서 답변을 제한했어요. 교육용 개념 질문으로 바꿔 주세요.",
    );
  const parts = candidate?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .filter((p) => p && typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("\n")
        .trim()
    : "";
  if (!text)
    throw new Error(
      "Gemini가 표시할 답변을 보내지 않았어요. 질문이나 모델 설정을 확인해 주세요.",
    );
  return candidate?.finishReason === "MAX_TOKENS"
    ? `${text}\n\n(길이 제한으로 일부가 생략됐어요. 더 짧게 나눠 질문해 주세요.)`
    : text;
}
