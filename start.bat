@echo off
chcp 65001 > nul
setlocal

echo ========================================================
echo   Acoustic Annotator (Praat互換 Webエディション)
echo ========================================================
echo.

:: IPアドレスの取得
for /f "tokens=*" %%i in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress"') do set LOCAL_IP=%%i

echo [起動情報]
echo   PCブラウザ用URL:    http://localhost:3000
echo   iPad / スマホ用URL: http://%LOCAL_IP%:3000
echo.
echo   ※ iPadのSafariで上記URLを開き、
echo      「共有」 -^> 「ホーム画面に追加」を行うと全画面アプリとして快適に利用できます。
echo ========================================================
echo.

echo バックエンド (FastAPI) を起動しています...
start "Acoustic Annotator - Backend" cmd /k "cd /d %~dp0backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo フロントエンド (Next.js) を起動しています...
start "Acoustic Annotator - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo サーバーが起動しました。ブラウザで http://localhost:3000 を開きます...
timeout /t 3 > nul
start http://localhost:3000