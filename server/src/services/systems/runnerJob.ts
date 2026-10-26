import pool from "../../config/db";

export interface RunnerFile { path: string; content: string; }
export interface RunnerTestCase {
  testCaseId: number;
  args: string[];
  stdin: string;
  env: Record<string, string>;
  expectedOutput: string;
  compare: "exact" | "unordered";
  isPublic: boolean;
}
export interface RunnerJob {
  files: RunnerFile[];
  buildCommand: string;
  entrypoint: string;
  testCases: RunnerTestCase[];
}

/** Test-case `input` doubles as argv (comma- or whitespace-separated), matching
 *  the other runners; stdin/env are the systems additions. */
export const splitArgs = (input: string | null | undefined): string[] => {
  if (!input) return [];
  const s = input.trim();
  if (!s) return [];
  return s.includes(",") ? s.split(",").map(a => a.trim()).filter(Boolean)
                         : s.split(/\s+/).filter(Boolean);
};

/**
 * Assembles the JSON the judge-systems runner expects, from a systems problem
 * and the student's edited files. Provided files (readonly/hidden) always come
 * from the problem; the student may only override `template` files, so a
 * submission cannot replace the harness or hidden headers.
 */
export const assembleSystemsJob = async (
  problemId: number,
  studentFiles: RunnerFile[]
): Promise<RunnerJob> => {
  const prob = await pool.query(
    `SELECT runtime, build_command, entrypoint FROM problems WHERE problem_id = $1`,
    [problemId]
  );
  if (prob.rowCount === 0) throw new Error("Problem not found");
  if (prob.rows[0].runtime !== "systems") throw new Error("Not a systems problem");
  const { build_command, entrypoint } = prob.rows[0];

  const filesRes = await pool.query(
    `SELECT path, content, role FROM problem_files WHERE problem_id = $1`,
    [problemId]
  );
  const editable = new Set(filesRes.rows.filter(f => f.role === "template").map(f => f.path));
  const studentByPath = new Map(studentFiles.map(f => [f.path, f.content]));

  // Start from the manifest; replace template files with the student's version.
  const files: RunnerFile[] = filesRes.rows.map(f => ({
    path: f.path,
    content: editable.has(f.path) && studentByPath.has(f.path)
      ? (studentByPath.get(f.path) as string)
      : f.content,
  }));
  // Allow new student files only at paths not already claimed by the manifest.
  for (const sf of studentFiles) {
    if (!files.some(f => f.path === sf.path)) files.push(sf);
  }

  const tcRes = await pool.query(
    `SELECT test_case_id, input, expected_output, is_public, stdin, env, compare
       FROM problem_test_cases WHERE problem_id = $1 ORDER BY test_case_id`,
    [problemId]
  );
  const testCases: RunnerTestCase[] = tcRes.rows.map(t => ({
    testCaseId: t.test_case_id,
    args: splitArgs(t.input),
    stdin: t.stdin ?? "",
    env: (t.env as Record<string, string>) ?? {},
    expectedOutput: t.expected_output ?? "",
    compare: (t.compare as "exact" | "unordered") ?? "exact",
    isPublic: t.is_public ?? true,
  }));

  return { files, buildCommand: build_command ?? "", entrypoint: entrypoint ?? "./app", testCases };
};
