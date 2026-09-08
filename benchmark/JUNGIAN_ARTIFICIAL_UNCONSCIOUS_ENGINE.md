# Jungian Artificial Unconscious Engine — Uygulama ve Doğrulama Raporu

**Tarih:** 31 Ağustos 2026  
**Kapsam:** Mevcut çalışan Infinite AI Live baseline'ı bozmadan, Jung esintili deterministic dream-psyche, collective tendency, compensation, intent memory, recurring-symbol memory, Jung-aware fallback ve küçük TR/EN viewer göstergesinin eklenmesi.

> Bu sistem sanatsal/narrative bir kontrol katmanıdır. İzleyicilerin gerçek bilinçdışı, kişiliği veya ruh sağlığı hakkında ölçüm/teşhis yapmaz. İç metrikler yalnızca rüya yönünü ve seçenek çeşitliliğini yönetir.

## Sonuç özeti

```text
JUNG ENGINE: PASS — davranışsal local/staging doğrulama tamamlandı; narrative human review adayı
ARCHITECTURE: deterministic Node layer + optional Qwen realization
QWEN DEPENDENCY: NO — timeout durumunda engine çalışmaya devam ediyor
QWEN TIMEOUT FALLBACK: PASS
ROUNDS TESTED: 60 deterministic + 50 real local production rounds (final iteration)
CONTEXT VIOLATIONS: 0 (bounded fallback audit)
EXACT RECENT PAIR REPEATS: 0 (12-pair recent memory window)
INTENT REPETITION: bounded intent memory, recent displayed-intent domination prevented
COMPENSATION: PASS
COLLECTIVE TENDENCY: PASS
RECURRING SYMBOL MEMORY: PASS
ARCHETYPAL STATE: PASS
DREAM SERIES: PASS (bounded cycle state)
INFOGRAPHIC: PASS — TR primary, EN secondary; hidden archetypes not exposed
BLACK FRAMES: 0 observed in real local run
STALE MEDIA: 0 observed in real local run
CRASHES: 0 observed in real local run
PERFORMANCE REGRESSION: no deterministic Jung regression; image/loop profile unchanged
FINAL VERDICT: JUNG ENGINE READY FOR HUMAN REVIEW (production baseline preserved)
```

## 1. Mevcut baseline auditı

Uygulama öncesi mevcut Node + Qwen + SDXL-Lightning + loop-motion akışı read-only incelendi.

Tespit edilen riskler:

- `storyState` vardı ancak psyche, collective tendency, intent memory veya recurring-symbol memory yoktu.
- Qwen promptu yalnızca story state ve renderability kurallarını biliyordu; Jungian yönlendirme Node dışında mevcut değildi.
- Qwen timeout olduğunda fallback contextual olsa da psikolojik karşıtlık/compensation bilgisi taşımıyordu.
- Seçenekler için intent ailesi vardı, ancak bounded bir narrative psyche ile birleşmiyordu.
- Viewer'a collective decision yönünü anlatan bir gösterge yoktu.
- Production'ın transactional story commit, bounded media/log/queue, 6 saniyelik voting lifecycle, Profile C, Soft Lock, MP4 loop ve OBS audio katmanları çalışır durumdaydı; bunlara dokunulmadı.

Risk sonucu: Jung katmanı görüntü motoruna veya vote lifecycle'a eklenmemeli; state/options sınırında kalmalıydı. Uygulama bu sınırı koruyor.

## 2. Korunan production baseline

- SDXL-Lightning 4-step FULL, Profile C, `1024×576`
- CFG 1, Euler, `sgm_uniform`
- Soft Lock bounded structured image prompt
- IMAGE_MOTION aktif
- Deterministic MP4 loop + CSS fallback
- Authoritative 6 saniyelik vote countdown
- TR + EN seçenekler, yüzdeler, winner/loser transition
- Existing story-state transaction ve bounded media/state/log cleanup
- Qwen mevcut model ve 8 saniyelik live bütçe
- AnimateDiff: `ANIMATEDIFF_ENABLED=false`
- YouTube/public hosting: kapalı
- Comfy 8188 ve Qwen: private/local
- OBS Ambient Main: değiştirilmedi
- Hostinger DNS/nameserver: değiştirilmedi

## 3. Eklenen deterministic dream engine

Yeni dosya:

- `app/lib/jungian-dream-engine.mjs`

Engine'in bounded state'i:

```json
{
  "dominant_archetypal_field": "shadow",
  "secondary_archetypal_field": "child",
  "tensions": {
    "confrontation_avoidance": 0.5,
    "control_surrender": 0.5,
    "connection_isolation": 0.5,
    "order_chaos": 0.5
  },
  "collective_tendency": {
    "curiosity": 0.5,
    "confrontation": 0.5,
    "avoidance": 0.5,
    "control": 0.5,
    "surrender": 0.5
  },
  "archetypal_pressure": {},
  "compensation_pressure": 0.25,
  "recurring_symbols": [],
  "active_complexes": [],
  "unresolved_motifs": [],
  "intent_memory": [],
  "recent_pairs": [],
  "dream_cycle": { "phase": "exposition", "age": 0 }
}
```

Bounded sınırlar:

- recurring symbols: maksimum 6
- active complexes: maksimum 4
- unresolved motifs: maksimum 4
- intent memory: son 8
- recent option pairs: son 12
- dream cycle age: 256 adımlık bounded döngü (saatler sonra da varyasyonun donmaması için)

Psyche verisi browser state'inde yayınlanmıyor. Viewer yalnızca üç anonim narrative trend görüyor: `MERAK / Curiosity`, `YÜZLEŞME / Confrontation`, `KAÇINMA / Avoidance`.

## 4. Psyche güncelleme mantığı

Her kazanan seçenek bir `intent` üzerinden yorumlanıyor: `approach`, `enter`, `descend`, `follow`, `inspect`, `confront`, `hide`, `listen`, `activate`, `abandon`, `return`, `surrender`, `preserve` veya `observe`.

- Tendency değerleri EMA benzeri yumuşak güncelleniyor; tek oy ani psikolojik sıçrama yaratmıyor.
- Aynı intent art arda baskınlaştığında compensation pressure yükseliyor.
- Archetypal pressure yavaşça kayıyor; baskın ve ikincil alanlar hesaplanıyor.
- Semboller yalnızca option anchor/result içinden seçiliyor, her sahneye zorla eklenmiyor.
- Aynı sembol tekrar görünürse appearance/strength yükseliyor; görünmezse strength decay uygulanıyor.
- 16 turluk yumuşak cycle ile `exposition → development → culmination → lysis` alanı tutuluyor; sonsuz yayın zorla bitirilmiyor.

## 5. Option engine değişiklikleri

Değişen dosyalar:

- `app/lib/options.mjs`
- `app/server.mjs`

Qwen artık şu girdileri alıyor:

- mevcut bounded story state
- pending story state
- bounded dream psyche
- recent displayed options
- candidate continuation direction
- candidate counterpoint direction
- current anchors/objects/hooks

Qwen'in rolü serbest bir hikâye motoru değil: deterministic engine'in verdiği geçerli yönleri kısa, yaratıcı ve renderable TR/EN seçeneğe dönüştürmek.

Beklenen ek metadata:

```json
{
  "option_1_intent": "approach",
  "option_2_intent": "inspect",
  "option_1_psyche_delta": {},
  "option_2_psyche_delta": {},
  "option_1_symbol_delta": [],
  "option_2_symbol_delta": [],
  "option_1_archetypal_role": "continuation",
  "option_2_archetypal_role": "counterpoint"
}
```

Mevcut result-state prompt, state patch, schema, güvenlik, renderability ve displayed-option repetition kontrolleri korunup genişletildi. Qwen çıktısı şema/context gate'ten geçmezse Jung-aware fallback kullanılıyor.

### İkinci iterasyon — davranışsal açıkların kapatılması

İlk denetimde görülen dört risk ayrı ayrı kapatıldı:

- Qwen timeout/bozuk yanıtında yalnızca teknik fallback değil, compensation'a göre seçilen gerçek counterpoint yönü korunuyor.
- Fallback çifti son 8 gösterilen seçeneğin intent'lerine ve son 12 çift hafızasına göre 32 adaya kadar yeniden örnekleniyor; aynı niyetin baskınlaşması cezalandırılıyor.
- Qwen çıktısının kendi `scene_anchors` alanı artık kendisini doğrulayamıyor. Context gate yalnızca active story context + deterministic güvenli yön ile görsel terim kesişimi arıyor; ilgisiz `vast desert` teleportu reddediliyor.
- Basit İngilizce biçim ekleri (`glow/glowing`, `door/doorway`, `room/rooms`) desteklenirken `car/character` gibi substring çakışmaları engelleniyor.

Bu değişiklikler yeni model, yeni agent veya yeni story-state mimarisi eklemeden `app/lib/options.mjs` ve `app/lib/jungian-dream-engine.mjs` içinde kaldı.

## 6. Jung-aware fallback

Qwen yoksa veya timeout olursa artık generic global seçim akışı kullanılmıyor.

Fallback üretimi:

```text
current location
+ scene anchors
+ important objects
+ open hooks
+ recent displayed options
+ recent intent memory
+ compensation pressure
↓
contextual continuation + psychological counterpoint
```

İlk seçenek continuation, ikinci seçenek counterpoint rolü taşıyor. İkisi de mevcut renderable sahne alanından geliyor. Recent pair memory ile son 12 çiftin aynı sıralı çifti yeniden gösterilmiyor; seçenek label'ları mevcut son 8 displayed-option penceresiyle birlikte kontrol ediliyor.

## 7. Transactional production akışı

`closeVote()` içinde:

1. Kazanan seçenek ve psyche metadata alınır.
2. Kazanan state patch'i `pendingStoryState` üzerine uygulanır.
3. Kazanan intent ile `pendingDreamPsyche` oluşturulur.
4. SDXL, mevcut prompt ve mevcut model profiliyle çalışır.
5. Qwen, `pendingStoryState + pendingDreamPsyche` üzerinden bir sonraki seçenekleri paralel hazırlar.
6. SDXL başarılıysa media, story state, psyche ve seçenek çifti birlikte commit edilir.
7. SDXL başarısızsa pending state/psyche/option sonucu active yapılmaz; eski state ve mevcut media korunur, fallback eski active state üzerinden üretilir.
8. Yeni MP4 loop mevcut async/stale-scene guard akışıyla devam eder.

Bu nedenle Jung state'i görüntü başarısız olduğunda hikâyeyi tek taraflı ilerletmez.

## 8. Viewer infographic

Değişen dosyalar:

- `public/index.html`
- `public/app.js`
- `public/style.css`

Eklenen küçük alan:

- `MERAK (Curiosity)`
- `YÜZLEŞME (Confrontation)`
- `KAÇINMA (Avoidance)`

Tasarım kararı:

- küçük, atmospheric, mevcut vote card içine yerleştirildi
- gizli archetype isimleri görünmüyor
- tanı/psikoloji iddiası yok
- yalnızca narrative collective tendency yüzdeleri gösteriliyor
- mobile media query ile dar ekran için küçülüyor

Browser state'e yalnız `collectiveTendency` gönderiliyor; `dreamPsyche`, archetypal fields ve symbol history viewer'a gönderilmiyor.

## 9. 60 turluk deterministic engine testi

Script:

- `benchmark/jungian-engine-60-round.mjs`

Sonuçlar:

| Metrik | Sonuç |
|---|---:|
| Deterministic tur | 60 |
| Continuation/counterpoint rol çifti | 60/60 |
| Context violation | 0 |
| Son 12 pair içinde exact tekrar | 0 |
| Benzersiz label | 40 |
| Deterministic option üretim üst süresi | 5.617 ms |
| Recurring symbol memory | 5 bounded symbol |
| Recent options | 8 |
| Recent events | 6 |
| Intent memory | 8 |
| Symbol memory | 5 |

Not: 40 unique label, 60 turda bounded fallback vocabulary'sinin doğal sonucu; bu ölçüm açık uçlu sınırsız dil iddiası değildir. Ama son displayed-option ve pair pencerelerinde tekrar kontrolü çalışmaktadır.

### Collective tendency scripted sequences

- 8 tekrar confrontation: confrontation **0,628**, compensation **0,736**
- 8 tekrar avoidance: avoidance **0,628**, compensation **0,736**
- 12 mixed seçim: tendency range **0,083**, yani ani osilasyon yok

Bu testler, compensation'ın seçimin aynı yönünde sonsuza kadar gitmek yerine yükseldiğini ve mixed seçimlerde değerlerin dengelendiğini doğruluyor.

### Qwen timeout ve context-gate probe

Ulaşılamayan Qwen endpoint ile test:

- elapsed: yaklaşık **36 ms**
- continuation role: PASS
- counterpoint role: PASS
- iki seçenek distinct: PASS

Ek sahte Qwen testi:

- mevcut sahneden kopuk `vast desert` result-state reddedildi.
- Qwen'in kendi anchor'ı ile kendini geçerli gösterme denemesi reddedildi.
- geçerli `doorway + glowing light` yanıtı kabul edildi.

## 10. 50 gerçek local production turu

Script:

- `benchmark/jungian-live-50-rounds.mjs`

Her tur gerçek Node `/api/debug/vote` üzerinden kilitlendi; SDXL gerçek PNG üretti, state commit edildi ve loop kuyruğa alındı. Test sırasında model, çözünürlük, voting semantiği veya Qwen ayarı değiştirilmedi.

| Metrik | Sonuç |
|---|---:|
| İstenen tur | 50 |
| Başarılı tur | 50/50 |
| Vote rejection | 0 |
| Scene timeout | 0 |
| Generation failures | 0 |
| Loop errors | 0 |
| Stale loop discard | 0 |
| Black frame | 0 gözlendi |
| Queue | 0 running / 0 pending |
| Scene progression | monoton, 8578 → 8628 |
| Story state boyutu | yaklaşık 762–788 byte |
| Serialized state | yaklaşık 8.4–9.1 KB sınıfı |
| Managed media | 24–36 dosya sınıfında bounded |
| Intent domination | 0 |
| Exact recent pair repeat | 0 |
| Qwen/fallback güvenliği | fallback ve context gate ile devam |

Gerçek 50 turun ilk ve son gözlemlerinde seçenekler iki ayrı rol olarak kaldı; result-state/scene progression devam etti. Qwen'in mevcut lokal timeout davranışı nedeniyle fallback birçok turda devreye girdi; Jung yönü fallback içinde kaybolmadı. Son koşuda queue `0 running / 0 pending`, generation failure `0`, loop error `0`, stale loop `0` ve black frame gözlemi `0` oldu. Fallback vocabulary'si bounded olduğu için bazı label'ların geri gelmesi mümkündür; aynı çift ve yakın intent baskınlığı gate ile engellendi.

## 11. Targeted test ve syntax doğrulaması

Çalıştırılan komutlar:

```text
node --test test/*.test.mjs
node --check app/server.mjs
node --check app/lib/options.mjs
node --check app/lib/jungian-dream-engine.mjs
node --check public/app.js
```

Sonuç:

- **34/34 targeted test PASS**
- yeni Jung testleri: **5/5 PASS**
- existing options, vote, story-state ve runtime-hygiene testleri: PASS
- syntax: PASS

`npm test` komutu repository'deki benchmark klasörü altındaki bağımsız deney script'lerini de Node test keşfine dahil edebilir; servislerin kapalı olduğu ortamda bu eski deneyler connection refused ile başarısız olabilir. Bu, Jung testlerinin veya production runtime'ının regresyonu değildir; doğru uygulama doğrulaması `node --test test/*.test.mjs` ile yapılmıştır. Final koşuda bu hedefli komutun sonucu **34/34 PASS**.

## 12. Production health ve final durum

Final ikinci iterasyon doğrulaması:

- `node --test test/*.test.mjs`: **34/34 PASS**
- `node benchmark/jungian-engine-60-round.mjs`: **60/60 rol çifti**, 0 context violation, 0 recent-pair repeat, 0 intent domination; deterministic maksimum **5.617 ms**
- `node benchmark/jungian-live-50-rounds.mjs`: **50/50** gerçek geçiş, 0 generation failure, 0 loop error, 0 stale loop, 0 recent-pair repeat; queue **0/0** (iç denetimde 1 bounded intent warning)
- `benchmark/jungian-visual-observer-50.mjs`: **50/50** gerçek viewer PNG'si benchmark klasörüne yakalandı; görsel zincir [JUNGIAN_50_VISUAL_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_SEQUENCE.png>) olarak insan incelemesine hazırlandı.
- `/api/state` public payload'ında `dreamPsyche` ve `dream_psyche` alanları yok; yalnızca üç anonim collective tendency değeri var.

Yeni kodu yüklemek için yalnız Node process'i güvenli tur sınırında yeniden başlatıldı. Comfy/Qwen yeniden yapılandırılmadı.

Son health gözlemi:

```json
{
  "ok": true,
  "comfy": true,
  "qwen": true,
  "youtube": false,
  "readiness": "ready",
  "phase": "PLAYING_VOTING",
  "engine": "IMAGE_MOTION"
}
```

Final runtime:

- Node: `http://127.0.0.1:3000`
- Comfy: `http://127.0.0.1:8188`
- Qwen: `http://127.0.0.1:8080`
- IMAGE_MOTION: healthy/active
- AnimateDiff: off
- YouTube: off
- Hostinger DNS: unchanged
- OBS Ambient Main: unchanged

## 13. Değişen dosyalar

Yeni:

- `app/lib/jungian-dream-engine.mjs`
- `test/jungian-dream-engine.test.mjs`
- `benchmark/jungian-engine-60-round.mjs`
- `benchmark/jungian-live-50-rounds.mjs`
- `benchmark/JUNGIAN_ARTIFICIAL_UNCONSCIOUS_ENGINE.md`

Güncellenen:

- `app/lib/options.mjs`
- `app/server.mjs`
- `public/index.html`
- `public/app.js`
- `public/style.css`

## 14. Kapsam dışında bırakılanlar

- yeni model veya ağır inference framework
- image model / resolution / steps / sampler değişikliği
- IPAdapter, img2img, ControlNet, LoRA, refiner, upscaler
- AnimateDiff veya video continuation
- frontend redesign veya dashboard
- YouTube OAuth/public launch
- Hostinger DNS değişikliği
- Jungian “12 archetype marketing” modeli
- gerçek psikolojik ölçüm/teşhis iddiası

## 15. Human review için önerilen kontrol

Local browser'da şu üç şeyi izlemek yeterli:

1. Seçeneklerden biri normal continuation, diğeri sahneye bağlı counterpoint gibi hissediyor mu?
2. Compensation yükseldiğinde karşıt yön gerçekten mevcut sahneden mi çıkıyor?
3. 30–50 tur sonra seçenekler hâlâ merak uyandırıyor mu, yoksa fallback vocabulary hissi mi oluşuyor?

Gizli psyche/archetype verisi normal viewer UI'ına bilerek eklenmedi. İnsan review için server log/state trace kullanılmalı.

## Nihai karar

Jungian katman mevcut teknik baseline'ı değiştirmeden uygulanmış ve hem deterministic 60 turda hem gerçek local 50 turda doğrulanmıştır. Core yayın akışı, Profile C, Soft Lock, 6 saniyelik voting, transactional story commit, loop-motion, bounded runtime ve OBS audio korunmuştur.

**Durum:** Local/staging human review için hazır. YouTube veya public production'a otomatik geçirilmedi.
