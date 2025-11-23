FROM python:3.11-alpine

RUN adduser -D judge

WORKDIR /home/judge

COPY --chown=judge:judge security/seccomp-python.json /seccomp.json
COPY --chown=judge:judge runner.py .

USER judge

ENTRYPOINT ["python3", "runner.py"]