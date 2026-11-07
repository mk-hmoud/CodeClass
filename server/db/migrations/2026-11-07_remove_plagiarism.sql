-- Remove plagiarism detection from the whole system.
--
-- Drops the plagiarism tables, the per-assignment flag, and the plagiarism /
-- similarity columns from the statistics snapshots. The assignments_with_status
-- view selects a.*, so it must be dropped and recreated around the column drop.

DROP TABLE IF EXISTS plagiarism_reports;
DROP TABLE IF EXISTS submission_fingerprints;

DROP VIEW IF EXISTS assignments_with_status;

ALTER TABLE assignments DROP COLUMN IF EXISTS plagiarism_detection;

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

ALTER TABLE assignment_statistics
  DROP COLUMN IF EXISTS plagiarism_rate,
  DROP COLUMN IF EXISTS max_similarity,
  DROP COLUMN IF EXISTS avg_similarity;

ALTER TABLE classroom_statistics
  DROP COLUMN IF EXISTS plagiarism_rate,
  DROP COLUMN IF EXISTS avg_similarity,
  DROP COLUMN IF EXISTS max_similarity;
