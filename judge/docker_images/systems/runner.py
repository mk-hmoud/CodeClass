#!/usr/bin/env python3
"""Runner for systems-programming problems (Milestone A).

Reads one JSON job on stdin:
  { "files":   [{"path": "main.c", "content": "..."}],  # student + provided files
    "buildCommand": "gcc main.c util.c -pthread -o app",
    "entrypoint":   "./app",
    "testCases": [
       { "testCaseId": 1, "args": ["x"], "stdin": "hello\n",
         "env": {"GREETING": "RESULT"}, "expectedOutput": "RESULT: HELLO",
         "compare": "exact", "isPublic": true } ] }

Writes the verdict JSON on stdout. Runs inside the sandbox container, so the
docker flags (read-only root, /tmp tmpfs exec, --network none, pids/mem/cpu
caps) are the real isolation; this adds the per-test timeout, stdin and env.
"""
import json, os, subprocess, sys, tempfile, time

BUILD_TIMEOUT = 20
RUN_TIMEOUT = 10
BASE_ENV = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"}


def normalize(s: str) -> str:
    return "\n".join(line.rstrip() for line in s.strip().splitlines())


def compare(actual: str, expected: str, mode: str) -> bool:
    a, e = normalize(actual), normalize(expected)
    if mode == "unordered":
        return sorted(a.splitlines()) == sorted(e.splitlines())
    return a == e


def main() -> None:
    try:
        job = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "error": "Invalid JSON input"}))
        return

    workdir = tempfile.mkdtemp(dir="/tmp")
    for f in job.get("files", []):
        path = os.path.join(workdir, f["path"])
        os.makedirs(os.path.dirname(path) or workdir, exist_ok=True)
        with open(path, "w") as fh:
            fh.write(f["content"])

    try:
        build = subprocess.run(
            job["buildCommand"], shell=True, cwd=workdir,
            capture_output=True, text=True, timeout=BUILD_TIMEOUT, env=BASE_ENV,
        )
    except subprocess.TimeoutExpired:
        print(json.dumps({"status": "compile_error",
                          "error": {"errorType": "BUILD_TIMEOUT",
                                    "errorMessage": f"build exceeded {BUILD_TIMEOUT}s",
                                    "fullError": ""}}))
        return
    if build.returncode != 0:
        msg = build.stderr.strip().splitlines()[0] if build.stderr.strip() else "build failed"
        print(json.dumps({"status": "compile_error",
                          "error": {"errorType": "BUILD_FAILED",
                                    "errorMessage": msg, "fullError": build.stderr}}))
        return

    results, passed = [], 0
    entry = job["entrypoint"]
    for idx, tc in enumerate(job.get("testCases", [])):
        tid = tc.get("testCaseId", idx)
        expected = tc.get("expectedOutput", "")
        env = dict(BASE_ENV); env.update(tc.get("env") or {})
        cmd = ([entry] if entry.startswith((".", "/")) else ["./" + entry]) + list(tc.get("args") or [])
        r = {"testCaseId": tid, "isPublic": tc.get("isPublic", True),
             "expectedOutput": expected, "actual": None, "status": None,
             "error": None, "executionTime": None}
        try:
            t0 = time.monotonic()
            proc = subprocess.run(
                cmd, cwd=workdir, input=tc.get("stdin") or "",
                capture_output=True, text=True, timeout=RUN_TIMEOUT, env=env,
            )
            r["executionTime"] = int((time.monotonic() - t0) * 1000)
            r["actual"] = normalize(proc.stdout)
            if proc.returncode != 0:
                r["status"] = "runtime_error"
                r["error"] = (proc.stderr or f"exited {proc.returncode}").strip()[:400]
            elif compare(proc.stdout, expected, tc.get("compare", "exact")):
                r["status"] = "passed"; passed += 1
            else:
                r["status"] = "failed"
                r["error"] = f"Expected: {normalize(expected)!r}, Got: {normalize(proc.stdout)!r}"
        except subprocess.TimeoutExpired:
            r["status"] = "timeout"; r["error"] = f"exceeded {RUN_TIMEOUT}s"
        results.append(r)

    print(json.dumps({"status": "completed", "testResults": results,
                      "metrics": {"passedTests": passed, "totalTests": len(results)}}))


if __name__ == "__main__":
    main()
