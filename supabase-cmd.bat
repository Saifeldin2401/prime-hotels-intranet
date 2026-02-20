@echo off
REM Supabase CLI Helper for PHG Connect
REM Usage: supabase-cmd.bat [command] [args...]
REM Example: supabase-cmd.bat migration new my_feature

set "SUPABASE_PATH=%USERPROFILE%\.local\bin"
set "PATH=%SUPABASE_PATH%;%PATH%"

if "%~1"=="" (
    echo Usage: supabase-cmd.bat [command] [args...]
    echo Example: supabase-cmd.bat migration new my_feature
n    echo.
    echo Common commands:
    echo   migration new [name]  - Create new migration
    echo   migration list        - List pending migrations
    echo   db push              - Deploy migrations
    echo   db pull              - Pull schema from cloud
    echo   --version            - Check CLI version
    exit /b 1
)

supabase %*
