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

    const std::string QUEUE_PENDING = "judge:queue";
    const std::string QUEUE_PROCESSING = "judge:processing_queue";

    while (true)
    {
        std::string jobId;

        if (!REDIS()->brpoplpush(QUEUE_PENDING, QUEUE_PROCESSING, 0, jobId))
        {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            continue;
        }

        std::string submissionData;
        if (!REDIS()->hget("judge:" + jobId, "data", submissionData))
        {
            LOG_ERROR("Job " << jobId << " exists in queue but data missing in Hash!");
            // edge case Data missing. Remove from processing to prevent clog?
            // Or move to 'judge:failed'?
            // For now, we remove it.
            REDIS()->lrem(QUEUE_PROCESSING, 1, jobId);
            continue;
        }

        LOG_INFO("Job " << jobId << " moved to processing queue.");

        threadPool_.enqueue([this, jobId, submissionData, QUEUE_PROCESSING]
                            { 
            this->judgeWorker_.processSubmission(jobId, submissionData); 
            
            REDIS()->lrem(QUEUE_PROCESSING, 1, jobId);
            
            LOG_INFO("Job " << jobId << " completed and removed from processing queue."); });
    }
}