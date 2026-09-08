# Sonsuz AI Live — Baştan Sona Kronolojik Test, Karar ve Görsel Arşiv Raporu

**Tarih aralığı:** 29–31 Ağustos 2026  
**Kapsam:** İlk fikir ve MVP karar ağacından; model/video feasibility testleri, image profile seçimi, continuity çalışmaları, loop-motion, audio, runtime hardening, public staging/UI polish ve Jungian Artificial Unconscious Engine uygulamasına kadar bu çalışma döneminde yapılanların kronolojik özeti.  
**Çalışma süresi notu:** Kullanıcının bildirdiği toplam kesintisiz çalışma süresi yaklaşık **3 saat 37 dakika**. Bu dosya, bu oturumdaki sonuçları ve daha önce aynı projede üretilmiş benchmark çıktılarını tek tarih sırasına bağlar.

> Bu rapor bir insan estetik/narrative değerlendirmesinin yerine geçmez. Otomatik testler teknik doğruluğu, süreyi, state ve fallback davranışını ölçer; “iyi rüya/iyi sanat” kararı gereken yerlerde insan review açıkça belirtilmiştir.

## 0. Başlangıç fikri ve dondurulan MVP sınırı

İlk fikir, YouTube canlı chat’inin yalnızca `1` veya `2` yazarak sonsuz bir yapay rüyayı yönlendirmesiydi. Her turda iki seçenek gösterilecek, kazanan seçim yeni sonucu üretecek ve yayın siyah ekrana düşmeden devam edecekti.

İlk planın ana ilkesi sonradan kod ve README seviyesine taşındı:

> **Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.**

Dondurulan temel kararlar:

- yerel Node.js + ComfyUI + Qwen + OBS Browser Source;
- güvenli seçenek doğrulama (NSFW, grafik şiddet, suç/tehlikeli talimat, gerçek kişi, marka ve telifli karakter yok);
- küçük/bounded story state, transactional scene commit ve güvenli fallback;
- gerçek semantic video yerine image-first yayın; yeni görüntü gelene kadar eski/son geçerli sahne korunacak;
- YouTube/OAuth ve Hostinger DNS değişikliği testlerin sonrasına bırakılacak.

## 1. İlk çalışan yerel mimari

Başlangıç akışı:

```text
chat / debug vote
  → Qwen veya güvenli fallback iki seçenek üretir
  → winner + result-state
  → SDXL-Lightning PNG
  → başarılıysa state + medya transactional commit
  → Browser Source statik sahneyi gösterir
  → CSS zoom/pan ile image-motion
```

Korumalı üretim sınırları:

- `ComfyImageEngine` yalnız `http://127.0.0.1:8188`
- Qwen local/private
- `ANIMATEDIFF_ENABLED=false`
- YouTube/public hosting kapalı
- Hostinger nameserver/DNS değiştirilmedi
- OBS Ambient Main sonradan eklendi ve Node/Qwen/Comfy’den bağımsız tutuldu.

## 2. Video yolu feasibility testleri

### 2.1. LTX-Video 2B Distilled — ilk aday

İlk benchmark, diğer UI/Qwen/YouTube işleri kurulmadan önce video kararını vermek için yapıldı. Düşük profil: `384×224`, 81 frame, 2 step.

Gerçek node süreleri:

| Parça | Süre |
|---|---:|
| T5 loader/preparation | ~84,62 s |
| Positive/negative text encode | ~20 s |
| Diffusion | ~57,54 s |
| VAE decode | ~10,88 s |
| Kısa klip toplamı | ~177,1 s |

`--lowvram`/CPU offload yoğun çalıştı; GPU kullanımı diffusion dışındaki bölümlerde düşüktü. **Karar:** 3070 Ti 8 GB’ta canlı yayına yetişmiyor; LTX production video motoru olmaktan çıkarıldı.

Raporlar: [LTX teşhis raporu](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\LTX_DIAGNOSTIC_REPORT.md>), [LTX text/video continuation raporu](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\LTX_TEXT_VIDEO_CONTINUATION_REPORT.md>).

### 2.2. Causal Forcing++ — araştırma dalı olarak durduruldu

Wan tabanı, 1–2 step ve continuation fikri teorik olarak ilgi çekiciydi; ancak Windows/3070 Ti çalıştırılabilirliği, ayrı environment/`flash-attn` sürtünmesi ve gerçek encoder/ağırlık gereksinimi doğrulanmadan production’a bağlanmadı. Yeni ağırlık indirilmedi ve ana sistem değiştirilmedi.

Rapor: [CAUSAL_FORCING_FEASIBILITY.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\CAUSAL_FORCING_FEASIBILITY.md>).

### 2.3. AnimateDiff-Lightning — isolated ve two-Comfy testleri

İlk izole 8191 testinde mevcut DreamShaper + AnimateDiff-Lightning workflow’u kullanıldı: `384×224`, 16 frame, 2 step, Euler/`sgm_uniform`.

İlk spike ölçümleri:

- araba cold: **14,47 s**;
- tünel warm: **2,50 s**;
- portal warm: **2,17 s**;
- image-conditioned benzeri testler: **5,60–8,47 s**;
- OOM: 0.

Bu workflow native first-frame I2V değil, image-conditioned motion yaklaşımıydı. Sonraki gerçek cache-miss testinde 8191’e unique input/seed/prompt ile 4 iş gönderildi:

| İş | Client | Server | Sonuç |
|---:|---:|---:|---|
| cold | 41,00 s | 40,76 s | başarılı |
| warm 1 | 19,42 s | 19,14 s | başarılı |
| warm 2 | 21,60 s | 21,33 s | başarılı |
| warm 3 | 21,41 s | 21,20 s | başarılı |

Warm cache-miss p50 yaklaşık **21,33 s** oldu. İlk 45+ saniyelik serinin bir kısmının gerçek regression değil, client timeout sonrası server queue’nun çalışmaya devam etmesi olduğu ayrıca teşhis edildi. Tek-job temiz execution yaklaşık **16,69 s** idi.

İlk two-Comfy routing testinde AnimateDiff’in yanlışlıkla 8188’e gittiği koşular görüldü; hard routing daha sonra kesinleştirildi:

- SDXL: yalnız 8188;
- AnimateDiff: yalnız 8191;
- 8191 sağlıksızsa 8188’e video fallback yok, statik IMAGE_MOTION devam ediyor.

5-turn integrated video testinde **3/5 video success**, **2/5 static-delay discard**, black frame 0, stale media 0 oldu. Browser `canplay/playing` telemetry’si o aşamada henüz bağımsız doğrulanmamıştı.

Raporlar: [AnimateDiff Lightning](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\ANIMATEDIFF_LIGHTNING_REPORT.md>), [two-Comfy validation](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\REAL_CACHE_MISS_TWO_COMFY_VALIDATION_20260830.md>), [two-Comfy integrated](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\TWO_COMFY_INTEGRATED_VALIDATION.md>).

### 2.4. SaveImage → LoadImage handoff teşhisi

Başarısız SDXL turu aynı workflow/prompt ile doğrudan ComfyUI’de yeniden çalıştırıldı. Diffusion başarılıydı; hata **SaveImage node 8**’deydi:

- exception: `PermissionError: [Errno 13] Permission denied`;
- hedef: `output/live/scene_02044_00001_.png`;
- prompt id: `2635e51a-8ad7-4172-8342-7d17b3035099`;
- KSampler ve VAE Decode executed.

Unique timestamp/UUID filename ve ayrı writable output yolu kullanıldı. ACL/path düzeltmesinden sonra doğrudan Comfy ve Node `ComfyImageEngine` üzerinden yeni PNG yazımı başarılı oldu. AnimateDiff input’una kopyalanan dosya için size `>0` ve decode edilebilir PNG doğrulaması eklendi. Bu helper daha sonra production’da değişmeden korundu.

Rapor: [SDXL_DIAGNOSTIC_REPORT.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\SDXL_DIAGNOSTIC_REPORT.md>).

### 2.5. Single-stage last-frame I2V denemesi

SDXL’i kaldırıp önceki playable frame + yeni result-state prompt ile tek aşamalı AnimateDiff üretme fikri denendi. 10 dönüşümlü zincirde:

- cold client: **31,46 s**;
- warm client p50/p95: **9,70 / 22,02 s**;
- warm server p50/p95: **8,47 / 20,83 s**;
- source composition continuity: **10/10**;
- yeni semantic result-state: **0/10**.

Model eski kompozisyonu koruyor, fakat “içeri gir”, “makineyi çalıştır”, “oda suyla doldu” gibi sonucu üretmiyordu. **Karar:** Hikâye continuation motoru reddedildi; yalnız hafif motion fikrine ilham verdi.

Rapor ve görsel set: [SINGLE_STAGE_I2V_FEASIBILITY.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\SINGLE_STAGE_I2V_FEASIBILITY.md>), [single-stage contact sheet](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\single-stage\contact-sheet.png>).

![Single-stage I2V contact sheet](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\single-stage\contact-sheet.png>)

## 3. Image model / profile seçimi

### 3.1. Z-Image-Turbo W4A8

Z-Image-Turbo’nun 8 GB’ta çalışıp çalışmadığı izole olarak test edildi. Çalıştı, ancak gerçek warm cache-miss p50 yaklaşık **62,67 s**, p95 yaklaşık **76,57 s** oldu. **Karar:** yeni model ailesi canlı MVP için reddedildi; optimizasyon yapılmadı.

Rapor: [IMAGE_ENGINE_BAKEOFF.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\IMAGE_ENGINE_BAKEOFF.md>).

### 3.2. SDXL-Lightning A/B/C/D quality ceiling

Önceki test production Comfy resident kaldığı için invalid olmuştu. Exclusive GPU erişimi sağlanarak dört saf profil tekrar ölçüldü:

| Profil | Ayar | Warm p50 | Warm p95 | Peak VRAM |
|---|---|---:|---:|---:|
| A | 768×448, 4 step | 3,51 s* | 5,35 s* | 7514 MiB |
| B | 768×448, 8 step | 2,98 s | 3,20 s | 7545 MiB |
| C | 1024×576, 4 step | 3,00 s | 4,01 s | 7545 MiB |
| D | 1024×576, 8 step | 3,72 s | 3,72 s | 7513 MiB |

\*A için ayrı A-vs-C eşleşmiş koşuda p50/p95 **2,44 / 2,78 s** görüldü; bu nedenle raporlar test koşulunu ayrıca belirtir.

12 gerçek proje sahnesinde C en güçlü semantic profile çıktı:

- C result-state: **9 PASS / 2 PARTIAL / 1 FAIL**;
- D: 8/2/2;
- A: 7/2/3;
- B: 6/2/4.

12 eşleştirilmiş A-vs-C blind karşılaştırmada:

- A: **10 PASS / 2 PARTIAL / 0 FAIL**;
- C: **11 PASS / 1 PARTIAL / 0 FAIL**;
- A/C artifact count: ikisinde de 1 minor.

İnsan değerlendirmesiyle **C production adayı**, D ise yalnız mutlak kalite adayı olarak kaldı. Üretim otomatik değiştirilmeden staging’de doğrulandı.

Görsel setler:

- [A/B/C/D blind sheet](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\BLIND_QUALITY_CONTACT_SHEET.png>)
- [QUALITY A](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_A.png>) · [QUALITY B](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_B.png>) · [QUALITY C](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_C.png>) · [QUALITY D](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_D.png>)
- [CONTINUITY A](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_A.png>) · [CONTINUITY B](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_B.png>) · [CONTINUITY C](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_C.png>) · [CONTINUITY D](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_D.png>)
- [A-vs-C final blind](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\A_C_FINAL_BLIND_COMPARISON.png>) · [A-vs-C key](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\A_C_FINAL_BLIND_KEY.json>)

![A vs C final blind comparison](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\A_C_FINAL_BLIND_COMPARISON.png>)

## 4. Continuity testleri

### 4.1. Vanilla, structured text ve img2img bake-off

Profile C tabanında aynı 12 transition ile dört yöntem ölçüldü:

| Yöntem | Teknik başarı | p50 | p95 | Sonuç |
|---|---:|---:|---:|---|
| Vanilla text-only | 12/12 | 2,60 s | 2,84 s | hızlı baz |
| Structured text | 12/12 | 2,62 s | 2,98 s | en dengeli text adayı |
| img2img 0,30 | 12/12 | 2,38 s | 2,88 s | old-scene lock |
| img2img 0,45 | 12/12 | 2,61 s | 3,11 s | lock + artifact |

Img2img, yeni result-state’i bastırdığı için production’dan çıkarıldı. Structured text bounded şu bölümleri kullandı: `WORLD`, `PROTAGONIST`, `CONTINUITY ANCHORS`, `PREVIOUS STATE`, `CURRENT RESULT STATE`, `MUST SHOW`.

Görseller:

- [Vanilla sequence](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\VANILLA_SEQUENCE.png>)
- [Structured text sequence](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\STRUCTURED_TEXT_SEQUENCE.png>)
- [img2img 0.30](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\IMG2IMG_030_SEQUENCE.png>)
- [img2img 0.45](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\IMG2IMG_045_SEQUENCE.png>)
- [failure sheet](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\CONTINUITY_FAILURES.png>)

### 4.2. Soft Lock final test

Üç metin modu (baseline, soft lock, medium lock) 8 transition zincirinde karşılaştırıldı:

- baseline semantic: **7/8 PASS**;
- soft semantic: **7/8 PASS**;
- medium semantic: **7/8 PASS**;
- baseline character: **4/8**;
- soft/medium character: **6/8**;
- text modlarında old-scene lock: **0/8**.

**Karar:** Yeni result-state önceliğini koruyan Soft Lock seçildi. Tam previous-composition lock kullanılmadı.

Görseller: [BASELINE_FINAL](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\BASELINE_FINAL.png>), [SOFT_LOCK](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\SOFT_LOCK.png>), [MEDIUM_LOCK](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\MEDIUM_LOCK.png>), [blind comparison](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\BLIND_COMPARISON.png>).

### 4.3. Structured text 30-turn validation

30 gerçek ardışık üretim:

- technical success: **30/30**;
- result-state: **26 PASS / 3 PARTIAL / 1 FAIL**;
- character: **23 PASS / 6 PARTIAL / 1 FAIL**;
- world: **24 PASS / 5 PARTIAL / 1 FAIL**;
- warm p50/p95: **2,45 / 2,81 s**;
- severe scene-lock: yok.

Görsel bütünler: [STRUCTURED_30_TURN_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\STRUCTURED_30_TURN_SEQUENCE.png>), [STRUCTURED_PROBLEM_TURNS.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\STRUCTURED_PROBLEM_TURNS.png>), [VANILLA_30_TURN_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\VANILLA_30_TURN_SEQUENCE.png>), [VANILLA_VS_STRUCTURED_CONTINUITY.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\VANILLA_VS_STRUCTURED_CONTINUITY.png>).

![Structured 30-turn sequence](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\STRUCTURED_30_TURN_SEQUENCE.png>)

### 4.4. IPAdapter son feasibility testi

IPAdapter yalnız izole 8194 Comfy runtime’ına kuruldu; production custom node/model klasörü değiştirilmedi. SDXL ViT-H + CLIP Vision yüküyle weight 0.15 smoke başarılı olsa da ilk gerçek üretim yaklaşık **240,5 s** sürdü. **Karar:** canlı latency gate’i açıkça geçemedi; IPAdapter production’a alınmadı.

Rapor: [IPADAPTER_INSTALLED_FINAL_TEST.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\IPADAPTER_INSTALLED_FINAL_TEST.md>).

## 5. Lightweight MP4 loop-motion

Semantic video continuation reddedilince tek PNG’den ucuz, deterministik “canlılık” katmanı test edildi. Akış:

```text
SDXL PNG → FFmpeg H.264 MP4 → sinusoidal zoom/drift → aynı sahne
```

10 temsilî görselde:

- liveliness: **10/10 PASS**;
- scene preservation: **10/10 PASS**;
- loop quality: **10/10 PASS**;
- live usability: **10/10 PASS**;
- ortalama render: **~1,20 s**;
- p95 render: **~1,96 s**;
- ortalama MP4 boyutu: **~58,4 KB**;
- WebM p95: **3,46 s**;
- animated WebP ortalama: **~395,5 KB**.

**Format kararı:** MP4/H.264; GIF production formatı yapılmadı. Loop yeni semantic olay üretmiyor, yalnız aynı görüntüyü hareketli hissettiriyor.

Görsel setler: [loop-motion raporu](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\LOOP_MOTION_FEASIBILITY.md>), [loop-motion klasörü](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\loop-motion\initial-room_contact.png>), [portal contact](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\loop-motion\i2v-portal_contact.png>), [run2 contact](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\loop-motion\run2-a_contact.png>).

## 6. Profile C staging soak ve production entegrasyonu

Profile C (1024×576, 4 step) Soft Lock ile staging’e alındı; önce 30/30 C soak, sonra 50-turn local staging yapıldı.

### C profile soak

- 30/30 generation;
- 0 fallback;
- 0 broken frame;
- p50/p95: **2,57 / 3,64 s**;
- semantic: **27 PASS / 3 PARTIAL / 0 FAIL**;
- continuity: **23 PASS / 7 PARTIAL / 0 FAIL**.

Görseller: [FULL_C_SOAK_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\c-profile-soak\FULL_C_SOAK_SEQUENCE.png>), [C_SOAK_PROBLEM_TURNS.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\c-profile-soak\C_SOAK_PROBLEM_TURNS.png>).

### Structured prompt + loop production integration

Başarılı PNG commit edilir edilmez statik olarak gösterildi; MP4 loop asenkron üretildi. Loop geç veya hatalıysa CSS IMAGE_MOTION kaldı. `sceneId` stale guard ile eski loop yeni sahnenin üzerine yazamadı.

- 30/30 story progression;
- 30/30 valid loop;
- SDXL p50/p95: **4,23 / 6,05 s** (uzun local integration koşusu);
- loop p50/p95: **0,73 / 0,92 s**;
- black frames: 0;
- stale media: 0.

Rapor: [STRUCTURED_LOOP_PRODUCTION_INTEGRATION.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\STRUCTURED_LOOP_PRODUCTION_INTEGRATION.md>).

### 50-turn local staging soak

- 50/50 SDXL success;
- 50/50 loop success;
- SDXL p50/p95: **3,49 / 5,81 s**;
- loop p50/p95: **0,74 / 0,94 s**;
- black/broken/stale: 0;
- Node/Comfy crash: 0;
- OOM: 0.

Rapor: [FINAL_LOCAL_STAGING_SOAK.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\FINAL_LOCAL_STAGING_SOAK.md>).

## 7. Runtime hardening ve 300-turn endurance

Sistemin saatlerce açık kalabilmesi için bounded story/media/log/queue davranışı uygulandı ve ölçüldü:

- recent events: 6;
- recent options: 8;
- TTL anchor: en fazla 3;
- hooks: 3;
- important objects: 5;
- MediaJanitor: 8 sahnelik pencere;
- loop: 1 aktif + 1 pending;
- Comfy history cleanup: her 25 tamamlanan işte, queue boşken;
- atomik state + backup + restart recovery;
- rotated technical log, bounded story log;
- FFmpeg child/timer/listener birikimi gözlendi ve hata üretilmedi.

Endurance sonucu:

| Metrik | Başlangıç | Bitiş / peak |
|---|---:|---:|
| Tur | — | **300/300** |
| Süre | — | **4474,5 s / 74,6 dk** |
| Node RAM | 63,8 MiB | 71,2 MiB / peak 78,7 MiB |
| GPU VRAM snapshot | 6674 MiB | 6735 MiB / peak 6751 MiB |
| Managed media | sabit pencere | **36 dosya plato** |
| Loop dosyası | sabit pencere | **25 dosya plato** |
| Log | 2,80 MiB | 3,06 MiB |
| SDXL ikinci yarı p50/p95 | — | **2,84 / 3,63 s** |
| Loop p50/p95 | — | **0,71 / 0,90 s** |
| Media/loop success | — | **300/300** |

**RESOURCE LEAK: NO. RESOURCE USAGE PLATEAU: YES. INDEFINITE-RUNTIME VERDICT: READY (local runtime).**

Rapor: [INFINITE_RUNTIME_ENDURANCE.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\INFINITE_RUNTIME_ENDURANCE.md>).

## 8. Bağımsız OBS ambient audio

Node/Qwen/Comfy’den tamamen bağımsız OBS Media Source katmanı kuruldu:

```text
assets/audio/ambient_main.wav
  → OBS Media Source: Ambient Main
  → OBS stream output
```

Asset: 90 saniye, stereo, 44.1 kHz, 16-bit PCM; yerel/prosedürel telifsiz ambient.

30 dakikalık stability test:

- source/process stability: PASS;
- gözlenen audio gap/interruption: 0;
- OBS RAM: yaklaşık 158–173 MB;
- kümülatif CPU: yaklaşık 146 CPU-saniyesi;
- görsel pipeline etkisi: gözlenmedi;
- audio source kontrollü kapanınca Node/Comfy/image-motion devam etti.

Rapor: [OBS_AUDIO_SYSTEM.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\OBS_AUDIO_SYSTEM.md>), [ölçüm CSV](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\obs-audio-stability.csv>).

## 9. Controlled public staging, tunnel ve viewer/UI polish

Domain `burakunkan.com` ve Hostinger DNS/nameserver değiştirilmedi. Yalnızca Node `localhost:3000` Cloudflare Quick Tunnel ile geçici expose edildi:

```text
cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate
```

Comfy 8188/8191/8192/8194 ve Qwen private kaldı. Public HTTPS ve WSS synthetic bağlantı testleri **100/100 PASS** oldu; ancak ikinci fiziksel cihaz/ikinci ağdan gerçek kullanıcı testi yapılmadı.

Başlangıçtaki “seçenekler görünmüyor / sistem kendi seçiyor” problemi için:

- authoritative `roundId`, `openedAt`, `closesAt` eklendi;
- countdown deadline’dan hesaplandı;
- startup warm-up oy penceresinden ayrıldı;
- `closeVote()` phase-guarded yapıldı;
- generation sırasında iki seçenek görünür ve disabled kaldı;
- oy yok/eşit durumunda açık `OY YOK/EŞİT — RASTGELE SEÇİM` etiketi gösterildi;
- winner green flash, loser fade, crossfade ve stale media guard korundu;
- TR+EN seçenek, yüzdeler, chat ve mobil layout doğrulandı.

Regression sonuçları:

- 30-turn lifecycle: **30/30**, her vote window **6000 ms**, early close 0, scene skip 0, stale vote leakage 0;
- final post-fix smoke: **3/3**;
- targeted runtime tests: **14/14 PASS**;
- public synthetic connections: **100/100 PASS**;
- physical phone/browser canplay/playing: bu ortamda bağımsız gözlemlenmedi.

Görsel sıra:

1. [Desktop live](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_1280x720_LIVE.png>)
2. [Desktop voting](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_1280x720_VOTING.png>)
3. [Desktop fixed](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_1280x720_FIXED.png>)
4. [Mobile voting](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_390x844_VOTING_FIXED.png>)
5. [Mobile final](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_390x844_FINAL.png>)
6. [Mobile generating](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_390x844_GENERATING.png>)

Raporlar: [PUBLIC_STAGING_NETWORK_UI_TEST.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\PUBLIC_STAGING_NETWORK_UI_TEST.md>), [PUBLIC_STAGING_UI_FIX.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\PUBLIC_STAGING_UI_FIX.md>), [VIEWER_EXPERIENCE_HARDENING.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\VIEWER_EXPERIENCE_HARDENING.md>), [VOTING_LIFECYCLE_FORENSIC_FIX.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\VOTING_LIFECYCLE_FORENSIC_FIX.md>).

**Public staging kararı:** tunnel teknik olarak çalışıyor ama gerçek mobil/ikinci ağ/reconnect/media playback review yapılmadığı için public launch READY ilan edilmedi.

## 10. Jungian Artificial Unconscious Engine

Bu fazda mevcut production baseline korunarak Node tarafına Jung’dan esinlenen, fakat psikolojik ölçüm/teşhis iddiası taşımayan deterministic anlatı katmanı eklendi.

Korunan baseline:

- Profile C `1024×576`, 4 step, CFG 1, Euler/`sgm_uniform`;
- Soft Lock structured prompt;
- IMAGE_MOTION + lightweight MP4 loop;
- 6 saniyelik authoritative voting;
- bounded state/media/log/queue;
- AnimateDiff false, YouTube false, OBS audio unchanged.

### Eklenen mekanikler

`app/lib/jungian-dream-engine.mjs` içinde:

- bounded `dream_psyche`;
- collective tendency (curiosity, confrontation, avoidance, control, surrender);
- compensation pressure;
- archetypal pressure (görsel stereotype değil, yön/çatışma ağırlığı);
- recurring symbol memory (context, last intent, appearance count, decay);
- intent memory ve recent option-pair memory;
- bounded 256-adımlık dream cycle;
- Qwen başarılıysa Jung-aware realization, Qwen timeout’ta bağımsız deterministic fallback;
- public state’te yalnız anonim trendler, iç psyche detayları browser’a açılmıyor;
- küçük TR+EN collective tendency infografiği.

Kapsamlı state sonsuza büyümüyor: recurring symbols 6, complexes 4, unresolved motifs 4, intent memory 8, recent pairs 12 ile sınırlı.

### Test sırası ve sonuçları

1. `node --test test/*.test.mjs` → **34/34 PASS**.
2. Deterministic 60-round engine trace → **60/60 valid role pairs**, context violations 0, exact recent pair repeat 0, intent domination 0, unique labels 120, max deterministic option time **5,617 ms**, recurring symbols 6.
3. 50-round human-readable trace → unique labels 99, unique locations 12, maximum same-location run 2, exact pair repeat 0, symbol returns 14, multi-context symbols 4, archetypal field changes 7, continuation selections 34, counterpoint selections 16.
4. Path divergence → continuation-heavy ve counterpoint-heavy yollar farklı location/psyche sonuçları verdi; tek rotaya kilitlenmedi.
5. Real local Node → Comfy/Qwen path: **50/50**, generation failure 0, loop error 0, stale loop 0, black frame 0, queue 0/0.
6. Görsel observer: **50/50 PNG** yakalandı; path `%20` hatası düzeltilip gerçek dosya isimleriyle yeniden alındı.

Jung fidelity denetiminin dürüst sonucu:

- **JUNG FIDELITY: PASS WITH EXPLICIT PRODUCT-ABSTRACTION CAVEAT**;
- Jung’un gerçek kolektif bilinçdışını ölçtüğü iddia edilmiyor;
- human review olmadan “tek rüya zihni” estetik sonucu kanıtlanmış sayılmıyor;
- repetition ve context mekanikleri makine testlerinde kontrollü.

Jung görsel bütünleri sırasıyla:

1. [50 tur görsel sequence](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_SEQUENCE.png>)
2. [50 tur annotated sequence](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_ANNOTATED.png>)
3. [50 tur trace JSON](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\jungian-observer-50\trace.json>)
4. [Human review scorecard](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_HUMAN_REVIEW_SCORECARD.md>)

![Jungian 50 visual sequence](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_SEQUENCE.png>)

Raporlar: [JUNGIAN_ARTIFICIAL_UNCONSCIOUS_ENGINE.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_ARTIFICIAL_UNCONSCIOUS_ENGINE.md>), [JUNG_FIDELITY_AND_NARRATIVE_REVIEW.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNG_FIDELITY_AND_NARRATIVE_REVIEW.md>), [JUNGIAN_50_DREAM_TRACE.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_DREAM_TRACE.md>), [JUNGIAN_PATH_DIVERGENCE.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_PATH_DIVERGENCE.md>).

## 11. Fotoğraf bütünlerinin tam kronolojik indeksi

Aşağıdaki sıra, eldeki ana görsel/contact-sheet çıktılarının test sırasını izler. Raw turn PNG’leri ayrıca ilgili klasörlerde tutulur; burada mobil/insan review için hazırlanmış bütünler öne çıkarılmıştır.

| Sıra | Test fazı | Görsel bütün |
|---:|---|---|
| 1 | Single-stage I2V rejected | [single-stage/contact-sheet.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\single-stage\contact-sheet.png>) |
| 2 | SDXL A/B/C/D quality | [BLIND_QUALITY_CONTACT_SHEET.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\BLIND_QUALITY_CONTACT_SHEET.png>) |
| 3 | SDXL A profile | [QUALITY_A.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_A.png>) |
| 4 | SDXL B profile | [QUALITY_B.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_B.png>) |
| 5 | SDXL C profile | [QUALITY_C.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_C.png>) |
| 6 | SDXL D profile | [QUALITY_D.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\QUALITY_D.png>) |
| 7 | SDXL continuity A | [CONTINUITY_A.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_A.png>) |
| 8 | SDXL continuity B | [CONTINUITY_B.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_B.png>) |
| 9 | SDXL continuity C | [CONTINUITY_C.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_C.png>) |
| 10 | SDXL continuity D | [CONTINUITY_D.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\sdxl-quality-ceiling\CONTINUITY_D.png>) |
| 11 | A-vs-C human review | [A_C_FINAL_BLIND_COMPARISON.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\A_C_FINAL_BLIND_COMPARISON.png>) |
| 12 | Continuity bake-off vanilla | [VANILLA_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\VANILLA_SEQUENCE.png>) |
| 13 | Continuity bake-off structured | [STRUCTURED_TEXT_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\STRUCTURED_TEXT_SEQUENCE.png>) |
| 14 | Continuity bake-off img2img .30 | [IMG2IMG_030_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\IMG2IMG_030_SEQUENCE.png>) |
| 15 | Continuity bake-off img2img .45 | [IMG2IMG_045_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\IMG2IMG_045_SEQUENCE.png>) |
| 16 | Continuity failures | [CONTINUITY_FAILURES.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\continuity-bakeoff\CONTINUITY_FAILURES.png>) |
| 17 | Soft-lock baseline | [BASELINE_FINAL.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\BASELINE_FINAL.png>) |
| 18 | Soft-lock mode | [SOFT_LOCK.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\SOFT_LOCK.png>) |
| 19 | Medium-lock mode | [MEDIUM_LOCK.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\MEDIUM_LOCK.png>) |
| 20 | Soft-lock blind | [BLIND_COMPARISON.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\BLIND_COMPARISON.png>) |
| 21 | C profile 30-turn | [FULL_C_SOAK_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\c-profile-soak\FULL_C_SOAK_SEQUENCE.png>) |
| 22 | C problem turns | [C_SOAK_PROBLEM_TURNS.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\c-profile-soak\C_SOAK_PROBLEM_TURNS.png>) |
| 23 | Structured 30-turn | [STRUCTURED_30_TURN_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\STRUCTURED_30_TURN_SEQUENCE.png>) |
| 24 | Structured problem turns | [STRUCTURED_PROBLEM_TURNS.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\STRUCTURED_PROBLEM_TURNS.png>) |
| 25 | Vanilla 30-turn | [VANILLA_30_TURN_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\VANILLA_30_TURN_SEQUENCE.png>) |
| 26 | Vanilla vs structured | [VANILLA_VS_STRUCTURED_CONTINUITY.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\VANILLA_VS_STRUCTURED_CONTINUITY.png>) |
| 27 | Loop motion initial room | [initial-room_contact.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\loop-motion\initial-room_contact.png>) |
| 28 | Loop motion portal | [i2v-portal_contact.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\loop-motion\i2v-portal_contact.png>) |
| 29 | Loop motion run 2 | [run2-a_contact.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\loop-motion\run2-a_contact.png>) |
| 30 | UI desktop fixed | [UI_AUDIT_1280x720_FIXED.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_1280x720_FIXED.png>) |
| 31 | UI mobile final | [UI_AUDIT_390x844_FINAL.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_390x844_FINAL.png>) |
| 32 | UI mobile generating | [UI_AUDIT_390x844_GENERATING.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\UI_AUDIT_390x844_GENERATING.png>) |
| 33 | Jungian 50-turn sequence | [JUNGIAN_50_VISUAL_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_SEQUENCE.png>) |
| 34 | Jungian annotated sequence | [JUNGIAN_50_VISUAL_ANNOTATED.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_ANNOTATED.png>) |

## 12. Son çalışan mimari ve sağlık durumu

Güncel yerel çalışma akışı:

```text
6 sn authoritative vote
  → Qwen Jung-aware seçenek / güvenli contextual fallback
  → Soft Lock structured result-state prompt
  → SDXL-Lightning Profile C (1024×576, 4-step)
  → PNG başarılıysa transactional story/media commit
  → statik görüntü preload/decode sonrası görünür
  → asynchronous 4 sn MP4 zoom/drift loop
  → loop hazır değilse CSS IMAGE_MOTION fallback
  → cleanup/history hygiene
  → yeni voting round
```

Final korunan durum:

- `IMAGE_MOTION`: **active**
- Profile C + Soft Lock: **active/validated**
- lightweight MP4 loop: **active/validated**
- OBS Ambient Main: **active/unchanged**
- `ANIMATEDIFF_ENABLED=false`
- YouTube/public hosting: **off**
- Hostinger DNS/nameserver: **unchanged**
- Comfy/Qwen: **private/local**
- browser countdown/options/winner/loser/crossfade: **implemented and local-render verified**
- runtime resources: **bounded over 300 turns**

Son health snapshot’larında `ok=true`, `readiness=ready`, Comfy/Qwen erişilebilir, engine `IMAGE_MOTION`, queue `0/0`, generation/loop/stale hata sayaçları 0 gözlendi. Jungian final local run: 50/50 başarılı; 0 black frame, 0 stale media, 0 crash.

## 13. Kalan açık noktalar ve dürüst sınırlar

- Gerçek fiziksel telefon ve ikinci mobil ağdan public staging kullanıcı testi yapılmadı.
- Gerçek YouTube OAuth/Live Chat testi yapılmadı; YouTube kapalı tutuldu.
- Browser `canplay/playing` telemetry kodu mevcut olsa da her public koşulda bağımsız gözlem raporlanmadı.
- Qwen direct local yanıtı yaklaşık 27,2 s olabilir; 8 s safety bütçesi aşılınca contextual fallback devreye girer. Bu, güvenlik/continuity katmanını kırmaz ancak açık uçlu seçenek çeşitliliğini sınırlar.
- İnsan estetik/narrative review hâlâ gereklidir. Jungian 50-turn trace makine destekli review materyalidir; bilimsel psikoloji ölçümü değildir.
- Hiçbir yeni model (IPAdapter, ControlNet, img2img, video model, LoRA, refiner, upscaler) production’a eklenmedi.

## 14. Nihai karar özeti

```text
BASE MODEL: SDXL-Lightning 4-step FULL
ACTIVE PROFILE: C / 1024×576
PROMPT: Soft Lock + bounded structured continuity
STORY: bounded transactional state
OPTIONS: Qwen + contextual/Jung-aware deterministic fallback
MOTION: lightweight MP4 zoom/drift + CSS fallback
AUDIO: independent OBS Ambient Main
VOTING: authoritative 6-second round with visible TR/EN options
LOCAL ENDURANCE: 300/300, resource plateau PASS
JUNG ENGINE: 60 deterministic + 50 real local rounds, human review caveat
ANIMATEDIFF: OFF
YOUTUBE: OFF
HOSTINGER DNS: UNCHANGED
PRODUCTION HEALTH: IMAGE_MOTION / ready
```

Bu arşivdeki deneylerin ortak sonucu: yüksek maliyetli semantic video/continuation yolları RTX 3070 Ti canlı temposuna uymadı; buna karşılık Profile C + Soft Lock + statik-first lightweight loop, bounded kaynak kullanımı ve görünür voting lifecycle ile çalışır, ölçülmüş yerel baseline hâline geldi. Yeni bir public rollout veya model değişimi insan review’ı olmadan yapılmadı.
