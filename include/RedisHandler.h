#ifndef REDIS_JUDGE_H
#define REDIS_JUDGE_H

#include <iostream>
#include <nlohmann/json.hpp>
#include <cstdlib>
#include <string>
#include <vector>
#include <hiredis/hiredis.h>
#include <unistd.h>
#include <chrono>
#include <iomanip>
#include <sstream>
// #include <hiredis/adapters/libuv.h>

using json = nlohmann::json;

class RedisHandler
{
public:
    RedisHandler(const char *host, int port);
    ~RedisHandler();
    bool brpop(std::string &jobId, std::string &value);
    void set(const std::string &key, const std::string &value);
    bool expire(const std::string &key, int seconds);

private:
    redisContext *context_;
};

#endif // REDIS_JUDGE_H
