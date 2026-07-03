import 'dotenv/config';
import pool from '../config/db';
import logger from '../config/logger';

const problems = [
  {
    title: 'Two Sum',
    description: 'Write a program that takes a target sum followed by a space-separated list of integers. Find the indices of the two numbers such that they add up to the target. Output the indices sorted, separated by a space. Assume there is exactly one solution.',
    category: 'Algorithms',
    prerequisites: 'Arrays, Loops',
    learning_outcomes: 'Using Hash Maps for O(n) lookup or basic nested loops for O(n^2).',
    tags: 'Array, Hash Table',
    testCases: [
      { input: '9\n2 7 11 15', expected_output: '0 1', is_public: true },
      { input: '6\n3 2 4', expected_output: '1 2', is_public: true },
      { input: '6\n3 3', expected_output: '0 1', is_public: false }
    ]
  },
  {
    title: 'Valid Palindrome',
    description: 'Write a program that takes a single string. Print "true" if it is a palindrome (reads the same forwards and backwards, ignoring non-alphanumeric characters and case), and "false" otherwise.',
    category: 'Fundamentals',
    prerequisites: 'Strings, Loops',
    learning_outcomes: 'String manipulation, two pointers approach.',
    tags: 'String, Two Pointers',
    testCases: [
      { input: 'A man, a plan, a canal: Panama', expected_output: 'true', is_public: true },
      { input: 'race a car', expected_output: 'false', is_public: true },
      { input: ' ', expected_output: 'true', is_public: false }
    ]
  },
  {
    title: 'Nth Fibonacci',
    description: 'Write a program that takes a single integer N and prints the Nth Fibonacci number. The Fibonacci sequence starts with F(0) = 0, F(1) = 1, and F(N) = F(N-1) + F(N-2).',
    category: 'Algorithms',
    prerequisites: 'Recursion or loops',
    learning_outcomes: 'Understanding recursion, memoization or dynamic programming.',
    tags: 'Math, DP, Recursion',
    testCases: [
      { input: '0', expected_output: '0', is_public: true },
      { input: '1', expected_output: '1', is_public: true },
      { input: '5', expected_output: '5', is_public: true },
      { input: '10', expected_output: '55', is_public: false }
    ]
  },
  {
    title: 'FizzBuzz',
    description: 'Write a program that takes an integer N. For numbers from 1 to N, print "Fizz" if the number is divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if divisible by both, and the number itself otherwise. Print each on a new line.',
    category: 'Fundamentals',
    prerequisites: 'Loops, Conditionals',
    learning_outcomes: 'Using basic control flow logic like if/else.',
    tags: 'Math, Strings',
    testCases: [
      { input: '5', expected_output: '1\n2\nFizz\n4\nBuzz', is_public: true },
      { input: '15', expected_output: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', is_public: true },
      { input: '1', expected_output: '1', is_public: false }
    ]
  }
];

async function seedProblems() {
  const email = process.argv[2];
  if (!email) {
    logger.error('Please provide an instructor email as an argument (e.g. node seedProblems.js test@instructor.com).');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    logger.info(`Looking for instructor with email: ${email}`);
    const userRes = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      throw new Error(`No user found with email: ${email}`);
    }
    const userId = userRes.rows[0].user_id;

    const instRes = await client.query('SELECT instructor_id FROM instructors WHERE user_id = $1', [userId]);
    if (instRes.rows.length === 0) {
      throw new Error(`User with email ${email} is not registered as an instructor.`);
    }
    const instructorId = instRes.rows[0].instructor_id;

    await client.query('BEGIN');
    
    let addedCount = 0;
    
    for (const prob of problems) {
      const pRes = await client.query(`
        INSERT INTO problems (instructor_id, title, description, category, prerequisites, learning_outcomes, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING problem_id
      `, [
        instructorId, 
        prob.title, 
        prob.description, 
        prob.category, 
        prob.prerequisites, 
        prob.learning_outcomes, 
        prob.tags
      ]);
      
      const problemId = pRes.rows[0].problem_id;
      
      for (const tc of prob.testCases) {
        await client.query(`
          INSERT INTO problem_test_cases (problem_id, input, expected_output, is_public)
          VALUES ($1, $2, $3, $4)
        `, [problemId, tc.input, tc.expected_output, tc.is_public]);
      }
      
      addedCount++;
    }

    await client.query('COMMIT');
    logger.info(`Successfully added ${addedCount} high-quality problems for instructor ${email}!`);
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error(`Error seeding problems: ${error.message}`);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedProblems();
