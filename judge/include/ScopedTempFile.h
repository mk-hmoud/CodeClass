#ifndef SCOPEDTEMPFILE_H
#define SCOPEDTEMPFILE_H

#include <string>
#include <unistd.h>
#include <fcntl.h>
#include <vector>
#include <stdexcept>
#include <cstring>
#include "Logger.h"

class ScopedTempFile
{
public:
    // pattern must end in XXXXXX
    explicit ScopedTempFile(std::string pattern = "/tmp/judge_XXXXXX")
        : path_(std::move(pattern)), fd_(-1)
    {

        std::vector<char> pathBuf(path_.begin(), path_.end());
        pathBuf.push_back('\0');

        fd_ = mkstemp(pathBuf.data());
        if (fd_ == -1)
        {
            throw std::runtime_error("Failed to create temp file: " + std::string(strerror(errno)));
        }

        path_ = pathBuf.data();
    }

    // prevent double-closing/unlinking due to copying
    ScopedTempFile(const ScopedTempFile &) = delete;
    ScopedTempFile &operator=(const ScopedTempFile &) = delete;

    ~ScopedTempFile()
    {
        if (fd_ != -1)
        {
            close(fd_);
        }
        if (!path_.empty())
        {
            if (unlink(path_.c_str()) != 0)
            {
                LOG_ERROR("Failed to unlink temp file " << path_ << ": " << strerror(errno));
            }
        }
    }

    void write(const std::string &content)
    {
        if (fd_ == -1)
            throw std::runtime_error("Attempting to write to closed temp file");

        ssize_t written = ::write(fd_, content.c_str(), content.size());
        if (written != static_cast<ssize_t>(content.size()))
        {
            throw std::runtime_error("Failed to write full content to temp file");
        }
        fsync(fd_);
    }

    const std::string &getPath() const { return path_; }

private:
    std::string path_;
    int fd_;
};

#endif // SCOPEDTEMPFILE_H