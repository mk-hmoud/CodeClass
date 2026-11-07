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
  /** "standard" (default) or "systems" (C exercise with build + files). */
  kind?: "standard" | "systems";
  /** Standard only: also return test cases consistent with the description. */
  includeTestCases?: boolean;
  /** How many test cases to generate when asked (clamped 1..12). */
  testCaseCount?: number;
}

export interface SystemsFileDraft {
  path: string;
  content: string;
  role: "template" | "readonly" | "hidden";
}

export interface SystemsTestDraft {
  stdin: string;
  /** KEY=VALUE per line, matching the authoring form's env textarea. */
  env: string;
  expectedOutput: string;
  isPublic: boolean;
  compare: "exact" | "unordered";
  rationale?: string;
}

export interface GeneratedProblemDraft {
  title: string;
  description: string;
  /** Standard problems: test cases generated alongside the description. */
  testCases?: SuggestedTestCase[];
  /** Systems problems: build command, entrypoint, files and systems tests. */
  systems?: {
    buildCommand: string;
    entrypoint: string;
    files: SystemsFileDraft[];
    testCases: SystemsTestDraft[];
  };
}

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

const buildDraftUserPrompt = (brief: string, count: number, includeTestCases: boolean): string => {
  const parts = [
    "The instructor describes the problem they want:",
    "",
    brief.trim(),
    "",
    "Produce the problem. Respond with ONLY a JSON object with these fields: " +
      '"title" (string), "description" (string, Markdown shown directly to students)',
  ];
  if (includeTestCases) {
    parts.push(
      `, and "testCases" (an array of ${count} objects {"input": string, ` +
        '"expectedOutput": string, "isPublic": boolean, "rationale": string}). ' +
        "The test cases MUST be consistent with the worked example and constraints in " +
        "the description: `input` is stdin, `expectedOutput` is exact stdout. Mark one " +
        "or two simple cases isPublic:true and the rest false."
    );
  } else {
    parts.push(".");
  }
  return parts.join("");
};

const buildSystemsDraftSystemPrompt = (): string =>
  "You are an experienced systems-programming instructor authoring a C/C++ exercise " +
  "from a colleague's brief. The student edits C source and the judge compiles and runs " +
  "it. Produce a clear, self-contained, solvable problem. The `description` is Markdown " +
  "structured as: a problem statement; what to implement; how it is built and run; a " +
  "`Constraints` section; and a worked `Example`. Everything must compile with gcc/g++, " +
  "make and coreutils only — no external libraries or network.";

const buildSystemsDraftUserPrompt = (brief: string, count: number): string => {
  const schema = [
    "Respond with ONLY a JSON object with these fields:",
    "- title: string",
    "- description: Markdown shown to students",
    "- buildCommand: string, e.g. gcc main.c -pthread -o app",
    "- entrypoint: string, the binary to run, e.g. ./app",
    "- files: array of { path, content, role } where role is template, readonly or hidden. " +
      "Include at least one template file (the student edits it) with a sensible compilable skeleton. " +
      "readonly = provided and shown but locked; hidden = provided at build time, never shown.",
    `- testCases: array of ${count} objects { stdin, env, expectedOutput, isPublic, compare, rationale }. ` +
      "env is KEY=VALUE pairs one per line (empty string if none); expectedOutput is the exact stdout " +
      "the correct program prints; compare is exact or unordered. Mark one or two simple cases isPublic true.",
  ].join("\n");
  return [
    "The instructor describes the systems problem they want:",
    "",
    brief.trim(),
    "",
    schema,
  ].join("\n");
};

const coerceDraftBase = (
  o: Record<string, unknown>
): { title: string; description: string } | null => {
  const title = o.title == null ? "" : String(o.title).trim();
  const description = o.description == null ? "" : String(o.description).trim();
  if (!title || !description) return null;
  return { title, description };
};

const coerceSystems = (o: Record<string, unknown>, count: number): GeneratedProblemDraft["systems"] => {
  const filesRaw = Array.isArray(o.files) ? o.files : [];
  const files: SystemsFileDraft[] = filesRaw
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => {
      const role = f.role === "readonly" || f.role === "hidden" ? f.role : "template";
      return {
        path: f.path == null ? "" : String(f.path).trim(),
        content: f.content == null ? "" : String(f.content),
        role: role as SystemsFileDraft["role"],
      };
    })
    .filter((f) => f.path);

  const testsRaw = Array.isArray(o.testCases) ? o.testCases : [];
  const testCases: SystemsTestDraft[] = testsRaw
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .slice(0, count)
    .map((t) => ({
      stdin: t.stdin == null ? "" : String(t.stdin),
      env: t.env == null ? "" : String(t.env),
      expectedOutput: t.expectedOutput == null ? "" : String(t.expectedOutput),
      isPublic: t.isPublic === true,
      compare: t.compare === "unordered" ? "unordered" : "exact",
      rationale: t.rationale == null ? undefined : String(t.rationale),
    }));

  return {
    buildCommand: o.buildCommand == null ? "" : String(o.buildCommand).trim(),
    entrypoint: o.entrypoint == null ? "" : String(o.entrypoint).trim(),
    files,
    testCases,
  };
};

/**
 * Draft a full problem (title + structured description, and — depending on
 * kind — matching standard test cases, or the systems build/entrypoint/files/
 * tests) from a plain-language brief. Returns
 * null when the model gives nothing usable; the caller reviews it before saving.
 */
export const generateProblemDraft = async (
  params: GenerateProblemInput
): Promise<GeneratedProblemDraft | null> => {
  const count = Math.min(Math.max(params.testCaseCount ?? 5, 1), 12);

  if (params.kind === "systems") {
    const content = await callChatJson(
      buildSystemsDraftSystemPrompt(),
      buildSystemsDraftUserPrompt(params.brief, count),
      0.5
    );
    const parsed = safeParseJson(content);
    if (parsed === null || typeof parsed !== "object") {
      logger.warn({ fn: "generateProblemDraft" }, "AI returned empty or non-JSON content (systems)");
      return null;
    }
    const base = coerceDraftBase(parsed as Record<string, unknown>);
    if (!base) return null;
    return { ...base, systems: coerceSystems(parsed as Record<string, unknown>, count) };
  }

  const outputType = params.outputType ?? "text";
  const includeTestCases = params.includeTestCases === true;
  const content = await callChatJson(
    buildDraftSystemPrompt(outputType),
    buildDraftUserPrompt(params.brief, count, includeTestCases),
    0.5
  );
  const parsed = safeParseJson(content);
  if (parsed === null || typeof parsed !== "object") {
    logger.warn({ fn: "generateProblemDraft" }, "AI returned empty or non-JSON content");
    return null;
  }
  const base = coerceDraftBase(parsed as Record<string, unknown>);
  if (!base) return null;
  const testCases = includeTestCases ? coerceCases(parsed).slice(0, count) : undefined;
  return { ...base, testCases };
};
