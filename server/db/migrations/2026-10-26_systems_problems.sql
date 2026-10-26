-- Systems-programming problem support (Milestone A).
--
-- A systems problem is a set of FILES that is BUILT, then each test case runs
-- the entry binary with its own argv + stdin + environment, compared exact or
-- unordered. All additive; standard problems are untouched (runtime defaults to
-- 'standard', no problem_files rows -> the existing single-`code` path runs).
--
-- Safe to re-run.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='problem_runtime_enum') THEN
    CREATE TYPE problem_runtime_enum AS ENUM ('standard','systems');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='problem_file_role_enum') THEN
    CREATE TYPE problem_file_role_enum AS ENUM ('template','readonly','hidden');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='test_compare_enum') THEN
    CREATE TYPE test_compare_enum AS ENUM ('exact','unordered');
  END IF;
END $$;

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS runtime        problem_runtime_enum NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS build_command  TEXT,
  ADD COLUMN IF NOT EXISTS entrypoint     TEXT;

-- The file manifest for a systems problem.
--   template = editable starter the student sees
--   readonly = provided, shown, locked
--   hidden   = provided at build time, never shown (headers, Makefiles, harness)
CREATE TABLE IF NOT EXISTS problem_files (
  file_id    SERIAL PRIMARY KEY,
  problem_id INT NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  role       problem_file_role_enum NOT NULL DEFAULT 'template',
  UNIQUE (problem_id, path)
);
CREATE INDEX IF NOT EXISTS idx_problem_files_problem ON problem_files(problem_id);

ALTER TABLE problem_test_cases
  ADD COLUMN IF NOT EXISTS stdin    TEXT,
  ADD COLUMN IF NOT EXISTS env      JSONB,
  ADD COLUMN IF NOT EXISTS compare  test_compare_enum NOT NULL DEFAULT 'exact';

-- Multi-file submissions. Single-file submissions keep using submissions.code;
-- a systems submission stores its editable files here instead.
CREATE TABLE IF NOT EXISTS submission_files (
  submission_id INT NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (submission_id, path)
);

COMMIT;
