import json
import subprocess
import sys
import os
from tempfile import TemporaryDirectory

def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({ "status": "error", "message": "Invalid JSON input" }))
        return

    code       = data.get('code', '')
    test_cases = data.get('testCases', [])

    results = []

    with TemporaryDirectory() as tmpdir:
        os.chdir(tmpdir)
        source_path = os.path.join(tmpdir, 'main.cpp')
        exe_path    = os.path.join(tmpdir, 'main')

        # Write user code
        with open(source_path, 'w') as f:
            f.write(code)

        # Compile
        compile = subprocess.run(
            ['g++', '-std=c++17', '-O2', '-o', exe_path, source_path],
            capture_output=True, text=True
        )
        if compile.returncode != 0:
            print(json.dumps({
                "status": "compile_error",
                "message": compile.stderr
            }))
            return

        os.chmod(exe_path, 0o755)

        for tc in test_cases:
            test_case_id           = tc.get('testCaseId')
            raw_input       = tc.get('input', '')
            expected_output = tc.get('expectedOutput', '').strip()

            # split "3, 7" -> ["3","7"]
            args = [part.strip() for part in raw_input.split(',') if part.strip()]

            result = {
                "test_case_id": test_case_id,
                "args":         args,
                "expected_output":     expected_output,
                "actual":       None,
                "status":       None,
                "error":        None
            }

            try:
                proc = subprocess.run(
                    [exe_path] + args,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                actual = proc.stdout.strip()
                errout = proc.stderr.strip()

                result["actual"] = actual
                if proc.returncode != 0:
                    result["status"] = "runtime_error"
                    result["error"]  = errout
                else:
                    result["status"] = "passed" if actual == expected_output else "failed"

            except subprocess.TimeoutExpired:
                result["status"] = "timeout"
                result["error"]  = "Execution timed out after 5 seconds"
            except Exception as e:
                result["status"] = "error"
                result["error"]  = str(e)

            results.append(result)

    print(json.dumps(results))


if __name__ == '__main__':
    main()
