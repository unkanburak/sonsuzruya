# SDXL exclusive benchmark restore state

Captured: 2026-08-30

- Node service: PID 2160, working directory `C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN`, command `node app/server.mjs` (health `ok=true`, engine `IMAGE_MOTION`).
- Production Comfy: PID 22444, working directory `D:\InfiniteAILive\ComfyUI_windows_portable\ComfyUI`, command line reported by `/system_stats`: `main.py --windows-standalone-build --lowvram --listen 127.0.0.1 --port 8188 --disable-auto-launch --output-directory C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\runtime\comfy8188-output`.
- Production Comfy health: `/system_stats` HTTP 200; SDXL-Lightning 4-step, 768x448, Euler/sgm_uniform, CFG 1.
- Qwen: local service reachable through Node health; separate process not exposed in process list.
- AnimateDiff: no listener on 8191; `ANIMATEDIFF_ENABLED=false` in `config.json`.
- Benchmark ports 8192/8193: not listening before start.
- YouTube: `false`.
- OBS: PID 26636; Ambient Main configuration was left unchanged.
- GPU before isolation: NVIDIA RTX 3070 Ti, Comfy resident and approximately 1.15 GiB free VRAM; this is the pre-stop reference only.

Restoration: stop isolated 8192, start the exact production Comfy command above, restart `node app/server.mjs`, verify `/system_stats`, `/health`, IMAGE_MOTION, Qwen and YouTube=false. Do not alter OBS audio configuration.
