#include <nlohmann/json.hpp>
#include <iostream>
#include "Judge_worker.h"
#include "Logger.h"

JudgeWorker::JudgeWorker(RedisHandler &redis)
    : redis_(redis)
{
}

void JudgeWorker::run()
{
    LOG_INFO("JudgeWorker entering main loop");
    std::string jobId;
    std::string submissionData;
    while (true)
    {
        if (!redis_.brpop(jobId, submissionData))
        {
            LOG_WARNING("Redis brpop failed or connection closed; exiting worker loop");
            break;
        }

        LOG_INFO("Processing job ID: " << jobId << " with data: " << submissionData);
        try
        {
            processSubmission(jobId, submissionData);
        }
        catch (const std::exception &ex)
        {
            LOG_ERROR("Exception in handleJob: " << ex.what());
        }
    }
}

void JudgeWorker::processSubmission(const std::string &jobId, const std::string &jsonSubmissionData)
{
    Submission submission = parseSubmission(jsonSubmissionData);
    LOG_INFO("Processing job " << jobId);
}

Submission JudgeWorker::parseSubmission(const std::string &jsonSubmissionData)
{
    auto j = json::parse(jsonSubmissionData);
    return {
        j["code"].get<std::string>(),
        j["language"].get<std::string>(),
        j["testCases"].get<std::vector<TestCase>>()};
}
