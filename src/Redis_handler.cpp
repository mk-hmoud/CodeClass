#include "Redis_handler.h"
#include "Logger.h"
#include <nlohmann/json.hpp>
#include <sstream>

using json = nlohmann::json;

RedisHandler::RedisHandler(const char *host, int port)
{
    LOG_INFO("Connecting to Redis at " << host << ":" << port);
    context_ = redisConnect(host, port);

    if (context_ == nullptr || context_->err)
    {
        if (context_)
        {
            LOG_ERROR("Redis connection error: " << context_->errstr);
        }
        else
        {
            LOG_ERROR("Failed to allocate Redis context");
        }
        exit(1);
    }
    LOG_INFO("Successfully connected to Redis");
}

RedisHandler::~RedisHandler()
{
    LOG_INFO("Closing Redis connection");
    redisFree(context_);
}

bool RedisHandler::brpop(std::string &value)
{
    LOG_DEBUG("Attempting BRPOP on 'judge:queue' queue");
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(context_, "BRPOP judge:queue 0"));
    if (!reply || reply->type != REDIS_REPLY_ARRAY || reply->elements != 2)
    {
        LOG_ERROR("BRPOP command failed or returned unexpected result");
        if (reply)
            freeReplyObject(reply);
        return false;
    }

    std::string jobId = reply->element[1]->str;
    freeReplyObject(reply);

    std::string hashKey = "judge:" + jobId;
    reply = static_cast<redisReply *>(
        redisCommand(context_, "HGET %s data", hashKey.c_str()));

    LOG_DEBUG("HGET reply type: " << reply->type);
    if (reply && reply->type == REDIS_REPLY_STRING)
    {
        value = reply->str;
        freeReplyObject(reply);
        LOG_INFO("Received new submission from queue with jobId: " << jobId);
        return true;
    }

    if (reply)
        freeReplyObject(reply);
    return false;
}

void RedisHandler::set(const std::string &key, const std::string &value)
{
    LOG_DEBUG("Setting Redis key: " << key);
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(context_, "SET %b %b",
                     key.data(), key.size(),
                     value.data(), value.size()));

    if (reply)
    {
        if (reply->type == REDIS_REPLY_ERROR)
        {
            LOG_ERROR("Redis SET failed: " << reply->str);
        }
        freeReplyObject(reply);
    }
}