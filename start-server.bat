@echo off
echo ========================================
echo   MONITIXE Server Launcher
echo ========================================
echo.
echo Starting local web server...
echo.
echo Once started, open your browser to:
echo   http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% == 0 goto :end

REM Try Python 2
python -m SimpleHTTPServer 8000 2>nul
if %errorlevel% == 0 goto :end

REM If Python not found
echo ERROR: Python is not installed or not in PATH
echo.
echo Please install Python from: https://www.python.org/downloads/
echo Or use another method from START_SERVER.md
pause

:end
