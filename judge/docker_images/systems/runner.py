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
import json, os, re, signal as signalmod, subprocess, sys, tempfile, time

BUILD_TIMEOUT = 20
RUN_TIMEOUT = 10
BASE_ENV = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"}

# Signals a test may ask the runner to deliver mid-run (for signal-handling
# problems). Restricted to a known-safe set.
SIGNALS = {
    "SIGINT": signalmod.SIGINT, "SIGTERM": signalmod.SIGTERM,
    "SIGHUP": signalmod.SIGHUP, "SIGQUIT": signalmod.SIGQUIT,
    "SIGUSR1": signalmod.SIGUSR1, "SIGUSR2": signalmod.SIGUSR2,
}


def normalize(s: str) -> str:
    return "\n".join(line.rstrip() for line in s.strip().splitlines())


def compare(actual: str, expected: str, mode: str) -> bool:
    a = normalize(actual)
    if mode == "unordered":
        return sorted(a.splitlines()) == sorted(normalize(expected).splitlines())
    if mode == "regex":
        # Every non-empty line of `expected` is a regex that must be found in the
        # output. Tolerates volatile values (PIDs) and fork interleaving: assert
        # the decisive lines, not the whole transcript.
        for pat in expected.splitlines():
            pat = pat.strip()
            if not pat:
                continue
            if re.search(pat, a, re.MULTILINE) is None:
                return False
        return True
    return a == normalize(expected)


def run_once(cmd, cwd, stdin, env, timeout, sig_name, sig_after_ms):
    """Run the program. Without a signal this is a plain timed run. With one, the
    process is started, left to run for sig_after_ms, sent the signal, then read
    to completion within the timeout. Returns (returncode, stdout, stderr, timed_out)."""
    if not sig_name:
        p = subprocess.run(cmd, cwd=cwd, input=stdin, capture_output=True,
                           text=True, timeout=timeout, env=env)
        return p.returncode, p.stdout, p.stderr, False

    sig = SIGNALS.get(sig_name, signalmod.SIGINT)
    proc = subprocess.Popen(
        cmd, cwd=cwd,
        stdin=subprocess.PIPE if stdin else subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    if stdin:
        try:
            proc.stdin.write(stdin)
            proc.stdin.close()
        except (BrokenPipeError, ValueError):
            pass
    # Detach stdin so the later communicate() doesn't try to flush the pipe we
    # just closed (it would raise on a closed file).
    proc.stdin = None
    time.sleep((sig_after_ms or 1000) / 1000.0)
    if proc.poll() is None:
        try:
            proc.send_signal(sig)
        except ProcessLookupError:
            pass
    try:
        out, err = proc.communicate(timeout=timeout)
        return proc.returncode, out, err, False
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        return proc.returncode, out, err, True


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
            rc, out, err, timed_out = run_once(
                cmd, workdir, tc.get("stdin") or "", env, RUN_TIMEOUT,
                tc.get("signal"), tc.get("signalAfterMs"),
            )
            r["executionTime"] = int((time.monotonic() - t0) * 1000)
            r["actual"] = normalize(out)
            if timed_out:
                r["status"] = "timeout"; r["error"] = f"exceeded {RUN_TIMEOUT}s"
            elif rc != 0:
                r["status"] = "runtime_error"
                r["error"] = (err or f"exited {rc}").strip()[:400]
            elif compare(out, expected, tc.get("compare", "exact")):
                r["status"] = "passed"; passed += 1
            else:
                r["status"] = "failed"
                r["error"] = f"Expected: {normalize(expected)!r}, Got: {normalize(out)!r}"
        except subprocess.TimeoutExpired:
            r["status"] = "timeout"; r["error"] = f"exceeded {RUN_TIMEOUT}s"
        results.append(r)

    print(json.dumps({"status": "completed", "testResults": results,
                      "metrics": {"passedTests": passed, "totalTests": len(results)}}))


if __name__ == "__main__":
    main()
