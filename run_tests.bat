@echo off
rem Runs the Deus test harness (game\js\plugins\UF_Test.js).
rem Usage: run_tests.bat [suite]    e.g. run_tests.bat smoke / selftest / perf
rem Results: game\test_output\results.txt. Exit code 0 = all passed, 1 = failures, 2 = harness problem.
set NODE=node
where node >nul 2>&1 || set NODE="C:\Program Files\nodejs\node.exe"
%NODE% "%~dp0tools\run_tests.js" %*
exit /b %ERRORLEVEL%
