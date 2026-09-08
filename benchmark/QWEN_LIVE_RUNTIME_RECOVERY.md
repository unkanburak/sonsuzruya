# Qwen Live-Runtime Recovery — Final Bottleneck

**Tarih:** 2026-09-01  
**Kapsam:** Yalnızca Qwen canlı çalışma yolu ve tanı testleri. UI, voting, story-state semantiği, SDXL/Profile C, loop-motion, ambient audio, AnimateDiff ve ağ/public ayarları değiştirilmedi.

## Son karar

**VERDICT: BLOCKED (creative Qwen acceptance hedefi karşılanmadı).**

Teknik tur akışı çalıştı: son 30 gerçek Node turunda **30/30 commit**, **0 görüntü üretim hatası** ve gözlenen Qwen gecikmesi yaklaşık **p50 5.687 s / p95 7.061 s** oldu. Ancak authored Qwen seçenek çifti yalnızca **4/30 (%13,3)** turda kullanılabildi; **26/30 (%86,7)** tur güvenli fallback'e düştü. Planın kabul eşiği Qwen **en az 24/30**, fallback **en fazla %20** olduğundan bu sürüm üretim yaratıcılık hedefini geçmedi.

Bu sonuç, fallback'in güvenli çalışmadığı anlamına gelmez. Yayın döngüsü devam etti; fakat Qwen'in normal yaratıcı seçenek kaynağı olarak yeterince güvenilir olduğu henüz kanıtlanmadı.

## 1. Başlangıç ve uygulanan dar kapsamlı değişiklik

Üretim kaynak kodunda ölçülen başlangıç değerleri:

- `config.json`: `qwenTimeoutMs=8000`, Qwen `127.0.0.1:8080`, Comfy `127.0.0.1:8188`.
- Qwen llama-server CPU-only çalışıyor (`--n-gpu-layers 0`, `--threads 5`).
- Üretim isteği daha önce `max_tokens=48` idi.

Uygulanan en küçük recovery paketi:

1. Uzun/3 adaylı istek yerine iki kısa action+visible-consequence adayı istendi; prompt mevcut sahne varlıklarını ve güvenli grounding'i koruyor.
2. Varsayılan `max_tokens` **64** yapıldı (env/function override korunuyor).
3. Qwen isteği için ayrıntılı `_qwenTrace` eklendi: HTTP, byte, finish reason, token, JSON tamamlanma, grounding/diversity ve fallback nedeni.
4. Uzun `current_scene_entities` eklemeleri state patch'e alınmadan önce kısa ve sınırlı tutuldu; bu, gereksiz patch validation hatasını azaltıyor.
5. Authored iki çift yoksa sonuç `qwen` başarı sayılmıyor; `QWEN_ZERO_COMPLETE_PAIRS`/fallback olarak raporlanıyor.
6. `OPTIONS_CREATED` olayları trace ile kaydediliyor; emergency completion artık Qwen authored gibi sayılmıyor.

Değişen ana dosyalar:

- `app/lib/options.mjs`
- `app/server.mjs`
- Tanı harness'leri: `benchmark/qwen-live-runtime-recovery.mjs`, `benchmark/qwen-two-candidate-probe.mjs`, `benchmark/qwen-contention-conditions.mjs`

## 2. Fallback nedeni sözlüğü ve gerçek gözlemler

Her live istekte trace alanı bulunuyor. Kullanılan nedenler:

| Kod | Anlamı |
|---|---|
| `QWEN_TIMEOUT` | İstek timeout/abort oldu |
| `QWEN_HTTP_ERROR` | Qwen endpoint/HTTP hatası |
| `QWEN_TRUNCATED` | `finish_reason=length` veya eksik JSON |
| `QWEN_JSON_INVALID` | Gövde parse edilemedi |
| `QWEN_ZERO_COMPLETE_PAIRS` | Kullanılabilir iki tamamlanmış çift oluşmadı |
| `QWEN_GROUNDING_REJECT` | Mevcut sahne varlıklarına grounding yetmedi |
| `QWEN_DIVERSITY_REJECT` | İki gelecek yeterince farklı değil |
| `QWEN_REPEAT_REJECT` | Son gösterilen seçeneklerle gereksiz tekrar |
| `QWEN_VALIDATION_REJECT` | Şema/güvenlik/patch doğrulaması reddetti |
| `QWEN_SUCCESS` | İki doğrulanmış authored çift |

Son gerçek 30 turdaki dağılım:

| Trace nedeni | Adet |
|---|---:|
| `QWEN_SUCCESS` | 4 |
| `QWEN_ZERO_COMPLETE_PAIRS` | 10 |
| `QWEN_VALIDATION_REJECT` | 12 |
| `QWEN_JSON_INVALID` | 3 |
| `QWEN_TRUNCATED` | 1 |
| **Toplam** | **30** |

Validation içindeki gözlenen alt nedenler `recent_repeat`, `diversity` ve önceki sürümde uzun entity patch'i idi. Entity uzunluğu için yapılan kısa filtre patch kaynaklı reddi düzeltti; tekrar/diversity reddi bilinçli güvenlik/çeşitlilik kapılarıdır ve gevşetilmedi.

## 3. 48 token ve 64 token kontrollü karşılaştırması

Bu seri eski uzun/3 adaylı production promptunun doğrudan Qwen ölçümüdür; bu nedenle yaklaşık 10 saniyelik değerler canlı son promptun değil, eski prompt şeklinin maliyetini gösterir.

| Seri | İstek | Qwen olarak kabul | Fallback | p50 | p95 | Ana bulgu |
|---|---:|---:|---:|---:|---:|---|
| 48 token | 20 | 5 | 15 | 10.228 s | 10.581 s | 14 truncation, 1 JSON invalid |
| 64 token | 20 | 16 | 4 | 10.063 s | 11.485 s | JSON/truncation belirgin azaldı |

Kısa iki-adaylı doğrudan probe ise **18/20 complete**, **p50 2.804 s**, **p95 3.603 s** verdi. Bu, bottleneck'in yalnız token limiti olmadığını; prompt şekli ve production state/validation etkileşiminin de belirleyici olduğunu gösteriyor.

## 4. Contention / çalışma koşulu testleri

Sabit sahneyle, kuyruk temizlenerek yapılan 5'er çağrılı koşullar:

| Koşul | Tanım | Qwen | Fallback | p50 | p95 | Not |
|---|---|---:|---:|---:|---:|---|
| A | İzole Node, Comfy yok | 3/5 | 2/5 | 2.874 s | 3.160 s | JSON invalid kaynaklı iki fallback |
| B | Node + idle Comfy | 5/5 | 0/5 | 2.782 s | 6.757 s | Contention kanıtı yok |
| C | Node + paralel gerçek SDXL | 5/5 | 0/5 | 2.928 s | 3.172 s | Qwen latency bozulmadı |
| D | SDXL sonrası Qwen | 3/5 | 2/5 | 2.882 s | 3.445 s | İki JSON invalid |

Bu sonuçlarda Qwen CPU-only olduğu için SDXL GPU işinin Qwen'i sistematik olarak yavaşlattığı görülmedi. Full runtime fallback problemi daha çok içerik tamamlanması ve katı doğrulama kapılarında ortaya çıktı.

## 5. Gerçek Node 30 tur kabul koşusu

Son 30 `OPTIONS_CREATED` trace kaydı ve eşleşen scene commit'leri kullanıldı:

- **30/30** story/scene commit tamamlandı.
- **0/30** görüntü üretim hatası.
- **4/30 Qwen authored** (%13,3).
- **26/30 güvenli fallback** (%86,7).
- Qwen trace gecikmeleri (ms): 6675, 5365, 5478, 6359, 6025, 5152, 4721, 4993, 6800, 5443, 6704, 5312, 5060, 5544, 5231, 5081, 6033, 6335, 5859, 6658, 5691, 4044, 3204, 5627, 7653, 7061, 6029, 4321, 5687, 5790.
- **p50:** 5687 ms; **p95:** 7061 ms; **maksimum:** 7653 ms.
- `previousCount` canlı kayıtlarda 8, `maxTokens` 64, prompt yaklaşık 877–1041 karakter.
- Qwen timeout bu son 30 turda görülmedi; önceki uzun prompt serisinde truncation baskındı.
- Qwen düşse bile eski/active state ve güvenli seçenek fallback'iyle görüntü döngüsü devam etti.

Kabul hedefiyle karşılaştırma:

- Qwen authored hedefi: **≥24/30** → **4/30, başarısız**.
- Fallback hedefi: **≤20%** → **86,7%, başarısız**.
- Qwen p95 hedefi: **≤8 s** → **7,061 s, geçti**.

## 6. Abort / gizli kuyruk teşhisi

İptal testi ayrı yapıldı:

1. `AbortController` ile doğrudan istek yaklaşık **115 ms** sonra iptal edildi.
2. Qwen `/slots` gözlemi server'ın kısa decode sonrasında yaklaşık **3.690 ms** içinde idle olduğunu gösterdi (`is_processing=false`).
3. Kuyrukta biriken iş kalmadı.
4. Sonraki yeni istek HTTP 200 ile yaklaşık **4.405 ms** içinde tamamlandı.

Sonuç: İptal edilen istek kısa süre decode etmeye devam edebilse de sonraki isteği zehirleyen kalıcı/artan bir gizli kuyruk görülmedi. Bu nedenle cancellation veya queue mimarisine ek değişiklik yapılmadı.

## 7. Kök neden

**Birincil neden:** eski 48-token/3-adaylı üretim şekli uzun JSON'u sıkça kesiyordu. 64 token bunu iyileştirdi, fakat canlı state üzerinde sorun tamamen çözülmedi.

**Kalan neden:** compact çıktı bazı turlarda tek tamamlanmış çift, geçersiz JSON veya grounding'e uyan ama `recent_repeat`/`diversity` kapılarını geçemeyen iki aday döndürüyor. Sistem bilinçli olarak bu adayları authored saymıyor ve güvenli fallback'e geçiyor. Bu davranış güvenlik ve tekrar kontrolünü koruyor, ancak Qwen authored oranını düşürüyor.

**Dışlanan nedenler:** son koşullarda Qwen timeout, kalıcı kuyruk büyümesi veya SDXL/Qwen GPU contention ana neden olarak doğrulanmadı.

## 8. Test kanıtı

- `node --check app/lib/options.mjs` — geçti.
- `node --check app/server.mjs` — geçti.
- `node --test test/options.test.mjs` — **5/5 geçti**.
- Tam `npm test` içinde mevcut ve bu görevle ilgisiz `benchmark/ipadapter-simple-test.mjs` / 8194 erişim hatası bulunuyor; bu rapor targeted testleri esas alır.
- Üretim health sonrasında `comfy=200`, `qwen=200`, `youtube=false`, `engine=IMAGE_MOTION`, `readiness=ready` doğrulandı.

## 9. Üretim durumu

Kapsam dışı sistemler değiştirilmedi:

- Profile C / SDXL ayarları aynı.
- Story-state, voting, UI, loop-motion ve ambient audio aynı.
- AnimateDiff kapalı (`ANIMATEDIFF_ENABLED=false`).
- YouTube/public hosting kapalı.
- IMAGE_MOTION üretim yolu sağlıklı.

Üretim Comfy'nin varsayılan D: yolundaki `user/temp` klasörleri Windows izin hatası verdiği için servis, aynı kayıtlı Comfy komutuyla **workspace içindeki yazılabilir runtime user/temp/input/output** hedeflerine yönlendirilerek ayağa kaldırıldı. Model/workflow/port değişmedi; bu geri kazanım not edilmiştir.

## 10. Öneri ve durma kararı

Bu görevde daha fazla prompt mikro-optimizasyonu yapılmadı. Şu an:

- fallback güvenli ve teknik tur döngüsü çalışır durumda,
- fakat Qwen normal yaratıcı motor kabul eşiğini geçmiyor.

**Öneri:** Qwen'i authored yaratıcı kaynak olarak production başarıyla terfi ettirmeyin; güvenli fallback'i koruyun. Yeni bir iyileştirme istenirse ayrı, onaylı bir görevde yalnızca validation/repeat oranını inceleyen dar bir deney açılmalı. Bu raporun kapsamı burada sona erer.

