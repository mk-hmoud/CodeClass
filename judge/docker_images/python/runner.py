import json
import sys
import subprocess
import os
import resource
import time
import shlex
from pathlib import Path
from tempfile import TemporaryDirectory

# Security limits
MAX_MEMORY_MB = 256
MAX_CPUTIME_SEC = 5
MAX_OUTPUT_KB = 1024

def set_limits():
    """Set resource limits for child processes"""
    resource.setrlimit(resource.RLIMIT_AS, 
        (MAX_MEMORY_MB * 1024 * 1024, MAX_MEMORY_MB * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, 
        (MAX_CPUTIME_SEC, MAX_CPUTIME_SEC))
    resource.setrlimit(resource.RLIMIT_FSIZE,
        (MAX_OUTPUT_KB * 1024, MAX_OUTPUT_KB * 1024))

def normalize_output(output: str) -> str:
    """Standardize output formatting"""
    return '\n'.join(line.rstrip() for line in output.strip().splitlines())

def parse_input_args(input_str: str):
    """Parse input string into arguments list"""
    if not input_str:
        return []
    
    if ',' in input_str:
        return [arg.strip() for arg in input_str.split(',') if arg.strip()]
    else:
        return [arg for arg in input_str.split() if arg]

def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "error": "Invalid JSON input"}))
        return

    results = []
    
    with TemporaryDirectory() as tmpdir:
        code_file = Path(tmpdir) / 'submission.py'
        code_file.write_text(data['code'])
        
        syntax_check = subprocess.run(
            ['python3', '-m', 'py_compile', str(code_file)],
            capture_output=True,
            text=True
        )
        
        if syntax_check.returncode != 0:
            error_msg = normalize_output(syntax_check.stderr)
            print(json.dumps({
                "status": "compile_error",
                "error": {
                    "errorType": "COMPILATION_FAILED",
                    "errorMessage": error_msg.split('\n')[0] if error_msg else "Syntax error in Python code",
                    "fullError": error_msg
                }
            }))
            return
            
        passed_tests = 0
        total_runtime = 0
        
        for idx, tc in enumerate(data.get('testCases', [])):
            test_id = tc.get('testCaseId', str(idx))
            expected_output = normalize_output(tc.get('expectedOutput', ''))
            input_str = tc.get('input', '')
            is_public = tc.get('isPublic', True)
            
            args = parse_input_args(input_str)
            
            result = {
                "testCaseId": test_id,
                "input": args,
                "expectedOutput": expected_output,
                "isPublic": is_public,
                "status": None,
                "actual": None,
                "error": None,
                "executionTime": None
            }
            
            try:
                start_time = time.monotonic()
                
                process = subprocess.run(
                    ['python3', str(code_file)] + args,
                    capture_output=True,
                    text=True,
                    timeout=5,
                    preexec_fn=set_limits
                )
                
                elapsed = time.monotonic() - start_time
                execution_time = int(elapsed * 1000)
                result["executionTime"] = execution_time
                total_runtime += execution_time
                
                actual_output = normalize_output(process.stdout)
                result["actual"] = actual_output

                if process.returncode != 0:
                    result["status"] = "runtime_error"
                    error_msg = normalize_output(process.stderr)
                    
                    # Classify common Python errors
                    if "MemoryError" in error_msg:
                        result["errorType"] = "MEMORY_LIMIT_EXCEEDED"
                    elif "TimeoutExpired" in error_msg:
                        result["errorType"] = "TIMEOUT"
                    elif "SyntaxError" in error_msg:
                        result["errorType"] = "SYNTAX_ERROR"
                    elif "ImportError" in error_msg or "ModuleNotFoundError" in error_msg:
                        result["errorType"] = "IMPORT_RESTRICTED"
                    elif "ZeroDivisionError" in error_msg:
                        result["errorType"] = "DIVISION_BY_ZERO"
                    elif "IndexError" in error_msg:
                        result["errorType"] = "INDEX_ERROR"
                    elif "TypeError" in error_msg:
                        result["errorType"] = "TYPE_ERROR"
                    else:
                        result["errorType"] = "RUNTIME_ERROR"
                        
                    result["error"] = error_msg
                    result["fullError"] = error_msg
                else:
                    if actual_output == expected_output:
                        result["status"] = "passed"
                        passed_tests += 1
                    else:
                        result["status"] = "failed"
                        result["error"] = f"Expected: '{expected_output}', Got: '{actual_output}'"

            except subprocess.TimeoutExpired:
                result.update({
                    "status": "timeout",
                    "errorType": "EXECUTION_TIMEOUT",
                    "error": "Execution timed out after 5 seconds",
                    "executionTime": 5000 
                })
            except Exception as e:
                result.update({
                    "status": "error",
                    "errorType": "EXECUTION_EXCEPTION",
                    "error": str(e)
                })

            results.append(result)
        
        total_tests = len(results)
        average_runtime = total_runtime // total_tests if total_tests > 0 else 0

        print(json.dumps({
            "status": "completed",
            "testResults": results,
            "metrics": {
                "passedTests": passed_tests,
                "totalTests": total_tests,
                "averageRuntime": average_runtime
            }
        }))

if __name__ == '__main__':
    main()