$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Acoustic Annotator (Praat Web Edition)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. uv の検出
$uvCmd = "uv"
if (-not (Get-Command "uv" -ErrorAction SilentlyContinue)) {
    $candidates = @(
        "$env:USERPROFILE\.local\bin\uv.exe",
        "$env:LOCALAPPDATA\Programs\uv\uv.exe",
        "$env:APPDATA\uv\uv.exe"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $uvCmd = $cand
            $env:Path = "$([System.IO.Path]::GetDirectoryName($cand));" + $env:Path
            break
        }
    }
}

# 2. node / npm の検出
$npmCmd = "npm"
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\nodejs\npm.cmd") {
        $npmCmd = "C:\Program Files\nodejs\npm.cmd"
        $env:Path = "C:\Program Files\nodejs;" + $env:Path
    }
}

# 3. ローカルIPアドレスの取得
$localIP = "localhost"
try {
    $ipObj = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
             Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
             Select-Object -First 1
    if ($ipObj) {
        $localIP = $ipObj.IPAddress
    }
} catch {
    $localIP = "localhost"
}

Write-Host "[Access URLs]" -ForegroundColor Green
Write-Host "  PC Browser:    http://localhost:3000" -ForegroundColor White
Write-Host "  iPad / Tablet: http://${localIP}:3000" -ForegroundColor White
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = (Resolve-Path "$PSScriptRoot\..").Path
$backendPath = Join-Path $rootPath "apps\annotator\backend"
$frontendPath = Join-Path $rootPath "apps\annotator\frontend"
$backendVenvPython = Join-Path $backendPath ".venv\Scripts\python.exe"

Write-Host "1. Starting Backend (FastAPI with hot-reload)..." -ForegroundColor Yellow
if (Test-Path $backendVenvPython) {
    # 日本語パス等で uv trampoline のパス正規化エラーを防止するため venv python を直接起動
    Start-Process -FilePath $backendVenvPython -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory $backendPath
} else {
    Start-Process -FilePath $uvCmd -ArgumentList "run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory $backendPath
}

Write-Host "2. Starting Frontend (Next.js)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $frontendPath

Write-Host ""
Write-Host "Opening http://localhost:3000 in browser..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "All services started successfully!" -ForegroundColor Cyan
Start-Sleep -Seconds 2