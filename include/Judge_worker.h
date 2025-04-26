#pragma once
#include <string>
#include "Redis_handler.h"

struct TestCase
{
    int test_case_id;
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
            j.at("testCaseId").get_to(tc.test_case_id);
            j.at("input").get_to(tc.input);
            j.at("expectedOutput").get_to(tc.expected_output);
            j.at("isPublic").get_to(tc.isPublic);
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