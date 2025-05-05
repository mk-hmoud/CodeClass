#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/wait.h>
#include <fcntl.h>
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

        // LOG_INFO("Processing job ID: " << jobId << " with data: " << submissionData);
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

// this only considers c++ submissions at the moment
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

    std::cout << "inputStr: " << inputStr;
    // create temp files using mkstep for input & output.
    char inputFilename[] = "/tmp/judge_input_XXXXXX";
    int inputFd = mkstemp(inputFilename);
    if (inputFd == -1)
    {
        LOG_ERROR("mkstemp(input) failed: " << strerror(errno));
        return;
    }
    {
        FILE *f = fdopen(inputFd, "w");
        fwrite(inputStr.c_str(), 1, inputStr.size(), f);
        fclose(f);
    }

    char outputFilename[] = "/tmp/judge_output_XXXXXX";
    int outputFd = mkstemp(outputFilename);
    if (outputFd == -1)
    {
        LOG_ERROR("mkstemp(output) failed: " << strerror(errno));
        unlink(inputFilename);
        return;
    }
    close(outputFd);

    pid_t pid = fork();
    if (pid < 0)
    {
        LOG_ERROR("fork() failed: " << strerror(errno));
        unlink(inputFilename);
        unlink(outputFilename);
        return;
    }
    else if (pid == 0)
    {
        int inFd = open(inputFilename, O_RDONLY);
        int outFd = open(outputFilename, O_WRONLY | O_TRUNC);
        if (inFd < 0 || outFd < 0)
        {
            std::cerr << "open() failed: " << strerror(errno) << "\n";
            _exit(1);
        }

        // redirectecing stdin and stdout
        if (dup2(inFd, STDIN_FILENO) < 0 ||
            dup2(outFd, STDOUT_FILENO) < 0)
        {
            std::cerr << "dup2() failed: " << strerror(errno) << "\n";
            _exit(1);
        }
        close(inFd);
        close(outFd);

        const char *image = "judge-cpp:latest";
        if (submission.language == "python")
        {
            image = "judge-py:latest";
        }
        else if (submission.language == "javascript" || submission.language == "typescript")
        {
            image = "judge-js:latest";
        }

        // exec() docker WITHOUT a shell
        execlp("docker", "docker",
               "run", "--rm", "-i",
               "--read-only",
               "--tmpfs", "/tmp:exec",
               "--memory=256m",
               "--cpus=0.5",
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

    std::ifstream outputFile(outputFilename);
    std::string outputStr(
        (std::istreambuf_iterator<char>(outputFile)),
        std::istreambuf_iterator<char>());

    try
    {
        auto results = json::parse(outputStr);
        LOG_INFO("Job " << jobId << " processed with results: "
                        << results.dump());
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
            LOG_ERROR("Unknown submission mode: " << submission.mode);
            return;
        }

        std::string verdictKey = prefix + jobId;
        std::cout << "\n\nresults: " << results.dump();
        redis_.set(verdictKey, results.dump());
        redis_.expire(verdictKey, 3600);
    }
    catch (const std::exception &e)
    {
        LOG_ERROR("Result parsing failed: " << e.what());
    }

    unlink(inputFilename);
    unlink(outputFilename);
    // redis_.del("judge:" + jobId);
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
