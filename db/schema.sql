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
  difficulty_level assignment_difficulty_enum,
  points INT,
  grading_method grading_method_enum NOT NULL,
  submission_attempts INT,
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