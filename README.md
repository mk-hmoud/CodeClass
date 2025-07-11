# CodeClass

CodeClass is a full-stack application designed for executing and judging code submissions securely. It features a modern web interface built with Vite and a backend powered by Node.js, with a high-performance C++ judge engine for processing code.

---

### 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- A C++ compiler (`g++`) and `cmake`
- [Redis] (https://redis.io/)

---

### 🚀 Getting Started

Follow these steps to get your local development environment up and running.

#### 1. Clone

First, clone the project to your local machine:

```bash
git clone [https://github.com/mk-hmoud/CodeClass.git](https://github.com/mk-hmoud/CodeClass.git)
cd CodeClass
```

#### 2. Build the Entire Project

This project includes a build script that install dependencies and build docker images.

Run the script from the root directory:

```bash
chmod +x build.sh

./build.sh
```

This script will:

- Download C++ dependencies (`hiredis`, `nlohmann/json`).
- Compile the C++ judge into the `judge/build` directory.
- Build the necessary Docker images for the judge.
- Install `npm` dependencies for both the `client` and `server`.

#### 3. Configure .env

You need to create a local environment file to store configuration settings.

First, copy the example file:

```bash
cp .env.example .env
```

Next, open the `.env` file and fill in the required values. It will contain variables needed for the server.

#### 4. Run the Project

To run the project, you can start all services with the run script.

```bash
chmod +x run.sh

./run.sh
```

This will start:

1.  The C++ Judge ('./judge/scripts/run_judge).
2.  The client server (`npm run dev`).
3.  The backend server (`npm run dev`).

You can now access your application in your browser.
To stop all services, press `Ctrl+C` in the terminal.
