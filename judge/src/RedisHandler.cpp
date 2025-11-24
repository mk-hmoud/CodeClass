#include "RedisHandler.h"
#include "Logger.h"
#include <hiredis/hiredis.h>

std::unique_ptr<RedisHandler> RedisHandler::instance_ = nullptr;

void RedisHandler::initialize(const char *host, int port)
{
    if (!instance_)
    {
        instance_.reset(new RedisHandler(host, port));
    }
}

RedisHandler &RedisHandler::getInstance()
{
    if (!instance_)
    {
        LOG_ERROR("RedisHandler has not been initialized, call initialize() first.");
        exit(1);
    }
    return *instance_;
}

RedisHandler::RedisHandler(const char *host, int port)
    : blocking_context_(nullptr), command_context_(nullptr)
{
    LOG_INFO("Connecting to Redis at " << host << ":" << port << " with 2 connections.");

    blocking_context_ = redisConnect(host, port);
    if (blocking_context_ == nullptr || blocking_context_->err)
    {
        if (blocking_context_)
        {
            LOG_ERROR("Redis blocking connection error: " << blocking_context_->errstr);
        }
        else
        {
            LOG_ERROR("Failed to allocate Redis blocking context");
        }
        exit(1);
    }

    command_context_ = redisConnect(host, port);
    if (command_context_ == nullptr || command_context_->err)
    {
        if (command_context_)
        {
            LOG_ERROR("Redis command connection error: " << command_context_->errstr);
        }
        else
        {
            LOG_ERROR("Failed to allocate Redis command context");
        }
        exit(1);
    }
    LOG_INFO("Successfully connected to Redis with both connections.");
}

RedisHandler::~RedisHandler()
{
    LOG_INFO("Closing Redis connections.");
    if (blocking_context_)
    {
        redisFree(blocking_context_);
    }
    if (command_context_)
    {
        redisFree(command_context_);
    }
}

void RedisHandler::set(const std::string &key, const std::string &value)
{
    std::lock_guard<std::mutex> lock(command_mutex_);
    LOG_DEBUG("SET on command connection. Key: " << key);
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(command_context_, "SET %b %b", key.data(), key.size(), value.data(), value.size()));
    if (reply)
    {
        if (reply->type == REDIS_REPLY_ERROR)
        {
            LOG_ERROR("Redis SET failed: " << reply->str);
        }
        freeReplyObject(reply);
    }
}

bool RedisHandler::expire(const std::string &key, int seconds)
{
    std::lock_guard<std::mutex> lock(command_mutex_);
    LOG_DEBUG("EXPIRE on command connection. Key: " << key);
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(command_context_, "EXPIRE %s %d", key.c_str(), seconds));
    if (!reply)
    {
        LOG_ERROR("Redis EXPIRE command failed: no reply");
        return false;
    }
    bool success = (reply->type == REDIS_REPLY_INTEGER && reply->integer == 1);
    if (!success && reply->type == REDIS_REPLY_ERROR)
    {
        LOG_ERROR("Redis EXPIRE failed: " << reply->str);
    }
    freeReplyObject(reply);
    return success;
}

bool RedisHandler::brpop(std::string &jobId, std::string &value)
{
    std::lock_guard<std::mutex> lock(blocking_mutex_);
    LOG_DEBUG("BRPOP on blocking connection.");
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(blocking_context_, "BRPOP judge:queue 0"));
    if (!reply || reply->type != REDIS_REPLY_ARRAY || reply->elements != 2)
    {
        LOG_ERROR("BRPOP command failed or returned unexpected result");
        if (reply)
            freeReplyObject(reply);
        return false;
    }

    jobId = reply->element[1]->str;
    freeReplyObject(reply);

    // HGET can also use the blocking connection since it follows BRPOP sequentially
    std::string hashKey = "judge:" + jobId;
    reply = static_cast<redisReply *>(
        redisCommand(blocking_context_, "HGET %s data", hashKey.c_str()));
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

bool RedisHandler::brpoplpush(const std::string &source, const std::string &destination, int timeout, std::string &outValue)
{
    std::lock_guard<std::mutex> lock(blocking_mutex_);
    // LOG_DEBUG("BRPOPLPUSH " << source << " -> " << destination);

    redisReply *reply = static_cast<redisReply *>(
        redisCommand(blocking_context_, "BRPOPLPUSH %s %s %d",
                     source.c_str(), destination.c_str(), timeout));

    if (!reply)
    {
        LOG_ERROR("BRPOPLPUSH failed: context error");
        return false;
    }

    bool success = false;
    if (reply->type == REDIS_REPLY_STRING)
    {
        outValue = std::string(reply->str, reply->len);
        success = true;
    }
    else if (reply->type == REDIS_REPLY_NIL)
    {
        // timeout
        success = false;
    }
    else
    {
        LOG_ERROR("BRPOPLPUSH unexpected type: " << reply->type);
    }

    freeReplyObject(reply);
    return success;
}

void RedisHandler::lrem(const std::string &key, int count, const std::string &value)
{
    std::lock_guard<std::mutex> lock(command_mutex_);
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(command_context_, "LREM %s %d %b", key.c_str(), count, value.data(), value.size()));

    if (reply)
        freeReplyObject(reply);
}

bool RedisHandler::hget(const std::string &key, const std::string &field, std::string &outValue)
{
    std::lock_guard<std::mutex> lock(command_mutex_);
    redisReply *reply = static_cast<redisReply *>(
        redisCommand(command_context_, "HGET %s %s", key.c_str(), field.c_str()));

    if (reply && reply->type == REDIS_REPLY_STRING)
    {
        outValue = std::string(reply->str, reply->len);
        freeReplyObject(reply);
        return true;
    }
    if (reply)
        freeReplyObject(reply);
    return false;
}