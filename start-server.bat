@echo off
title Nursify Server
cd /d "%~dp0"
echo Starting Nursify Server with Auto-Restart...
echo.
node node_modules/nodemon/bin/nodemon.js index.js
pause
