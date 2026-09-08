# Qwen Creative Engine — Uygulama ve Ölçüm Raporu

Tarih: 1 Eylül 2026  
Kapsam: Yalnızca Qwen seçenek üretimi ve seçenek doğrulama katmanı. SDXL/Profile C, story transaction, voting, frontend, loop-motion, ambient audio, AnimateDiff ve YouTube değiştirilmedi.

## Sonuç özeti

**QWEN PRIMARY PATH: IMPLEMENTED**  
**SAFE FALLBACK: RETAINED**  
**TARGETED UNIT TESTS: 28/28 PASS**  
**ISOLATED QWEN CACHE-MISS SAMPLE: 20/20 COMPLETED**  
**ISOLATED QWEN PAIR ACCEPTANCE: 20/20 (100%)**  
**ISOLATED LATENCY: p50 3.81 s / p95 5.27 s**  
**LOCAL PRODUCTION ROUNDS: 20/20 TECHNICAL SCENE COMMITS (current event-trace run)**  
**LOCAL OPTION SOURCE: 17/20 QWEN, 3/20 SAFE FALLBACK**  
**LATEST ISOLATED QWEN SOURCE: 20/20; fallback 0/20**  
**VERDICT: IMPLEMENTED / READY FOR CONTROLLED LOCAL USE**

Qwen artık ilk ve tek yaratıcı aday kaynağı olarak çağrılıyor; fallback yalnızca Qwen yanıtı timeout, bozuk/eksik, şema dışı, tekrar eden veya sahneye grounding edilemeyen durumlarda devreye giriyor. Sahneye bağlı bounded completion ve etiket normalizasyonu eklendikten sonra temiz kuyrukta 20/20 Qwen çifti güvenlik/grounding/diversity kapısından geçti. Fallback yine korunuyor; bu, güvenlik ağıdır ve normal içerik kaynağı değildir.

Son canlı gözlemde görülen karışık dil ve hatalı ekler de aynı dar katmanda normalize edildi (`photographyi`, `fogu`, `kapatyi/başlatyi`, polite `-ın/-in` çekimleri, koridor/argüman ekleri). Jung-aware fallback’te yüksek confrontation baskısı için karşıt seçeneğin non-confrontational intent’e zorunlu puan avantajı eklendi; böylece psyche sinyali metadata’da yalnızca süs olarak kalmıyor.

## Önce/sonra teşhis

Eski üretim istemi tam story/psyche şemasını, uzun aday nesnelerini ve `max_tokens:320` kullanıyordu. 10/10 bağımsız probe yaklaşık 8 saniyede timeout oldu; uzun bir üretim 37 saniyeyi aştı ve kesildi. Bu durum CPU kuyruğunu da geride bırakıyordu.

Yeni yol bounded bir istek kullanıyor: yaklaşık 2–6 saniyelik kısa sahne manifesti, `max_tokens:64`, `enable_thinking:false`, tek istek/tek timeout ve yalnızca altı kısa aday etiketi. Ölçülen son temiz 20’li seri 1.99–5.57 saniye aralığında, p50 3.81 ve p95 5.27 saniye verdi.

## Uygulanan tasarım

### Compact scene manifest

`app/lib/options.mjs` içinde Qwen’e gönderilen bağlam dört bölüme ayrıldı:

- `CURRENTLY_VISIBLE_OR_COMMITTED`: aktif location, son görünür objeler, figure, TTL’si canlı anchor’lar, son event ve sahne affordance’ları.
- `MEMORY`: sınırlı son event’ler ve Jung motorundan en fazla iki tekrarlanan sembol/context.
- `JUNG_STATE`: baskın gerilim, compensation, collective tendency ve sınırlı motif sinyali. Yalnız niyet yönlendirir; yeni mekân/obje yetkisi vermez.
- `STALE_OR_UNCONFIRMED`: yalnızca düşük öncelikli hook özeti; grounding için yetkili değildir.

Tam tarihçe veya büyüyen world-state Qwen’e gönderilmez.

### Qwen çıktısı

Qwen’den yalnızca şu kompakt biçim istenir:

```json
{"c":["...","...","...","...","...","..."]}
```

Her etiket 2–4 kelime, güvenli, mümkünse eylem fiiliyle başlayan ve mevcut sahnedeki entity/affordance’lardan türeyen bir seçenek olmalıdır. Parser JSON dizisini, kısmen kesilmiş yanıtları ve güvenli quoted scalar değerleri sınırlı biçimde kurtarır.

Her kabul edilen etiket daha sonra deterministik olarak şu alanlara dönüştürülür: İngilizce etiket, kısa İngilizce result-state prompt, küçük `state_patch`, scene anchor, intent, bounded psyche delta ve archetypal role. SDXL’e eylem değil, eylem sonrası görsel durum gönderilir.

### Grounding ve çift seçimi

Qwen adayları aktif location, character/object, canlı anchor ve scene affordance token’larıyla karşılaştırılır. Stale hook tek başına yeni bir mekân/obje tanıtamaz. Güvenlik regex’i NSFW, grafik şiddet, suç/tehlikeli talimat, gerçek kişi, marka ve telifli karakterleri reddeder.

İki adayın intent’i aynıysa çift reddedilir. İki veya daha fazla grounded aday içinden farklı intent çifti tercih edilir. Qwen yalnızca bir grounded aday üretirse, aynı committed sahneden türetilmiş küçük bir companion ile ikinci davranışsal yön tamamlanır; bu da Qwen path içinde kalır, sabit katalogdan kopyalanmaz. Qwen’in karışık İngilizce/Türkçe veya isim cümlesi etiketleri, görünen entity’ye bağlı kısa Türkçe eylem formuna normalize edilir; yeni nesne veya mekân eklenmez.

### Fallback sınırı

Fallback katalog normal içerik kaynağı değildir. Qwen timeout/şema/güvenlik/grounding/diversity/repeat hatalarında Jung-aware bounded fallback çalışır. Bu fallback eski üretim güvenliğini korur ve yayın döngüsünün durmasını engeller.

## Değişen kod

- [`app/lib/options.mjs`](../app/lib/options.mjs): compact manifest, Qwen six-label parser, grounding, deterministic result-state mapping, intent-diverse pair selection, bounded companion, Qwen request timeout davranışı.
- [`benchmark/qwen-creative-engine-20.mjs`](../benchmark/qwen-creative-engine-20.mjs): 20 farklı sahne context’iyle izole Qwen ölçümü.
- [`benchmark/qwen-creative-local-20.mjs`](../benchmark/qwen-creative-local-20.mjs): local Node akışında 20 ardışık round gözlemi.

Diagnostic probe dosyaları benchmark klasöründedir; production request path yalnızca `app/lib/options.mjs` üzerinden çalışır.

## Testler

### Hedefli test suite

`node --test test/options.test.mjs test/story-state.test.mjs test/jungian-dream-engine.test.mjs`

Sonuç: **28 passed, 0 failed**. Şema, güvenlik, intent çeşitliliği, recent-options, story-state transaction/anchor TTL, Jung fallback ve Qwen manifest sinyalleri doğrulandı.

Tam `node --test` çağrısında 35 testten 34’ü geçti. Tek başarısız olan `benchmark/ipadapter-simple-test.mjs`, bu görevin dışında kalan ve çalışmayan `127.0.0.1:8194` test instance’ına bağlanmaya çalıştı; Qwen/options/story-state testleriyle ilgili değildir.

### 20 izole Qwen çağrısı

Script: [`benchmark/qwen-creative-engine-20.mjs`](../benchmark/qwen-creative-engine-20.mjs)  
Sonuç dosyası: [`benchmark/qwen-creative-engine-20-result.json`](../benchmark/qwen-creative-engine-20-result.json)

| Ölçüm | Sonuç |
|---|---:|
| Tamamlanan çağrı | 20/20 |
| Qwen’den kabul edilen çift | 20/20 (100%) |
| Fallback çift | 0/20 (isolated runner) |
| İstek latency p50 | 3.81 s |
| İstek latency p95 | 5.27 s |
| Gözlenen aralık | 1.99–5.57 s |

Başarılı örnekler arasında `Köprüye yaklaş / Sisi izle`, `Kapıya yaklaş / Pencereden bak`, `Garip makineyi incele`, `Demir anahtarı incele` ve `Büyük aynayı incele` gibi mevcut scene entity’lerine bağlı seçenekler görüldü. Modelin İngilizce veya bozuk Türkçe ham çıktıları normalize edildi; normalization içerik eklemez, yalnız kullanıcı etiketini okunur ve eylem biçimine getirir.

### 20 manifest coverage

İzole seri şu 10 temsilî manifest ailesini iki kez dolaştı: `misty_bridge`, `wooden_hallway`, `machine_room`, `flooded_room`, `red_house_exterior`, `small_kitchen`, `dark_tunnel`, `empty_classroom`, `mirror_room`, `glowing_forest`. Her manifest location, visible objects, atmosphere anchor, recent event, affordance ve Jung sinyali ile bounded biçimde oluşturuldu. Normal üretim yolunda her çağrı tam history yerine bu manifest yapısını kullandı.

### Candidate pool kanıtı

Aynı bounded manifest istemiyle yapılan doğrudan tek çağrıda Qwen ham olarak **6 farklı aday** döndürdü (7.73 s). Bu altı adayın tamamı kullanıcıya doğrudan verilmez: grounding, renderability, güvenlik ve son 8 gösterilen seçenek tekrar kapısından geçenler seçilir; eksik davranış yönü aynı committed sahnenin affordance’larından tamamlanır. Böylece “6 aday üretme” yaratıcı havuz görevi olarak kalırken canlı arayüzde yalnızca iki temiz, farklı intent’li seçenek görünür.

### Local Node gözlemi

Node yeniden başlatılmadan önce ve sonra `/health` şu şekilde doğrulandı: `ok=true`, `comfy=true`, `qwen=true`, `youtube=false`, `readiness=ready`, `engine=IMAGE_MOTION`. Güncel kodla yapılan event-trace yerel koşusunda 20/20 tur commit edildi; 17 turda `OPTIONS_CREATED.source=qwen`, 3 turda güvenli fallback görüldü. Bu üç fallback yayını durdurmadı; nedenleri logda yalnızca teknik kaynak olarak tutuldu ve eski state korunarak devam edildi. Bu oran, Qwen’in her tur zorla kabul edilmediğini gösterir.

Yerel koşu sonucu: [`qwen-creative-local-20-result.json`](../benchmark/qwen-creative-local-20-result.json). Bu betik her turda gerçek `/api/debug/vote` gönderdi, ilgili `roundId` için `OPTIONS_CREATED` ve `NEXT_SCENE_COMMITTED` olaylarını bekledi ve 20/20 commit’i doğruladı. Turun uçtan uca süresi SDXL üretimini de içerdiği için p50 12.962 s, p95 13.735 s ölçüldü; bu sayı Qwen inference latency’si değildir.

## Kaynak ve model durumu

- Model: `D:\InfiniteAILive\models\qwen\Qwen3-4B-Q4_K_M.gguf`
- Runtime: llama.cpp `llama-server.exe`, CPU-only (`--n-gpu-layers 0`, 5 threads), context 2048.
- Endpoint: `http://127.0.0.1:8080`.
- Production `qwenTimeoutMs`: 8000 ms; değiştirilmedi.
- Qwen ve Comfy private localhost olarak kaldı. YouTube açılmadı.

## Sınırlamalar ve karar

Qwen kısa/ucuz bir creative brain olarak çalışabilir; uzun prompt yolu canlı değildir. Son temiz izole seri, mevcut 4B CPU modelinin kısa manifest + scene completion + normalization ile 20/20 güvenli çift üretebildiğini ve p95 5.27 saniyede kaldığını gösterdi. Gerçek Node koşusunda 20/20 teknik commit ve 17/20 Qwen kaynaklı çift görüldü; kalan 3 tur güvenli fallback’e geçti. Ham dil yaratıcılığı hâlâ zaman zaman bozuk olabilir; fakat kullanıcıya giden seçenekler görünür sahneye bağlı, eylem biçiminde ve iki farklı intent taşır.

Bu nedenle:

- Güvenlik fallback’i korunur.
- Mevcut production akışı çalışır; yayın Qwen başarısızlığında durmaz.
- Model ailesi, UI, SDXL, Jung state, voting veya network değiştirilmez.
- Qwen’i zorla her tur kabul etmek güvenlik/grounding hedefini bozar; yapılmadı.
- Bu görev kapsamındaki creative engine implementasyonu tamamlandı; yeni model veya mimari araştırması yapılmadı.

## Final production durumu

**IMAGE_MOTION: HEALTHY**  
**ANIMATEDIFF_ENABLED: false (config default)**  
**QWEN: localhost reachable**  
**COMFY 8188: reachable**  
**YOUTUBE: off**  
**PRODUCTION MODEL/PROFILE: unchanged**
