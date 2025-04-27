import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SubmissionModel.ts] [${functionName}] ${message}`);
};

export interface CreateSubmissionArgs {
  studentId: number;
  assignmentId: number;
  language: string;
  code: string;
}

export const createSubmission = async ({
    studentId,
    assignmentId,
    language,
    code,
  }: CreateSubmissionArgs): Promise<number> => {
    const functionName = "createSubmission";
    logMessage(functionName, `Attempting to create submission for student ${studentId}, assignment ${assignmentId}, language ${language}.`);
    try {
        logMessage(functionName, `Querying for language ID for language: ${language}`);
        const langQueryResult = await pool.query(
          `SELECT language_id FROM languages WHERE name = $1`,
          [language]
        );

        if (langQueryResult.rowCount === 0) {
          logMessage(functionName, `Unsupported language: ${language}. Throwing error.`);
          throw new Error("Unsupported language");
        }
        const languageId = langQueryResult.rows[0].language_id;
        logMessage(functionName, `Found language ID: ${languageId} for language: ${language}.`);


        logMessage(functionName, `Counting existing submissions for student ${studentId} on assignment ${assignmentId}.`);
        const attemptRes = await pool.query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM submissions
           WHERE student_id=$1 AND assignment_id=$2`,
          [studentId, assignmentId]
        );
        const attempts = parseInt(attemptRes.rows[0].cnt, 10);
        logMessage(functionName, `Student ${studentId} has ${attempts} existing submissions for assignment ${assignmentId}.`);


        logMessage(functionName, `Getting maximum allowed submissions for assignment ${assignmentId}.`);
        const maxRes = await pool.query<{ submission_attempts: number | null }>( 
          `SELECT max_submissions FROM assignments WHERE assignment_id=$1`, 
          [assignmentId]
        );

         if (maxRes.rowCount === 0) {
            logMessage(functionName, `Assignment ${assignmentId} not found when checking max submissions. Throwing error.`);
            throw new Error("Assignment not found when checking submission attempts");
         }

        const maxAttempts = maxRes.rows[0].submission_attempts;
        logMessage(functionName, `Maximum submissions allowed for assignment ${assignmentId}: ${maxAttempts === null ? 'Unlimited' : maxAttempts}.`);


        logMessage(functionName, `Checking if submission limit reached (attempts: ${attempts}, max: ${maxAttempts}).`);
        if (maxAttempts != null && attempts >= maxAttempts) {
          logMessage(functionName, `Max submission attempts (${maxAttempts}) reached for student ${studentId} on assignment ${assignmentId}. Throwing error.`);
          throw new Error(`Max submission attempts (${maxAttempts}) reached`);
        }
        logMessage(functionName, `Submission limit not reached.`);


        logMessage(functionName, `Inserting new submission record.`);

        const insertRes = await pool.query<{ submission_id: number }>( 
          `INSERT INTO submissions
             (student_id, assignment_id, language_id, code, status) -- Added 'status' column assuming it exists
           VALUES ($1,$2,$3,$4, $5)
           RETURNING submission_id`,
          [studentId, assignmentId, languageId, code, 'queued']
        );

        const submissionId = insertRes.rows[0].submission_id;
        logMessage(functionName, `New submission created with ID: ${submissionId}.`);

        logMessage(functionName, `Returning submission ID ${submissionId}.`);
        return submissionId;

    } catch (error) {
        logMessage(functionName, `Error creating submission for student ${studentId}, assignment ${assignmentId}: ${error}`);
        throw error;
    }
  };