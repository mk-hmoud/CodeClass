import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { tmpdir } from 'os';
import { mkdtempSync, writeFileSync, chmodSync } from 'fs';

interface TestCase {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  isPublic?: boolean;
}

interface TestResult {
  testCaseId: string;
  input: string[];
  expectedOutput: string;
  actual: string | null;
  status: string | null;
  error: string | null;
  errorType?: string;
  fullError?: string;
  executionTime: number | null;
  isPublic?: boolean;
}

interface InputData {
  code: string;
  testCases: TestCase[];
  language: string;
}

interface Verdict {
  status: string;
  testResults?: TestResult[];
  error?: {
    errorType: string;
    errorMessage: string;
    fullError?: string;
  };
}

async function main() {
  try {
    let inputData = '';
    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });

    await new Promise<void>((resolve) => {
      process.stdin.on('end', resolve);
    });

    let data: InputData;
    try {
      data = JSON.parse(inputData);
    } catch (e) {
      console.log(JSON.stringify({
        status: "error",
        errorMessage: "Invalid JSON input"
      }));
      return;
    }

    const code = data.code || '';
    const testCases = data.testCases || [];
    const lang = (data.language || 'typescript').toLowerCase();

    const results: TestResult[] = [];
    
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'ts-runner-'));
    process.chdir(tmpDir);
    
    const ext = lang === 'javascript' ? 'js' : 'ts';
    const sourcePath = path.join(tmpDir, `main.${ext}`);
    const compiledPath = path.join(tmpDir, 'main.js');
    
    writeFileSync(sourcePath, code);
    
    if (lang === 'typescript') {
      // Create a basic tsconfig.json
      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          module: "CommonJS",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: tmpDir
        },
        files: [sourcePath]
      };
      
      writeFileSync(path.join(tmpDir, 'tsconfig.json'), JSON.stringify(tsConfig));
      
      const compilePromise = new Promise<{success: boolean, stdout: string, stderr: string}>((resolve) => {
        exec('tsc --project ' + tmpDir, (error, stdout, stderr) => {
          resolve({
            success: !error,
            stdout,
            stderr
          });
        });
      });
      
      const compileResult = await compilePromise;
      
      if (!compileResult.success) {
        const errorMsg = compileResult.stderr || compileResult.stdout;
        
        // extract meaningful errors
        const errorLines = errorMsg.split('\n');
        const filteredErrors = errorLines.filter(line => 
          /error TS\d+:|warning TS\d+:/.test(line)
        );
        
        // if no specific errors found, use all output
        const finalErrors = filteredErrors.length > 0 ? filteredErrors : errorLines;
        
        const verdict: Verdict = {
          status: "compile_error",
          error: {
            errorType: "COMPILATION_FAILED",
            errorMessage: finalErrors.join('\n'),
            fullError: errorMsg
          }
        };
        
        console.log(JSON.stringify(verdict));
        return;
      }
    } else {
      // if JavaScript, just copy the file to the "compiled" path
      fs.copyFileSync(sourcePath, compiledPath);
    }
    
    try {
      chmodSync(compiledPath, 0o755);
    } catch (e) {
      // ignore
    }
    
    for (const tc of testCases) {
      const testCaseId = tc.testCaseId;
      const rawInput = tc.input || '';
      const expectedOutput = (tc.expectedOutput || '').trim();
      const isPublic = tc.isPublic;
      
      let args: string[] = [];
      if (rawInput) {
        if (rawInput.includes(',')) {
          args = rawInput.split(',').map(part => part.trim()).filter(Boolean);
        } else {
          args = rawInput.split(' ').filter(Boolean);
        }
      }
      
      const result: TestResult = {
        testCaseId,
        input: args,
        expectedOutput,
        actual: null,
        status: null,
        error: null,
        executionTime: null,
        isPublic
      };
      
      try {
        const start = Date.now();
        
        const nodeProcess = spawn('node', [compiledPath, ...args], {
          timeout: 5000,
        });
        
        let stdout = '';
        let stderr = '';
        
        nodeProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        nodeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        const exitCode = await new Promise<number>((resolve) => {
          nodeProcess.on('close', resolve);
        });
        
        const elapsed = Date.now() - start;
        
        const actual = stdout.trim();
        const errout = stderr.trim();
        
        result.actual = actual;
        result.executionTime = elapsed;
        
        if (exitCode !== 0) {
          result.status = "runtime_error";
          
          if (errout.includes('RangeError')) {
            result.errorType = "RANGE_ERROR";
            result.error = "Range error - e.g., invalid array length or numeric overflow";
          } else if (errout.includes('TypeError')) {
            result.errorType = "TYPE_ERROR";
            result.error = "Type error - operation on wrong type of value";
          } else if (errout.includes('ReferenceError')) {
            result.errorType = "REFERENCE_ERROR";
            result.error = "Reference error - reference to undefined variable";
          } else if (errout.includes('SyntaxError')) {
            result.errorType = "SYNTAX_ERROR";
            result.error = "Syntax error in code";
          } else {
            result.errorType = "RUNTIME_ERROR";
            result.error = errout || `Program exited with code ${exitCode}`;
          }
          
          result.fullError = errout;
        } else {
          if (actual === expectedOutput) {
            result.status = "passed";
          } else {
            result.status = "failed";
            result.error = `Expected: '${expectedOutput}', Got: '${actual}'`;
          }
        }
      } catch (e) {
        const error = e as Error;
        if (error.message.includes('timeout')) {
          result.status = "timeout";
          result.errorType = "EXECUTION_TIMEOUT";
          result.error = "Execution timed out after 5 seconds";
          result.executionTime = 5000;
        } else {
          result.status = "error";
          result.errorType = "EXECUTION_EXCEPTION";
          result.error = error.message;
        }
      }
      
      results.push(result);
    }
    
    const verdict: Verdict = {
      status: "completed",
      testResults: results
    };
    
    console.log(JSON.stringify(verdict));
    
  } catch (e) {
    const error = e as Error;
    const verdict: Verdict = {
      status: "error",
      error: {
        errorType: "SYSTEM_ERROR",
        errorMessage: error.message,
        fullError: error.stack
      }
    };
    console.log(JSON.stringify(verdict));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});