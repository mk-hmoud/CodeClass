cmake_minimum_required(VERSION 3.10)
project(judge)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/bin)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories("${CMAKE_SOURCE_DIR}/dependencies/hiredis/include")

include_directories(${CMAKE_SOURCE_DIR}/include)

find_library(HIREDIS_LIB
    NAMES hiredis
    HINTS "${CMAKE_SOURCE_DIR}/dependencies/hiredis/lib"
)
if (NOT HIREDIS_LIB)
    message(FATAL_ERROR "Could not find libhiredis")
endif()

add_executable(judge
    src/main.cpp
    src/JudgeEngine.cpp
    src/RedisHandler.cpp
    src/JudgeWorker.cpp
)

target_link_libraries(judge
    PRIVATE ${HIREDIS_LIB} pthread
)
