@echo off
setlocal

REM ============================================================
REM DAO BÁNH QUY - DAILY AUTOMATION
REM Project root:
REM C:\Users\ADMIN\OneDrive\Desktop\auto post playwright - page
REM
REM DAILY FLOW:
REM   1) Check captions.json against currentCampaign.
REM      - If captions are missing or belong to another campaign,
REM        generate-captions.ts is run automatically.
REM      - If captions already match currentCampaign, generation is skipped.
REM   2) prepare-daily-batch.ts
REM   3) post-daily.ts
REM ============================================================

REM This BAT lives in fbpost\
REM Move to project root so the root .env is available.
cd /d "%~dp0.."

if not exist "fbpost\logs" mkdir "fbpost\logs"

set LOG_FILE=fbpost\logs\daily-%date:~10,4%-%date:~4,2%-%date:~7,2%.log

echo.
echo ============================================================
echo START DAILY AUTOMATION
echo %date% %time%
echo ============================================================
echo.

echo [1/3] Checking captions for current campaign...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$config = Get-Content 'fbpost\config\campaign-config.json' -Raw | ConvertFrom-Json; $needGenerate = $true; if (Test-Path 'fbpost\data\captions.json') { try { $captions = Get-Content 'fbpost\data\captions.json' -Raw | ConvertFrom-Json; if ($captions.campaign -eq $config.currentCampaign) { $needGenerate = $false } } catch { $needGenerate = $true } }; Write-Host ('Current campaign: ' + $config.currentCampaign); if ($needGenerate) { Write-Host 'Captions are missing or belong to another campaign. Generating...'; exit 10 } else { Write-Host 'Captions already match current campaign. Skipping generation.'; exit 0 }"

if errorlevel 10 (
    echo.
    echo [INFO] Generating captions for current campaign...
    call npx.cmd tsx fbpost\generate-captions.ts >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        echo.
        echo [ERROR] generate-captions.ts failed.
        echo See: %LOG_FILE%
        echo.
        exit /b 1
    )
    echo.
    echo [OK] Captions generated.
) else if errorlevel 1 (
    echo.
    echo [ERROR] Could not check captions.json.
    echo See: %LOG_FILE%
    echo.
    exit /b 1
) else (
    echo.
    echo [OK] Existing captions match current campaign.
)

echo.
echo [2/3] Preparing today's 25-group batch...
call npx.cmd tsx fbpost\prepare-daily-batch.ts >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] prepare-daily-batch.ts failed.
    echo See: %LOG_FILE%
    echo.
    exit /b 1
)
echo.
echo [OK] Daily batch prepared.
echo.
echo [3/3] Starting Facebook posting...
call npx.cmd tsx fbpost\post-daily.ts >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] post-daily.ts failed.
    echo See: %LOG_FILE%
    echo.
    exit /b 1
)
echo.
echo ============================================================
echo DAILY AUTOMATION FINISHED
echo %date% %time%
echo ============================================================
echo.
echo Log: %LOG_FILE%

endlocal
