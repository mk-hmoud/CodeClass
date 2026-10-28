-- Systems grading additions for Lab 2 (process model / signals).
--
-- 1. A 'regex' compare mode: each non-empty line of a test's expected output is
--    a regular expression that must be found in the program's output. This is
--    what lets us grade programs whose output carries volatile values (PIDs,
--    UIDs) or interleaves (fork) -- we assert the decisive lines, masking the
--    noise with \d+ etc.
-- 2. Per-test signal delivery: `signal` (e.g. 'SIGINT') + `signal_after_ms` let
--    the runner start a process, wait, then deliver a signal -- needed to grade
--    signal handlers (the program otherwise loops to timeout).
--
-- Additive; existing tests default to compare='exact' with no signal.
--
-- NOTE: ALTER TYPE ... ADD VALUE must run OUTSIDE a transaction block and cannot
-- be used in the same transaction it's added, so it stands alone (autocommit)
-- and the column adds are in their own transaction below. Safe to re-run.

ALTER TYPE test_compare_enum ADD VALUE IF NOT EXISTS 'regex';

BEGIN;

ALTER TABLE problem_test_cases
  ADD COLUMN IF NOT EXISTS signal          TEXT,
  ADD COLUMN IF NOT EXISTS signal_after_ms INT;

COMMIT;
