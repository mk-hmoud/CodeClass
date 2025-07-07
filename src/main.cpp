#include <cstdlib>
#include "JudgeEngine.h"
#include "Logger.h"

int main(int argc, char *argv[])
{
    const char *host = "127.0.0.1";
    int port = 6379;

    JudgeEngine engine(host, port);
    engine.start();

    return EXIT_SUCCESS;
}