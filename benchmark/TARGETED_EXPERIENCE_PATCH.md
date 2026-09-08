# TARGETED EXPERIENCE PATCH

Tarih: 2026-08-31  (Europe/Istanbul)

## Kök nedenler

- Whole-image `zoompan` MP4 katmanı her sahnede aynı crop/drift davranışını üretiyor ve gözle görülür pumping riski taşıyordu.
- Atmosfer katmanı sahneden bağımsız sürekli sis/noise animasyonuydu; bu da efekt spamı hissi oluşturuyordu.
- WebSocket sunucusu aktif oturum sayısını yayınlamıyordu; yeniden bağlanma/reconnect davranışı gözlemlenemiyordu.
- Fallback seçenekleri güvenli olsa da sınırlı aile/eylem sinyaliyle tekrar tekrar navigation/portal/sis/ışık eksenine dönebiliyordu.

## Değişen dosyalar

- `app/lib/loop-motion-engine.mjs`
- `app/lib/options.mjs`
- `app/server.mjs`
- `public/index.html`
- `public/app.js`
- `public/style.css`
- `benchmark/targeted-option-audit.mjs` (deterministik ölçüm aracı)
- `benchmark/targeted-local-rounds.mjs` (10 tur smoke aracı)

Profile C, SDXL ayarları, Qwen/story-state semantiği, oy lifecycle/countdown, transaction commit/discard, networking erişim sınırı, OBS/YouTube ve audio asset değiştirilmedi.

## Motion: önce / sonra

Önce: 4 saniye / 12 fps MP4 içinde `zoompan` ile yaklaşık %1.8 zoom ve drift.

Sonra: aynı hafif MP4 taşıyıcısı korunuyor; kaynak PNG 1024×576, 4.00 saniye, 12 fps H.264 olarak sabit tekrar ediliyor. Geometriye müdahale yok. FFprobe doğrulaması: `1024x576`, `12 fps`, `4.00 s`.

## Sahne efekt sistemi

`scene-effects` yalnızca tek bir düşük yoğunluklu effect seçiyor: `static`, `fog`, `rain`, `water`, `glow` veya `dark`. Seçim committed prompt/location/anchor/object metninden yapılıyor. Sis, yağmur, su ve glow artık bütün sahnelere bindirilmiyor; static sahne geçerli bir sonuç. Whole-image hareket yok.

## Blink / geçiş

Yeni görüntü preload/decode edildikten sonra, sahne başına bir kez `BLINK_TRIGGERED` tetikleniyor. Eski görüntü blink sırasında korunuyor; yüklenmemiş/boş kare gösterilmiyor. Loop dosyası geç gelirse statik görüntü görünür kalıyor.

## Audio

Ambient bed ve tape cue bağımsız kaldı. Ambient gerçek `audio.play()` promise/event telemetry’siyle, cue ise yalnızca geçerli AudioContext sonrasında ve committed scene başına bir kez deneniyor (`TAPE_CUE_ATTEMPTED` / `TAPE_CUE_PLAYING`). HTTP 200 tek başına playback PASS sayılmadı. Mevcut açık/önceki istemcilerden gelen telemetry’de 109 `play_rejected` görüldü; bu nedenle gerçek cihaz autoplay/gesture kabulü kesinleşmiş değil ve rapordan gizlenmedi.

## Active viewer count

Sunucu, `?session=` ile oturumları Map içinde tutuyor; aynı session reconnect ederse eski socket kapatılıyor. 30 saniyelik ping/pong stale temizliği var ve interval `unref` edildi. `state.activeViewerSessions` ve `viewer_count` olayı authoritative olarak yayınlanıyor. İki ek oturum testi: mevcut 1 istemci varken `3 → 2 → 1` (ek oturumlar kapanınca) gözlendi; runaway count yok.

## Option diversity / contextual fallback

Fallback’e bounded `recent_situation_families` eklendi (8 kayıt): `NAVIGATION`, `ENVIRONMENT_TRANSFORMATION`, `FIGURE_ENCOUNTER`, `OBJECT_EXAMINATION`, `NON_ACTION`, `DISCOVERY`, `MEMORY`, `OBJECT_EXCHANGE` sinyalleri. Dominant aileler cezalandırılıyor, iki seçenek mümkün olduğunda farklı aile/intent seçiyor ve seçim sırası context hash ile döndürülüyor. Eski sabit katalog yalnız güvenli kaynak olarak kaldı.

### 100 deterministic round

- 200 gösterilen seçenek, 46 benzersiz etiket
- family dağılımı: ENVIRONMENT_TRANSFORMATION 55, FIGURE_ENCOUNTER 30, NAVIGATION 33, OBJECT_EXAMINATION 27, DISCOVERY 26, NON_ACTION 25, MEMORY 3, OBJECT_EXCHANGE 1
- navigasyon oranı: %16.5
- maksimum aynı-family koşusu: 2
- güvenlik/renderable grammar ihlali: 0 (8 konservatif lexical warning; bunlar bilinçli atmosfer geçişleriydi)
- exact pair tekrarları: 33/100 (bounded recent_options penceresi nedeniyle; yayın dead-end olmuyor)
- en sık etiketler: `Aralık kapıyı izle` (12), `Arabayı sisli yola çıkar` (11), `Suyun içindeki ışığı izle` (9)

Bu sonuç family çeşitliliğinin arttığını gösteriyor; ancak finite fallback havuzunda uzun zaman aralığında aynı etiketlerin dönmesi kalan sınırlamadır.

## 10 gerçek local tur

- 10/10 SDXL committed scene, yeni image HTTP 200
- 10/10 loop üretimi; `loop_error=0`, `stale=0`, `generation_failed=0`
- loop render tipik ~0.8–1.3 s; 10 tur örneklerinde siyah/bozuk medya görülmedi
- generation uçtan uca örnekleri: 9.3–15.2 s (vote→next scene; 6 s oy penceresi dahil)
- kuyruk: pending 0, loop child 0; test sonunda `/health`: `ok=true, comfy=true, qwen=true, youtube=false, readiness=ready`

## Testler ve gözlem

- Targeted unit suite: **34/34 PASS**
- `node --check`: app/server, options, loop engine, browser JS PASS
- Local 10-round smoke: **10/10 PASS**
- Viewer sessions: **PASS** (server-side 2-session connect/disconnect; gerçek insan sayısı iddia edilmiyor)
- Blink/audio/motion kod telemetry’si mevcut; fiziksel mobil tarayıcı gözlemi bu ortamda doğrulanamadı.

## Sonuç

**PATCH DURUMU: TEKNİK OLARAK PASS / GERÇEK CİHAZ AUDIO-PLAYBACK: BEKLEMEDE**

Zoom pumping kaldırıldı, sahne efektleri sadeleştirildi, blink ve tape cue scene başına bağlandı, viewer count eklendi ve fallback family çeşitliliği yükseldi. Kalan ana konu, finite fallback etiketlerinin saatler içinde tekrarlanması ve açık/mobil istemcilerde autoplay `play_rejected` telemetry’sinin cihaz üzerinde doğrulanmasıdır. Production/Profile C ve IMAGE_MOTION akışı korunmuştur.
