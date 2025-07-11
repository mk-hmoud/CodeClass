#!/bin/bash

echo "Starting the judge..."
(cd judge && ./scripts/run_judge.sh) &
JUDGE_PID=$!
echo "Judge started with PID: $JUDGE_PID"

echo "Starting the client development server..."
(cd client && npm run dev) &
CLIENT_PID=$!
echo "Client dev server started with PID: $CLIENT_PID"

echo "Starting the server..."
(cd server && npm run dev) &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

wait $JUDGE_PID $CLIENT_PID $SERVER_PID

echo "CodeClass is running..."