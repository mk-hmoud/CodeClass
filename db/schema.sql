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
  FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id) ON DELETE CASCADE
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
  UNIQUE (classroom_id, problem_id),
  CONSTRAINT submission_attempts_check CHECK (submission_attempts IS NULL OR submission_attempts >= 0)
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
  passed_tests    INT,
  total_tests     INT,
  score           NUMERIC(5,2),
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
