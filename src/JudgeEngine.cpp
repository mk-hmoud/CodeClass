#include "JudgeEngine.h"
#include "Logger.h"

/**
 * @brief Initializes the RedisHandler and JudgeWorker.
 */
JudgeEngine::JudgeEngine(const std::string &redisHost, int redisPort)
    // Initialize RedisHandler with host and port
    : redisHandler_(redisHost.c_str(), redisPort),
      // Pass the initialized RedisHandler to the JudgeWorker
      judgeWorker_(redisHandler_)
{
    LOG_INFO("JudgeEngine initialized");
}

/**
 * @brief Begins the worker's execution.
 */
void JudgeEngine::start()
{
    LOG_INFO("JudgeEngine is starting the worker");
    judgeWorker_.run();
}