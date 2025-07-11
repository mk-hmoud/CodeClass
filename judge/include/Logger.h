#ifndef LOGGER_H
#define LOGGER_H

#include <iostream>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <string>

inline std::string get_timestamp()
{
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %X");
    return ss.str();
}

#define LOG_INFO(msg) (std::cout << "[" << get_timestamp() << "] INFO: " << msg << std::endl)
#define LOG_ERROR(msg) (std::cerr << "[" << get_timestamp() << "] ERROR: " << msg << std::endl)
#define LOG_DEBUG(msg) (std::cout << "[" << get_timestamp() << "] DEBUG: " << msg << std::endl)
#define LOG_WARNING(msg) (std::cout << "[" << get_timestamp() << "] WARNING: " << msg << std::endl)

#endif // LOGGER_H
