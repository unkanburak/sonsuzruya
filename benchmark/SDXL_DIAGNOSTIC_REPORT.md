# SDXL hattı hata teşhisi

Tarih: 29 Ağustos 2026  
AnimateDiff feature flag: `false` (kapalı)

## Bulgular

Başarısız turdaki state promptu aynen kullanıldı:

`A cinematic surreal scene. Carry forward these visual anchors: a luminous portal; a cracked stone bridge; a deep crimson sky. The character is now standing on a misty bridge. Visually clear central subject, atmospheric lighting, no text, no logo.`

Aynı Node `ComfyImageEngine.workflow()` payload’i doğrudan ComfyUI’ye gönderildi.

- Port: `http://127.0.0.1:8188`
- Checkpoint: `sdxl_lightning_4step.safetensors`
- Resolution: 768×448
- Steps/CFG: 4 / 1
- Sampler/scheduler: Euler / `sgm_uniform`
- Prompt id: `2635e51a-8ad7-4172-8342-7d17b3035099`
- HTTP kabul: 200
- Diffusion: başarılı; history’de executed nodes `5` (KSampler) ve `6` (VAE Decode) görünüyor.

## Gerçek exception

Hata node’u: **8 — SaveImage**  
Exception: **`PermissionError: [Errno 13] Permission denied`**  
Hedef:

`D:\InfiniteAILive\ComfyUI_windows_portable\ComfyUI\output\live\scene_02044_00001_.png`

Comfy traceback `nodes.py`, `save_images()` içindeki `img.save(..., "w+b")` çağrısında oluşuyor. Bu nedenle sorun checkpoint, prompt, KSampler veya VAE değil; çıktı dosyası/yolu yazma erişimi veya dosya kilidi.

## VRAM

Hata history’sinde per-node VRAM telemetrisi yok; bu yüzden geriye dönük peak VRAM iddiası yapılmadı. Aynı teşhis anındaki Comfy `/system_stats` snapshot’ı:

- GPU: RTX 3070 Ti
- Toplam VRAM: 8589410304 bytes (~8 GiB)
- Comfy free VRAM: 799805422 bytes
- NVIDIA snapshot: 7559 MiB used / 459 MiB free

Bu değer hata sonrasındaki snapshot’tır, node peak değeri değildir.

## Sonuç

SDXL hesaplama hattı çalışıyor; kırılma **SaveImage node’unda `output/live` yazma aşamasında**. Node tarafındaki `comfy_execution_error`, Comfy’nin gerçek `PermissionError` ayrıntısını kaybedip genel hata olarak sarmalıyor.

AnimateDiff, Qwen, story-state, timeout veya prompt kalitesi değiştirilmedi. `ANIMATEDIFF_ENABLED=false` olarak bırakıldı. Video feature flag’i SDXL output yazma problemi çözülüp aynı workflow güvenilir biçimde dosya ürettikten sonra açılmalıdır.

## Unique filename / ACL testi

Timestamp + UUID içeren iki benzersiz prefix ile tekrar denendi:

- `output/diagnostic/sdxl_write_...`: `[WinError 5] Erişim engellendi` (klasör oluşturma aşaması)
- `output/live/sdxl_write_...`: `[WinError 5] Erişim engellendi` (dosya yazma aşaması)

Bu nedenle sorun overwrite/aynı filename değildir. `output` ve `output/live` için `A369F\\burak` hesabına Modify ACL uygulandı; teşhis kabuğunun hesabı `A369F\\codexsandboxoffline` olduğundan bu sandbox hesabıyla yapılan probe hâlâ reddediliyor. ComfyUI’nin hangi Windows hesabıyla çalıştığı kesinleştirilip aynı hesaba klasör Modify izni verilmeden yazma testi geçerli hale gelmeyecek.

`ComfyImageEngine` artık her generation’da immutable timestamp/UUID prefix kullanıyor ve Comfy history içindeki node adı, exception ve path bilgisini hata mesajına taşıyor. Eski dosyalar otomatik silinmiyor; cleanup ayrı ve güvenli bir işlem olarak bırakıldı.

## İzin sonrası tekrar testi

Klasör izinleri düzeltildikten sonra aynı SDXL hattı iki kez başarıyla yazdı:

- Doğrudan ComfyUI: prompt id `d88c9801-51ba-4c0a-beb7-bfdae54115d2`, `output/live/permission_retest_1788037332575_00001_.png`, başarı.
- Node `ComfyImageEngine`: `/generated/live/scene_09997_1788037355646_1cbe7fec_00001_.png`, başarı, 14,78 sn.

Böylece payload/port farkı yok; önceki hata Windows klasör erişim izniydi. `ANIMATEDIFF_ENABLED` hâlâ `false`.
