-- Adds users.must_change_password (see schema.sql) to an existing deployment,
-- and turns it on for every student account that exists today: those were all
-- created with one shared password, which is exactly what the flag is for.
--
-- Instructors and admins are left alone. Flipping an admin to "must change"
-- while this flow is still being verified risks locking out the only account
-- that could fix it.
--
-- No view recreation needed: the schema's only view (assignments_with_status)
-- selects from assignments, not users.
--
-- Safe to re-run: the ADD COLUMN is guarded and the UPDATE is idempotent.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users u
   SET must_change_password = TRUE
 WHERE EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.user_id)
   AND must_change_password = FALSE;

COMMIT;
