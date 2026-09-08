# IPAdapter / Hafif Reference-Conditioning Feasibility Spike

## Kısa sonuç

**DECISION: KEEP PRODUCTION AS-IS**

Bu spike üretim sistemine dokunmadan, yalnızca yerel kurulum denetimi aşamasında sonlandırıldı. Mevcut ComfyUI kurulumunda IPAdapter node paketi, IPAdapter modeli veya CLIP Vision ağırlığı bulunmadığı için Mode 1–3'ü güvenilir ve tekrarlanabilir biçimde çalıştırmak mümkün değildi. Yeni model/node eklemek bu talebin kapsamı dışındaydı.

## Mevcut kontrol

Mode 0'ın referansı önceki doğrulanmış sonuçtur:

| Mod | Durum | Semantic | Character | World | Warm p50 | Warm p95 |
|---|---|---:|---:|---:|---:|---:|
| Mode 0 — Profile C + Soft Lock | Önceki benchmark | 7/8 | 6/8 | 7/8 | ~2.48 s | ~2.50 s |
| Mode 1 — Very Light Reference | Çalıştırılmadı: bileşen yok | — | — | — | — | — |
| Mode 2 — Light Reference | Çalıştırılmadı: bileşen yok | — | — | — | — | — |
| Mode 3 — Split Reference | Atlandı (opsiyonel) | — | — | — | — | — |

## Teknik audit

Aranan yerel bileşenler:

- `ComfyUI/custom_nodes`: IPAdapter node paketi bulunamadı.
- `ComfyUI/models/ipadapter`: mevcut değil / ağırlık bulunamadı.
- `ComfyUI/models/clip_vision`: yalnızca `put_clip_vision_models_here` placeholder'ı var; kullanılabilir CLIP Vision modeli yok.

Bu nedenle düşük ağırlıklı reference-conditioning workflow'u kurmak için gereken minimum dosyalar yerelde yok. İndirme yapılmadı; yeni framework, model ailesi veya custom node kurulmadı.

## Neden erken sonlandırıldı?

Eksik bileşenlerle yapılan bir deneme gerçek bir A/B testi olmazdı. Ayrıca mevcut production workflow'una geçici node eklemek; state, latency ve fallback davranışını gereksiz yere riske atardı. Bu nedenle semantic adherence, old-scene lock ve latency hakkında uydurma sonuç üretilmedi.

## Korunan kapsam

- SDXL-Lightning Profile C ve Soft Lock üretim adayı aynen korundu.
- Qwen, story-state, voting, frontend, loop motion ve OBS audio değiştirilmedi.
- AnimateDiff kapalı kaldı.
- YouTube/public hosting kapalı kaldı.

## Production güvenlik doğrulaması

- Comfy 8188 `/system_stats`: PASS (HTTP 200)
- Node `/health`: PASS (`ok=true`, `comfy=true`, `qwen=true`)
- Engine: `IMAGE_MOTION`
- YouTube: `false`
- `ANIMATEDIFF_ENABLED`: kapalı/varsayılan
- OBS `obs64`: çalışıyor (PID 26636); audio yapılandırmasına dokunulmadı.

## Gelecek için minimum gereksinim (uygulanmadı)

İnsan onayıyla ayrı bir deney yapılacaksa yalnızca uyumlu bir ComfyUI IPAdapter node paketi, ilgili IPAdapter ağırlığı ve CLIP Vision encoder ağırlığı gerekir. Bunlar kurulmadan Mode 1/2/3 hakkında teknik veya görsel karar verilmemelidir.

**Nihai karar:** `DECISION: KEEP PRODUCTION AS-IS`
