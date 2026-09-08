while ($true) {
  while (-not (Test-Path 'benchmark/long-horizon-300-result.json')) { Start-Sleep -Seconds 5 }
  try { $r = Get-Content 'benchmark/long-horizon-300-result.json' -Raw | ConvertFrom-Json } catch { Start-Sleep -Seconds 2; continue }
  if ([int]$r.endScene -ge [int]$r.targetScene -and [int]$r.rows.Count -ge 300) { break }
  Remove-Item -LiteralPath 'benchmark/long-horizon-300-result.json' -Force -ErrorAction SilentlyContinue
  Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'benchmark/continue-long-horizon.mjs' -WorkingDirectory (Get-Location) -WindowStyle Hidden
}
& 'C:\Program Files\nodejs\node.exe' benchmark/sanitize-long-horizon-result.mjs
& 'C:\Program Files\nodejs\node.exe' benchmark/build-long-horizon-report.mjs
& 'C:\Program Files\nodejs\node.exe' benchmark/update-final-report.mjs
