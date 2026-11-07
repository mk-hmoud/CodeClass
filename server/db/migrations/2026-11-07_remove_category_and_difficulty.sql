-- Remove the "category" field from problems and the "difficulty" field from
-- assignments, plus their enum types. The assignments_with_status view selects
-- a.*, so it is dropped and recreated around the column drop.

DROP VIEW IF EXISTS assignments_with_status;

ALTER TABLE assignments DROP COLUMN IF EXISTS difficulty_level;
ALTER TABLE problems    DROP COLUMN IF EXISTS category;

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

DROP TYPE IF EXISTS problem_category_enum;
DROP TYPE IF EXISTS assignment_difficulty_enum;
