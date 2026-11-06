-- Remove the "primary problem" concept from assignments entirely.
--
-- assignments.problem_id was the single-problem-era pointer. Assignments are now
-- an ordered SET of problems (assignment_problems); the primary problem is simply
-- the first row by position. This migration guarantees every assignment has at
-- least one assignment_problems row, then drops the legacy column. Run AFTER
-- 2026-11-06_drop_classroom_problem_unique.sql.

-- 1. Backfill: any assignment with no assignment_problems row (legacy /assign
--    path, pre-multi-problem data) gets one seeded from its old problem_id.
INSERT INTO assignment_problems (assignment_id, problem_id, points, position)
SELECT a.assignment_id, a.problem_id, COALESCE(a.points, 100), 0
FROM assignments a
WHERE a.problem_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM assignment_problems ap WHERE ap.assignment_id = a.assignment_id
  )
ON CONFLICT (assignment_id, problem_id) DO NOTHING;

-- 2. The assignments_with_status view is defined as `SELECT a.*`, which pins an
--    explicit column list that still names problem_id. Drop it, drop the column,
--    then recreate the view so it no longer carries problem_id.
DROP VIEW IF EXISTS assignments_with_status;

ALTER TABLE assignments DROP COLUMN IF EXISTS problem_id;

CREATE VIEW assignments_with_status AS
SELECT
  a.*,
  CASE
    WHEN a.publish_date IS NOT NULL
      AND a.publish_date >  NOW()           THEN 'not_published'
    WHEN a.due_date     IS NOT NULL
      AND a.due_date     <  NOW()           THEN 'expired'
    ELSE 'active'
  END AS status
FROM assignments a;
