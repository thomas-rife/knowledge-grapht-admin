export const REARRANGE_BLANK = "{{blank}}";
export const MIN_REARRANGE_OPTIONS = 2;
export const MAX_REARRANGE_OPTIONS = 4;

export const splitRearrangeLine = (line: string) => {
  const parts = line.split(REARRANGE_BLANK);
  return parts.length === 2 ? { before: parts[0], after: parts[1] } : null;
};

export const joinRearrangeLine = (before: string, after: string) =>
  `${before}${REARRANGE_BLANK}${after}`;

export const normalizeQuestionOptions = (options: unknown[]): string[] =>
  options.map((option) => {
    if (typeof option === "string") return option;
    if (option && typeof option === "object") {
      const value = Object.values(option)[0];
      if (typeof value === "string") return value;
    }
    return "";
  });

// Code choices are case-sensitive: `value` and `Value` can mean different things.
export const getDuplicateRearrangeOptionIndexes = (options: string[]) => {
  const keys = options.map((option) => option.normalize("NFKC").trim());
  return new Set(keys.flatMap((key, index) =>
    key && keys.some((other, otherIndex) => otherIndex !== index && other === key) ? [index] : [],
  ));
};

export function validateRearrangeQuestion(question: {
  prompt: string;
  snippet: string;
  answerOptions: unknown[];
  answer: string;
}) {
  if (!question.prompt.trim()) return { success: false as const, error: "Enter a question prompt." };
  if (!splitRearrangeLine(question.snippet)) {
    return { success: false as const, error: "Provide a line with exactly one answer blank." };
  }
  const options = normalizeQuestionOptions(question.answerOptions);
  if (options.length < MIN_REARRANGE_OPTIONS || options.length > MAX_REARRANGE_OPTIONS) {
    return { success: false as const, error: "Rearrange questions need between 2 and 4 answer options." };
  }
  if (options.some((option) => !option.trim())) {
    return { success: false as const, error: "Fill in every answer option." };
  }
  if (/\r|\n/.test(question.snippet) || options.some((option) => /\r|\n/.test(option))) {
    return { success: false as const, error: "Use a single line for the rearrange text and each answer option." };
  }
  if (getDuplicateRearrangeOptionIndexes(options).size) {
    return { success: false as const, error: "Each answer option must be different." };
  }
  if (!options.includes(question.answer)) {
    return { success: false as const, error: "Select the correct option for the blank." };
  }
  return { success: true as const, answerOptions: options, answer: question.answer };
}

const decodeLegacyOptions = (options: unknown[]) => options.map((option) => {
  if (typeof option !== "string") return option;
  try { return JSON.parse(option); } catch { return option; }
});

export function getRearrangeDraft(options: unknown[], snippet: string, answer: string) {
  const normalized = normalizeQuestionOptions(options);
  if (splitRearrangeLine(snippet) && normalized.every((option) => option.trim())) {
    return { options: normalized, snippet, answer };
  }
  // Older records used JSON wrappers (sometimes serialized inside a text array).
  const legacy = decodeLegacyOptions(options) as Array<{ studentView?: { tokens?: unknown; problem?: unknown }[] }>;
  const view = legacy.find((option) => option?.studentView)?.studentView?.[0];
  if (!Array.isArray(view?.tokens) || !view.tokens.every((token) => typeof token === "string") || !Array.isArray(view.problem)) return null;
  const blanks = view.problem.flatMap((part, index) => part === null ? [index] : []);
  if (blanks.length !== 1) return null;
  const before = view.problem.slice(0, blanks[0]).join("");
  const after = view.problem.slice(blanks[0] + 1).join("");
  const matches = view.tokens.filter((token) => before + token + after === answer);
  if (matches.length !== 1) return null;
  return { options: view.tokens as string[], snippet: joinRearrangeLine(before, after), answer: matches[0] as string };
}

export function getRearrangeDisplayOptions(options: unknown[]): string[] {
  const legacy = decodeLegacyOptions(options) as Array<{ studentView?: { tokens?: unknown }[] }>;
  const tokens = legacy.find((option) => option?.studentView)?.studentView?.[0]?.tokens;
  return Array.isArray(tokens) ? tokens.map(String) : normalizeQuestionOptions(options);
}
