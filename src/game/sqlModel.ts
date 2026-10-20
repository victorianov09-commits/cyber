// A deliberately small conceptual model. These strings are never evaluated as SQL.
export const simulatedRows = [
  { id: 1, name: "학습자 A", note: "가상의 첫 번째 행" },
  { id: 2, name: "학습자 B", note: "가상의 두 번째 행" },
];
export const teachingToken = "«조건 바꾸기»";
export function queryModel(
  input: string,
  parameterized: boolean,
  validateLength = false,
) {
  if (validateLength && input.length > 20)
    return {
      rows: [],
      explanation: "길이 제한 20자를 초과해 입력을 거부했습니다.",
    };
  const rows = parameterized
    ? simulatedRows.filter((r) => r.name === input)
    : input === teachingToken
      ? [...simulatedRows]
      : simulatedRows.filter((r) => r.name === input);
  return {
    rows,
    explanation: parameterized
      ? "입력을 별도 데이터로 취급해 정확히 일치하는 가상 행만 반환합니다."
      : input === teachingToken
        ? "교육용 모형에서 입력이 조건의 의미를 바꿔 모든 가상 행이 반환됩니다."
        : "입력을 조건 문자열에 합친 모형입니다. 정상 입력만으로는 취약성이 드러나지 않습니다.",
  };
}
