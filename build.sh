#!/bin/bash

set -e

echo "Setting up judge dependencies..."
DEPS_DIR="judge/dependencies"
mkdir -p $DEPS_DIR

if [ ! -d "$DEPS_DIR/json" ]; then
  echo "Cloning nlohmann/json..."
  git clone https://github.com/nlohmann/json.git $DEPS_DIR/json
else
  echo "nlohmann/json already exists."
fi

if [ ! -d "$DEPS_DIR/hiredis" ]; then
  echo "Cloning and building hiredis..."
  git clone https://github.com/redis/hiredis.git $DEPS_DIR/hiredis
  cd $DEPS_DIR/hiredis
  make
  make install
  cd ../../../
else
  echo "hiredis already exists."
fi
echo "Judge dependencies are set up."

echo "Building the C++ judge..."
mkdir -p judge/build
cd judge/build
cmake ..
make
cd ../..
echo "C++ judge built successfully."

echo "Building Docker images for the judge..."
./judge/scripts/build_images.sh
echo "Docker images built successfully."

echo "Building the client..."
cd client
npm install
cd ..
echo "Client built successfully."

echo "Building the server..."
cd server
npm install
cd ..
echo "Server built successfully."

echo "Project build complete."