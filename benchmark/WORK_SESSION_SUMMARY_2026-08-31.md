# Sonsuz Sürreal AI Yayını — Çalışma Oturumu Kapsamlı Özeti

**Tarih:** 31 Ağustos 2026  
**Kapsam:** Mevcut polish / option relevance / repetition / UI / audio / transition işinin tamamlanması ve yerel doğrulaması  
**Durum:** Uygulama tamamlandı; üretim sistemi yerel olarak sağlıklı. Jungian unconscious architecture, yeni story-state mimarisi veya yeni model bu oturuma dahil edilmedi.

## 1. Oturumun hedefi ve sınırı

Bu çalışmada amaç, mevcut çalışan sistemi yeni bir ürüne dönüştürmek değil, izleyici gözüyle daha anlaşılır ve daha az rastgele görünen bir canlı döngü oluşturmaktı.

Hedeflenen iyileştirmeler:

- Seçeneklerin mevcut sahne, mekân, anchor ve hook'larla ilişkili olması
- Aynı iki seçeneğin sürekli tekrarlanmaması
- Oylama penceresinin gerçekten görünür ve sabit süreli olması
- Sistem kendi kendine seçim yapıyormuş izleniminin giderilmesi
- Seçeneklerin üretim sırasında ekranda kalması
- Kazanan/kaybeden görsel geri bildiriminin net olması
- Yeni sahneye geçişin siyah ekran yaratmadan yapılması
- Mobil ekranda iki seçeneğin, sayaç ve chat alanının çakışmaması
- Hafif atmosfer/motion katmanının ucuz ve titrek görünmemesi
- Comfy geçmiş metadata'sının sınırsız büyüyerek üretimi yavaşlatmaması
- En az 30 ardışık yerel turla yaşam döngüsünün doğrulanması

Bilinçli olarak yapılmayanlar:

- Jungian unconscious architecture
- Yeni world-state/agent mimarisi
- Vision, IPAdapter, ControlNet, img2img veya yeni model
- Qwen modelinin değiştirilmesi
- Voting semantiğinin değiştirilmesi
- YouTube'un açılması veya public hosting değişikliği
- AnimateDiff'in açılması
- OBS Ambient Main ses yapılandırmasının değiştirilmesi

## 2. Başlangıçta görülen sorunlar

1. Seçenekler bazen ekrana gelmeden tur ilerliyor gibi görünüyordu.
2. Kullanıcı, sistemin oylama beklemeden kendi kendine seçim yaptığı izlenimine kapılabiliyordu.
3. Sayaç bazı durumlarda authoritative state ile eşleşmiyordu.
4. Üretim sırasında seçenek kartı kaybolduğu için kararın sonucu ile üretim arasında görsel bağ zayıflıyordu.
5. Güvenli fallback seçenekleri zaman zaman mevcut sahneden kopuk görünüyordu.
6. Uzun çalışmada Comfy execution history büyüyor, bunun sonucunda kaynak baskısı ve generation latency artıyordu.
7. Full-screen analog grain hızlı/titrek algılanabiliyordu.
8. Mobil yerleşimde vote card, chat ve footer birbirinin üstüne gelebiliyordu.

## 3. Teşhis edilen ana teknik neden

### 3.1. Oylama yaşam döngüsü

Sorunun ana kısmı oylama zamanlayıcısının tek başına bir sayaç gibi davranmasıydı. Gecikmeli WebSocket/state güncellemelerinde yanlış veya erken kapanma izlenimi oluşabiliyordu.

Çözüm olarak her tur için benzersiz `roundId`, authoritative `openedAt` ve authoritative `closesAt` kullanıldı. Sayaç artık `closesAt - currentTime` üzerinden hesaplanıyor. Startup warm-up oylamadan ayrıldı, readiness tamamlanmadan ilk deadline açılmıyor ve `closeVote()` phase-guarded çalışıyor.

### 3.2. Comfy history büyümesi

Uzun yerel testte Comfy history yaklaşık 962 kayıt ve yaklaşık 2 MB metadata seviyesine çıktı. Aynı dönemde RAM/GPU boşluğu azalıyor ve bazı üretimler 20–35 saniyeye çıkıyordu.

Queue gerçekten boşken `POST /history { clear: true }` uygulandığında history yaklaşık 962 kayıttan 1 kayda düştü ve sonraki üretimler yeniden yaklaşık 4 saniye sınıfına döndü. Bu, yavaşlamanın model değişiminden çok biriken geçici metadata/resource baskısıyla ilişkili olduğunu gösterdi.

Kalıcı çözüm: `ComfyImageEngine` her 25 tamamlanmış işte queue'yu kontrol eder; queue boşsa history temizlenir. Cleanup başarısız olsa bile sahne akışı kırılmaz ve aktif iş varken temizlik yapılmaz.

## 4. Uygulanan değişiklikler

### 4.1. Sunucu ve round lifecycle — `app/server.mjs`

- Her oylama turuna `roundId` atandı.
- `openedAt`/`closesAt` state'e yazıldı.
- Sayaç deadline'dan türetilir hale getirildi.
- Startup recovery yeni ve tam bir oylama penceresi açıyor.
- Startup warm-up oylamadan ayrıldı.
- Readiness tamamlanmadan ilk deadline açılmıyor.
- `closeVote()` phase-guarded hale getirildi.
- Üretim sırasında iki seçenek ekranda kalıyor; butonlar yalnızca disable ediliyor.
- Oy yokluğu/eşitlik açıkça `OY YOK/EŞİT — RASTGELE SEÇİM` etiketiyle gösteriliyor.
- Forensic olaylar ve round metrics endpoint'i eklendi.
- Transactional story-state davranışı korundu; başarılı medya olmadan pending state active state'e yazılmıyor.

### 4.2. Seçenek relevance ve tekrar azaltma — `app/lib/options.mjs`

- Fallback artık global rastgele katalogdan seçilmiyor.
- `current_location`, anchors, important objects ve open hooks ile ilgili adaylar önce değerlendiriliyor.
- Bir seçenek doğal ilerleme, diğeri kontrollü sürpriz olacak şekilde intent grupları ayrıştırılıyor.
- Aynı intent grubunun sürekli baskınlaşması engelleniyor.
- Tekrar kontrolü gösterilmiş seçenekler üzerinden yapılıyor.
- Her turdaki iki seçenek `recent_options` bounded penceresine yazılıyor.
- Qwen timeout/bozuk JSON/şema veya grammar ihlalinde güvenli fallback devreye giriyor.
- Fallback kayıtları result-state prompt ve state patch içeriyor.

Eklenen güvenli varyant aileleri: koridor/kapı/merdiven; köprü/sis/ışık; tünel/araba/pencere; portal/ayna/küreler; ağaç/kırmızı gökyüzü/su atmosferi.

Sabit katalog normal içerik kaynağı değil, fail-safe katmanı olarak kalıyor. Qwen başarılı olduğunda açık uçlu çeşitlilik korunuyor.

### 4.3. Comfy resource hygiene — `app/lib/comfy-image-engine.mjs`

- `historyCleanupEvery=25` ve tamamlanmış job sayacı eklendi.
- Queue doluyken cleanup erteleniyor.
- Cleanup hatası generation'ı başarısız kılmıyor.
- Unique output/handoff davranışı korunuyor.
- Model, resolution, step, sampler, CFG ve workflow değiştirilmedi.

### 4.4. Browser/UI — `public/app.js`

Round telemetry olayları eklendi: `WS_STATE_RECEIVED`, `OPTIONS_RENDERED`, `COUNTDOWN_VISIBLE`, `VOTING_UI_INTERACTIVE`, `USER_CLICK`, `VOTE_ACK`, `VOTE_REJECTED`, `VOTE_LOCK_UI`, `GENERATING_UI`, `NEW_MEDIA_VISIBLE`.

- Seçenek kartı generation sırasında gizlenmiyor.
- Butonlar disable edilse de iki seçenek görünür kalıyor.
- Oy yüzdeleri ve barlar korunuyor.
- Kazanan flash/kaybeden fade korunuyor.
- Yeni medya preload/decode edilmeden eski görüntü kaldırılmıyor.
- Yeni scene transition'da kısa blink overlay kullanılıyor.
- Loop-motion `sceneId` stale guard ile korunuyor.
- `loadstart`, `loadedmetadata`, `canplay`, `playing`, `play_resolved`, `play_rejected`, `error`, `ended` olayları loglanıyor.
- `play()` başarısızsa statik image-motion korunuyor.
- WebAudio cue yalnızca kullanıcı gesture'ı sonrasında deneniyor ve autoplay engelinde sessizce kapanıyor.
- Late/stale loop yeni sahnenin üzerine yazamıyor.
- `new_scene` geldiğinde DOM'a yazılan yeni seçenekler aynı anda istemcinin `currentState.options` alanına da işleniyor; böylece kısa bir stale-option penceresi winner flash/telemetry eşleşmesini bozamıyor.

### 4.5. HTML/CSS — `public/index.html`, `public/style.css`

- Vote-window label ve blink overlay eklendi.
- Script cache-busting sürümü güncellendi.
- Mobilde vote/result kartları chat paneli ve footer'ın üstüne taşındı.
- Son saniyelerde daha belirgin countdown durumu eklendi.
- Grain opaklığı yaklaşık `%8`'den `%4.5`'e indirildi.
- Grain animasyonu yaklaşık `0.18s` hızlı titreşimden `1.6s` yumuşak harekete çekildi.
- Bilingual seçenekler, yüzdeler, winner flash ve mevcut layout korunuyor.

### 4.6. Test desteği — `test/runtime-hygiene.test.mjs`

Queue boşken history cleanup çağrısını, queue doluyken ertelenmesini ve cleanup hatasının akışı kırmamasını test eden kontroller eklendi.

## 5. Test ve ölçüm sonuçları

### 5.1. Kod testleri

Son targeted komut:

```text
node --test test/options.test.mjs test/story-state.test.mjs test/vote-manager.test.mjs test/runtime-hygiene.test.mjs
```

Sonuç: **14/14 PASS**. `public/app.js`, `app/server.mjs`, `app/lib/options.mjs` ve `app/lib/comfy-image-engine.mjs` syntax kontrolünden geçti. Final state-sync düzeltmesi sonrasında da aynı sonuç korundu.

Tam `npm test` içinde daha önce mevcut olan, bu göreve bağlı olmayan `benchmark/ipadapter-simple-test.mjs` nedeniyle hata görülebilir; bu, production lifecycle testlerinin başarısız olduğu anlamına gelmez.

### 5.2. Restart ve smoke

Node kontrollü biçimde birkaç kez yeniden başlatıldı. Warm-up'ın oylama penceresini tüketmediği doğrulandı. Final code ile ek **5/5** smoke turu ve ardından **30/30** regression tamamlandı.

Son client-state sync düzeltmesi sonrasında ayrıca **3/3** post-fix smoke turu (`8145→8148`) çalıştırıldı. Üç turda da authoritative oylama penceresi `6000 ms` idi; final health `ready`, Comfy/Qwen erişilebilir, `IMAGE_MOTION` aktif ve YouTube kapalı döndü.

Ardından kararlı snapshot için `PLAYING_VOTING` ve boş queue beklendi: scene `8153`, queue `0/0`, story state `759` byte, serialized state `3449` byte, log `976244` byte, loop/stale/generation hata sayaçları `0`.

Final completion audit'te `/health` `ok=true`, `readiness=ready`, `engine=IMAGE_MOTION`, Comfy/Qwen erişilebilir ve YouTube kapalı döndü. Diagnostics scene `8161`, phase `PLAYING_VOTING`, queue `0/0`, story state `772` byte, serialized state `3500` byte, loop/stale/generation hata sayaçları `0` gösterdi. Tüm değişen runtime/client modüllerinin syntax kontrolleri ve 14-test targeted suite tekrar geçti. Static UI contract audit; round deadline, generation sırasında görünür seçenekler, client option sync, rüya sayacı, playback telemetry, stale guard, contextual fallback, history cleanup, mobil yerleşim ve düşük-jitter grain hook'larını doğruladı.

Bu audit'ten sonra doğrudan local Chromium render'ı da alındı. Önceki `el.sceneNumber` anahtar hatası düzeltildi ve `benchmark/UI_AUDIT_1280x720_FIXED.png` ile rüya sayacının gerçek render'da nonzero göründüğü doğrulandı. `benchmark/UI_AUDIT_390x844_FINAL.png` mobil viewport'ta sahne crop'u, iki TR/EN seçenek, yüzdeler, sayaç, rüya numarası, status ve chat'in taşmadan göründüğünü gösterdi. `benchmark/UI_AUDIT_390x844_GENERATING.png` vote-lock/generating durumunda seçeneklerin görünür kaldığını ve `AI RÜYA GÖRÜYOR` durumunun gösterildiğini doğruladı. Fiziksel telefon/network kontrolü yine bu ortamın dışındadır.

### 5.3. Final 30 tur regression

Script: `benchmark/voting-lifecycle-regression.mjs`  
Scene aralığı: **8072 → 8102**  
Başarı: **30/30**

- 30/30 tur ardışık ilerledi.
- 30/30 turda iki seçenek authoritative state içinde yayınlandı.
- Oylama pencerelerinin tamamı tam **6000 ms** oldu.
- Erken kapanma: 0
- Scene skip: 0
- Stale vote leakage: 0
- Crash: 0
- Generation failure: 0
- Loop error: 0
- Stale loop replacement: 0
- Queue son durumda: `0/0`

| Ölçüm | İlk yarı | İkinci yarı | Tüm koşu |
|---|---:|---:|---:|
| Generation p50 | 5.95 s | 6.04 s | 5.95 s |
| Generation p95 | 9.49 s | 8.77 s | 9.49 s |
| Min | 4.36 s | 4.35 s | 4.35 s |
| Max | 10.21 s | 9.82 s | 10.21 s |

İlk ve ikinci yarı arasında monoton yavaşlama görülmedi. Test harness oy submit'inden scene'e yaklaşık **14.6 s** gözledi; bunun nedeni 6 s oylama penceresine ek mevcut Qwen safety bütçesinin 8 s'e kadar beklenebilmesi.

### 5.4. Seçenek çeşitliliği

Final 30 turda **62** gösterilen etiketin **37** tanesi benzersiz, **25** tanesi kontrollü tekrar oldu. Önceki 60-round örneğinde yalnızca 19 benzersiz etiket vardı. Bu, fallback planner'ın tekrarı azaltıp scene-context çeşitliliğini artırdığını gösteriyor.

Gözlenen aileler: corridor/door/exit, bridge-light, tunnel/car/window, portal/mirror/orbs, tree/red-sky/water.

### 5.5. Bounded kaynak snapshot'ı

- Comfy queue: `0/0`
- Comfy history: **15 kayıt**
- Story state: yaklaşık **743 byte**
- Serialized state: yaklaşık **3360 byte**
- Runtime media: **36 dosya**, yaklaşık **12.95 MB**
- Log boyutu: yaklaşık **748 KB**; rotation ile bounded
- Loop pending: yalnızca in-flight bir FFmpeg child varken bounded
- Loop errors: 0
- Stale loops: 0
- Generation failures: 0

Bu sonuç, metadata/state/medya/queue davranışının run boyunca plato yapabildiğini gösteriyor.

## 6. Qwen'in gerçek durumu

Qwen normal çalışma için hâlâ seçenek kaynağıdır; ancak direct local probe küçük bir completion için yaklaşık **27.2 s** sürdü. Mevcut güvenlik bütçesi **8 s** olduğu için local testlerde Qwen sıkça timeout olup contextual fallback'e düşüyor.

Bu oturumda model, timeout mimarisi veya story-state semantiği değiştirilmedi. Fallback davranışı gizlenmedi; açıkça raporlandı. Yayının ayakta kalması için safe contextual fallback kullanıldı. Sonuç, “Qwen her tur real-time” iddiası değildir; kanıtlanan şey Qwen yavaş/başarısız olsa da lifecycle'ın durmamasıdır.

## 7. Üretim sağlık durumu

Son health cevabı:

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

- Node: `localhost:3000`
- Qwen: `localhost:8080`
- Comfy: `localhost:8188`
- OBS Ambient Main: değişmedi
- AnimateDiff: kapalı
- YouTube/public hosting: kapalı

Oturum boyunca port dinlemeyen stale Node PID'i `10176` inceleme sonrası güvenli şekilde kaldırıldı; production portları etkilenmedi. Son gözlemlerde Node yaklaşık `30184`, Comfy `15616`, Qwen `18672`, OBS `26636` PID'leriyle çalışıyordu; PID'ler kalıcı sözleşme değildir.

## 8. Değiştirilen dosyalar

- `app/server.mjs`
- `app/lib/options.mjs`
- `app/lib/comfy-image-engine.mjs`
- `public/app.js`
- `public/index.html`
- `public/style.css`
- `benchmark/voting-lifecycle-regression.mjs`
- `test/runtime-hygiene.test.mjs`
- `benchmark/VIEWER_EXPERIENCE_HARDENING.md`
- `benchmark/WORK_SESSION_SUMMARY_2026-08-31.md`

## 9. Kullanıcıya yansıyan nihai akış

1. Yeni tur authoritative `roundId` ve deadline ile açılır.
2. İzleyici iki TR/EN seçeneği ve geri sayımı görür.
3. Oylama penceresi tam 6 saniyedir.
4. Kullanıcı başına ilk geçerli oy bir kez sayılır.
5. Oy yoksa/eşitse açık random etiketi gösterilir.
6. Kazanan flash ile gösterilir; seçenek kartı generation sırasında görünür kalır.
7. SDXL result-state görseli üretilir.
8. Yeni görsel decode edilmeden eski görüntü kaldırılmaz.
9. Hazır görsel blink/crossfade ile gösterilir.
10. Güncel sceneId'ye ait loop varsa oynatılır; değilse statik image-motion sürer.
11. Story state ve medya başarılı generation sonrası transactional commit edilir.
12. Qwen yavaş/bozuksa safe contextual fallback kullanılır.
13. Her 25 tamamlanmış Comfy işinde queue boşsa metadata cleanup yapılır.
14. Sistem yeni round'a aynı bounded lifecycle ile geçer.

## 10. Kalan sınırlamalar

Otomatik test server state, timing, queue ve resource davranışını kanıtlıyor. Doğrudan mobil screenshot/ekran kontrolü bu ortamda browser-control kernel hatası nedeniyle alınamadı.

Bu yüzden staging sayfasında insan gözüyle bir tam round kontrol edilmeli: iki seçenek aynı anda görünüyor mu, sayaç geri sayıyor mu, winner/loser feedback okunuyor mu, yeni sahne siyah ekransız mı geliyor ve mobil chat/footer kartları kapatmıyor mu.

Bu sınırlama lifecycle testlerinin başarısız olduğu anlamına gelmez; yalnızca öznel görsel polish'in son onayının gerçek cihazda yapılması gerektiğini belirtir.

## 11. Nihai durum

```text
STRUCTURED PROMPT: ACTIVE
LOOP MOTION: ACTIVE
IMAGE_MOTION: HEALTHY
ANIMATEDIFF: DISABLED
YOUTUBE/PUBLIC HOSTING: DISABLED
OBS AMBIENT MAIN: UNCHANGED
FINAL LOCAL SOAK: 30/30
TARGETED TESTS: 14/14 PASS
QUEUE: 0/0
GENERATION FAILURES: 0
LOOP ERRORS: 0
STALE MEDIA REPLACEMENTS: 0
```

**Sonuç:** Polish görevi teknik olarak uygulandı ve final kodla 30 ardışık yerel turda doğrulandı. Contextual fallback ve repetition kontrolü güçlendirildi; round/countdown lifecycle authoritative hale getirildi; UI geçişleri ve mobil yerleşim sertleştirildi; Comfy metadata büyümesi bounded hale getirildi. Model, Qwen/story-state semantiği, OBS ses, AnimateDiff ve YouTube durumu korunmuştur.

**Sıradaki güvenli adım:** yeni mimari eklemek değil, gerçek mobil/staging sayfasında bir tam turun insan gözüyle kontrolünü yapmaktır.
