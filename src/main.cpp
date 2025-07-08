#include <cstdlib>
#include <thread>
#include "JudgeEngine.h"
#include "Logger.h"

int main(int argc, char *argv[])
{
    const char *HOST = "127.0.0.1";
    int PORT = 6379;

    const auto numThreads = std::thread::hardware_concurrency() ? std::thread::hardware_concurrency() : 4;

    LOG_INFO("Initializing Judge Engine with " << numThreads << " threads.");
    JudgeEngine engine(HOST, PORT, numThreads);
    engine.start();

    return EXIT_SUCCESS;
}