@echo off
echo Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo Browser opened! If page is blank, wait a few seconds for server to start.



