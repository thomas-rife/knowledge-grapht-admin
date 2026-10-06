import "server-only";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];
const REQUEST_TIMEOUT_MS = 20_000;
const TOTAL_TIMEOUT_MS = 60_000;
const FALLBACK_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

// Best-effort cooldowns shared by requests on this server instance.
const modelCooldowns = new Map<string, number>();

class GeminiGenerationError extends Error {}

export const getGeminiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof GeminiGenerationError ? error.message : fallback;

const capacityError = () =>
  new GeminiGenerationError(
    "AI generation is temporarily unavailable: the available models are busy or have reached their usage limits. Please try again shortly.",
  );

const getCooldownMs = (response: Response, body: any) => {
  const retryAfter = response.headers.get("retry-after");
  const headerSeconds = retryAfter ? Number(retryAfter) : NaN;
  const headerDelay = Number.isFinite(headerSeconds)
    ? headerSeconds * 1000
    : retryAfter
      ? Date.parse(retryAfter) - Date.now()
      : 0;
  const retryInfo = body?.error?.details?.find(
    (detail: any) => detail?.["@type"]?.endsWith("google.rpc.RetryInfo"),
  );
  const retrySeconds = Number.parseFloat(retryInfo?.retryDelay ?? "");
  return Math.min(
    3_600_000,
    Math.max(
      response.status === 404 ? 300_000 : 30_000,
      Number.isFinite(headerDelay) ? headerDelay : 0,
      Number.isFinite(retrySeconds) ? retrySeconds * 1000 : 0,
    ),
  );
};

export async function generateGeminiStructured<T>(
  prompt: string,
  schema: Record<string, unknown>,
  thinkingLevel: "low" | "medium" | "high" = "low",
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiGenerationError("AI generation is not configured.");
  }

  const configuredModel = process.env.GEMINI_MODEL
    ?.trim()
    .replace(/^models\//, "");
  const preferredModel =
    configuredModel && FALLBACK_MODELS.includes(configuredModel)
      ? configuredModel
      : DEFAULT_MODEL;
  const models = Array.from(new Set([preferredModel, ...FALLBACK_MODELS]));
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  let invalidResponse = false;

  for (const model of models) {
    if ((modelCooldowns.get(model) ?? 0) > Date.now()) continue;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;

    const thinkingConfig = model.startsWith("gemini-3")
      ? { thinkingLevel }
      : { thinkingBudget: { low: 512, medium: 2048, high: 8192 }[thinkingLevel] };

    let response: Response;
    let body: any;
    try {
      response = await fetch(`${API_BASE}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig,
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remainingMs)),
      });
      body = await response.json();
    } catch {
      modelCooldowns.set(model, Date.now() + 30_000);
      console.warn("Gemini model request failed; trying fallback", { model });
      continue;
    }

    if (!response.ok) {
      console.warn("Gemini model request rejected", {
        model,
        status: response.status,
        code: body?.error?.status,
      });
      if (FALLBACK_STATUSES.has(response.status)) {
        modelCooldowns.set(model, Date.now() + getCooldownMs(response, body));
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        throw new GeminiGenerationError(
          "AI generation could not authenticate. Check the configured API key and its permissions.",
        );
      }
      throw new GeminiGenerationError(
        "AI generation rejected the request. Check the generation configuration.",
      );
    }

    const candidate = body?.candidates?.[0];
    if (
      body?.promptFeedback?.blockReason ||
      ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(
        candidate?.finishReason,
      )
    ) {
      throw new GeminiGenerationError(
        "AI generation could not complete this request. Please revise your prompt.",
      );
    }

    const text = (candidate?.content?.parts ?? [])
      .filter((part: any) => !part.thought && typeof part.text === "string")
      .map((part: any) => part.text)
      .join("");
    try {
      if (!text.trim()) throw new Error("Empty response");
      const result = JSON.parse(text) as T;
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("Invalid response");
      }
      modelCooldowns.delete(model);
      return result;
    } catch {
      invalidResponse = true;
      console.warn("Gemini returned invalid JSON; trying fallback", { model });
    }
  }

  if (invalidResponse) {
    throw new GeminiGenerationError(
      "AI generation returned an incomplete response. Please try again.",
    );
  }
  throw capacityError();
}
