#pragma once

#include "RedisHandler.h"
#include "JudgeWorker.h"
#include <string>

/**
 * @class JudgeEngine
 * @brief Orchestrator for the judge.
 */
class JudgeEngine
{
public:
    JudgeEngine(const std::string &redisHost, int redisPort);
    void start();

private:
    RedisHandler redisHandler_;
    JudgeWorker judgeWorker_;
};