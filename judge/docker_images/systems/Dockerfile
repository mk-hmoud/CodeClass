FROM python:3.11-slim

# Toolchain + the common utilities a systems-programming lab needs available to
# student programs (exec/popen targets) and, later, to the interactive shell.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential coreutils procps nano \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m judge
WORKDIR /home/judge
COPY runner.py .
USER judge

# The batch judge entrypoint. The lab-shell service overrides this with a PTY
# bash session (see Milestone C), reusing the same image and isolation.
ENTRYPOINT ["python3", "runner.py"]
