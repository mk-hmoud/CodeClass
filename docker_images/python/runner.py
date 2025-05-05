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
        
        for idx, tc in enumerate(data.get('testCases', [])):
            result = {
                "testCaseId": tc.get('testCaseId', idx),
                "input": tc.get('input', ''),
                "expectedOutput": tc.get('expectedOutput', ''),
                "status": "unknown",
                "executionTime": 0
            }
            
            try:
                start_time = time.monotonic()
                
                # Parse input arguments safely
                args = shlex.split(tc.get('input', ''))
                
                process = subprocess.run(
                    ['python3', str(code_file)] + args,
                    input=tc.get('stdin', ''),
                    capture_output=True,
                    text=True,
                    timeout=tc.get('timeout', 5),
                    preexec_fn=set_limits
                )
                
                elapsed = time.monotonic() - start_time
                result["executionTime"] = int(elapsed * 1000)
                result["actual"] = normalize_output(process.stdout)
                result["memoryUsage"] = process.maxrss // 1024 if hasattr(process, 'maxrss') else 0

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
                    elif "ImportError" in error_msg:
                        result["errorType"] = "IMPORT_RESTRICTED"
                    else:
                        result["errorType"] = "RUNTIME_ERROR"
                        
                    result["error"] = error_msg
                else:
                    result["status"] = "passed" if (
                        normalize_output(process.stdout) == normalize_output(tc['expectedOutput'])
                    ) else "failed"

            except subprocess.TimeoutExpired:
                result.update({
                    "status": "timeout",
                    "errorType": "EXECUTION_TIMEOUT",
                    "error": f"Exceeded {tc.get('timeout', 5)}s limit"
                })
            except Exception as e:
                result.update({
                    "status": "system_error",
                    "errorType": "JUDGE_ERROR",
                    "error": str(e)
                })

            results.append(result)

    print(json.dumps({
        "status": "completed",
        "testResults": results,
        "metrics": {
            "maxMemoryKB": max(r.get('memoryUsage', 0) for r in results),
            "totalTimeMS": sum(r.get('executionTime', 0) for r in results)
        }
    }))

if __name__ == '__main__':
    main()