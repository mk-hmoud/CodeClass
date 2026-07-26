import json
import sys
import sqlite3
import time

MAX_CPUTIME_SEC = 5


def normalize_output(output: str) -> str:
    return '\n'.join(line.rstrip() for line in output.strip().splitlines())


def split_statements(sql: str):
    """Split a blob of SQL on ';' while respecting single/double-quoted string
    literals, so a semicolon inside a string doesn't get treated as a statement
    boundary. Good enough for course-lab-level SQL, not a full parser."""
    statements = []
    current = []
    quote_char = None
    for ch in sql:
        if quote_char:
            current.append(ch)
            if ch == quote_char:
                quote_char = None
        elif ch in ("'", '"'):
            quote_char = ch
            current.append(ch)
        elif ch == ';':
            stmt = ''.join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
        else:
            current.append(ch)
    tail = ''.join(current).strip()
    if tail:
        statements.append(tail)
    return statements


def format_value(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, float):
        return f"{v:.6g}"
    return str(v)


def canonicalize(columns, rows) -> str:
    """Column-header line + one sorted line per row. Sorting rows (rather than
    preserving whatever order SQLite happened to return them in) is what makes
    comparison order-insensitive -- SQL itself gives no row-order guarantee
    without an explicit ORDER BY, so this avoids penalizing a correct query
    whose engine returned rows in a different (equally valid) sequence."""
    header = ",".join(columns)
    row_lines = [",".join(format_value(v) for v in row) for row in rows]
    row_lines.sort()
    return normalize_output("\n".join([header] + row_lines))


def run_query(conn: sqlite3.Connection, code: str):
    """Executes each statement in the student's submission in turn, keeping
    track of the last one that returned rows (has a non-None description) as
    the result to grade -- lets a submission do e.g. CREATE VIEW ...; SELECT
    ...; and be graded on the SELECT, not just a single bare query."""
    last_result = None
    for stmt in split_statements(code):
        cur = conn.cursor()
        cur.execute(stmt)
        if cur.description is not None:
            columns = [d[0] for d in cur.description]
            rows = cur.fetchall()
            last_result = (columns, rows)
    return last_result


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "error": "Invalid JSON input"}))
        return

    code = data.get('code', '')
    results = []
    passed_tests = 0
    total_runtime = 0

    for idx, tc in enumerate(data.get('testCases', [])):
        test_id = tc.get('testCaseId', str(idx))
        expected_output = normalize_output(tc.get('expectedOutput') or '')
        setup_sql = tc.get('input') or ''
        is_public = tc.get('isPublic', True)

        result = {
            "testCaseId": test_id,
            "input": [],
            "expectedOutput": expected_output,
            "isPublic": is_public,
            "status": None,
            "actual": None,
            "error": None,
            "executionTime": None,
        }

        conn = sqlite3.connect(":memory:")
        try:
            start_time = time.monotonic()
            # signal.alarm can't interrupt a query blocked inside sqlite3's C
            # extension -- Python only checks for pending signals between
            # bytecode instructions, which doesn't happen again until the C
            # call returns on its own. SQLite's progress handler is the actual
            # mechanism for this: it's invoked periodically *from inside*
            # SQLite's own execution loop (every N virtual-machine
            # instructions), and returning non-zero aborts the query in
            # progress with sqlite3.OperationalError.
            def _check_timeout():
                return 1 if (time.monotonic() - start_time) > MAX_CPUTIME_SEC else 0
            conn.set_progress_handler(_check_timeout, 1000)

            if setup_sql.strip():
                conn.executescript(setup_sql)

            last_result = run_query(conn, code)

            elapsed = time.monotonic() - start_time
            execution_time = int(elapsed * 1000)
            result["executionTime"] = execution_time
            total_runtime += execution_time

            if last_result is None:
                actual_output = ""
            else:
                columns, rows = last_result
                actual_output = canonicalize(columns, rows)
            result["actual"] = actual_output

            if actual_output == expected_output:
                result["status"] = "passed"
                passed_tests += 1
            else:
                result["status"] = "failed"
                result["error"] = f"Expected: '{expected_output}', Got: '{actual_output}'"

        except sqlite3.OperationalError as e:
            if str(e) == "interrupted":
                # The progress handler above aborted the query for running too long.
                result.update({
                    "status": "timeout",
                    "errorType": "EXECUTION_TIMEOUT",
                    "error": f"Query exceeded {MAX_CPUTIME_SEC} seconds",
                    "executionTime": MAX_CPUTIME_SEC * 1000,
                })
            else:
                result.update({
                    "status": "runtime_error",
                    "errorType": "SQL_ERROR",
                    "error": str(e),
                    "fullError": str(e),
                })
        except sqlite3.Error as e:
            result.update({
                "status": "runtime_error",
                "errorType": "SQL_ERROR",
                "error": str(e),
                "fullError": str(e),
            })
        except Exception as e:
            result.update({
                "status": "error",
                "errorType": "EXECUTION_EXCEPTION",
                "error": str(e),
            })
        finally:
            conn.close()

        results.append(result)

    total_tests = len(results)
    average_runtime = total_runtime // total_tests if total_tests > 0 else 0

    print(json.dumps({
        "status": "completed",
        "testResults": results,
        "metrics": {
            "passedTests": passed_tests,
            "totalTests": total_tests,
            "averageRuntime": average_runtime,
        },
    }))


if __name__ == '__main__':
    main()
