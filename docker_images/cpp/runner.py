import json
import subprocess
import sys
import os
import time
import re
from tempfile import TemporaryDirectory

def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({
            "status": "error",
            "errorMessage": "Invalid JSON input"
        }))
        return

    code = data.get('code', '')
    test_cases = data.get('testCases', [])

    results = []

    with TemporaryDirectory() as tmpdir:
        os.chdir(tmpdir)
        source_path = os.path.join(tmpdir, 'main.cpp')
        exe_path = os.path.join(tmpdir, 'main')

        # Write user code
        with open(source_path, 'w') as f:
            f.write(code)

        # Compile
        compile_result = subprocess.run(
            ['g++', '-std=c++17', '-Wall', '-Wextra', '-O2', '-o', exe_path, source_path],
            capture_output=True, text=True
        )
        
        if compile_result.returncode != 0:
            # format compiler errors
            error_msg = compile_result.stderr
            
            # try to extract meaningful errors and filter out noise
            error_lines = error_msg.split('\n')
            filtered_errors = []
            
            for line in error_lines:
                if re.search(r'(error:|warning:|note:|undefined reference)', line):
                    filtered_errors.append(line)
            
            # if no specific errors found, use the last 20 lines
            if not filtered_errors:
                filtered_errors = error_lines[-20:]
                
            verdict = {
              "status": "compile_error",
              "error": {
                "errorType": "COMPILATION_FAILED",
                "errorMessage": "\n".join(filtered_errors),
                "fullError": error_msg
              }
            }
            print(json.dumps(verdict))
            return

        os.chmod(exe_path, 0o755)

        for tc in test_cases:
            test_case_id = tc.get('testCaseId')
            raw_input = tc.get('input', '')
            expected_output = tc.get('expectedOutput', '').strip()
            is_public = tc.get('isPublic')

            # parse input, this supports both comma,separated and space separated arguments
            args = []
            if raw_input:
                if ',' in raw_input:
                    args = [part.strip() for part in raw_input.split(',') if part.strip()]
                else:
                    args = raw_input.split()

            result = {
                "testCaseId": test_case_id,
                "input": args,
                "expectedOutput": expected_output,
                "actual": None,
                "status": None,
                "error": None,
                "executionTime": None,
                "isPublic": is_public
            }

            try:
                start = time.time()
                proc = subprocess.run(
                    [exe_path] + args,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                elapsed = (time.time() - start) * 1000

                actual = proc.stdout.strip()
                errout = proc.stderr.strip()

                result["actual"] = actual
                result["executionTime"] = int(elapsed)

                if proc.returncode != 0:
                    result["status"] = "runtime_error"
                    
                    if "Segmentation fault" in errout:
                        result["errorType"] = "SEGMENTATION_FAULT"
                        result["error"] = "Segmentation fault - program tried to access invalid memory"
                    elif "Bus error" in errout:
                        result["errorType"] = "BUS_ERROR"
                        result["error"] = "Bus error - memory access alignment issue"
                    elif "Floating point exception" in errout:
                        result["errorType"] = "FLOATING_POINT_EXCEPTION"
                        result["error"] = "Floating point exception - division by zero or invalid operation"
                    elif "Aborted" in errout:
                        result["errorType"] = "ABORTED"
                        result["error"] = "Program aborted - possibly due to a failed assertion"
                    else:
                        result["errorType"] = "RUNTIME_ERROR"
                        result["error"] = errout if errout else f"Program exited with code {proc.returncode}"
                    
                    result["fullError"] = errout
                else:
                    if actual == expected_output:
                        result["status"] = "passed"
                    else:
                        result["status"] = "failed"
                        result["error"] = f"Expected: '{expected_output}', Got: '{actual}'"

            except subprocess.TimeoutExpired:
                result["status"] = "timeout"
                result["errorType"] = "EXECUTION_TIMEOUT"
                result["error"] = "Execution timed out after 5 seconds"
                result["executionTime"] = 5000
            except Exception as e:
                result["status"] = "error"
                result["errorType"] = "EXECUTION_EXCEPTION"
                result["error"] = str(e)

            results.append(result)

    verdict = {
      "status": "completed",
      "testResults": results
    }
    print(json.dumps(verdict))

if __name__ == '__main__':
    main()