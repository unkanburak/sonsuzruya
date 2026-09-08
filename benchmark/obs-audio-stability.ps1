$out = Join-Path (Get-Location) 'benchmark/obs-audio-stability.csv'
"timestamp,obs_cpu_seconds,obs_rss_bytes,node_rss_bytes,sdxl_last_seconds,queue_depth,obs_alive,node_healthy" | Set-Content -LiteralPath $out
for ($i = 0; $i -lt 30; $i++) {
  $now = (Get-Date).ToUniversalTime().ToString('o')
  $obs = Get-Process obs64 -ErrorAction SilentlyContinue | Select-Object -First 1
  $node = Get-Process node -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1
  $last = ''; $queue = ''; $healthy = 'false'
  try { $d = Invoke-RestMethod 'http://127.0.0.1:3000/api/diagnostics' -TimeoutSec 5; $last = [string]$d.recentGenerationTimes[-1]; $queue = [string]($d.queue.running + $d.queue.pending); $healthy = 'true' } catch {}
  $line = '{0},{1},{2},{3},{4},{5},{6},{7}' -f $now, $(if($obs){$obs.CPU}else{''}), $(if($obs){$obs.WorkingSet64}else{''}), $(if($node){$node.WorkingSet64}else{''}), $last, $queue, [bool]$obs, $healthy
  Add-Content -LiteralPath $out -Value $line
  if ($i -lt 29) { Start-Sleep -Seconds 60 }
}
Write-Output "completed=$out"
