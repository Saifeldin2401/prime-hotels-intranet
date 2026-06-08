@echo off
echo Starting Prime Hotels Intranet...
echo.

cd /d "%~dp0"

if exist ".env" (
    echo Using .env file configuration
) else (
    echo WARNING: No .env file found
)

echo.
echo Starting development server...
echo App will be available at: http://localhost:5173
echo.
echo Login with:
echo   Your Admin credentials
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause


