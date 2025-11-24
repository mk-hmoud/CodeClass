#ifndef REDIS_JUDGE_H
#define REDIS_JUDGE_H

#include <string>
#include <memory>
#include <mutex>

struct redisContext;

class RedisHandler
{
public:
    RedisHandler(const RedisHandler &) = delete;
    void operator=(const RedisHandler &) = delete;

    /**
     * @brief Initializes the singleton instance. Must be called once at startup.
     */
    static void initialize(const char *host, int port);

    static RedisHandler &getInstance();

    bool brpop(std::string &jobId, std::string &value);
    bool brpoplpush(const std::string &source, const std::string &destination, int timeout, std::string &outValue);
    void lrem(const std::string &key, int count, const std::string &value);
    bool hget(const std::string &key, const std::string &field, std::string &outValue);
    void set(const std::string &key, const std::string &value);
    bool expire(const std::string &key, int seconds);

private:
    RedisHandler(const char *host, int port);

    ~RedisHandler();
    friend struct std::default_delete<RedisHandler>;

private:
    redisContext *blocking_context_;
    redisContext *command_context_;

    std::mutex blocking_mutex_;
    std::mutex command_mutex_;

    static std::unique_ptr<RedisHandler> instance_;
};

#define REDIS() (&RedisHandler::getInstance())

#endif // REDIS_JUDGE_H
