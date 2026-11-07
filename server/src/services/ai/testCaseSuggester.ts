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
const AI_MODEL = process.env.AI_MODEL || "gemini-3.6-flash";

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

/**
 * One OpenAI-compatible chat call that asks for a JSON object back, returning
 * the raw message content. Shared by every AI helper in this module.
 */
const callChatJson = async (
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> => {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
  const url = `${AI_BASE_URL!.replace(/\/+$/, "")}/chat/completions`;
  const { data } = await axios.post(
    url,
    {
      model: AI_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );
  return data?.choices?.[0]?.message?.content ?? "";
};

/** Parse a JSON object from model output, salvaging the first {...} if the
 *  provider wrapped it in prose or code fences. Returns null when unusable. */
const safeParseJson = (content: string): unknown | null => {
  if (!content.trim()) return null;
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

export const suggestTestCases = async (
  params: SuggestTestCasesInput
): Promise<SuggestedTestCase[]> => {
  const count = Math.min(Math.max(params.count ?? 5, 1), 12);
  const outputType = params.outputType ?? "text";

  const content = await callChatJson(
    buildSystemPrompt(outputType),
    buildUserPrompt(params, count),
    0.4
  );
  const parsed = safeParseJson(content);
  if (parsed === null) {
    logger.warn({ fn: "suggestTestCases" }, "AI returned empty or non-JSON content");
    return [];
  }
  return coerceCases(parsed).slice(0, count);
};

// ── Problem drafting (title + description from a plain-language brief) ────────

export interface GenerateProblemInput {
  /** The instructor's free-text explanation of the problem they want. */
  brief: string;
  /** "text" | "sql" | "image" — shapes the description conventions. */
  outputType?: string;
}

export interface GeneratedProblemDraft {
  title: string;
  description: string;
  category?: string;
  difficulty?: string; // "Easy" | "Medium" | "Hard"
}

/** The category values the creation form offers; the model is asked to pick one
 *  and anything else is dropped so the form's Select stays valid. */
const DRAFT_CATEGORIES = ["Fundamentals", "Algorithms", "Bug fixes", "Refactoring", "Puzzles"];

const buildDraftSystemPrompt = (outputType: string): string => {
  const base =
    "You are an experienced computer-science instructor authoring a programming " +
    "exercise from a colleague's brief. Write a clear, self-contained, unambiguous " +
    "and solvable problem. The `description` MUST be Markdown structured in this " +
    "order: a one-paragraph problem statement; an `Input` section describing the " +
    "stdin format; an `Output` section describing the exact expected stdout; a " +
    "`Constraints` section with concrete bounds; and at least one worked `Example` " +
    "showing sample input and its output. Do not invent requirements the brief " +
    "contradicts, and keep examples consistent with the statement.";
  if (outputType === "sql") {
    return (
      base +
      " This is a SQL problem: describe the table schema and seed data under `Input`, " +
      "state the query the student must write, and show the canonical result shape " +
      "under `Output` with a small worked example."
    );
  }
  if (outputType === "image") {
    return (
      base +
      " This is an image-output problem graded manually: the program draws and saves a " +
      "PNG. Describe precisely what should be rendered; there is no exact stdout, so the " +
      "`Output` section describes the expected image instead of literal text."
    );
  }
  return base;
};

const buildDraftUserPrompt = (brief: string): string =>
  [
    "The instructor describes the problem they want:",
    "",
    brief.trim(),
    "",
    "Produce the problem. Respond with ONLY a JSON object of the form " +
      '{"title": string, "description": string, "category": string, "difficulty": string}. ' +
      `"category" must be one of: ${DRAFT_CATEGORIES.join(", ")}. ` +
      '"difficulty" must be one of: Easy, Medium, Hard. ' +
      '"description" is Markdown shown directly to students.',
  ].join("\n");

const coerceDraft = (raw: unknown): GeneratedProblemDraft | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = o.title == null ? "" : String(o.title).trim();
  const description = o.description == null ? "" : String(o.description).trim();
  if (!title || !description) return null;

  const category =
    typeof o.category === "string" && DRAFT_CATEGORIES.includes(o.category)
      ? o.category
      : undefined;
  const difficultyRaw = typeof o.difficulty === "string" ? o.difficulty.trim() : "";
  const difficulty = ["Easy", "Medium", "Hard"].includes(difficultyRaw)
    ? difficultyRaw
    : undefined;

  return { title, description, category, difficulty };
};

/**
 * Draft a full problem (title + structured description, plus a suggested
 * category/difficulty) from a plain-language brief. Returns null when the model
 * gives nothing usable; the caller shows it for editing before anything is saved.
 */
export const generateProblemDraft = async (
  params: GenerateProblemInput
): Promise<GeneratedProblemDraft | null> => {
  const outputType = params.outputType ?? "text";
  const content = await callChatJson(
    buildDraftSystemPrompt(outputType),
    buildDraftUserPrompt(params.brief),
    0.5
  );
  const parsed = safeParseJson(content);
  if (parsed === null) {
    logger.warn({ fn: "generateProblemDraft" }, "AI returned empty or non-JSON content");
    return null;
  }
  return coerceDraft(parsed);
};
