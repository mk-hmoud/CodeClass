FROM node:18-slim

RUN apt-get update && apt-get install -y libseccomp2 && \
    npm install -g typescript@latest

RUN useradd -m runner

WORKDIR /home/runner

COPY runner.ts /runner.ts
COPY package.json /package.json

RUN npm install

RUN tsc /runner.ts --esModuleInterop --target ES2020 --module CommonJS

RUN chmod +x /runner.js

USER runner

ENTRYPOINT ["node", "/runner.js"]