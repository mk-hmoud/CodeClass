import { TestCase } from "@/types/TestCase";

/** The subset of a test case that import/export round-trips. */
export type ParsedTestCase = Pick<TestCase, "input" | "expectedOutput" | "isPublic">;

const toBool = (v: unknown): boolean =>
  v === true || v === 1 || (typeof v === "string" && ["true", "1", "yes", "y", "public"].includes(v.trim().toLowerCase()));

const normalize = (input: unknown, expected: unknown, isPublic: unknown): ParsedTestCase => ({
  input: input == null ? "" : String(input),
  expectedOutput: expected == null ? "" : String(expected),
  isPublic: toBool(isPublic),
});

/** Split delimited text into rows/fields, honouring quoted fields that may
 *  contain the delimiter, quotes ("") and newlines (RFC-4180 style). */
const parseDelimitedRows = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
    } else if (c === delimiter) {
      pushField();
      i += 1;
    } else if (c === "\r") {
      i += 1;
    } else if (c === "\n") {
      pushRow();
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
};

const parseJsonCases = (text: string): ParsedTestCase[] => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { testCases?: unknown }).testCases)
    ? (data as { testCases: unknown[] }).testCases
    : null;
  if (!arr) throw new Error("JSON must be an array of test cases, or an object with a \"testCases\" array.");
  return arr.map((row, i) => {
    if (typeof row !== "object" || row == null) throw new Error(`Item ${i + 1} is not an object.`);
    const r = row as Record<string, unknown>;
    return normalize(r.input ?? r.stdin, r.expectedOutput ?? r.expected ?? r.output, r.isPublic ?? r.public);
  });
};

const parseDelimitedCases = (text: string): ParsedTestCase[] => {
  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows = parseDelimitedRows(text, delimiter).filter(
    (r) => !(r.length === 1 && r[0].trim() === "")
  );
  if (rows.length === 0) throw new Error("File has no rows.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const headerHit = (names: string[]) => header.findIndex((h) => names.includes(h));
  let inputIdx = 0;
  let expectedIdx = 1;
  let publicIdx = 2;
  let dataRows = rows;
  const looksLikeHeader =
    headerHit(["input", "stdin"]) !== -1 ||
    headerHit(["expectedoutput", "expected_output", "expected", "output"]) !== -1;
  if (looksLikeHeader) {
    inputIdx = headerHit(["input", "stdin"]);
    expectedIdx = headerHit(["expectedoutput", "expected_output", "expected", "output"]);
    publicIdx = headerHit(["ispublic", "is_public", "public", "visible"]);
    dataRows = rows.slice(1);
  }
  return dataRows.map((r) =>
    normalize(
      inputIdx >= 0 ? r[inputIdx] : "",
      expectedIdx >= 0 ? r[expectedIdx] : "",
      publicIdx >= 0 ? r[publicIdx] : false
    )
  );
};

/** Parse an uploaded file into test cases. Supports JSON (array of objects or
 *  `{ testCases: [...] }`) and CSV/TSV with an optional header row. The format
 *  is chosen from the extension, falling back to content sniffing. */
export const parseTestCaseFile = (filename: string, text: string): ParsedTestCase[] => {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("File is empty.");
  const isJson = /\.json$/i.test(filename) || trimmed.startsWith("[") || trimmed.startsWith("{");
  const cases = isJson ? parseJsonCases(trimmed) : parseDelimitedCases(text);
  if (cases.length === 0) throw new Error("No test cases found in the file.");
  return cases;
};

/** Serialize test cases to the JSON shape `parseTestCaseFile` reads back. */
export const testCasesToJson = (cases: TestCase[]): string =>
  JSON.stringify(
    cases.map((c) => ({
      input: c.input ?? "",
      expectedOutput: c.expectedOutput ?? "",
      isPublic: !!c.isPublic,
    })),
    null,
    2
  );
