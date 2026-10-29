-- Multiple libraries per problem.
--
-- Previously each problem in an assignment linked at most one helper-code
-- library (assignment_problems.library_id). Now a problem can link several, via
-- the assignment_problem_libraries join table (ordered by `position`). The
-- grading lookup concatenates every linked library's code for the language, in
-- order, and still falls back to the legacy per-problem / assignment library
-- when a problem has no rows here. Additive; the old column is kept as the
-- fallback. Safe to re-run.
BEGIN;

CREATE TABLE IF NOT EXISTS assignment_problem_libraries (
  assignment_id INT NOT NULL,
  problem_id    INT NOT NULL,
  library_id    INT NOT NULL REFERENCES libraries(library_id) ON DELETE CASCADE,
  position      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (assignment_id, problem_id, library_id),
  FOREIGN KEY (assignment_id, problem_id)
    REFERENCES assignment_problems(assignment_id, problem_id) ON DELETE CASCADE
);

-- Seed the join table from the existing single per-problem library.
INSERT INTO assignment_problem_libraries (assignment_id, problem_id, library_id, position)
SELECT assignment_id, problem_id, library_id, 0
FROM assignment_problems
WHERE library_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
