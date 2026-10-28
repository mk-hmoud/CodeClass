-- Multi-problem assignments.
--
-- Until now an assignment IS one problem: assignments.problem_id is a 1:1 FK and
-- everything (submissions, attempts, starter code, stats) hangs off assignment_id
-- meaning "that one problem". This makes an assignment an ORDERED SET of problems,
-- lifting the shape quizzes already use (quiz_problems + per-problem submissions).
--
-- Strategy: purely additive + backfilled. Every existing assignment becomes the
-- N=1 case (one assignment_problems row at position 0), so the 48 existing
-- assignments behave exactly as before. New columns are left NULLABLE and
-- backfilled -- NOT made NOT NULL -- so that during the gap between applying this
-- migration and the server image finishing its rebuild, the still-running old
-- server (which does not set problem_id) keeps inserting rows without error.
-- assignments.problem_id is kept populated as the "primary" problem through the
-- transition; a later migration drops it once nothing reads it.
--
-- Safe to re-run.
BEGIN;

-- 1. The ordered problem set of an assignment. points/position are per-problem,
--    per-assignment (mirrors quiz_problems).
CREATE TABLE IF NOT EXISTS assignment_problems (
  assignment_id INT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  problem_id    INT NOT NULL REFERENCES problems(problem_id)       ON DELETE CASCADE,
  points        INT NOT NULL DEFAULT 100,
  position      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (assignment_id, problem_id)
);
CREATE INDEX IF NOT EXISTS idx_assignment_problems_assignment ON assignment_problems(assignment_id);

-- Backfill: one row per existing assignment, carrying its current problem + points.
INSERT INTO assignment_problems (assignment_id, problem_id, points, position)
SELECT a.assignment_id, a.problem_id, COALESCE(a.points, 100), 0
FROM assignments a
ON CONFLICT (assignment_id, problem_id) DO NOTHING;

-- 2. A submission is now against a specific problem WITHIN the assignment.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS problem_id INT REFERENCES problems(problem_id) ON DELETE CASCADE;

UPDATE submissions s
SET problem_id = a.problem_id
FROM assignments a
WHERE s.assignment_id = a.assignment_id
  AND s.problem_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment_problem
  ON submissions(assignment_id, student_id, problem_id, submitted_at DESC);

-- 3. Attempts are counted per problem (the attempt budget is per problem).
ALTER TABLE submission_attempts
  ADD COLUMN IF NOT EXISTS problem_id INT REFERENCES problems(problem_id) ON DELETE CASCADE;

-- Backfill from the attempt's own submission when still present, else from the
-- assignment's single problem (pre-migration attempts were all single-problem).
UPDATE submission_attempts sa
SET problem_id = COALESCE(
      (SELECT s.problem_id FROM submissions s WHERE s.submission_id = sa.submission_id),
      (SELECT a.problem_id FROM assignments a WHERE a.assignment_id = sa.assignment_id))
WHERE sa.problem_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_submission_attempts_problem
  ON submission_attempts(student_id, assignment_id, problem_id);

-- 4. Starter code / language pairs become per-(assignment, problem): in a
--    multi-problem assignment each problem has its own initial code & languages.
ALTER TABLE assignment_languages_pairs
  ADD COLUMN IF NOT EXISTS problem_id INT REFERENCES problems(problem_id) ON DELETE CASCADE;

UPDATE assignment_languages_pairs alp
SET problem_id = a.problem_id
FROM assignments a
WHERE alp.assignment_id = a.assignment_id
  AND alp.problem_id IS NULL;

-- Replace UNIQUE(assignment_id, language_id) with (assignment_id, problem_id,
-- language_id). Look the old constraint up by shape rather than by name.
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'assignment_languages_pairs'::regclass
    AND contype = 'u'
    AND conkey = (
      SELECT array_agg(attnum ORDER BY attnum)
      FROM pg_attribute
      WHERE attrelid = 'assignment_languages_pairs'::regclass
        AND attname IN ('assignment_id', 'language_id'));
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE assignment_languages_pairs DROP CONSTRAINT %I', cname);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS assignment_languages_pairs_apl_uq
  ON assignment_languages_pairs (assignment_id, problem_id, language_id);

COMMIT;
