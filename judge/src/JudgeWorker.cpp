#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/wait.h>
#include <fcntl.h>

#include "JudgeWorker.h"
#include "Logger.h"
#include "RedisHandler.h"
#include "ScopedTempFile.h"

using json = nlohmann::json;

JudgeWorker::JudgeWorker() {}

void JudgeWorker::processSubmission(const std::string &jobId,
                                    const std::string &jsonSubmissionData)
{
    // not used
    Submission submission = parseSubmission(jsonSubmissionData);
    LOG_INFO("Processing job " << jobId);

    // The input is a json,meaning my parsing is useless.
    json inputJson;
    inputJson["language"] = submission.language;
    inputJson["code"] = submission.code;
    inputJson["testCases"] = json::array();
    for (const auto &tc : submission.testCases)
    {
        json tcJson;
        tcJson["testCaseId"] = tc.test_case_id;
        tcJson["input"] = tc.input;
        tcJson["expectedOutput"] = tc.expected_output;
        tcJson["isPublic"] = tc.is_public;
        inputJson["testCases"].push_back(tcJson);
    }
    std::string inputStr = inputJson.dump();

    try
    {
        std::cout << "inputStr: " << inputStr;

        ScopedTempFile inputFile("/tmp/judge_input_XXXXXX");
        ScopedTempFile outputFile("/tmp/judge_output_XXXXXX");

        inputFile.write(inputStr);

        pid_t pid = fork();
        if (pid < 0)
        {
            LOG_ERROR("fork() failed: " << strerror(errno));
            return;
        }
        else if (pid == 0)
        {
            int inFd = open(inputFile.getPath().c_str(), O_RDONLY);
            int outFd = open(outputFile.getPath().c_str(), O_WRONLY | O_TRUNC);

            if (dup2(inFd, STDIN_FILENO) < 0 || dup2(outFd, STDOUT_FILENO) < 0)
            {
                std::cerr << "open() failed: " << strerror(errno) << "\n";
                _exit(1);
            }
            close(inFd);
            close(outFd);

            const char *image = "judge-cpp:latest";
            if (submission.language == "python")
                image = "judge-py:latest";
            else if (submission.language == "javascript" || submission.language == "typescript")
                image = "judge-js:latest";

            // exec() docker WITHOUT a shell
            execlp("docker", "docker", "run",
                   "--rm",
                   "-i",
                   "--read-only",
                   "--network", "none",
                   "--pids-limit", "64",
                   "--tmpfs", "/tmp:exec",
                   "--memory=256m",
                   "--memory-swap", "256m",
                   "--cpus=0.5",
                   "--tmpfs", "/tmp:exec",
                   image,
                   (char *)nullptr);

            std::cerr << "execlp(docker) failed: " << strerror(errno) << "\n";
            _exit(1);
        }
        else
        {
            int status = 0;
            if (waitpid(pid, &status, 0) < 0)
            {
                LOG_ERROR("waitpid() failed: " << strerror(errno));
            }
            else if (!WIFEXITED(status) || WEXITSTATUS(status) != 0)
            {
                LOG_WARNING("Docker exited with status "
                            << (WIFEXITED(status)
                                    ? WEXITSTATUS(status)
                                    : -1));
            }
        }

        std::ifstream outputStream(outputFile.getPath());
        std::string outputStr((std::istreambuf_iterator<char>(outputStream)),
                              std::istreambuf_iterator<char>());

        try
        {
            auto results = json::parse(outputStr);
            LOG_INFO("Job " << jobId << " processed with results: " << results.dump(4));
            std::string prefix;
            if (submission.mode == "submit")
            {
                prefix = "judge:submit:verdict:";
            }
            else if (submission.mode == "run")
            {
                prefix = "judge:run:verdict:";
            }
            else
            {
                LOG_ERROR("Unknown submission mode for job " << jobId << ": " << submission.mode);
                return;
            }

            std::string verdictKey = prefix + jobId;
            REDIS()->set(verdictKey, results.dump());
            REDIS()->expire(verdictKey, 3600);
            LOG_INFO("DONE");
        }
        catch (const json::parse_error &e)
        {
            LOG_ERROR("Result parsing failed for job " << jobId << ": " << e.what() << ". Raw output: " << outputStr);
        }
    }
    catch (const std::exception &e)
    {
        LOG_ERROR("System error in JudgeWorker: " << e.what());
    }
}

Submission JudgeWorker::parseSubmission(const std::string &jsonSubmissionData)
{
    auto j = json::parse(jsonSubmissionData);
    return {
        j["code"].get<std::string>(),
        j["language"].get<std::string>(),
        j["testCases"].get<std::vector<TestCase>>(),
        j["mode"].get<std::string>()};
}
