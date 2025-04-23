#include <iostream>
#include <cstdlib>
#include "Redis_handler.h"
#include "Judge_worker.h"
#include "Logger.h"

int main(int argc, char *argv[])
{
    const char *host = "127.0.0.1";
    int port = 6379;

    LOG_INFO("Connecting to Redis at " << host << ":" << port);
    RedisHandler redis(host, port);

    JudgeWorker worker(redis);
    worker.run();

    return EXIT_SUCCESS;
}
