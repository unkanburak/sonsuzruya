# LTX Text→Video Devam Testi

## Test kurulumu

- Model: `ltxv-2b-0.9.6-distilled-04-25.safetensors`
- ComfyUI native LTX workflow
- 384×224, 81 frame, 24 fps (~3.4 saniye çıktı)
- 2 step, CFG 1, Euler
- İlk parça: saf text→video (`EmptyLTXVLatentVideo`)
- İkinci parça: ilk videonun çıkarılan son karesi + yeni text prompt (`LTXVImgToVideo`)
- İlk prompt: karakterin yağmurlu sokağa çıkması
- Devam promptu: karakterin gizemli kırmızı arabaya binmesi

## Ölçüm

| Aşama | Süre | Durum |
|---|---:|---|
| İlk text→video | 224.6 sn | Başarılı |
| Son kare + text devamı | 249.7 sn | Başarılı |

Her iki iş de teknik olarak tamamlandı; ComfyUI hata veya OOM vermedi.

## Görsel gözlem

İlk video karanlık bir geçiş/koridor ve kapı atmosferi üretti. Son karesi devam workflow’una doğru şekilde aktarıldı. Ancak devam promptu “karakter arabada” olmasına rağmen devam klibinin görünen başlangıcında araba net biçimde oluşmadı; önceki karanlık mimari atmosfer sürdü.

Bu, son kare aktarımının çalıştığını fakat modelin yeni result-state aksiyonunu her zaman güçlü biçimde uygulamadığını gösteriyor. Continuity var, ancak prompt uyumu garanti değil.

## Karar

Bu LTX kurulumu video-only canlı yayın için uygun değil. Yaklaşık 4 saniyelik görüntü için 225–250 saniye üretim süresi gerekir; bu, oylama turu temposunun çok uzağında. Son kareden devam tekniği uygulanabilir olsa da mevcut donanım/model kombinasyonunda yayın sürekliliği sağlanamaz.

Önerilen sistem değişmedi: image-motion ana motor olarak kalıyor. LTX text→video + son-kare devam akışı ayrı bir V2/prototip olarak değerlendirilebilir; mevcut yayına bağlanmadı.

Ham ölçüm: `benchmark/ltx-text-video-continuation-results.json`
