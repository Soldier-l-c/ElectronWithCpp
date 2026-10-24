[CmdletBinding()]
param(
    [switch]$Build,
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',
    [switch]$Open
)

$ErrorActionPreference = 'Stop'
$CppRoot = Split-Path -Parent $PSScriptRoot
$BuildDir = Join-Path $CppRoot 'build'

function Find-VisualStudio2019 {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (Test-Path $vswhere) {
        $installation = & $vswhere -latest -products * -version '[16.0,17.0)' `
            -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
            -property installationPath
        if ($installation) {
            return $installation.Trim()
        }
    }

    $base = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\2019'
    if (Test-Path $base) {
        foreach ($edition in @('Enterprise', 'Professional', 'Community', 'BuildTools')) {
            $candidate = Join-Path $base $edition
            if (Test-Path (Join-Path $candidate 'Common7\IDE\devenv.exe')) {
                return $candidate
            }
        }
    }

    return $null
}

function Find-CMake([string]$VisualStudioPath) {
    $command = Get-Command cmake -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        (Join-Path $VisualStudioPath 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe'),
        'C:\Program Files\CMake\bin\cmake.exe',
        'C:\Program Files (x86)\CMake\bin\cmake.exe'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

$visualStudio = Find-VisualStudio2019
if (-not $visualStudio) {
    throw 'Visual Studio 2019 was not found. Install the "Desktop development with C++" workload.'
}

if (-not (Test-Path (Join-Path $visualStudio 'VC\Tools\MSVC'))) {
    throw 'The Visual Studio 2019 C++ toolchain was not found. Install the "Desktop development with C++" workload.'
}

$cmake = Find-CMake $visualStudio
if (-not $cmake) {
    throw 'CMake was not found. Install CMake 3.16+ or use the CMake bundled with Visual Studio 2019.'
}

Write-Host "Visual Studio : $visualStudio"
Write-Host "CMake         : $cmake"
Write-Host "Source        : $CppRoot"
Write-Host "Build         : $BuildDir"
Write-Host ''

& $cmake -S $CppRoot -B $BuildDir -G 'Visual Studio 16 2019' -A x64
if ($LASTEXITCODE -ne 0) {
    throw "CMake configure failed with exit code $LASTEXITCODE."
}

if ($Build) {
    & $cmake --build $BuildDir --config $Configuration --parallel
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE."
    }
}

$solution = Join-Path $BuildDir 'electron_cpp_core.sln'
if (-not (Test-Path $solution)) {
    throw "The Visual Studio solution was not generated: $solution"
}

Write-Host ''
Write-Host "Visual Studio 2019 solution: $solution"
Write-Host 'Open it with Visual Studio, or run this script with -Build to compile.'

if ($Open) {
    Start-Process (Join-Path $visualStudio 'Common7\IDE\devenv.exe') -ArgumentList "`"$solution`""
}
