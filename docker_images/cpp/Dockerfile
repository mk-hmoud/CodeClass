FROM gcc:latest

RUN apt-get update && apt-get install -y python3 && \
    useradd -m runner

WORKDIR /home/runner

COPY runner.py /runner.py

RUN chmod +x /runner.py

USER runner

ENTRYPOINT ["python3", "/runner.py"]