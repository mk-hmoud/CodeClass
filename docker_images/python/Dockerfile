FROM python:3.11-slim

# python needs more security tightning compared to C/C++ because of its dynamic nature
RUN useradd -m judge && \
    apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

USER judge
WORKDIR /home/judge

# security tools
COPY --chown=judge:judge security/seccomp-python.json /seccomp.json
COPY --chown=judge:judge runner.py .

ENTRYPOINT ["python3", "runner.py"]