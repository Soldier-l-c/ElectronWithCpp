/**
 * ElectronWithCpp native core public C ABI.
 *
 * The library is loaded by koffi from Electron's main process. Keep this
 * interface plain C: no STL types, no exceptions and no C++ name mangling may
 * cross the library boundary.
 *
 * Both functions accept one UTF-8 JSON object encoded as a NUL-terminated
 * string. Future fields can be added to the JSON object without changing the
 * ABI. Every call returns one of the cpp_core_status values below.
 */
#ifndef CPP_CORE_H
#define CPP_CORE_H

// clang-format off
#if defined(_WIN32)
#  if defined(CPP_CORE_EXPORTS)
#    define CPP_CORE_API __declspec(dllexport)
#  else
#    define CPP_CORE_API __declspec(dllimport)
#  endif
#else
#  define CPP_CORE_API __attribute__((visibility("default")))
#endif
// clang-format on

#ifdef __cplusplus
extern "C"
{
#endif

    typedef enum cpp_core_status
    {
        CPP_CORE_OK = 0,
        CPP_CORE_ERR_INVALID_ARGUMENT = 1,
        CPP_CORE_ERR_INVALID_JSON = 2,
        CPP_CORE_ERR_ALREADY_INITIALIZED = 3,
        CPP_CORE_ERR_NOT_INITIALIZED = 4,
        CPP_CORE_ERR_INTERNAL = 5
    } cpp_core_status;

    /**
     * Initializes the native core.
     *
     * \param config_json UTF-8 JSON object, for example:
     *                    {"appName":"ElectronWithCpp","logLevel":"info"}
     * \return CPP_CORE_OK on success, otherwise a cpp_core_status error code.
     */
    CPP_CORE_API int cpp_init(const char *config_json);

    /**
     * Deinitializes the native core.
     *
     * \param config_json UTF-8 JSON object, for example:
     *                    {"reason":"app-quit"}
     * \return CPP_CORE_OK on success, otherwise a cpp_core_status error code.
     */
    CPP_CORE_API int cpp_deinit(const char *config_json);

#ifdef __cplusplus
}
#endif

#endif /* CPP_CORE_H */
