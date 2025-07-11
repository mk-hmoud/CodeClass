#!/bin/bash

cd ../build || { echo "Error: 'build' directory not found."; exit 1; }

echo "Building project..."
if ! make; then
  echo "Build failed. Exiting."
  exit 1
fi

cd ../bin || { echo "Error: 'bin' directory not found."; exit 1; }

echo "Running Judge..."
./CodeEd-Judge
