FROM alpine:3.18

RUN apk add --no-cache g++ python3

RUN adduser -D runner

WORKDIR /home/runner

COPY runner.py /runner.py
RUN chmod +x /runner.py

USER runner

ENTRYPOINT ["python3", "/runner.py"]