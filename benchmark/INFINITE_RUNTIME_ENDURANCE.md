# Infinite Runtime Endurance

Test tarihi: 2026-08-30

## Sonuç özeti

| Metrik | Sonuç |
|---|---:|
| Turlar | **300/300** |
| Süre | **4474.5 s (74.6 dk)** |
| Node RAM başlangıç / bitiş / peak | **63.8 / 71.2 / 78.7 MiB** |
| GPU VRAM snapshot başlangıç / bitiş / peak | **6674 / 6735 / 6751 MiB** |
| Yönetilen media dosyası | **36 (sabit pencere)** |
| Loop dosyası | **25 (sabit pencere)** |
| Log boyutu başlangıç / bitiş | **2.80 /  
 | **2.81 / 3.63 s** |
| SDXL p50/p95 — ikinci yarı | **2.84 / 3.63 s** |
| Loop p50/p95 | **0.71 / 0.90 s** |
| Media/loop başarısı | **300/300** |

**RESOURCE LEAK:** NO (ölçülen çalışma setinde sürekli artış yok)

**RESOURCE USAGE PLATEAU:** YES

**INDEFINITE-RUNTIME VERDICT:** **READY (local runtime)**

Bu karar YouTube/public hosting anlamına gelmez; yalnızca mevcut local IMAGE_MOTION çalışma yolunun 300 ardışık turdaki kaynak davranışıdır.

## Uygulanan sınırlar

- Story state: `recent_events` 6, `recent_options` 8, en fazla 3 TTL anchor, 3 hook ve 5 important object.
- State yazımı: geçici dosya + backup + atomik rename; restart’te current, bozuksa `.bak` okunur.
- MediaJanitor: 8 sahnelik aktif pencere; cleanup her 10 turda veya eşik aşımında çalışır. Aktif/fallback medya korunur.
- Loop üretimi: 1 aktif + 1 pending iş; eski pending iş supersede edilir.
- Event log: 5 MiB dosya sınırı ve 3 rotated backup.
- Eski Comfy output/input için startup prune ve yalnızca yönetilen `scene_` / `animatediff_input_` adları temizlenir.

## Kontrol noktaları

| Tur | Node RSS | Sistem RAM kullanımı | GPU VRAM | Media | Loop | Log | Queue | FFmpeg |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 63.8 MiB | 28,823 MiB | 6674 MiB | 21 | 20 | 2,868 KiB | 0 | 0 |
| 75 | 76.1 MiB | 28,194 MiB | 6591 MiB | 36 | 25 | 2,916 KiB | 0 | 0 |
| 150 | 73.7 MiB | 28,165 MiB | 6549 MiB | 36 | 25 | 2,964 KiB | 0 | 0 |
| 225 | 70.0 MiB | 28,403 MiB | 6751 MiB | 36 | 25 | 3,004 KiB | 0 | 0 |
| 300 | 71.2 MiB | 28,862 MiB | 6735 MiB | 36 | 25 | 3,061 KiB | 0 | 0 |

Sistem RAM ve toplam process count makine-geneli ölçümlerdir; başka masaüstü süreçleri nedeniyle küçük dalgalanmalar vardır. FFmpeg çocukları kısa süreli çalışıp temizlendi; snapshot anlarında zombie/kalıcı FFmpeg görülmedi.

## Latency ve güvenilirlik

- 300 turda media HTTP/erişilebilirlik kontrolü **300/300**.
- Loop tamamlanması **300/300**, loop error **0**, stale loop **0**.
- Queue her örnekte boştu; backlog oluşmadı.
- SDXL latency ilk ve ikinci yarıda pratik olarak aynı kaldı. Tek bir **90.63 s** outlier gözlendi; p95’e yansımadı ve kaynakların kalıcı büyümesine yol açmadı.
- Loop render p95 **0.90 s**, maksimum ölçüm **2.00 s**.
- `black frames` bu endurance sürücüsünde PNG/HTTP erişilebilirliği ve boş/bozuk medya açısından **0** gözlendi. Piksel-seviyesi decode sınıflandırması ayrıca yapılmadı.

## Crash-safe restart doğrulaması

300 tur sonrasında Node kontrollü olarak durdurulup aynı `app/server.mjs` komutuyla yeniden başlatıldı.

- `/health`: `ok=true`
- Comfy: reachable
- Qwen: reachable
- engine: `IMAGE_MOTION`
- YouTube: `false`
- Restart sonrası scene: **6554**
- Restart sonrası media path: mevcut son geçerli PNG
- State corruption: **0**

Bu, son geçerli committed state’in restart sonrasında okunabildiğini doğrular. Yarım kalmış üretimin active state’e yazıldığı gözlenmedi.

## Doğrulama notu

İlk deneme, benchmark sürücüsünün 74. tur timeout’u nedeniyle geçersiz olarak durdu ve rapora dahil edilmedi. Kuyruk temizlendikten sonra Node yeniden başlatıldı ve yukarıdaki 300 tur temiz koşuda tamamlandı.

Üretim dosya yolunun yazılabilir runtime output’a yönlendirilmesi ve eski D: output’larının temizlenmesi bu testin ön koşuluydu. Temizlik sırasında eski, yönetilen `scene_*` çıktıları ve eski AnimateDiff input dosyaları kaldırıldı; aktif/fallback medya korunmuştur.

## Final state

- IMAGE_MOTION: **active/healthy**
- Structured prompting: **active**
- Loop motion: **active**
- `ANIMATEDIFF_ENABLED`: **false**
- Production timeout: **10 s**
- YouTube/public access: **off**
- Yeni AI özellikleri veya model değişikliği: **yok**

### Sonuç

300 turluk, yaklaşık 75 dakikalık local soak testinde story/state boyutu, media çalışma seti, queue ve child-process davranışı plato yaptı; generation latency ikinci yarıda kötüleşmedi. Mevcut pipeline local olarak uzun süreli çalışmaya hazır görünüyor. Gerçek 7/24 kararı için ayrıca saatler-günler seviyesinde işletim izlemesi gerekir.
