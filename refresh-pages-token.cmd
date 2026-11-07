@echo off
setlocal
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\redeploy-pages.ps1" -RefreshToken
set "result=%errorlevel%"
pause
exit /b %result%
