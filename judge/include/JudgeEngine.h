#pragma once

#include "RedisHandler.h"
#include "JudgeWorker.h"
#include <string>
#include "ThreadPool.h"

/**
 * @class JudgeEngine
 * @brief Orchestrator for the judge.
 */
class JudgeEngine
{
public:
    JudgeEngine(const std::string &redisHost, int redisPort, size_t numThreads);
    void start();

private:
    JudgeWorker judgeWorker_;
    ThreadPool threadPool_;
};