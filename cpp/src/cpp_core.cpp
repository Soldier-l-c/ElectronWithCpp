#include "cpp_core.h"

#include <nlohmann/json.hpp>

#include <cstdio>
#include <cstring>
#include <exception>
#include <mutex>
#include <string>
#include <utility>

namespace {

constexpr std::size_t kMaxJsonBytes = 64U * 1024U;

std::mutex g_mutex;
bool g_initialized = false;
nlohmann::json g_config = nlohmann::json::object();

const char *status_name(int status)
{
    switch (status) {
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

std::string read_string(const nlohmann::json &object, const char *key)
{
    const auto it = object.find(key);
    if (it == object.end() || !it->is_string()) {
        return {};
    }
    return it->get<std::string>();
}

int parse_object(const char *json_text, nlohmann::json &parsed)
{
    if (json_text == nullptr) {
        return CPP_CORE_ERR_INVALID_ARGUMENT;
    }

    if (std::strlen(json_text) > kMaxJsonBytes) {
        return CPP_CORE_ERR_INVALID_ARGUMENT;
    }

    parsed = nlohmann::json::parse(json_text, nullptr, false);
    if (parsed.is_discarded()) {
        return CPP_CORE_ERR_INVALID_JSON;
    }
    if (!parsed.is_object()) {
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

extern "C" {

int cpp_init(const char *config_json)
{
    try {
        nlohmann::json config;
        const int parse_status = parse_object(config_json, config);
        if (parse_status != CPP_CORE_OK) {
            log_result("cpp_init", parse_status);
            return parse_status;
        }

        std::lock_guard<std::mutex> lock(g_mutex);
        if (g_initialized) {
            log_result("cpp_init", CPP_CORE_ERR_ALREADY_INITIALIZED);
            return CPP_CORE_ERR_ALREADY_INITIALIZED;
        }

        g_config = std::move(config);

        const std::string app_name = read_string(g_config, "appName");
        const std::string log_level = read_string(g_config, "logLevel");
        g_initialized = true;
        std::fprintf(stderr,
                     "[cpp_core] initialized appName=\"%s\" logLevel=\"%s\"\n",
                     app_name.empty() ? "(default)" : app_name.c_str(),
                     log_level.empty() ? "info" : log_level.c_str());
        log_result("cpp_init", CPP_CORE_OK);
        return CPP_CORE_OK;
    } catch (const std::exception &error) {
        std::fprintf(stderr, "[cpp_core] cpp_init exception: %s\n", error.what());
        return CPP_CORE_ERR_INTERNAL;
    } catch (...) {
        std::fprintf(stderr, "[cpp_core] cpp_init unknown exception\n");
        return CPP_CORE_ERR_INTERNAL;
    }
}

int cpp_deinit(const char *config_json)
{
    try {
        nlohmann::json config;
        const int parse_status = parse_object(config_json, config);
        if (parse_status != CPP_CORE_OK) {
            log_result("cpp_deinit", parse_status);
            return parse_status;
        }

        std::lock_guard<std::mutex> lock(g_mutex);
        if (!g_initialized) {
            log_result("cpp_deinit", CPP_CORE_ERR_NOT_INITIALIZED);
            return CPP_CORE_ERR_NOT_INITIALIZED;
        }

        const std::string reason = read_string(config, "reason");
        g_config.clear();
        g_initialized = false;

        std::fprintf(stderr,
                     "[cpp_core] deinitialized reason=\"%s\"\n",
                     reason.empty() ? "(none)" : reason.c_str());
        log_result("cpp_deinit", CPP_CORE_OK);
        return CPP_CORE_OK;
    } catch (const std::exception &error) {
        std::fprintf(stderr, "[cpp_core] cpp_deinit exception: %s\n", error.what());
        return CPP_CORE_ERR_INTERNAL;
    } catch (...) {
        std::fprintf(stderr, "[cpp_core] cpp_deinit unknown exception\n");
        return CPP_CORE_ERR_INTERNAL;
    }
}

} // extern "C"
