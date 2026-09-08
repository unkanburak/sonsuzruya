# LTX Gecikme Teşhisi

Ana uygulamaya hiçbir video motoru bağlanmadı.

## Ortam

- ComfyUI 0.34.0, PyTorch 2.13.0+cu130
- RTX 3070 Ti, 8 GB VRAM
- ComfyUI başlatma: `--lowvram`
- LTX checkpoint: `ltxv-2b-0.9.6-distilled-04-25.safetensors`
- T5 encoder: `t5xxl_fp8_e4m3fn.safetensors`
- 384×224, 81 frame, 24 fps, 2 step, CFG 1, Euler

## Node zamanları

Tek izole text→video işi toplam **177,1 saniye** sürdü. WebSocket `executing` olayları arasındaki farklar yaklaşık node süreleridir:

| Node | İş | Yaklaşık süre |
|---|---|---:|
| 2 | LTX checkpoint yükleme / hazırlama | 3,25 sn |
| 5 | Empty LTX latent | 0,04 sn |
| 8 | LTX scheduler | 0,11 sn |
| 9 | Euler sampler seçimi | 0 sn |
| 1 | T5 CLIPLoader | **84,62 sn** |
| 4 | Negative text encode | 10,65 sn |
| 3 | Positive text encode | 9,28 sn |
| 6 | LTX conditioning | 0 sn |
| 10 | LTX sampler / diffusion | **57,54 sn** |
| 11 | VAE decode | 10,88 sn |
| 12 | WEBP yazma | 0,45 sn |

Node süreleri ComfyUI WebSocket event sınırlarından çıkarılmış yaklaşık değerlerdir; birbirini bekleyen hazırlık süreleri ilgili node aralığına dahildir.

## GPU / CPU / offload gözlemi

- GPU belleği iş öncesi yaklaşık 7,5 GB dolu, boş alan yaklaşık 0,5 GB seviyesine kadar indi.
- Üretim sırasında VRAM yaklaşık 1,2–6,7 GB arasında dalgalandı.
- GPU kullanımı uzun bölümlerde %0–30 aralığında kaldı; kısa diffusion bölümlerinde %70–100 sıçramaları görüldü.
- ComfyUI `--lowvram` ile çalışıyor; bu model parçalarının CPU/GPU arasında offload edilmesine neden oluyor.
- T5 loader açıkça `device: cpu` kullanıyor. Pozitif/negative text encode toplamı yaklaşık 20 saniye, T5 yükleme/hazırlama aralığı yaklaşık 85 saniye.
- Windows işlemci sayacı sandbox izinleri nedeniyle güvenilir CPU yüzdesi döndürmedi; bu yüzden CPU oranı uydurulmadı. CPU darboğazı, açık CPU text-encoder ayarı ve düşük GPU kullanım paterniyle doğrulanıyor.

## Sonuç

384×224 ve yalnızca 2 step ayarında 3,4 saniyelik video üretimi 177 saniye sürdü. Önceki devam testinde iki klip 224,6 ve 249,7 saniye sürmüştü. Bu; oylama tabanlı canlı yayın temposunun yaklaşık iki büyüklük mertebesi dışında.

Muhtemel ana nedenler:

1. 8 GB VRAM nedeniyle `--lowvram` offload.
2. T5XXL encoder’ın CPU’da yüklenmesi ve encode edilmesi.
3. LTX 2B diffusion ve VAE’nin düşük VRAM ortamında parça parça çalışması.

## Wan2.1 1.3B durumu

Yerel ComfyUI model klasöründe Wan2.1 1.3B diffusion modeli, UMT5 encoder ve Wan VAE bulunmuyor. Bu nedenle Wan benchmarkı bu turda çalıştırılamadı; model dosyaları kurulmadan ölçüm üretmek doğru olmaz. ComfyUI’nin resmi Wan akışı 1.3B T2V için diffusion model + UMT5 + VAE ister ve I2V/son-kare akışı ayrı conditioning girdisi kullanır. Ana uygulamaya hiçbir değişiklik yapılmadı. citeturn17search0

Nihai mevcut karar: LTX text→video / son-kare devam yolu canlı MVP’ye bağlanmıyor; image-motion sistemi korunuyor.

Ham ölçüm: `benchmark/ltx-diagnostic-results.json`
