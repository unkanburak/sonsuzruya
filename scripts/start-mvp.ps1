# Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

$ErrorActionPreference = 'Stop'
$installRoot = 'D:\InfiniteAILive'
$projectRoot = Split-Path -Parent $PSScriptRoot

function Test-Endpoint($url) {
  try { return (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
}

if (-not (Test-Endpoint 'http://127.0.0.1:8188/system_stats')) {
  $comfyRoot = Join-Path $installRoot 'ComfyUI_windows_portable'
  Start-Process -FilePath (Join-Path $comfyRoot 'python_embeded\python.exe') `
    -ArgumentList @('-s', (Join-Path $comfyRoot 'ComfyUI\main.py'), '--windows-standalone-build', '--lowvram', '--listen', '127.0.0.1', '--port', '8188', '--disable-auto-launch') `
    -WorkingDirectory $comfyRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $installRoot 'comfy-runtime.log') `
    -RedirectStandardError (Join-Path $installRoot 'comfy-runtime.err.log')
}

if (-not (Test-Endpoint 'http://127.0.0.1:8080/health')) {
  Start-Process -FilePath (Join-Path $installRoot 'llama.cpp\llama-server.exe') `
    -ArgumentList @('-m', (Join-Path $installRoot 'models\qwen\Qwen3-4B-Q4_K_M.gguf'), '--host', '127.0.0.1', '--port', '8080', '--alias', 'qwen3-4b', '--ctx-size', '2048', '--n-gpu-layers', '0', '--threads', '5') `
    -WorkingDirectory (Join-Path $installRoot 'llama.cpp') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $installRoot 'qwen-server.log') `
    -RedirectStandardError (Join-Path $installRoot 'qwen-server.err.log')
}

if (-not (Test-Endpoint 'http://127.0.0.1:3000/health')) {
  Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @('app\server.mjs') -WorkingDirectory $projectRoot `
    -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot 'app-runtime.log') -RedirectStandardError (Join-Path $projectRoot 'app-runtime.err.log')
}

Write-Host 'MVP başlatıldı: http://127.0.0.1:3000'
