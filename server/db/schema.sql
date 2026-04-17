CREATE TYPE problem_category_enum AS ENUM (
  'Fundamentals',
  'Algorithms',
  'Bug fixes',
  'Refactoring',
  'Puzzles'
);

CREATE TYPE assignment_difficulty_enum AS ENUM (
  'Easy',
  'Medium',
  'Hard'
);

CREATE TYPE grading_method_enum AS ENUM (
  'Manual',
  'Automatic',
  'Hybrid'
);

CREATE TYPE grading_status_enum AS ENUM (
  'pending', 
  'system graded', 
  'graded'
);

CREATE TABLE languages (
  language_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50)
);

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

CREATE TABLE instructors (
  instructor_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE students (
  student_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE classrooms (
  classroom_id SERIAL PRIMARY KEY,
  instructor_id INT NOT NULL,
  classroom_name VARCHAR(255) NOT NULL,
  classroom_code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  CONSTRAINT fk_instructor FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id) ON DELETE CASCADE
);


CREATE TABLE classroom_enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  student_id INT NOT NULL,
  enrollment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, student_id)
);

CREATE TABLE problems (
  problem_id SERIAL PRIMARY KEY,
  instructor_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category problem_category_enum,
  prerequisites TEXT,
  learning_outcomes TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id) ON DELETE CASCADE
);

CREATE TABLE assignments (
  assignment_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  problem_id INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  difficulty_level assignment_difficulty_enum,
  points INT,
  grading_method grading_method_enum NOT NULL,
  max_submissions INT,
  plagiarism_detection BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  publish_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, problem_id)
);

CREATE TABLE problem_test_cases (
  test_case_id SERIAL PRIMARY KEY,
  problem_id INT NOT NULL,
  input TEXT,
  expected_output TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE
);

CREATE TABLE assignment_languages_pairs (
  pair_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  language_id INT NOT NULL,
  initial_code TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, language_id)
);

CREATE TABLE submissions (
  submission_id   SERIAL PRIMARY KEY,
  student_id      INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  assignment_id   INT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  language_id     INT NOT NULL REFERENCES languages(language_id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  --is_main         BOOLEAN NOT NULL DEFAULT TRUE
  passed_tests    INT,
  total_tests     INT,
  grading_status grading_status_enum NOT NULL DEFAULT 'pending',
  auto_score NUMERIC(5,2), -- system score
  manual_score NUMERIC(5,2), -- instructor score
  final_score NUMERIC(5,2),
  feedback TEXT,
  status          VARCHAR(20) NOT NULL
    CHECK (status IN ('queued','running','completed','error'))
    DEFAULT 'queued'
);

CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_student_assignment ON submissions(assignment_id, student_id, submitted_at DESC);

CREATE TABLE submission_results (
  submission_id     INT NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
  test_case_id      INT NOT NULL REFERENCES problem_test_cases(test_case_id) ON DELETE CASCADE,
  passed            BOOLEAN NOT NULL,
  actual_output     TEXT,
  execution_time_ms INT,
  memory_usage_kb   INT,
  error_message     TEXT,
  PRIMARY KEY (submission_id, test_case_id)
);

CREATE TABLE submission_fingerprints (
  submission_id    INT   PRIMARY KEY
    REFERENCES submissions(submission_id)
    ON DELETE CASCADE,
  fingerprint_hashes BIGINT[] NOT NULL,
  indexed_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plagiarism_reports (
  report_id            SERIAL PRIMARY KEY,
  submission_id        INT    NOT NULL
    REFERENCES submissions(submission_id)
    ON DELETE CASCADE,
  compared_submission  INT    NOT NULL
    REFERENCES submissions(submission_id)
    ON DELETE CASCADE,
  similarity           NUMERIC(5,2) NOT NULL,
  checked_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(submission_id, compared_submission)
);


CREATE TABLE assignment_statistics (
  stat_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_submissions INT NOT NULL DEFAULT 0,
  distinct_submitters INT NOT NULL DEFAULT 0,
  average_score NUMERIC(5,2),
  median_score NUMERIC(5,2),
  average_runtime_ms INT,
  public_test_pass_rate NUMERIC(5,2),
  private_test_pass_rate NUMERIC(5,2),
  plagiarism_rate NUMERIC(5,2),
  max_similarity NUMERIC(5,2),
  avg_similarity NUMERIC(5,2),
  runtime_error_rate NUMERIC(5,2),
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_time)
);

CREATE TABLE assignment_score_distribution (
  distribution_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL,
  bucket_start INT NOT NULL,
  bucket_end INT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_time, bucket_start)
);

CREATE TABLE assignment_attempts_distribution (
  distribution_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL,
  avg_attempts NUMERIC(5,2) NOT NULL,
  median_attempts INT NOT NULL,
  max_attempts INT NOT NULL,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_time)
);

CREATE TABLE assignment_runtime_distribution (
  distribution_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL,
  min_runtime_ms INT,
  percentile_25_ms INT,
  median_runtime_ms INT,
  percentile_75_ms INT,
  max_runtime_ms INT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_time)
);

CREATE TABLE assignment_test_case_stats (
  stat_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  test_case_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  failure_rate NUMERIC(5,2) NOT NULL,
  avg_runtime_ms INT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  FOREIGN KEY (test_case_id) REFERENCES problem_test_cases(test_case_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, test_case_id, snapshot_time)
);

CREATE TABLE assignment_error_patterns (
  pattern_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  occurrence_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_time, error_type, error_message)
);

CREATE TABLE assignment_submission_timeline (
  timeline_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submission_day INT NOT NULL,
  submission_hour INT NOT NULL,
  submission_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_time, submission_day, submission_hour)
);

CREATE TABLE assignment_submission_trend (
  trend_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  snapshot_date DATE NOT NULL,
  submission_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (assignment_id, snapshot_date)
);

CREATE INDEX idx_assignment_statistics_assignment_id ON assignment_statistics(assignment_id);
CREATE INDEX idx_score_distribution_assignment_id ON assignment_score_distribution(assignment_id);
CREATE INDEX idx_attempts_distribution_assignment_id ON assignment_attempts_distribution(assignment_id);
CREATE INDEX idx_runtime_distribution_assignment_id ON assignment_runtime_distribution(assignment_id);
CREATE INDEX idx_test_case_stats_assignment_id ON assignment_test_case_stats(assignment_id);
CREATE INDEX idx_error_patterns_assignment_id ON assignment_error_patterns(assignment_id);
CREATE INDEX idx_submission_timeline_assignment_id ON assignment_submission_timeline(assignment_id);
CREATE INDEX idx_submission_trend_assignment_id ON assignment_submission_trend(assignment_id);

CREATE TABLE classroom_statistics (
  stat_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_students INT NOT NULL DEFAULT 0,
  active_students INT NOT NULL DEFAULT 0,
  active_student_rate NUMERIC(5,2),
  total_submissions INT NOT NULL DEFAULT 0,
  submissions_per_student NUMERIC(5,2),
  avg_assignment_score NUMERIC(5,2),
  median_assignment_score NUMERIC(5,2),
  plagiarism_rate NUMERIC(5,2),
  avg_similarity NUMERIC(5,2),
  max_similarity NUMERIC(5,2),
  runtime_error_rate NUMERIC(5,2),
  assignment_completion_rate NUMERIC(5,2),
  dropoff_rate NUMERIC(5,2),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, snapshot_time)
);

CREATE TABLE classroom_score_distribution (
  distribution_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL,
  bucket_start INT NOT NULL,
  bucket_end INT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, snapshot_time, bucket_start)
);

CREATE TABLE classroom_submission_timeline (
  timeline_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submission_day INT NOT NULL, -- 0-6, sunday to sat
  submission_hour INT NOT NULL, -- 0-23
  submission_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, snapshot_time, submission_day, submission_hour)
);

CREATE TABLE classroom_language_usage (
  usage_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  language_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submission_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  FOREIGN KEY (language_id) REFERENCES languages(language_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, language_id, snapshot_time)
);

CREATE TABLE classroom_student_improvement (
  improvement_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  improved_significantly INT NOT NULL DEFAULT 0, -- improvement by 10+ points
  improved_moderately INT NOT NULL DEFAULT 0,   -- improvement by 0-10 points
  stayed_flat INT NOT NULL DEFAULT 0,           -- no change
  declined INT NOT NULL DEFAULT 0,              -- negative change
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, snapshot_time)
);

CREATE INDEX idx_classroom_statistics_classroom_id ON classroom_statistics(classroom_id);
CREATE INDEX idx_classroom_score_distribution_classroom_id ON classroom_score_distribution(classroom_id);
CREATE INDEX idx_classroom_submission_timeline_classroom_id ON classroom_submission_timeline(classroom_id);
CREATE INDEX idx_classroom_language_usage_classroom_id ON classroom_language_usage(classroom_id);
CREATE INDEX idx_classroom_student_improvement_classroom_id ON classroom_student_improvement(classroom_id);

CREATE TABLE submission_attempts (
  attempt_id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  assignment_id INT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, assignment_id, submitted_at)
);

CREATE INDEX idx_submission_attempts ON submission_attempts(student_id, assignment_id);

CREATE OR REPLACE VIEW assignments_with_status AS
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


CREATE TABLE quizzes (
  quiz_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  instructor_id INT NOT NULL REFERENCES instructors(instructor_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time_limit_minutes INT, 
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  shuffle_problems BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quiz_problems (
  quiz_problem_id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  problem_id INT NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 10,
  problem_order INT NOT NULL,
  UNIQUE (quiz_id, problem_id)
);

CREATE TABLE quiz_sessions (
  session_id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  final_score NUMERIC(5,2),
  UNIQUE (quiz_id, student_id)
);

CREATE TABLE quiz_submissions (
  submission_id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES quiz_sessions(session_id) ON DELETE CASCADE,
  quiz_problem_id INT NOT NULL REFERENCES quiz_problems(quiz_problem_id) ON DELETE CASCADE,
  language_id INT NOT NULL REFERENCES languages(language_id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','error')),
  passed_tests INT,
  total_tests INT,
  auto_score NUMERIC(5,2)
);

CREATE TABLE quiz_submission_results (
  submission_id INT NOT NULL REFERENCES quiz_submissions(submission_id) ON DELETE CASCADE,
  test_case_id INT NOT NULL REFERENCES problem_test_cases(test_case_id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  actual_output TEXT,
  execution_time_ms INT,
  memory_usage_kb INT,
  error_message TEXT,
  PRIMARY KEY (submission_id, test_case_id)
);

--ALTER TABLE assignments
--ADD COLUMN results_published BOOLEAN NOT NULL DEFAULT FALSE;