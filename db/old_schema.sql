CREATE TYPE assignment_category_enum AS ENUM (
  'Fundamentals',
  'Algorithms',
  'Bug fixes',
  'Refactoring',
  'Puzzles'
);

CREATE TYPE assignment_difficulty_enum AS ENUM (
  'Beginner',
  'Intermediate',
  'Advanced'
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

CREATE TABLE assignments (
  assignment_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP  -- Trigger to auto update on change?
);

CREATE TABLE assignment_metadata (
  assignment_id INT PRIMARY KEY,
  category assignment_category_enum,
  difficulty_level assignment_difficulty_enum,
  points INT,
  prerequisites TEXT,
  learning_outcomes TEXT,
  tags TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE
);

CREATE TABLE assignment_config (
  assignment_id INT PRIMARY KEY,
  grading_method grading_method_enum NOT NULL,
  submission_attempts INT,
  plagiarism_detection BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  CONSTRAINT submission_attempts_check CHECK (submission_attempts IS NULL OR submission_attempts >= 0)
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

CREATE TABLE assignment_test_cases (
  test_case_id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  input TEXT,
  expected_output TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE
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

CREATE TABLE classroom_assignments (
  classroom_assignment_id SERIAL PRIMARY KEY,
  classroom_id INT NOT NULL,
  assignment_id INT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  publish_date TIMESTAMPTS
  due_date TIMESTAMPTZ,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  UNIQUE (classroom_id, assignment_id)
);

CREATE TABLE instructor_assignments(
  instructor_id INT NOT NULL,
  assignment_id INT NOT NULL,
  PRIMARY KEY (instructor_id, assignment_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id) ON DELETE CASCADE
);