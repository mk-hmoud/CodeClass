#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR/build" || { echo "Error: 'build' directory not found."; exit 1; }

echo "Building project..."
if ! make; then
  echo "Build failed. Exiting."
  exit 1
fi

cd ../bin || { echo "Error: 'bin' directory not found."; exit 1; }

echo "Running Judge..."
./judge
