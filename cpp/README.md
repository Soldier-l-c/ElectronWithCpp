# C++ Core

独立的 C++17 动态库，对 Electron 暴露纯 C ABI。

## 接口

见 [`include/cpp_core.h`](include/cpp_core.h)：

```c
int cpp_init(const char *config_json);
int cpp_deinit(const char *config_json);
```

两个接口都只接收一个 UTF-8 JSON 对象字符串，返回整数状态码。JSON 顶层必须是对象，最大 64 KiB。

## 依赖

JSON 解析使用 RapidJSON，不引入其他 JSON 库，也不在本目录复制第三方源码。

CMake 按以下顺序查找 RapidJSON：

1. 命令行或缓存变量 `RAPIDJSON_INCLUDE_DIR`
2. `SOLDIERS_3RD/rapidjson/include`
3. `SOLDIERS_3RD/rapidjson`
4. `SOLDIERS_3RD/include`
5. 系统默认头文件路径

本机环境变量：

```text
SOLDIERS_3RD=D:\GitResponse\GitHub\ThirdParty
```

后续新增第三方库时，优先使用 `SOLDIERS_3RD` 中已有的库。

## 代码风格

C++ 使用 Allman 大括号风格，所有代码块 `{` 独立成行。仓库根目录的 `.clang-format` 已配置好，可直接执行：

```bash
clang-format -i cpp/include/*.h cpp/src/*.cpp
```

## 构建

### Windows / Visual Studio 2019

双击 `scripts/generate-vs2019.bat` 生成：

```text
cpp/build/electron_cpp_core.sln
```

也可以从项目根目录执行：

```bash
npm run build:native
npm run generate:vs2019
```

VS2019 自带的 CMake 会被自动定位。

### Linux / macOS

```bash
bash scripts/build.sh
```

### 手动 CMake

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
```

如果 CMake 找不到 RapidJSON：

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
  -DRAPIDJSON_INCLUDE_DIR=/path/to/rapidjson/include
```

### 输出

```text
bin/<platform>/<arch>/cpp_core.dll        # Windows
bin/<platform>/<arch>/libcpp_core.so      # Linux
bin/<platform>/<arch>/libcpp_core.dylib   # macOS
```

CMake 会把所有配置（Debug/Release）统一输出到上述目录，方便 Electron 直接加载。

## 测试

在项目根目录执行：

```bash
npm run test:native
```

测试会通过 koffi 加载动态库，并验证成功初始化、重复初始化、反初始化、重复反初始化、非法 JSON 和非法顶层类型六种情况。

## 扩展约定

- 新参数优先加进 JSON 对象，而不是增加新的 C 函数参数。
- 不跨 DLL 边界传递 C++ 对象、异常或 STL 容器。
- 新增导出函数继续使用 `extern "C"` + `CPP_CORE_API`。
- JSON 解析失败、参数错误与内部异常必须映射为状态码，不能抛出到 ABI 外。
