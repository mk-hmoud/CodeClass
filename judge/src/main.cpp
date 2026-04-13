#include <cstdlib>
#include <thread>
#include "JudgeEngine.h"
#include "Logger.h"

int main(int argc, char *argv[])
{
    const char *HOST = std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "127.0.0.1";
    const char *portEnv = std::getenv("REDIS_PORT");
    int PORT = portEnv ? std::atoi(portEnv) : 6379;

    const auto numThreads = std::thread::hardware_concurrency() ? std::thread::hardware_concurrency() : 4;

    LOG_INFO("Initializing Judge Engine with " << numThreads << " threads.");
    JudgeEngine engine(HOST, PORT, numThreads);
    engine.start();

    return EXIT_SUCCESS;
}