    FROM node:18-alpine AS builder

    WORKDIR /build
    
    COPY package.json .
    COPY runner.ts .
    
    RUN npm install typescript
    
    RUN npx tsc runner.ts --esModuleInterop --target ES2020 --module CommonJS
    
    FROM node:18-alpine
    
    RUN apk add --no-cache libseccomp
    
    RUN npm install -g typescript
    
    RUN adduser -D runner
    
    WORKDIR /home/runner
    
    COPY --from=builder /build/runner.js /runner.js
    
    RUN chmod +x /runner.js
    
    USER runner
    
    ENTRYPOINT ["node", "/runner.js"]