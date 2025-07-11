#ifndef THREAD_POOL_H
#define THREAD_POOL_H

#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <future>

#include "Logger.h"

class ThreadPool
{
public:
    explicit ThreadPool(size_t threads);
    ~ThreadPool();

    /**
     * @brief Enqueues a task to be executed by a thread.
     * @tparam F The type of the function.
     * @tparam Args The types of the arguments to the function.
     * @param f The function to execute.
     * @param args Arguments to the function.
     * @return result of the task as std::future.
     */
    template <class F, class... Args>
    auto enqueue(F &&f, Args &&...args)
        -> std::future<typename std::result_of<F(Args...)>::type>;

private:
    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex queue_mutex_;
    std::condition_variable condition_;
    bool stop_ = false;
};

template <class F, class... Args>
auto ThreadPool::enqueue(F &&f, Args &&...args)
    -> std::future<typename std::result_of<F(Args...)>::type>
{
    using return_type = typename std::result_of<F(Args...)>::type;

    auto task = std::make_shared<std::packaged_task<return_type()>>(
        std::bind(std::forward<F>(f), std::forward<Args>(args)...));

    std::future<return_type> res = task->get_future();
    {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        if (stop_)
        {
            throw std::runtime_error("enqueue on stopped ThreadPool");
        }
        tasks_.emplace([task]()
                       { (*task)(); });
    }
    condition_.notify_one();
    return res;
}

inline ThreadPool::ThreadPool(size_t threads)
{
    for (size_t i = 0; i < threads; ++i)
    {
        workers_.emplace_back([this]
                              {
            while (true) {
                std::function<void()> task;
                {
                    std::unique_lock<std::mutex> lock(this->queue_mutex_);
                    this->condition_.wait(lock,
                        [this] { return this->stop_ || !this->tasks_.empty(); });
                    if (this->stop_ && this->tasks_.empty()) {
                        return;
                    }
                    task = std::move(this->tasks_.front());
                    this->tasks_.pop();
                }
                try {
                    task();
                } catch (const std::exception& e) {
                    LOG_ERROR("Exception caught in thread pool task: " << e.what());
                } catch (...) {
                    LOG_ERROR("Unknown exception caught in thread pool task.");
                }
            } });
    }
}

inline ThreadPool::~ThreadPool()
{
    {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        stop_ = true;
    }
    condition_.notify_all();
    for (std::thread &worker : workers_)
    {
        if (worker.joinable())
        {
            worker.join();
        }
    }
}

#endif // THREAD_POOL_H