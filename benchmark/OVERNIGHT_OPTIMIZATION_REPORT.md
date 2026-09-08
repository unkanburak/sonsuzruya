STATUS: PARTIAL

CURRENT DEFAULT MODE: IMAGE_MOTION

IMAGE_MOTION HEALTH: healthy

VIDEO PLAYBACK: 0 / 3

COLD E2E: N/A (successful Browser playing sample yok)

WARM E2E P50: N/A

WARM E2E P95: N/A

SDXL P50: 2.40 sec (isolated warm, 3 runs)

ANIMATEDIFF P50: 16.21 sec (single AnimateDiff instance, 3 runs)

VIDEO SUCCESS RATE: 0 % (3-round integrated smoke)

FALLBACK SUCCESS RATE: 100 % (3 / 3 integrated smoke)

BLACK FRAMES: 0 observed

STALE VIDEO ERRORS: 0 observed

MAIN BOTTLENECK: AnimateDiff image-conditioned job completion on the main ComfyUI instance; each integrated job exceeded the 10-second timeout. Two-instance contention increased AnimateDiff p95.

BEST OPTIMIZATION FOUND: Correct SDXL→AnimateDiff handoff (real output path, immutable input filename, copy retry, file-size and PNG decode validation) and stale-video protection in the Browser Source.

ALEX REPO IDEAS ADAPTED: Existing last-frame/fallback principle was reinforced; stale media is rejected by scene number and the old static frame remains visible until video `playing`. The reference repo’s RTMP/FAL/Twitch/Python architecture was not copied.

FINAL RECOMMENDATION: STAY IMAGE_MOTION

## 1. Başlangıç durumu

Ana sistem Node.js + ComfyUI + Qwen + OBS Browser Source ile çalışıyordu. `ANIMATEDIFF_ENABLED=false`, YouTube kapalı, varsayılan motor `IMAGE_MOTION` idi. Başlangıç snapshot’ı `benchmark/overnight_snapshot_20260830_004144/` altında kaydedildi.

## 2. Referans audit

`alex-remade/infinte-tv` incelendi. Yüksek değerli ve düşük riskli fikirler: üretim/streaming ayrımı, son oynatılabilir frame ile boşluk doldurma, sınırlı rolling history, generation latency metrikleri ve stale çıktı koruması. FAL/B200/LTX/Twitch, dashboard ve Python pipeline bu donanım/proje için uygulanmadı.

## 3. Benchmarklar

| Test | Koşul | Sonuç |
|---|---|---|
| A | Yalnız SDXL Comfy (8188) | 2.17 / 2.67 / 2.40 sn, 3/3 |
| B | SDXL + idle AnimateDiff Comfy (8191) | 3.12 / 1.87 / 4.49 sn, 3/3 |
| C | Yalnız AnimateDiff Comfy | 8.45 / 16.93 / 16.21 sn, 3/3 |
| D | İki Comfy açık, AnimateDiff | 13.10 / 19.61 / 15.83 sn, 3/3 |

GPU örnekleri A/B’de `nvidia-smi` ile toplandı: SDXL aktif örneklerde yaklaşık 6.5–7.5 GiB kullanım ve %45–100 GPU kullanımı görüldü. C/D’de üç iş başarılı olsa da mevcut kısa script sonuçlarına per-sample GPU telemetrisi eklenmedi; latency farkı ölçüldü, yeni optimizasyon yapılmadı. İki instance açıkken AnimateDiff p95, tek instance’a göre yaklaşık 16.93 → 19.61 sn yükseldi.

## 4. Uygulanan değişiklikler

- `ComfyImageEngine`: gerçek output metadata path’i, immutable timestamp/UUID filename, copy retry ve size/PNG decode doğrulaması.
- `AnimateDiffVideoEngine`: enqueue öncesi aynı input doğrulaması; timeout ve gerçek hata bilgisi.
- Browser Source: video scene-number stale guard; video `playing` olmadan statik görüntüyü kaldırmama.
- Structured event log: `sdxl_image_ready`, `animatediff_start`, `motion_ready`, `motion_discarded`, playback metric.

## 5. Entegre playback smoke

Handoff izin problemi düzeldikten sonra üç turda input snapshot başarıyla oluşturuldu. Ancak 2114–2116 turlarında AnimateDiff job’ları 10 saniyelik timeout’u aştı. Bu yüzden `video file ready` ve `Browser video playing` 0/3 oldu. Statik SDXL sahnesi ve fallback 3/3 korundu.

## 6. Uygulanmayan fikirler

Director/story-rhythm, yeni model, resolution/step tuning, tek-instance production yönlendirmesi, büyük queue, dashboard ve YouTube entegrasyonu uygulanmadı. Video smoke 3/3 geçmediği için warm soak yapılmadı.

## 7. Before/after latency

| Aşama | Önce | Overnight ölçüm |
|---|---:|---:|
| SDXL izole warm | ~15 sn sınıfı | 2.17–2.67 sn (3 benchmark işi) |
| SDXL + idle ikinci Comfy | ölçülmemiş | 1.87–4.49 sn |
| AnimateDiff tek instance | 5.6–8.5 sn önceki spike | 8.45–16.93 sn |
| AnimateDiff iki instance | ölçülmemiş | 13.10–19.61 sn |
| Entegre video E2E | yok | 0/3 video-ready; 10 sn timeout |

Not: Önceki ve overnight işlerinin cache/iş kuyruğu koşulları aynı olmayabilir; bu tablo yön gösterir, tam laboratuvar karşılaştırması değildir.

### Tek-instance sequential spike (aynı Comfy process)

Üç ardışık SDXL → AnimateDiff işi tek 8188 process’inde, Node otomatik üretimi durdurulmuşken çalıştırıldı. Üçü de video dosyası üretti:

| Run | SDXL | AnimateDiff | Toplam | Video |
|---:|---:|---:|---:|---|
| 1 | 31,78 sn | 32,44 sn | 64,22 sn | başarılı |
| 2 | 30,58 sn | 33,32 sn | 63,90 sn | başarılı |
| 3 | 29,30 sn | 33,18 sn | 62,48 sn | başarılı |

Sequential tek-instance warm toplam p50 **63,90 sn**, p95 **64,22 sn**; AnimateDiff p50 **33,18 sn**, p95 **33,32 sn**. Bu, iki process’i birleştirmenin video için yeterli olmadığını; model switch/offload ve toplam ardışık üretimin canlı tempoya uymadığını kesinleştirdi. Ham sonuç: `benchmark/overnight-single-instance-results.json`.

## 8. Bulunan bug’lar ve kalan blocker’lar

- Önceki `SaveImage` PermissionError ACL ile çözüldü.
- SDXL→AnimateDiff handoff’taki sabit/geçersiz input adı çözüldü.
- Kalan blocker: AnimateDiff’in ana ComfyUI’de mevcut profile göre 10 saniyede tamamlanmaması; 16-frame kliplerde gerçek Browser playback’e ulaşamadı.
- Tek Comfy process içinde bile toplam SDXL→AnimateDiff warm p95 yaklaşık 64 sn; bu nedenle tek-instance yönlendirmesi production çözümü olarak seçilmedi.

## 9. Rollback/checkpoint

Başlangıç snapshot’ı: `benchmark/overnight_snapshot_20260830_004144/`. `config.json` içinde AnimateDiff `enabled=false`; ana servis health kontrolü başarılı, YouTube kapalı.

## 10. Sabah manuel yapılacaklar

1. `http://127.0.0.1:3000/` üzerinde IMAGE_MOTION akışını gözle kontrol et.
2. AnimateDiff’i açmadan önce tek Comfy instance ve timeout kararını değerlendir.
3. Video denenecekse yeni model/ayar aramak yerine önce AnimateDiff’in neden 10 saniyeyi aştığını ayrı teşhis et.

## 11. Disk yaşam döngüsü

`output/live` içinde 2.277 dosya ve yaklaşık 873,8 MB tespit edildi. `scripts/cleanup-media.mjs` eklendi; varsayılanı dry-run’dır ve son 200 dosyayı korur. Overnight sırasında silme yapılmadı. Dry-run sonucu 2.077 eski dosyanın yaklaşık 830 MB olduğu görüldü. Aktif/son medya üretim sırasında silinmez; cleanup ayrı zamanda açıkça `--apply` ile çalıştırılmalıdır.
