# Sonsuz Sürreal AI Yayını — Tüm Çalışma Sürecinin Master Raporu

**Tarih:** 29–31 Ağustos 2026  
**Kapsam:** Projenin video araştırmalarından mevcut image-motion production adayına, kaynak sertleştirmeden viewer-polish doğrulamasına kadar yapılan tüm ölçümler ve kararlar.  
**Rapor amacı:** Yaklaşık 2,5–3 saatlik kesintisiz çalışma dönemini ve bu döneme ait önceki benchmark sonuçlarını tek dosyada toplamak.

> Bu rapor, kullanıcı tarafından sonradan önerilen Jungian unconscious architecture veya yeni bir hikâye motorunu içermez. O yön ayrı bir sonraki görev olarak bırakılmıştır.

## 1. Nihai ürün fikri

İzleyici, canlı yayındaki sahne için `1` veya `2` seçer. Sistem:

```text
izleyici oyu
  ↓
Qwen seçenek / güvenli fallback
  ↓
winner + result-state
  ↓
SDXL-Lightning görseli
  ↓
başarılı PNG commit
  ↓
statik sahne hemen görünür
  ↓
asenkron lightweight MP4 loop
  ↓
loop hazırsa statikten loop'a güvenli geçiş
  ↓
bir sonraki 6 saniyelik oy turu
```

Ürün hedefi, gerçek semantic video continuation değil; izleyicinin seçimlerinin görsel sonucu net görünen, sonsuza yakın devam edebilen, atmosferik ve güvenli bir interaktif rüya yayınıdır.

## 2. Nihai korunmuş production sınırları

- Ana görüntü modeli: `sdxl_lightning_4step.safetensors`
- Aktif profile: Profile C, `1024×576`, 4 step
- CFG: `1`
- Sampler: `Euler`
- Scheduler: `sgm_uniform`
- Prompt modu: Soft Lock / bounded structured prompting
- Loop motion: lightweight deterministic MP4 zoom/drift
- Voting: kişi başına turda bir oy, yalnızca tam `1` veya `2`
- Vote window: 6 saniye
- Qwen: mevcut model ve mevcut 8 saniyelik güvenlik bütçesi
- Comfy 8188: yalnızca local image generation
- AnimateDiff: `ANIMATEDIFF_ENABLED=false`
- YouTube/public hosting: kapalı
- OBS Ambient Main: bağımsız ve değiştirilmeden korunuyor
- Hostinger DNS/nameserver: değiştirilmedi

## 3. Güvenlik ve kapsam kararları

Hiçbir aşamada aşağıdakiler production'a eklenmedi:

- NSFW, grafik şiddet, suç talimatı, gerçek kişi, marka veya telifli karakter üretimi
- üçüncü taraf müzik veya görüntü
- Vision, ControlNet, IPAdapter, LoRA, refiner, upscaler, img2img production yolu
- AnimateDiff veya başka video modelinin production'a alınması
- public YouTube canlı yayını
- Hostinger DNS kalıcı değişikliği
- serbest kullanıcı promptunun doğrudan modele verilmesi

## 4. Video yönünün araştırılması

### 4.1. LTX teşhisi

LTX-Video 2B Distilled ile 384×224, 81 frame, 2 step test edildi.

- Tek kısa video toplamı: **177,1 saniye**
- T5 loader/preparation: **84,62 saniye**
- Positive/negative text encode toplamı: yaklaşık **20 saniye**
- LTX diffusion: **57,54 saniye**
- VAE decode: **10,88 saniye**
- `--lowvram` ve CPU offload yoğun kullanıldı
- GPU kullanımı uzun bölümlerde düşük, kısa diffusion bölümlerinde yüksek sıçramalıydı

**Karar:** LTX, 3070 Ti 8 GB üzerinde live video temposu için reddedildi. Ana image-motion sistemi korunarak video motoru production'dan çıkarıldı.

Rapor: `benchmark/LTX_DIAGNOSTIC_REPORT.md`

### 4.2. Causal Forcing++ araştırması

Resmî repo/config audit edildi. Teorik olarak frame-wise T2V/I2V ve 1–2 step yaklaşımı ilginç olsa da:

- Windows/3070 Ti için çalışma garantisi yoktu
- ayrı environment ve `flash-attn` gerektiriyordu
- kaynakta UMT5-XXL yükü görüldü; BERT-base varsayımı doğrulanmadı
- checkpoint yalnızca yaklaşık 5,68 GB idi; Wan tabanı ve diğer ağırlıklar ayrıca gerekiyordu

**Karar:** Kurulum sürtünmesi ve belirsizliği nedeniyle production'a bağlanmadı; sonraki test dalı olarak da durduruldu.

Rapor: `benchmark/CAUSAL_FORCING_FEASIBILITY.md`

### 4.3. AnimateDiff-Lightning ilk feasibility spike

İzole 8191 Comfy instance'ında:

- `DreamShaper_8_pruned.safetensors`
- `animatediff_lightning_2step_comfyui.safetensors`
- 384×224
- 16 frame / 8 fps
- 2 step, CFG 1, Euler / `sgm_uniform`

İlk izole ölçüm:

- Araba cold: **14,47 s**
- Tünel warm: **2,50 s**
- Portal warm: **2,17 s**
- Image-conditioned benzeri testler: **5,60–8,47 s**
- OOM: 0

Ancak bu workflow native first-frame I2V değil, latent tekrarına dayalı image-conditioned motion'dı.

Rapor: `benchmark/ANIMATEDIFF_LIGHTNING_REPORT.md`

### 4.4. İki-Comfy routing ve sahte 45 saniye çelişkisi

İlk 45+ saniyelik serinin gerçek inference regression olmadığı tespit edildi:

- istemci timeout olduktan sonra server job çalışmaya devam ediyordu
- sonraki örnekler önceki queue tarafından kirleniyordu
- 8188 ve 8191 arasında yanlış/contested routing yaşandı

Kontrollü tek-job teşhisi:

- AnimateDiff yalnız başına temiz server execution: yaklaşık **16,69 s**
- Önceki 45 s serisi: client timeout + arka planda devam eden queue kirlenmesi

Hard routing kuralları doğrulandı:

- `ComfyImageEngine` yalnız `http://127.0.0.1:8188`
- `AnimateDiffVideoEngine` yalnız `http://127.0.0.1:8191`
- 8191 hazır değilse 8188'e video fallback yok; `motion_unavailable` ve statik image-motion var

### 4.5. Gerçek cache-miss iki-Comfy benchmark

SDXL output permission/path problemi düzeltildi; PNG benzersiz isimle yazılıp AnimateDiff input'una doğrulanarak kopyalandı.

8191 gerçek cache-miss sonuçları:

| Job | Client | Server | Sonuç |
|---:|---:|---:|---|
| 1 cold | 41,00 s | 40,76 s | başarılı |
| 2 warm | 19,42 s | 19,14 s | başarılı |
| 3 warm | 21,60 s | 21,33 s | başarılı |
| 4 warm | 21,41 s | 21,20 s | başarılı |

Warm cache-miss p50 yaklaşık **21,33 s**; ilk job model-load etkiliydi. Bu değer, kısa image-motion'a göre canlı deneyim için zayıftı.

Rapor: `benchmark/REAL_CACHE_MISS_TWO_COMFY_VALIDATION_20260830.md`

### 4.6. Single-stage last-frame I2V denemesi

Amaç: SDXL'i kaldırıp önceki oynanabilir frame + result prompt ile tek aşamada video üretmekti.

AnimateDiff image-conditioned workflow'u 10 transition zincirinde denendi.

- Cold client: **31,46 s**
- Warm client p50: **9,70 s**
- Warm client p95: **22,02 s**
- Warm server p50: **8,47 s**
- Warm server p95: **20,83 s**
- Continuity: 10/10 source composition korunuyordu
- Semantic result-state: **0/10**

Model eski kompozisyonu koruyor fakat “evin içine gir”, “makine aktive oldu”, “oda suyla doldu” gibi yeni sonucu üretmiyordu.

**Karar:** Hikâye I2V motoru olarak reddedildi; yalnız motion enhancer fikrine yön verdi.

Rapor: `benchmark/SINGLE_STAGE_I2V_FEASIBILITY.md`

## 5. Lightweight loop-motion kararı

Video continuation yerine mevcut SDXL PNG'yi canlı göstermek için deterministik bir motion loop tasarlandı:

```text
SDXL PNG
  ↓
FFmpeg H.264 MP4
  ↓
sinusoidal zoom / drift
  ↓
aynı semantic sahne, yeni içerik yok
```

10 temsilî görüntüyle test edildi:

- Liveliness: **10/10 PASS**
- Scene preservation: **10/10 PASS**
- Loop quality: **10/10 PASS**
- Live usability: **10/10 PASS**
- MP4 ortalama render: yaklaşık **1,20 s**
- MP4 p95 render: **1,96 s**
- MP4 ortalama boyut: yaklaşık **58,4 KB**
- WebM: daha küçük fakat daha yavaş; p95 **3,46 s**
- Animated WebP: daha büyük; ortalama yaklaşık **395,5 KB**

**Format kararı:** MP4/H.264, OBS Browser Source uyumluluğu ve hız nedeniyle varsayılan format oldu. GIF production formatı yapılmadı.

Rapor: `benchmark/LOOP_MOTION_FEASIBILITY.md`

## 6. Görüntü modeli araştırması

### 6.1. Z-Image-Turbo bake-off

Z-Image-Turbo W4A8, 8 GB RTX 3070 Ti üzerinde çalıştı ancak canlı ürün eşiğini geçemedi.

- Warm cache-miss p50: **62,67 s**
- Warm p95: **76,57 s**
- OOM: tekrarlı değildi, fakat hız kabul edilemezdi

**Karar:** Yeni model ailesi production'a alınmadı. SDXL-Lightning korunarak kalite ceiling testi yapıldı.

Rapor: `benchmark/IMAGE_ENGINE_BAKEOFF.md`

### 6.2. SDXL-Lightning A/B/C/D quality ceiling

Exclusive GPU erişimi doğrulandı ve dört saf SDXL profili test edildi:

| Profil | Ayar | Warm p50 | Warm p95 | Peak VRAM |
|---|---|---:|---:|---:|
| A | 768×448, 4 step | 3,51 s | 5,35 s | 7514 MiB |
| B | 768×448, 8 step | 2,98 s | 3,20 s | 7545 MiB |
| C | 1024×576, 4 step | 3,00 s | 4,01 s | 7545 MiB |
| D | 1024×576, 8 step | 3,72 s | 3,72 s | 7513 MiB |

12 semantic sahnede:

| Profil | Result-state PASS/PARTIAL/FAIL | Object PASS | Spatial PASS | Major artifact |
|---|---|---:|---:|---:|
| A | 7/2/3 | 7/12 | 6/12 | 0 |
| B | 6/2/4 | 6/12 | 5/12 | 1 minor |
| C | 9/2/1 | 8/12 | 8/12 | 0 |
| D | 8/2/2 | 8/12 | 7/12 | 0 |

İnsan değerlendirmesi sonucunda Profile C seçildi: A'ya yakın hızda, daha yüksek çözünürlük ve daha güçlü semantic sonuç.

Rapor: `benchmark/SDXL_QUALITY_CEILING.md`

### 6.3. A-vs-C blind karşılaştırma

12 eşleştirilmiş çiftte:

- A semantic: **10 PASS / 2 PARTIAL / 0 FAIL**
- C semantic: **11 PASS / 1 PARTIAL / 0 FAIL**
- A artifact: 1 minor
- C artifact: 1 minor
- A latency ref: p50 2,44 s / p95 2,78 s
- C latency ref: p50 2,46 s / p95 2,83 s

Blind subjective winner otomatik seçilmedi; Profile C insan review için staging adayı yapıldı.

Rapor: `benchmark/A_C_FINAL_DECISION.md`

## 7. Continuity çalışmaları

### 7.1. Vanilla / structured / img2img bake-off

Exclusive GPU altında Profile C tabanına yakın çalışma ile:

| Yöntem | Başarı | p50 | p95 | Ana bulgu |
|---|---:|---:|---:|---|
| Vanilla text-only | 12/12 | 2,60 s | 2,84 s | en hızlı p95 sınıfı |
| Structured text | 12/12 | 2,62 s | 2,98 s | en dengeli text adayı |
| img2img 0,30 | 12/12 | 2,38 s | 2,88 s | belirgin scene lock |
| img2img 0,45 | 12/12 | 2,61 s | 3,11 s | scene lock + artifact |

Img2img yöntemleri, önceki görüntüyü fazla koruduğu için reddedildi. Structured text en az zararlı continuity yaklaşımı oldu.

Rapor: `benchmark/CONTINUITY_OPTIMIZATION_BAKEOFF.md`

### 7.2. Structured text 30-turn validation

Bounded yapı:

```text
WORLD
PROTAGONIST
CONTINUITY ANCHORS
PREVIOUS STATE
CURRENT RESULT STATE
MUST SHOW
```

Sonuç:

- Technical success: **30/30**
- Result state: **26 PASS / 3 PARTIAL / 1 FAIL**
- Character: **23 PASS / 6 PARTIAL / 1 FAIL**
- World: **24 PASS / 5 PARTIAL / 1 FAIL**
- Warm p50/p95: **2,45 / 2,81 s**
- Severe scene lock: yok

Kalan sorunlar ağırlıklı olarak SDXL random drift ve ambiguous spatial wording olarak etiketlendi.

Rapor: `benchmark/STRUCTURED_TEXT_30_TURN_VALIDATION.md`

### 7.3. Profile C Soft Lock final text-only test

Test edilen üç metin modu: baseline, soft lock, medium lock.

- Baseline semantic: 7/8 PASS
- Soft semantic: 7/8 PASS
- Medium semantic: 7/8 PASS
- Baseline character: 4/8
- Soft character: 6/8
- Medium character: 6/8
- Eski-scene lock: text modlarında 0/8
- img2img: reddedildi
- Soft warm p50/p95: yaklaşık **2,48 / 2,50 s**
- Medium warm p50/p95: yaklaşık **2,34 / 2,35 s**

**Karar:** Soft Lock, yeni result-state'e öncelik veren sabit protagonist/world/style bilgisiyle seçildi; img2img production'a alınmadı. IPAdapter sonraki ayrı deney olarak değerlendirildi ama production'a alınmadı.

Rapor: `benchmark/PROFILE_C_SOFT_LOCK_FINAL.md`

### 7.4. IPAdapter feasibility

İzole 8194 Comfy instance'ında IPAdapter kurulumu doğrulandı:

- `ComfyUI_IPAdapter_plus`
- `ip-adapter_sdxl_vit-h.safetensors` yaklaşık 666 MB
- CLIP ViT-H yaklaşık 2,35 GB
- Profile C + weight 0,15 smoke başarılı
- İlk gerçek generation: yaklaşık **240,5 s**

**Karar:** Canlı latency eşiğini açıkça geçtiği için IPAdapter continuity adayı elendi. Production Profile C + Soft Lock olarak kaldı.

Rapor: `benchmark/IPADAPTER_INSTALLED_FINAL_TEST.md`

## 8. Production integration: structured prompt + loop motion

Başarılı SDXL generation sonrası:

1. PNG commit edilir.
2. Static image hemen broadcast edilir.
3. Aynı PNG asenkron loop renderer'a verilir.
4. MP4 var, okunabilir ve güncel `sceneId` ise browser'a gönderilir.
5. Loop gecikirse veya hata verirse CSS image-motion devam eder.
6. Eski scene hiçbir zaman yeni scene'in üzerine yazılmaz.

Feature flags:

- `STRUCTURED_PROMPT_ENABLED=true` varsayılan
- `LOOP_MOTION_ENABLED=true` varsayılan
- `ANIMATEDIFF_ENABLED=false`

İlk production integration sonucu:

- 30/30 story progression
- 30/30 loop success
- SDXL p50/p95: 4,23 / 6,05 s
- Loop p50/p95: 0,73 / 0,92 s
- Black frames: 0
- Stale media: 0

Rapor: `benchmark/STRUCTURED_LOOP_PRODUCTION_INTEGRATION.md`

## 9. 50-turn staging soak

Profile C + Soft Lock + loop-motion ile:

- 50/50 SDXL success
- 50/50 loop success
- SDXL p50/p95: **3,49 / 5,81 s**
- Loop p50/p95: **0,74 / 0,94 s**
- Broken/black frames: 0
- Stale media: 0
- Node/Comfy crash: 0
- OOM: 0
- Managed media penceresi bounded

**Karar:** Local public-staging adayı hazır; YouTube/public launch otomatik açılmadı.

Rapor: `benchmark/FINAL_LOCAL_STAGING_SOAK.md`

## 10. Resource hardening ve 300-turn endurance

Sistemin saatlerce açık kalabilmesi için bounded sınırlar doğrulandı:

- Story `recent_events`: 6
- `recent_options`: 8
- TTL anchor: en fazla 3
- Hooks: en fazla 3
- Important objects: en fazla 5
- MediaJanitor: 8 sahnelik aktif pencere
- Loop: 1 aktif + 1 pending
- Event log: 5 MiB + 3 rotated backup
- Comfy history: her 25 tamamlanan işte queue boşsa cleanup
- Atomik state + backup + restart recovery

300-turn endurance:

- Turlar: **300/300**
- Süre: **4474,5 s / 74,6 dakika**
- Node RAM: 63,8 → 71,2 MiB; peak 78,7 MiB
- GPU VRAM snapshot: 6674 → 6735 MiB; peak 6751 MiB
- Managed media: 36 dosyada plato
- Loop dosyası: 25 dosyada plato
- Log: 2,80 → 3,06 MiB
- SDXL ikinci yarı p50/p95: **2,84 / 3,63 s**
- Loop p50/p95: **0,71 / 0,90 s**
- Media/loop success: 300/300
- Resource leak: **NO**
- Resource usage plateau: **YES**
- Restart sonrası state/media recovery: PASS

Rapor: `benchmark/INFINITE_RUNTIME_ENDURANCE.md`

## 11. Bağımsız OBS ambient audio

Audio, Node/Qwen/Comfy'den ayrıldı:

```text
OBS Media Source
  ↓
Ambient Main
  ↓
OBS stream output
```

Asset:

- `assets/audio/ambient_main.wav`
- 90 saniye
- stereo, 44.1 kHz, 16-bit PCM
- tamamen yerel üretilmiş, telifsiz ambient drone/noise

30 dakika stability:

- Process/source stability: PASS
- Loop gap/interruption: 0 gözlenen
- OBS RAM: yaklaşık 158–173 MB
- Kümülatif CPU: yaklaşık 146 CPU-saniyesi
- Görsel pipeline etkisi: gözlenmedi
- Audio source kapanınca Node/Comfy/image-motion devam etti

Rapor: `benchmark/OBS_AUDIO_SYSTEM.md`

## 12. Controlled public staging

Hostinger domain ayarlarına dokunulmadan Cloudflare Quick Tunnel kullanıldı:

```text
cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate
```

Güvenlik sonucu:

- Yalnız Node `localhost:3000` expose edildi.
- Comfy 8188/8191/8192/8194 ve Qwen private kaldı.
- Hostinger nameserver/DNS değişmedi.
- Public HTTPS: PASS
- Public WSS: PASS, 100/100 synthetic connections
- Comfy external exposure: SAFE

Ancak gerçek ikinci cihaz/ikinci ağ kullanıcı testi yapılmadı:

- External real users: 0
- External story turns: 0
- Real browser reconnect: test edilmedi
- Browser playback: bağımsız olarak doğrulanmadı

**Karar:** Teknik tunnel çalışıyor ama public launch için henüz READY ilan edilmedi.

Raporlar: `benchmark/PUBLIC_STAGING_NETWORK_UI_TEST.md`, `benchmark/PUBLIC_STAGING_UI_FIX.md`

## 13. Viewer experience polish

### 13.1. Round/countdown lifecycle

Root cause: Restart sonrası bazı turlarda `closesAt` yoktu; timer turu hemen kapatıp sistem kendi kendine seçim yapıyor gibi görünüyordu.

Çözümler:

- `roundId`
- authoritative `openedAt`
- authoritative `closesAt`
- deadline tabanlı `secondsLeft`
- startup warm-up'ın oylamadan ayrılması
- readiness tamamlanmadan ilk oylamanın açılmaması
- phase-guarded `closeVote()`
- oy yokluğu/eşitlik için açık random etiketi

30 tur final lifecycle regression:

- 30/30 sequential
- 30/30 iki seçenek yayınlandı
- Tüm gözlenen pencereler: **6000 ms**
- Early close: 0
- Scene skip: 0
- Stale vote leakage: 0
- Crash: 0

### 13.2. Option relevance ve repetition

Qwen timeout olduğunda fallback artık global katalogdan rastgele seçilmiyor. Adaylar:

- current location
- scene anchors
- important objects
- open hooks

üzerinden filtreleniyor.

İki seçenek mümkün olduğunca:

- biri doğal ilerleme
- biri kontrollü sürpriz

olarak farklı intent gruplarından seçiliyor.

Final 30 turda:

- Gösterilen label: 62
- Benzersiz label: 37
- Repeat: 25

Önceki 60-round örnekte benzersiz label sayısı 19 idi. Qwen direct local probe yaklaşık 27,2 saniye sürdüğü için 8 saniyelik safety budget altında fallback sık kullanıldı; bu durum gizlenmedi.

### 13.3. Scene transition ve motion

- Yeni image preload/decode edilmeden eski image kaldırılmıyor.
- 650 ms civarı crossfade korunuyor.
- Kısa non-black blink overlay eklendi.
- Loop `sceneId` güncel değilse discard ediliyor.
- `canplay/playing` olmadan video static image'in yerini alamıyor.
- CSS analog grain opacity yaklaşık 0,045'e indirildi.
- Grain animasyonu yaklaşık 1,6 saniyeye yavaşlatıldı; hızlı titreme azaltıldı.
- MP4 loop aynı semantic sahneyi koruyor; yeni eylem uydurmuyor.

### 13.4. UI ve gerçek browser render bulgusu

İlk headless render gerçek bir bug yakaladı:

- `el.sceneNumber` yanlış DOM key'i kullanıyordu.
- Seçenekler güncellenmesine rağmen rüya sayacı `#0`'da kalıyordu.

Düzeltildi:

- `el["scene-number"]` kullanılıyor.
- `new_scene` geldiğinde DOM seçenekleri ile `currentState.options` aynı anda senkronlanıyor.
- Uzun seçenekler mobilde kırılıyor.
- Mobil vote card sabit genişlikte tutuluyor.
- Countdown dairesi garanti edildi.
- Footer/chat paneli viewport dışına taşmıyor.
- Mobil sahne `object-fit: cover` ile siyah bant bırakmıyor.

Gerçek local Chromium render dosyaları:

- `benchmark/UI_AUDIT_1280x720_FIXED.png`
- `benchmark/UI_AUDIT_390x844_FINAL.png`
- `benchmark/UI_AUDIT_390x844_GENERATING.png`

Görsel olarak doğrulananlar:

- İki TR/EN seçenek görünür.
- Countdown görünür.
- `RÜYA #` nonzero ve ilerleyen değeri gösteriyor.
- `SEÇİM AÇIK` ve `AI RÜYA GÖRÜYOR` durumları okunuyor.
- Vote percentages ve barlar görünür.
- Mobil chat ve footer taşmıyor.
- Generation sırasında seçenekler görünür kalıyor.

## 14. Final local test özeti

Final polish kodu ile:

- Targeted tests: **14/14 PASS**
- Final 30-round regression: **30/30**
- Post-fix smoke: **3/3**
- Her round window: **6000 ms**
- Scene sequence: sıralı
- Queue: `0/0`
- Story state: yaklaşık 759–772 byte snapshot sınıfı
- Serialized state: yaklaşık 3,4–3,5 KB
- Loop errors: 0
- Stale loops: 0
- Generation failures: 0
- Comfy history: cleanup sonrası bounded
- Node health: `ok=true`
- Comfy: reachable
- Qwen: reachable
- `IMAGE_MOTION`: active
- YouTube: false

Final generation snapshot'larında ilk/ikinci yarı arasında monoton bozulma görülmedi. Qwen bekleme bütçesi nedeniyle vote submit → next scene toplamı yaklaşık 14,6 saniye olabiliyor; bu, SDXL generation latency'si değil, mevcut Qwen safety beklemesidir.

## 15. Mevcut servis ve dosya durumu

Servisler:

- Node: `http://127.0.0.1:3000`
- Qwen: `http://127.0.0.1:8080`
- Comfy: `http://127.0.0.1:8188`
- AnimateDiff 8191: production akışında kapalı
- YouTube: kapalı

Ana değişiklik dosyaları:

- `app/server.mjs`
- `app/lib/options.mjs`
- `app/lib/comfy-image-engine.mjs`
- `app/lib/loop-motion-engine.mjs`
- `public/app.js`
- `public/index.html`
- `public/style.css`
- `test/runtime-hygiene.test.mjs`
- `benchmark/voting-lifecycle-regression.mjs`

Ana raporlar:

- `benchmark/VIEWER_EXPERIENCE_HARDENING.md`
- `benchmark/STRUCTURED_LOOP_PRODUCTION_INTEGRATION.md`
- `benchmark/INFINITE_RUNTIME_ENDURANCE.md`
- `benchmark/OBS_AUDIO_SYSTEM.md`
- `benchmark/SDXL_QUALITY_CEILING.md`
- `benchmark/PROFILE_C_SOFT_LOCK_FINAL.md`
- `benchmark/LOOP_MOTION_FEASIBILITY.md`
- `benchmark/PUBLIC_STAGING_NETWORK_UI_TEST.md`

## 16. Şu anda çalışan nihai akış

1. Server yeni `roundId` ve 6 saniyelik deadline yayınlar.
2. Browser iki seçeneği, İngilizce alt metni, yüzdeleri ve countdown'ı gösterir.
3. İlk geçerli oy kullanıcı başına bir kez sayılır.
4. Oy yok/eşit ise random sonucu açıkça yazılır.
5. Winner yeşil flash, loser fade alır.
6. Seçenekler generation sırasında gizlenmez; yalnız butonlar disable edilir.
7. Qwen başarısız/yavaşsa contextual safe fallback seçilir.
8. SDXL Soft Lock result-state görseli üretir.
9. PNG başarılıysa state + media transactional commit edilir.
10. Yeni static scene preload/decode sonrası blink/crossfade ile görünür.
11. Loop MP4 asenkron hazırlanır; güncel scene ise oynatılır.
12. Loop yoksa CSS image-motion devam eder.
13. Her 25 Comfy işinde queue boşsa history cleanup yapılır.
14. Sistem bounded state/media/log/queue ile yeni round'a geçer.

## 17. Kalan sınırlamalar

- Qwen lokal direct yanıtı yaklaşık 27,2 saniye; 8 saniyelik budget altında fallback sık kullanılıyor.
- Fallback çeşitliliği güvenli renderable seçenek kümesiyle sınırlı; sonsuz açık uçlu seçenek yalnız Qwen zamanında döndüğünde geliyor.
- Gerçek fiziksel telefon, ikinci gerçek ağ kullanıcısı, gerçek YouTube chat ve OAuth testi yapılmadı.
- Browser canplay/playing telemetry hook'ları kodda var; local headless render static/generating UI'ı doğruladı, gerçek MP4 playing telemetry bağımsız public testte ölçülmedi.
- Subjective “sanat eseri kalitesi” otomatik testle kanıtlanamaz; insan review gerekir.

## 18. Nihai karar

```text
BASE MODEL: SDXL-Lightning 4-step
ACTIVE PROFILE: C / 1024x576
PROMPT MODE: Soft Lock / bounded structured prompting
MOTION: lightweight MP4 loop + CSS fallback
AUDIO: independent OBS Ambient Main
VOTING: 6-second authoritative round lifecycle
LOCAL STABILITY: PASS
300-TURN ENDURANCE: PASS
OPTION RELEVANCE: materially improved
OPTION REPETITION: materially reduced
DREAM COUNTER: fixed and browser-render verified
MOBILE UI: fixed and browser-render verified
ANIMATEDIFF: OFF
YOUTUBE: OFF
HOSTINGER DNS: UNCHANGED
JUNGIAN ARCHITECTURE: NOT INCLUDED
```

**Sonuç:** Sistem artık yalnız “feature eklenmiş prototip” seviyesinde değil; ölçülmüş, fallback'leri tanımlı, statik sahneyi koruyan, bounded kaynak kullanımlı ve gerçek local browser render'ında round/option/countdown davranışı doğrulanmış bir interaktif yayın baseline'ı durumundadır. Yeni konsept veya hikâye mimarisi eklenmeden mevcut polish görevi tamamlanmıştır.
