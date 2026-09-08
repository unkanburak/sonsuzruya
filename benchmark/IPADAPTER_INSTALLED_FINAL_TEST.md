# IPAdapter Installed Final Test

## Sonuç

IPADAPTER INSTALL: **PASS (izole benchmark runtime)**

COMPONENTS INSTALLED:

- `ComfyUI_IPAdapter_plus` (benchmark runtime custom node)
- `ip-adapter_sdxl_vit-h.safetensors` (666 MB)
- `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors` (2.35 GB)

BASELINE: Profile C + Soft Lock; önceki kontrol sonucu semantic 7/8, character 6/8, warm p50 yaklaşık 2.48 s.

WEIGHT 0.15: **Smoke generation başarılı**, ancak ilk gerçek üretim yaklaşık **240.5 s** sürdü; tam zincir çalıştırılmadı.

WEIGHT 0.25: Çalıştırılmadı (IPAdapter temel latency gate’inde elendi).

WEIGHT 0.35: Çalıştırılmadı.

BEST MODE: Yok; canlı kullanım için uygun değil.

STAGING CANDIDATE: **NO**

DECISION: **USE PROFILE C + SOFT LOCK**

CONFIDENCE: **HIGH** (latency reddi doğrudan ölçüldü; semantic/continuity zinciri bu nedenle gereksiz yere çalıştırılmadı).

## Teknik kurulum

Test, production 8188’den ayrı 8194 Comfy instance’ında yapıldı. `--base-directory` ve ayrı user/temp/input/output dizinleri kullanıldı. Production custom_nodes veya model klasörüne dosya kopyalanmadı. Production checkpoint/VAE yolları read-only extra model path olarak referanslandı.

Node import doğrulandı: `IPAdapter`, `IPAdapterUnifiedLoader`, `CLIPVisionLoader` ve ilgili düğümler `/object_info` içinde görüldü. İzole Comfy `/system_stats` HTTP 200 verdi.

## Smoke workflow

- SDXL-Lightning 4-step FULL
- 1024×576, CFG 1, Euler, `sgm_uniform`
- Önceki başarılı sahne PNG’si `ref.png` olarak LoadImage ile verildi
- `IPAdapterUnifiedLoader` preset: `STANDARD (medium strength)`
- IPAdapter weight: **0.15**
- weight type: `prompt is more important`
- 4 KSampler step; unique seed `928374`; output `ipadapter_smoke_00001_.png`

Smoke sonucu başarıyla kaydedildi: `benchmark/runtime/ipadapter/output/ipadapter_smoke_00001_.png`.

## Latency ve kaynak gözlemi

İlk smoke üretiminde server logları şu yükleri gösterdi:

- SDXL CLIP: yaklaşık 1560 MB staged
- CLIP Vision ViT-H: yaklaşık 1209 MB staged
- SDXL model: yaklaşık 4896 MB staged
- 4 diffusion adımı tamamlanma süresi: yaklaşık 240.5 s

Bu süre, kabul kriteri olan warm p50 ≤6 s ve canlı ürün sınırı olan ≤8 s’in çok üzerindedir. İlk yükleme/offload maliyeti tek başına bile adayı eliyor; 8 turluk semantic/continuity testi çalıştırmak karar değerini artırmayacaktı. OOM oluşmadı ve smoke başarıyla tamamlandı.

## Test edilmeyen modlar

0.25 ve 0.35 ağırlıkları çalıştırılmadı. Ağırlığı artırmak temel ViT-H/SDXL yükleme maliyetini ortadan kaldırmayacağından, modelin canlı latency gate’ini geçmesi beklenmiyor. Eski-scene lock ve semantic skorları hakkında ölçülmemiş sonuç uydurulmadı.

## Production doğrulaması

- Comfy 8188 `/system_stats`: PASS (HTTP 200)
- Node `/health`: PASS (`ok=true`, `comfy=true`, `qwen=true`)
- `engine`: `IMAGE_MOTION`
- YouTube: `false`
- `ANIMATEDIFF_ENABLED`: kapalı/varsayılan
- OBS Ambient Main: değiştirilmedi
- İzole 8194 Comfy: durduruldu

**DECISION: KEEP PRODUCTION AS-IS** — Profile C + Soft Lock korunuyor; IPAdapter production’a entegre edilmedi.
