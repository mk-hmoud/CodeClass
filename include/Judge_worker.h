#pragma once
#include <string>
#include "Redis_handler.h"

struct TestCase
{
    std::string input;
    std::string expected_output;
    bool isPublic;
};

struct Submission
{
    std::string code;
    std::string language;
    std::vector<TestCase> testCases;
};

namespace nlohmann
{
    template <>
    struct adl_serializer<TestCase>
    {
        static void from_json(const json &j, TestCase &tc)
        {
            j.at("input").get_to(tc.input);
            j.at("expected_output").get_to(tc.expected_output);
            j.at("is_public").get_to(tc.isPublic);
        }
    };
}

class JudgeWorker
{
public:
    explicit JudgeWorker(RedisHandler &redis);
    void run();
    void processSubmission(const std::string &jobId, const std::string &jsonSubmissionData);

private:
    RedisHandler &redis_;

    Submission parseSubmission(const std::string &jsonSubmissionData);
};