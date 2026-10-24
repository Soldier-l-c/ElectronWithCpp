@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate-vs2019.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%~1"=="" goto end
echo.
pause
:end
exit /b %EXIT_CODE%
