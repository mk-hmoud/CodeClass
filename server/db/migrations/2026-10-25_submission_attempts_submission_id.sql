-- Ties each attempt row to the submission that created it, so a compile error
-- can un-count its own attempt idempotently (DELETE WHERE submission_id = x
-- matches at most one row and nothing after it is removed).
--
-- ON DELETE SET NULL, not CASCADE: submissions are delete-and-replaced on every
-- resubmit (SubmissionModel.createSubmission), and attempts must survive that --
-- they are the thing the per-assignment limit counts. A prior attempt simply
-- loses its submission_id when its submission is replaced; it still counts.
--
-- Safe to re-run.
BEGIN;
ALTER TABLE submission_attempts
  ADD COLUMN IF NOT EXISTS submission_id INT REFERENCES submissions(submission_id) ON DELETE SET NULL;
COMMIT;
