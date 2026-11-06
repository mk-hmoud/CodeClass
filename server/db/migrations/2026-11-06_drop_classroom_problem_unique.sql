-- Remove the "one assignment per (classroom, problem)" restriction entirely.
--
-- Assignments now hold an ordered SET of problems (assignment_problems); the
-- legacy assignments.problem_id is only the primary/first-problem pointer. There
-- is no reason a problem can't appear in several assignments in the same
-- classroom (e.g. a warm-up reused in a later lab, or the same problem in two
-- separate assignments), so the uniqueness that blocked this is dropped.

DROP INDEX IF EXISTS assignments_classroom_problem_no_group_uq;
DROP INDEX IF EXISTS assignments_classroom_problem_group_uq;

-- Defensive: if an older database still carries the original inline
-- UNIQUE(classroom_id, problem_id) constraint under its auto-generated name
-- (never migrated to the partial indexes), drop that too.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'assignments'::regclass
    AND contype = 'u'
    AND conkey = (
      SELECT array_agg(attnum ORDER BY attnum)
      FROM pg_attribute
      WHERE attrelid = 'assignments'::regclass
        AND attname IN ('classroom_id', 'problem_id')
    );
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', cname);
  END IF;
END $$;
