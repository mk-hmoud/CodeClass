#include "JudgeEngine.h"
#include "Logger.h"
#include "RedisHandler.h"

JudgeEngine::JudgeEngine(const std::string &redisHost, int redisPort, size_t numThreads)
    : judgeWorker_(),
      threadPool_(numThreads)
{
    RedisHandler::initialize(redisHost.c_str(), redisPort);
    LOG_INFO("JudgeEngine initialized with " << numThreads << " threads.");
}

void JudgeEngine::start()
{
    LOG_INFO("JudgeEngine starting main loop and listening for jobs.");
    while (true)
    {
        std::string jobId;
        std::string submissionData;

        if (!REDIS()->brpop(jobId, submissionData))
        {
            LOG_WARNING("Redis brpop failed or connection closed, closing worker loop.");
            break;
        }

        LOG_INFO("Job " << jobId << " received. Enqueuing for threadpool to process.");
        threadPool_.enqueue([this, jobId, submissionData]
                            { this->judgeWorker_.processSubmission(jobId, submissionData); });
    }
}