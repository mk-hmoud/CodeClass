#pragma once
#include <string>
#include "nlohmann/json.hpp"
#include <vector>

struct TestCase
{
    int test_case_id;
    std::string input;
    std::string expected_output;
    bool is_public;
};

struct Submission
{
    std::string code;
    std::string language;
    std::vector<TestCase> testCases;
    std::string mode;
    std::string libraryCode;
    std::string outputType;
};

namespace nlohmann
{
    template <>
    struct adl_serializer<TestCase>
    {
        // input/expectedOutput can legitimately be SQL NULL (e.g. a test case with
        // no stdin/argv, or an image-output problem with nothing to diff), which
        // arrives here as JSON null. Neither .at(...).get_to(std::string&) nor
        // .value(key, default) tolerate an explicit null (only a missing key) --
        // both throw type_error.302. And since this runs inside a
        // std::packaged_task (see ThreadPool::enqueue), an uncaught throw here is
        // silently swallowed into a future nobody reads, leaving the job stuck in
        // the processing queue forever with no verdict and no log line. Extract
        // manually so null is handled the same as a missing key.
        static std::string stringOrEmpty(const json &j, const char *key)
        {
            if (!j.contains(key) || j.at(key).is_null())
            {
                return "";
            }
            return j.at(key).get<std::string>();
        }

        static void from_json(const json &j, TestCase &tc)
        {
            j.at("testCaseId").get_to(tc.test_case_id);
            tc.input = stringOrEmpty(j, "input");
            tc.expected_output = stringOrEmpty(j, "expectedOutput");
            j.at("isPublic").get_to(tc.is_public);
        }
    };
}

class JudgeWorker
{
public:
    explicit JudgeWorker();
    void processSubmission(const std::string &jobId, const std::string &jsonSubmissionData);

private:
    Submission parseSubmission(const std::string &jsonSubmissionData);
};