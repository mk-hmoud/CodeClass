#!/bin/bash

DB_CONTAINER_NAME="codeclass-postgres"

# Start PostgreSQL container if not running
if docker ps -q -f name=$DB_CONTAINER_NAME > /dev/null; then
  echo "PostgreSQL container '$DB_CONTAINER_NAME' is already running."
else
  echo "Starting PostgreSQL container '$DB_CONTAINER_NAME'..."
  docker start $DB_CONTAINER_NAME > /dev/null || {
    echo "❌ Failed to start PostgreSQL container."
    exit 1
  }
  echo "PostgreSQL Database started."
fi

# Check if Redis is running locally
if ! redis-cli ping > /dev/null 2>&1; then
  echo "⚠️  Redis does not appear to be running on localhost:6379."
  echo "   Please start Redis (e.g., with: 'sudo systemctl start redis' or 'redis-server')"
  exit 1
else
  echo "Redis is running on localhost."
fi

# Start judge engine
echo "Starting the judge..."
(cd judge && ./scripts/run_judge.sh) &
JUDGE_PID=$!
echo "Judge started with PID: $JUDGE_PID"

# Start client dev server
echo "Starting the client development server..."
(cd client && npm run dev) &
CLIENT_PID=$!
echo "Client dev server started with PID: $CLIENT_PID"

# Start backend server
echo "Starting the server..."
(cd server && npm run dev) &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

wait $JUDGE_PID $CLIENT_PID $SERVER_PID

echo "CodeClass is running..."
