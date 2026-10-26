# judge-systems

Runtime for systems-programming problems (processes, pipes, threads, file I/O,
and self-contained socket exercises on loopback).

Difference from the algorithmic runners: a submission is a **set of files** that
is **built** (not one source compiled implicitly), then each test case runs the
entry binary with its own **argv + stdin + environment**, and output is compared
`exact` or `unordered`. See `runner.py` for the job protocol.

Isolation is identical to the other judge images — launched by JudgeWorker with
`--read-only --network none --tmpfs /tmp:exec --memory --cpus --pids-limit`.
Proven in the Milestone A spike: fork/pipe/threads run; external network is
blocked; fork bombs and runaways are contained by the pids/cpu/timeout caps.
