import 'dotenv/config';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import logger from '../config/logger';

// Credentials for the two accounts your supervisor will use.
const SUPERVISOR_INSTRUCTOR = { email: 'supervisor.instructor@codeclass.demo', password: 'Demo1234!', first_name: 'Guest', last_name: 'Instructor' };
const SUPERVISOR_STUDENT = { email: 'supervisor.student@codeclass.demo', password: 'Demo1234!', first_name: 'Guest', last_name: 'Student' };

// A couple of extra students so the classroom/analytics screens don't look empty.
const EXTRA_STUDENTS = [
  { email: 'alex.johnson@codeclass.demo', first_name: 'Alex', last_name: 'Johnson' },
  { email: 'sam.lee@codeclass.demo', first_name: 'Sam', last_name: 'Lee' },
];
const EXTRA_STUDENT_PASSWORD = 'Demo1234!';

// Known-working C++ image library (verified end-to-end earlier: compiles,
// links against libpng, produces a valid PNG) -- reused here so the demo
// image assignment actually works if the supervisor tries running it.
const IMAGE_LIB_CONTENT = `
#pragma once

#include <stdio.h>
#include <vector>
#include "png.h"
#include <iostream>
#include <string>
#include <algorithm>
#include <math.h>

typedef unsigned char Byte;

struct RGBA
{
    RGBA() : r(0), g(0), b(0), a(255) {}
    RGBA(Byte r, Byte g, Byte b, Byte a = 255) : r(r), g(g), b(b), a(a) {}
    RGBA(Byte lum) : r(lum), g(lum), b(lum), a(255) {}

    Byte luminance() const
    {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    Byte r, g, b, a;
};

class ColorImage
{
public:
    ColorImage() : width(0), height(0) {}

    ColorImage(int width, int height) : width(width), height(height), data(width * height) {}

    RGBA &operator()(int x, int y)
    {
        return data[x + y * width];
    }

    RGBA operator()(int x, int y) const
    {
        return data[x + y * width];
    }

    int GetWidth() const { return width; }

    int GetHeight() const { return height; }

    void Save(std::string filename)
    {
        FILE *fp = NULL;
        png_structp png_ptr = NULL;
        png_infop info_ptr = NULL;

        fp = fopen(filename.c_str(), "wb");
        if (fp == NULL)
        {
            fprintf(stderr, "Could not open file %s for writing\\n", filename.c_str());
            goto finalise;
        }

        png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
        if (png_ptr == NULL)
        {
            fprintf(stderr, "Could not allocate write struct\\n");
            goto finalise;
        }

        info_ptr = png_create_info_struct(png_ptr);
        if (info_ptr == NULL)
        {
            fprintf(stderr, "Could not allocate info struct\\n");
            goto finalise;
        }

        if (setjmp(png_jmpbuf(png_ptr)))
        {
            fprintf(stderr, "Error during png creation\\n");
            goto finalise;
        }

        png_init_io(png_ptr, fp);

        png_set_IHDR(png_ptr, info_ptr, width, height,
                     8, PNG_COLOR_TYPE_RGBA, PNG_INTERLACE_NONE,
                     PNG_COMPRESSION_TYPE_BASE, PNG_FILTER_TYPE_BASE);

        png_write_info(png_ptr, info_ptr);

        for (int y = 0; y < height; y++)
        {
            png_write_row(png_ptr, (unsigned char *)&data[y * width]);
        }

        png_write_end(png_ptr, NULL);

    finalise:
        if (fp != NULL)
            fclose(fp);
        if (info_ptr != NULL)
            png_free_data(png_ptr, info_ptr, PNG_FREE_ALL, -1);
        if (png_ptr != NULL)
            png_destroy_write_struct(&png_ptr, (png_infopp)NULL);
    }

private:
    std::vector<RGBA> data;
    int width, height;
};
`;

// A tiny, real, already-produced 128x128 PNG (a red square on black) --
// verified rendering correctly earlier -- used to pre-populate the demo
// image submission so the grading screen isn't empty.
const SAMPLE_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABW0lEQVR4nO3dsQ3AMAwEMTn77+wMkcJwjpzgi4NarT2z51Lr9IAfeE4P4CwBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOJed3AD/UypDJYAAAAASUVORK5CYII=';

async function createUserWithRole(
  client: any,
  table: 'instructors' | 'students',
  info: { email: string; password: string; first_name: string; last_name: string }
): Promise<number> {
  const passwordHash = await bcrypt.hash(info.password, 10);
  const userRes = await client.query(
    `INSERT INTO users (password_hash, first_name, last_name, email) VALUES ($1,$2,$3,$4) RETURNING user_id`,
    [passwordHash, info.first_name, info.last_name, info.email]
  );
  const userId = userRes.rows[0].user_id;
  const idColumn = table === 'instructors' ? 'instructor_id' : 'student_id';
  const roleRes = await client.query(
    `INSERT INTO ${table} (user_id) VALUES ($1) RETURNING ${idColumn}`,
    [userId]
  );
  return roleRes.rows[0][idColumn];
}

async function languageId(client: any, name: string): Promise<number> {
  const res = await client.query(
    `SELECT language_id FROM languages WHERE name = $1 ORDER BY language_id LIMIT 1`,
    [name]
  );
  if (res.rows.length === 0) throw new Error(`Language "${name}" not found -- is the languages table seeded?`);
  return res.rows[0].language_id;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    logger.info('Wiping all non-admin data (every FK in this schema cascades from users)...');
    await client.query(`
      DELETE FROM users
      WHERE user_id NOT IN (
        SELECT ur.user_id FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE r.role_name = 'admin'
      )
    `);

    logger.info('Creating supervisor accounts...');
    const instructorId = await createUserWithRole(client, 'instructors', SUPERVISOR_INSTRUCTOR);
    const supervisorStudentId = await createUserWithRole(client, 'students', SUPERVISOR_STUDENT);
    const extraStudentIds: number[] = [];
    for (const s of EXTRA_STUDENTS) {
      extraStudentIds.push(await createUserWithRole(client, 'students', { ...s, password: EXTRA_STUDENT_PASSWORD }));
    }

    logger.info('Creating classroom and enrollments...');
    const classroomRes = await client.query(
      `INSERT INTO classrooms (instructor_id, classroom_name, classroom_code) VALUES ($1,$2,$3) RETURNING classroom_id`,
      [instructorId, 'Intro to Programming (Demo)', 'DEMO2026']
    );
    const classroomId = classroomRes.rows[0].classroom_id;
    for (const sid of [supervisorStudentId, ...extraStudentIds]) {
      await client.query(
        `INSERT INTO classroom_enrollments (classroom_id, student_id) VALUES ($1,$2)`,
        [classroomId, sid]
      );
    }

    const pythonId = await languageId(client, 'python');
    const cppId = await languageId(client, 'cpp');

    // ── Text assignment: Two Sum, automatically graded, already submitted ──
    logger.info('Creating text assignment (Two Sum, Automatic grading)...');
    const problemRes = await client.query(
      `INSERT INTO problems (instructor_id, title, description, category, prerequisites, learning_outcomes, tags, output_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'text') RETURNING problem_id`,
      [
        instructorId,
        'Two Sum',
        'Write a program that takes a target sum followed by a space-separated list of integers. Find the indices of the two numbers such that they add up to the target. Output the indices sorted, separated by a space. Assume there is exactly one solution.',
        'Algorithms',
        'Arrays, Loops',
        'Using hash maps for O(n) lookup, or basic nested loops for O(n^2).',
        'Array, Hash Table',
      ]
    );
    const problemId = problemRes.rows[0].problem_id;

    const testCases = [
      { input: '9\n2 7 11 15', expected_output: '0 1', is_public: true },
      { input: '6\n3 2 4', expected_output: '1 2', is_public: true },
      { input: '6\n3 3', expected_output: '0 1', is_public: false },
    ];
    const testCaseIds: number[] = [];
    for (const tc of testCases) {
      const r = await client.query(
        `INSERT INTO problem_test_cases (problem_id, input, expected_output, is_public) VALUES ($1,$2,$3,$4) RETURNING test_case_id`,
        [problemId, tc.input, tc.expected_output, tc.is_public]
      );
      testCaseIds.push(r.rows[0].test_case_id);
    }

    const assignmentRes = await client.query(
      `INSERT INTO assignments (classroom_id, problem_id, title, description, difficulty_level, points, grading_method, plagiarism_detection, publish_date, due_date)
       VALUES ($1,$2,$3,$4,'Easy',100,'Automatic',false, now(), now() + interval '14 days')
       RETURNING assignment_id`,
      [classroomId, problemId, 'Two Sum', 'Solve the classic Two Sum problem.']
    );
    const assignmentId = assignmentRes.rows[0].assignment_id;

    const pythonStarter = `import sys\n\ndef solution(target, nums):\n    # TODO: implement\n    pass\n\ndata = sys.stdin.read().split('\\n')\ntarget = int(data[0])\nnums = list(map(int, data[1].split()))\nprint(*solution(target, nums))\n`;
    await client.query(
      `INSERT INTO assignment_languages_pairs (assignment_id, language_id, initial_code) VALUES ($1,$2,$3)`,
      [assignmentId, pythonId, pythonStarter]
    );

    const solvedPythonCode = `import sys\n\ndef solution(target, nums):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return sorted([seen[target - n], i])\n        seen[n] = i\n\ndata = sys.stdin.read().split('\\n')\ntarget = int(data[0])\nnums = list(map(int, data[1].split()))\nprint(*solution(target, nums))\n`;
    const subRes = await client.query(
      `INSERT INTO submissions (student_id, assignment_id, language_id, code, passed_tests, total_tests, grading_status, auto_score, final_score, status)
       VALUES ($1,$2,$3,$4,$5,$6,'graded',100,100,'completed')
       RETURNING submission_id`,
      [supervisorStudentId, assignmentId, pythonId, solvedPythonCode, testCases.length, testCases.length]
    );
    const submissionId = subRes.rows[0].submission_id;
    for (const [i, tc] of testCases.entries()) {
      await client.query(
        `INSERT INTO submission_results (submission_id, test_case_id, passed, actual_output, execution_time_ms)
         VALUES ($1,$2,true,$3,$4)`,
        [submissionId, testCaseIds[i], tc.expected_output, 10 + i * 3]
      );
    }

    // ── Image assignment: manually graded, pending review ──
    logger.info('Creating image-output assignment (Computer Graphics style, Manual grading)...');
    const imageProblemRes = await client.query(
      `INSERT INTO problems (instructor_id, title, description, category, prerequisites, learning_outcomes, tags, output_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'image') RETURNING problem_id`,
      [
        instructorId,
        'Draw a Solid Square',
        'Using the provided image library, create a 128x128 image and draw a solid colored square in the top-left corner. Save it as output.png. There is no automated pass/fail for this problem -- your instructor reviews the produced image directly.',
        'Puzzles',
        'Basic C++, arrays',
        'Working with pixel buffers and an image-writing library.',
        'Graphics, C++',
      ]
    );
    const imageProblemId = imageProblemRes.rows[0].problem_id;
    const imageTestCaseRes = await client.query(
      `INSERT INTO problem_test_cases (problem_id, input, expected_output, is_public) VALUES ($1, '', NULL, true) RETURNING test_case_id`,
      [imageProblemId]
    );
    const imageTestCaseId = imageTestCaseRes.rows[0].test_case_id;

    const libraryRes = await client.query(
      `INSERT INTO libraries (instructor_id, name, description) VALUES ($1,$2,$3) RETURNING library_id`,
      [instructorId, 'Image.h', 'Minimal PNG-writing helper (wraps libpng) for Computer Graphics style assignments.']
    );
    const libraryId = libraryRes.rows[0].library_id;
    await client.query(
      `INSERT INTO library_files (library_id, language_id, content) VALUES ($1,$2,$3)`,
      [libraryId, cppId, IMAGE_LIB_CONTENT]
    );

    const imageAssignmentRes = await client.query(
      `INSERT INTO assignments (classroom_id, problem_id, title, description, difficulty_level, points, grading_method, plagiarism_detection, publish_date, due_date, library_id)
       VALUES ($1,$2,$3,$4,'Medium',50,'Manual',false, now(), now() + interval '14 days', $5)
       RETURNING assignment_id`,
      [classroomId, imageProblemId, 'Draw a Solid Square', 'Draw a solid square using the provided image library.', libraryId]
    );
    const imageAssignmentId = imageAssignmentRes.rows[0].assignment_id;

    const cppStarter = `#include "lib.h"\n\nint main() {\n    ColorImage img(128, 128);\n    // TODO: draw a solid square somewhere in the image\n    img.Save("output.png");\n    return 0;\n}\n`;
    await client.query(
      `INSERT INTO assignment_languages_pairs (assignment_id, language_id, initial_code) VALUES ($1,$2,$3)`,
      [imageAssignmentId, cppId, cppStarter]
    );

    const imageSolutionCode = `#include "lib.h"\n\nint main() {\n    ColorImage img(128, 128);\n    for (int y = 0; y < 49; y++)\n        for (int x = 0; x < 47; x++)\n            img(x, y) = RGBA(255, 0, 0, 255);\n    img.Save("output.png");\n    return 0;\n}\n`;
    const imageSubRes = await client.query(
      `INSERT INTO submissions (student_id, assignment_id, language_id, code, passed_tests, total_tests, grading_status, status)
       VALUES ($1,$2,$3,$4,0,1,'pending','completed')
       RETURNING submission_id`,
      [supervisorStudentId, imageAssignmentId, cppId, imageSolutionCode]
    );
    await client.query(
      `INSERT INTO submission_results (submission_id, test_case_id, passed, actual_output, execution_time_ms)
       VALUES ($1,$2,false,$3,3)`,
      [imageSubRes.rows[0].submission_id, imageTestCaseId, SAMPLE_PNG_DATA_URI]
    );

    await client.query('COMMIT');

    logger.info('Demo data seeded successfully.');
    logger.info('──────────────────────────────────────────────');
    logger.info(`Instructor login: ${SUPERVISOR_INSTRUCTOR.email} / ${SUPERVISOR_INSTRUCTOR.password}`);
    logger.info(`Student login:    ${SUPERVISOR_STUDENT.email} / ${SUPERVISOR_STUDENT.password}`);
    logger.info('──────────────────────────────────────────────');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, 'Seeding failed, rolled back.');
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
