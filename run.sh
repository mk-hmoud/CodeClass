#!/bin/bash

DB_CONTAINER_NAME="codeclass-postgres"
if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  echo "PostgreSQL container '$DB_CONTAINER_NAME' is already running."
else
  echo "Starting PostgreSQL container '$DB_CONTAINER_NAME'..."
  docker start $DB_CONTAINER_NAME > /dev/null
  echo "PostgreSQL started."
fi

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
