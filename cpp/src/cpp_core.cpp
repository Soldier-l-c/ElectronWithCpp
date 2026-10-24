#include "cpp_core.h"

#include <rapidjson/document.h>
#include <rapidjson/error/en.h>

#include <cstdio>
#include <cstring>
#include <exception>
#include <mutex>
#include <string>

namespace
{
constexpr std::size_t kMaxJsonBytes = 64U * 1024U;

std::mutex g_mutex;
bool g_initialized = false;

const char *status_name(int status)
{
    switch (status)
    {
        case CPP_CORE_OK:
            return "OK";
        case CPP_CORE_ERR_INVALID_ARGUMENT:
            return "INVALID_ARGUMENT";
        case CPP_CORE_ERR_INVALID_JSON:
            return "INVALID_JSON";
        case CPP_CORE_ERR_ALREADY_INITIALIZED:
            return "ALREADY_INITIALIZED";
        case CPP_CORE_ERR_NOT_INITIALIZED:
            return "NOT_INITIALIZED";
        case CPP_CORE_ERR_INTERNAL:
            return "INTERNAL";
        default:
            return "UNKNOWN";
    }
}

std::string read_string(const rapidjson::Value &object, const char *key)
{
    const auto it = object.FindMember(key);
    if (it == object.MemberEnd() || !it->value.IsString())
    {
        return std::string();
    }
    return std::string(it->value.GetString(), it->value.GetStringLength());
}

int parse_object(const char *json_text, rapidjson::Document &parsed)
{
    if (json_text == nullptr)
    {
        return CPP_CORE_ERR_INVALID_ARGUMENT;
    }

    const std::size_t length = std::strlen(json_text);
    if (length > kMaxJsonBytes)
    {
        return CPP_CORE_ERR_INVALID_ARGUMENT;
    }

    parsed.Parse(json_text, length);
    if (parsed.HasParseError())
    {
        std::fprintf(stderr, "[cpp_core] JSON parse error at offset %zu: %s\n",
                     parsed.GetErrorOffset(), rapidjson::GetParseError_En(parsed.GetParseError()));
        return CPP_CORE_ERR_INVALID_JSON;
    }

    if (!parsed.IsObject())
    {
        return CPP_CORE_ERR_INVALID_ARGUMENT;
    }

    return CPP_CORE_OK;
}

void log_result(const char *operation, int status)
{
    std::fprintf(stderr, "[cpp_core] %s -> %s (%d)\n", operation, status_name(status), status);
    std::fflush(stderr);
}
} // namespace

extern "C"
{
    int cpp_init(const char *config_json)
    {
        try
        {
            rapidjson::Document config;
            const int parse_status = parse_object(config_json, config);
            if (parse_status != CPP_CORE_OK)
            {
                log_result("cpp_init", parse_status);
                return parse_status;
            }

            std::lock_guard<std::mutex> lock(g_mutex);
            if (g_initialized)
            {
                log_result("cpp_init", CPP_CORE_ERR_ALREADY_INITIALIZED);
                return CPP_CORE_ERR_ALREADY_INITIALIZED;
            }

            const std::string app_name = read_string(config, "appName");
            const std::string log_level = read_string(config, "logLevel");
            g_initialized = true;

            std::fprintf(stderr, "[cpp_core] initialized appName=\"%s\" logLevel=\"%s\"\n",
                         app_name.empty() ? "(default)" : app_name.c_str(),
                         log_level.empty() ? "info" : log_level.c_str());
            log_result("cpp_init", CPP_CORE_OK);
            return CPP_CORE_OK;
        }
        catch (const std::exception &error)
        {
            std::fprintf(stderr, "[cpp_core] cpp_init exception: %s\n", error.what());
            return CPP_CORE_ERR_INTERNAL;
        }
        catch (...)
        {
            std::fprintf(stderr, "[cpp_core] cpp_init unknown exception\n");
            return CPP_CORE_ERR_INTERNAL;
        }
    }

    int cpp_deinit(const char *config_json)
    {
        try
        {
            rapidjson::Document config;
            const int parse_status = parse_object(config_json, config);
            if (parse_status != CPP_CORE_OK)
            {
                log_result("cpp_deinit", parse_status);
                return parse_status;
            }

            const std::string reason = read_string(config, "reason");

            std::lock_guard<std::mutex> lock(g_mutex);
            if (!g_initialized)
            {
                log_result("cpp_deinit", CPP_CORE_ERR_NOT_INITIALIZED);
                return CPP_CORE_ERR_NOT_INITIALIZED;
            }

            g_initialized = false;

            std::fprintf(stderr, "[cpp_core] deinitialized reason=\"%s\"\n",
                         reason.empty() ? "(none)" : reason.c_str());
            log_result("cpp_deinit", CPP_CORE_OK);
            return CPP_CORE_OK;
        }
        catch (const std::exception &error)
        {
            std::fprintf(stderr, "[cpp_core] cpp_deinit exception: %s\n", error.what());
            return CPP_CORE_ERR_INTERNAL;
        }
        catch (...)
        {
            std::fprintf(stderr, "[cpp_core] cpp_deinit unknown exception\n");
            return CPP_CORE_ERR_INTERNAL;
        }
    }
} // extern "C"
