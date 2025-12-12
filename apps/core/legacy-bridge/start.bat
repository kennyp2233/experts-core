@echo off
echo Starting Legacy Access Bridge...
cd /d "%~dp0"

if not exist node_modules (
    echo Installing dependencies...
    call yarn install
)

echo Starting server...
call yarn start
paste
