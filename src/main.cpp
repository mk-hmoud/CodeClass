#include <iostream>
#include <cstdlib>
#include "Redis_handler.h"
#include "Logger.h"

int main(int argc, char *argv[])
{
    const char *host = "127.0.0.1";
    int port = 6379;

    LOG_INFO("Connecting to Redis at " << host << ":" << port);
    RedisHandler redis(host, port);

    std::string value;
    LOG_INFO("Entering BRPOP loop on 'code-evaluation:wait'");
    while (true)
    {
        if (redis.brpop(value))
        {
            std::cout << "Popped value: " << value << std::endl;
        }
        else
        {
            LOG_WARNING("BRPOP failed or queue closed; exiting.");
            break;
        }
    }

    return EXIT_SUCCESS;
}
