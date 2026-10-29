import axios from "axios";
import logger from "../../config/logger";

/**
 * AI-assisted test-case suggestions.
 *
 * Provider-agnostic: talks to any OpenAI-compatible `/chat/completions`
 * endpoint, configured entirely through env vars so the provider is a
 * deployment detail (Google Gemini on day one, but Groq / OpenRouter / a local
 * model all drop in by changing these three values):
 *   AI_BASE_URL  e.g. https://generativelanguage.googleapis.com/v1beta/openai
 *   AI_API_KEY   the provider key
 *   AI_MODEL     e.g. gemini-3.8-flash  (defaulted below)
 *
 * When the env is absent the feature is simply "not configured" — the
 * controller turns that into a friendly 503 rather than a crash.
 */

const AI_BASE_URL = process.env.AI_BASE_URL;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gemini-3.8-flash";

export const isAiConfigured = (): boolean => Boolean(AI_BASE_URL && AI_API_KEY);

/** Raised when a suggestion is requested but no provider env is set. */
export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI suggestions are not configured on this server.");
    this.name = "AiNotConfiguredError";
  }
}

export interface SuggestTestCasesInput {
  title: string;
  description: string;
  category?: string;
  /** "text" | "image" | "sql" — shapes the field semantics in the prompt. */
  outputType?: string;
  /** How many cases to ask for (clamped 1..12). */
  count?: number;
  /** Inputs already present, so the model avoids duplicating them. */
  existingInputs?: string[];
}

export interface SuggestedTestCase {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  /** Short note on what the case exercises; shown in the review panel. */
  rationale?: string;
}

const buildSystemPrompt = (outputType: string): string => {
  const base =
    "You are an experienced computer-science instructor writing test cases for a " +
    "programming exercise. You design cases that cover the normal path plus " +
    "meaningful edge cases (empty/zero, maximum/boundary, negative, malformed where " +
    "relevant). Be precise and deterministic.";
  if (outputType === "sql") {
    return (
      base +
      " This is a SQL problem: `input` is setup SQL (schema + seed data) and " +
      "`expectedOutput` is the canonical query result. Keep setup SQL minimal and valid."
    );
  }
  if (outputType === "image") {
    return (
      base +
      " This is an image-output problem graded manually, so `expectedOutput` is not " +
      "used — return it as an empty string and focus on varied, meaningful `input` values."
    );
  }
  return (
    base +
    " `input` is fed to the program on stdin and `expectedOutput` is the exact stdout " +
    "the program should print for that input."
  );
};

const buildUserPrompt = (params: SuggestTestCasesInput, count: number): string => {
  const parts = [
    `Problem title: ${params.title}`,
    params.category ? `Category: ${params.category}` : "",
    "",
    "Problem description:",
    params.description,
    "",
    `Produce ${count} test cases.`,
  ];
  if (params.existingInputs && params.existingInputs.length > 0) {
    parts.push(
      "",
      "Do NOT duplicate these existing inputs:",
      ...params.existingInputs.slice(0, 20).map((i) => `- ${i.slice(0, 200)}`)
    );
  }
  parts.push(
    "",
    'Respond with ONLY a JSON object of the form {"testCases": [{"input": string, ' +
      '"expectedOutput": string, "isPublic": boolean, "rationale": string}]}. ' +
      "Mark one or two simple, illustrative cases as isPublic:true and the rest false. " +
      "rationale is a short phrase naming what the case exercises."
  );
  return parts.filter((p) => p !== "").join("\n");
};

const coerceCases = (raw: unknown): SuggestedTestCase[] => {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { testCases?: unknown }).testCases)
    ? (raw as { testCases: unknown[] }).testCases
    : [];
  return arr
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      input: c.input == null ? "" : String(c.input),
      expectedOutput: c.expectedOutput == null ? "" : String(c.expectedOutput),
      isPublic: c.isPublic === true,
      rationale: c.rationale == null ? undefined : String(c.rationale),
    }));
};

export const suggestTestCases = async (
  params: SuggestTestCasesInput
): Promise<SuggestedTestCase[]> => {
  if (!isAiConfigured()) throw new AiNotConfiguredError();

  const count = Math.min(Math.max(params.count ?? 5, 1), 12);
  const outputType = params.outputType ?? "text";
  const url = `${AI_BASE_URL!.replace(/\/+$/, "")}/chat/completions`;

  const { data } = await axios.post(
    url,
    {
      model: AI_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(outputType) },
        { role: "user", content: buildUserPrompt(params, count) },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    logger.warn({ fn: "suggestTestCases" }, "AI returned empty content");
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Some providers wrap JSON in prose or fences; salvage the first object.
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      logger.warn({ fn: "suggestTestCases" }, "AI response was not JSON");
      return [];
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  return coerceCases(parsed).slice(0, count);
};
