# OBS Audio System

Test tarihi: 2026-08-30

## Sonuç

| Alan | Sonuç |
|---|---|
| AUDIO ARCHITECTURE | OBS Media Source → Ambient Main → stream output |
| OBS SOURCE | `Ambient Main` (`ffmpeg_source`) |
| LOCAL FILE PATH | `assets/audio/ambient_main.wav` |
| LOOP ENABLED | **YES** |
| PLAYBACK STABLE | **YES (30 dakika process/source stability)** |
| AUDIO INTERRUPTION | **0 gözlenen OBS kapanması/restart’ı; loop sınırı boyunca hata yok** |
| VISUAL PIPELINE IMPACT | **NONE observed** |
| FAIL-SAFE | **PASS** |
| RECOMMENDATION | **READY for local OBS use** |

## Asset

`ambient_main.wav` tamamen yerel olarak üretildi; dışarıdan indirilen veya telifli müzik kullanılmadı.

- 90 saniye
- PCM WAV, stereo, 44.1 kHz, 16-bit
- 15,876,044 bytes
- Düşük seviyeli, beat/melodi içermeyen özgün ambient drone/noise dokusu

Bu dosya müzik servisine, Qwen’e, Node’a, ComfyUI’ye veya sahne üretim döngüsüne bağlı değildir.

## OBS yapılandırması

`SonsuzYayin` sahne koleksiyonuna yedeklenmiş kopya üzerinden şu kaynak eklendi:

- Kaynak adı: `Ambient Main`
- Tip: `ffmpeg_source` / Media Source
- Dosya: `C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\assets\audio\ambient_main.wav`
- Loop: açık
- Restart on activate: kapalı; sahne değişimlerinde yeniden başlamaz
- Close when inactive: kapalı
- Başlangıç volume: **0.18** (yaklaşık -14.9 dB), clipping/headroom için düşük tutuldu
- Browser Source ve AI scene kaynaklarından ayrı

Orijinal koleksiyon şu yedeğe alındı:

`%APPDATA%\obs-studio\basic\scenes\SonsuzYayin.json.before-audio-20260830.bak`

## 30 dakika stability testi

Ölçüm dosyası: [obs-audio-stability.csv](C:\Users\burak\OneDrive\Desktop\SONSUZ%20YAYIN\benchmark\obs-audio-stability.csv)

- 30 adet dakikada-bir örnek, yaklaşık 30 dakika
- OBS process’i 30/30 örnekte ayaktaydı (process doğrudan gözlem)
- Node health: 30/30 başarılı
- Görsel akış IMAGE_MOTION olarak kaldı
- Test boyunca SDXL üretim latency’sinde ses katmanına bağlanabilecek bir bozulma gözlenmedi
- OBS RAM doğrudan process snapshot’larında yaklaşık **158–173 MB** bandında kaldı
- OBS CPU düşük kaldı; 30 dakikada yaklaşık **146 CPU-saniyesi** kümülatif değer gözlendi (tek çekirdek karşılığı yaklaşık %0.8)
- OBS loglarında audio source error/restart görülmedi
- 90 saniyelik asset loop sınırı birkaç kez aşıldı; process/source kesintisi gözlenmedi

Collector’ın Windows PowerShell process alanlarında kültür kaynaklı CSV sütun kayması olduğu görüldü; bu nedenle ham CSV’deki process byte sütunları güvenilir metrik olarak kullanılmamalıdır. Stability kararı doğrudan process/health gözlemleri ve OBS log kontrolüne dayanır.

## Fail-safe doğrulaması

OBS process’i kontrollü olarak kapatıldı. Dört saniye sonra:

- Node health: `true`
- Comfy: `true`
- Qwen: `true`
- Engine: `IMAGE_MOTION`
- YouTube: `false`

Yani audio source kapanması görsel sistemi durdurmadı; ses dekoratif ve bağımsız kaldı. OBS aynı profil/sahne koleksiyonuyla tekrar başlatıldı ve process sağlıklı şekilde ayakta.

## Dosyayı değiştirme

Yeni bir telifsiz ambient kullanmak için aynı dosya yolunu koruyarak:

1. OBS’i kapatın veya Media Source’u durdurun.
2. `assets/audio/ambient_main.wav` dosyasını yeni WAV/MP3 ile değiştirin.
3. OBS’te `Ambient Main` kaynağında dosyayı yeniden seçin.
4. Loop açık, restart-on-activate kapalı ve volume yaklaşık 0.18 kalsın.

MP3 kullanılacaksa WAV yerine küçük bir bitrate seçilebilir; runtime CPU farkı beklenmez. Üçüncü taraf/telifli müzik eklemeyin.

## Geleceğe bırakılan hook’lar

İleride ayrı OBS kaynakları olarak `UI SFX` ve `Environment Layer` eklenebilir. Bu testte Qwen tone-state, Node, story-state veya frontend ile audio arasında bağlantı kurulmadı.

## Final state

- IMAGE_MOTION: active/healthy
- Node/Qwen/Comfy: çalışıyor
- Ambient Main: OBS’te bağımsız loop
- AnimateDiff: off
- YouTube/public: off
- AI modelleri ve inference mimarisi: değiştirilmedi
