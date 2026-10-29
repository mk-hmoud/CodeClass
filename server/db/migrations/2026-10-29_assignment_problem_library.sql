-- Per-problem library linking.
--
-- Previously a whole assignment linked one helper-code library (assignments.
-- library_id). Now each problem within the assignment can link its own, via
-- assignment_problems.library_id. The grading lookup uses the problem's library
-- and falls back to the assignment's. Additive; existing per-problem rows inherit
-- whatever library the assignment had. Safe to re-run.
BEGIN;

ALTER TABLE assignment_problems
  ADD COLUMN IF NOT EXISTS library_id INT REFERENCES libraries(library_id) ON DELETE SET NULL;

UPDATE assignment_problems ap
SET library_id = a.library_id
FROM assignments a
WHERE ap.assignment_id = a.assignment_id
  AND ap.library_id IS NULL
  AND a.library_id IS NOT NULL;

COMMIT;
