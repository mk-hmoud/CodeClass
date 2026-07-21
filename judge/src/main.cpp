#include <cstdlib>
#include <thread>
#include "JudgeEngine.h"
#include "Logger.h"

int main(int argc, char *argv[])
{
    const char *HOST = std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "127.0.0.1";
    const char *portEnv = std::getenv("REDIS_PORT");
    int PORT = portEnv ? std::atoi(portEnv) : 6379;

    const unsigned int cores = std::thread::hardware_concurrency() ? std::thread::hardware_concurrency() : 4;

    // Each worker thread mostly blocks on waitpid() for its sandboxed docker
    // container rather than spinning CPU itself, so oversubscribing cores is
    // expected and beneficial here as the actual CPU is consumed by the
    // spawned --cpus=0.5 sandbox container, not this coordinating thread.
    // Default to 4x cores, override via JUDGE_THREADS for tuning without a
    // rebuild.
    const char *threadsEnv = std::getenv("JUDGE_THREADS");
    const unsigned int numThreads = threadsEnv ? static_cast<unsigned int>(std::atoi(threadsEnv)) : cores * 4;

    LOG_INFO("Initializing Judge Engine with " << numThreads << " threads (host has " << cores << " cores).");
    JudgeEngine engine(HOST, PORT, numThreads);
    engine.start();

    return EXIT_SUCCESS;
}