cmake_minimum_required(VERSION 3.16)

project(electron_cpp_core VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(WIN32)
    set(CPP_CORE_PLATFORM "win32")
elseif(APPLE)
    set(CPP_CORE_PLATFORM "darwin")
else()
    set(CPP_CORE_PLATFORM "linux")
endif()

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "^(aarch64|arm64|ARM64)$")
        set(CPP_CORE_ARCH "arm64")
    else()
        set(CPP_CORE_ARCH "x64")
    endif()
else()
    set(CPP_CORE_ARCH "x86")
endif()

# Keep the runtime output in a predictable location so Electron can load it in
# development and electron-builder can copy it into the packaged resources.
set(CPP_CORE_OUTPUT_DIR
    "${CMAKE_CURRENT_SOURCE_DIR}/bin/${CPP_CORE_PLATFORM}/${CPP_CORE_ARCH}")

# RapidJSON is header-only and lives in the shared third-party directory on this
# machine. RAPIDJSON_INCLUDE_DIR takes precedence for other environments.
set(RAPIDJSON_INCLUDE_DIR "" CACHE PATH "Directory containing rapidjson/document.h")
if(NOT RAPIDJSON_INCLUDE_DIR)
    set(RAPIDJSON_HINTS "")
    if(DEFINED ENV{SOLDIERS_3RD})
        list(APPEND RAPIDJSON_HINTS
            "$ENV{SOLDIERS_3RD}/rapidjson/include"
            "$ENV{SOLDIERS_3RD}/rapidjson"
            "$ENV{SOLDIERS_3RD}/include"
            "$ENV{SOLDIERS_3RD}"
        )
    endif()

    find_path(_RAPIDJSON_INCLUDE_DIR
        NAMES rapidjson/document.h
        HINTS ${RAPIDJSON_HINTS}
        DOC "Directory containing rapidjson/document.h"
    )
    if(_RAPIDJSON_INCLUDE_DIR)
        set(RAPIDJSON_INCLUDE_DIR "${_RAPIDJSON_INCLUDE_DIR}" CACHE PATH
            "Directory containing rapidjson/document.h" FORCE)
    endif()
endif()

if(NOT RAPIDJSON_INCLUDE_DIR)
    message(FATAL_ERROR
        "RapidJSON was not found. Set SOLDIERS_3RD to the third-party root "
        "or set RAPIDJSON_INCLUDE_DIR to the directory containing rapidjson/document.h."
    )
endif()

message(STATUS "RapidJSON include: ${RAPIDJSON_INCLUDE_DIR}")

add_library(cpp_core SHARED
    src/cpp_core.cpp
)

target_include_directories(cpp_core
    PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include"
)

target_include_directories(cpp_core
    SYSTEM PRIVATE "${RAPIDJSON_INCLUDE_DIR}"
)

target_compile_definitions(cpp_core PRIVATE CPP_CORE_EXPORTS)
target_compile_features(cpp_core PRIVATE cxx_std_17)

if(MSVC)
    target_compile_options(cpp_core PRIVATE /W4 /permissive- /utf-8 /EHsc)
    target_compile_definitions(cpp_core PRIVATE _CRT_SECURE_NO_WARNINGS NOMINMAX WIN32_LEAN_AND_MEAN)
else()
    target_compile_options(cpp_core PRIVATE -Wall -Wextra -Wpedantic)
    set_target_properties(cpp_core PROPERTIES
        CXX_VISIBILITY_PRESET hidden
        VISIBILITY_INLINES_HIDDEN YES
    )
endif()

set_target_properties(cpp_core PROPERTIES
    OUTPUT_NAME "cpp_core"
    RUNTIME_OUTPUT_DIRECTORY "${CPP_CORE_OUTPUT_DIR}"
    LIBRARY_OUTPUT_DIRECTORY "${CPP_CORE_OUTPUT_DIR}"
    ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/lib"
    PDB_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/pdb"
)

# Visual Studio is a multi-config generator: make every configuration write to
# the same predictable folder instead of adding a Debug/Release subdirectory.
foreach(CONFIG ${CMAKE_CONFIGURATION_TYPES})
    string(TOUPPER "${CONFIG}" CONFIG_UPPER)
    set_target_properties(cpp_core PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CPP_CORE_OUTPUT_DIR}"
        LIBRARY_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CPP_CORE_OUTPUT_DIR}"
        ARCHIVE_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CMAKE_CURRENT_BINARY_DIR}/lib"
        PDB_OUTPUT_DIRECTORY_${CONFIG_UPPER} "${CMAKE_CURRENT_BINARY_DIR}/pdb"
    )
endforeach()

message(STATUS "cpp_core target platform: ${CPP_CORE_PLATFORM}/${CPP_CORE_ARCH}")
message(STATUS "cpp_core runtime output: ${CPP_CORE_OUTPUT_DIR}")
