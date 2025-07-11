set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
DOCKER_BASE="${REPO_ROOT}/docker_images"

echo "Building all judge Docker images…"

#  C/C++ 
echo "Building C/C++ runner"
cd "${DOCKER_BASE}/c\cpp"
docker build \
  -t judge-cpp:latest \
  .

# JS / TS
echo "Building JavaScript/TypeScript runner"
cd "${DOCKER_BASE}/javascript\typescript"
docker build \
  -t judge-js:latest \
  .

# Python 
echo "Building Python runner"
cd "${DOCKER_BASE}/python"
docker build \
  -t judge-py:latest \
  .

echo "Success! All Docker images built."
