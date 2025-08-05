#!/bin/bash

set -e


# --- Flag Parsing ---
BUILD_DOCKER=true

if [[ "$1" == "--no-docker" ]]; then
  echo "Flag --no-docker detected. skip Docker image build."
  BUILD_DOCKER=false
fi
# --- End of Flag Parsing ---


echo "=== Setting up judge dependencies ==="
DEPS_DIR="$PWD/judge/dependencies"
mkdir -p "$DEPS_DIR"

if [ ! -d "$DEPS_DIR/json" ]; then
  echo "Cloning nlohmann/json..."
  git clone https://github.com/nlohmann/json.git $DEPS_DIR/json
else
  echo "nlohmann/json already exists."
fi

if [ ! -f "$DEPS_DIR/hiredis/lib/libhiredis.a" ]; then
  echo "Cloning and building hiredis..."
  rm -rf "$DEPS_DIR/hiredis"
  git clone https://github.com/redis/hiredis.git "$DEPS_DIR/hiredis"
  pushd "$DEPS_DIR/hiredis"
    make
    make install PREFIX="$DEPS_DIR/hiredis"
  popd
else
  echo "hiredis is already built and installed locally."
fi

echo "Judge dependencies are set up."

echo "=== Building the C++ judge ==="
BUILD_DIR="judge/build"
if [ -d "$BUILD_DIR" ]; then
  echo "→ Removing stale build directory at $BUILD_DIR"
  rm -rf "$BUILD_DIR"
fi
mkdir -p "$BUILD_DIR"
pushd "$BUILD_DIR" >/dev/null
  cmake ..
  make
popd >/dev/null
echo "C++ judge built successfully."

if [ "$BUILD_DOCKER" = true ]; then
  echo "=== Building Docker images for the judge ==="
  ./judge/scripts/build_images.sh
  echo "Docker images built successfully."
fi

echo "=== Setting up PostgreSQL container ==="
if [ ! -f .env ]; then
  echo ".env file not found. Cannot set up database container."
  exit 1
fi

set -o allexport
source .env
set +o allexport

if [ "$(docker ps -a -q -f name=codeclass-postgres)" ]; then
  echo "PostgreSQL container 'codeclass-postgres' already exists."
  docker start codeclass-postgres
else
  echo "Creating new PostgreSQL container..."
  docker run --name codeclass-postgres \
    -e POSTGRES_DB=$DB_NAME \
    -e POSTGRES_USER=$DB_USER \
    -e POSTGRES_PASSWORD=$DB_PASSWORD \
    -p $DB_PORT:5432 \
    -d postgres
fi

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run schema.sql
SCHEMA_FILE="server/db/schema.sql"
if [ -f "$SCHEMA_FILE" ]; then
  echo "Applying database schema..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d $DB_NAME -f $SCHEMA_FILE || {
    echo "❌ Failed to apply schema.sql"
    exit 1
  }
  echo "✅ Database schema applied."
else
  echo "❌ schema.sql not found at $SCHEMA_FILE"
  exit 1
fi

echo "=== Installing client dependencies ==="
cd client
npm install
cd ..
echo "Client setup complete."

echo "=== Installing server dependencies ==="
cd server
npm install
cd ..
echo "Server setup complete."

echo "✅ Project build complete."
