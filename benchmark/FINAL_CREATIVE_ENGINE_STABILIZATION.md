# Final Creative Engine Stabilization

**Tarih:** 2026-09-01  
**Kapsam:** Yalnızca Qwen aday üretimi, aday-başı doğrulama, tek-kare renderability ve final pair seçimi. Model ailesi, llama.cpp mimarisi, timeout (8 s), SDXL/Profile C, Jung, current/memory entity modeli, fallback kataloğu, voting, UI, audio, motion ve networking değiştirilmedi.

## Nihai hüküm

**FINAL VERDICT: BLOCKED**

30 gerçek Node turunda teknik yayın döngüsü **30/30** commit ile tamamlandı; fakat Qwen tarafından authored ve iki bağımsız doğrulanmış aday çifti yalnızca **6/30 (%20)** turda kullanılabildi. **24/30 (%80)** tur güvenli fallback kullandı. Plan eşiği `QWEN_SUCCESS >= 24/30` ve `fallback <= 20%` idi; yaratıcı motor bu eşiği geçmedi. Grounding, güvenlik veya statik-görsel kurallar gevşetilmedi.

## Root cause fixed

Önceki temel sorunların bir kısmı düzeltildi:

- 48 token + uzun/3 adaylı eski isteklerde görülen truncation azaltıldı; canlı varsayılan **64 token**.
- İstek artık kısa ve tam olarak **3 action + visible consequence adayı** istiyor.
- Qwen'in authored adayları varken deterministic completion çifti artık sessizce Qwen başarısı sayılmıyor.
- Uzun/uygunsuz `current_scene_entities_add` patch'leri kısa filtreleniyor.
- Her aday bağımsız static visibility, grounding, safety, repeat ve action/consequence family kontrollerinden geçiyor.
- Final çiftte semantik gelecek/future signature ve consequence family farklılığı kullanılıyor.

Kök neden tamamen çözülmedi: kalan fallback'lerin çoğu gerçek Qwen yanıtının iki güvenilir final çifte dönüşememesi (`QWEN_VALIDATION_REJECT`), eksik tamamlanmış aday (`QWEN_ZERO_COMPLETE_PAIRS`) veya JSON/truncation kaynaklı.

## Candidate survival before / after

| Durum | İstek | Sonuç |
|---|---:|---|
| Eski 48 token / uzun 3-aday prompt | 20 | 5 Qwen, 15 fallback; 14 truncation |
| Eski şekil / 64 token | 20 | 16 Qwen, 4 fallback; p50 10.063 s |
| Yeni compact 2-aday doğrudan probe | 20 | 18 complete; p50 2.804 s, p95 3.603 s |
| Yeni compact 3-aday doğrudan probe | 15 | 4 Qwen, 11 fallback; p50 5.100 s, p95 8.013 s |
| **Gerçek Node acceptance (yeni kod)** | **30** | **6 Qwen, 24 fallback** |

Üç adaylı formatta aday havuzu artık tek kötü aday yüzünden toptan reddedilmiyor; kötü adayın `reject_reason` bilgisi trace'e yazılıyor ve kalan adaylar çift seçimine devam ediyor. Buna rağmen acceptance oranı hedefin altında kaldı.

## Static image consequence rule

**PASS (uygulandı).** Her consequence tek bir sessiz still-image'da fiziksel olarak görülebilir olmalı. Ses, fısıltı, koku, sıcaklık, iç düşünce, salt hafıza veya yalnız zaman geçişi ana anlamı taşıyorsa aday reddediliyor; görünür iz/ışık/yansıma/nesne değişimi eşlik ediyorsa izin veriliyor. `A child's handprint is visible on the radio` geçerli; `The radio broadcasts a child's voice` geçersiz.

30 tur trace'inde görünmez sonuçlar `static_visibility` ile elendi; grounding veya safety gevşetilmedi.

## Qwen direct latency

Yeni compact 3-aday promptla 15 izole çağrı:

- **p50:** 5.100 s
- **p95:** 8.013 s
- **maksimum:** 8.013 s
- **Qwen authored:** 4/15
- **Fallback:** 11/15

Prompt bir kez kısaltıldı; timeout artırılmadı ve model araştırması açılmadı.

## 30 real rounds

- **Technical scene commits:** 30/30
- **Image generation failures:** 0
- **Qwen authored:** 6/30 (%20)
- **Fallback:** 24/30 (%80)
- **Qwen trace p50:** 5.471 s
- **Qwen trace p95:** 7.633 s
- **Maksimum:** 8.012 s
- Kuyruk büyümesi veya görüntü üretim zincirini durduran hata gözlenmedi.

Fallback nedenleri:

| Neden | Adet |
|---|---:|
| `QWEN_VALIDATION_REJECT` | 15 |
| `QWEN_JSON_INVALID` | 5 |
| `QWEN_ZERO_COMPLETE_PAIRS` | 3 |
| `QWEN_TIMEOUT` | 1 |
| **Toplam fallback** | **24** |

Validation alt nedenlerinde `diversity`, `recent_repeat` ve static/patch kapıları görüldü. Entity patch uzunluğu filtrelendi; tekrar ve diversity kapıları korunuyor.

## Candidate-level trace

Her `OPTIONS_CREATED` kaydı action/consequence, `static_visible`, `grounded`, `safety`, `repeat`, `action_family`, `consequence_family` ve `reject_reason` alanlarını taşır. Ham üçlü havuz ile final iki seçenek ayrıdır.

## Contention / cancellation evidence

| Koşul | Qwen | Fallback | p50 | p95 |
|---|---:|---:|---:|---:|
| A — Node, Comfy yok | 3/5 | 2/5 | 2.874 s | 3.160 s |
| B — Node + idle Comfy | 5/5 | 0/5 | 2.782 s | 6.757 s |
| C — Node + paralel SDXL | 5/5 | 0/5 | 2.928 s | 3.172 s |
| D — SDXL sonrası Qwen | 3/5 | 2/5 | 2.882 s | 3.445 s |

Abort testi: yaklaşık 115 ms'de iptal; `/slots` yaklaşık 3.690 s içinde `is_processing=false`; sonraki istek yaklaşık 4.405 s'de HTTP 200. Kalıcı gizli kuyruk bulunmadı.

## Testler

- `node --check app/lib/options.mjs` — geçti.
- `node --check app/server.mjs` — geçti.
- `node --test test/options.test.mjs` — **5/5 geçti**.
- Tam `npm test` içindeki 8194/IPAdapter erişim hatası bu görevle ilgisiz mevcut benchmark testidir.

## Üretim durumu

- Node `/health`: **200**, `readiness=ready`, `engine=IMAGE_MOTION`.
- Comfy `8188/system_stats`: **200**.
- Qwen `8080/health`: **200**.
- `ANIMATEDIFF_ENABLED=false`, `youtube=false`.
- Profile C, story-state, fallback kataloğu, UI/voting, audio ve motion değişmedi.

Varsayılan Comfy `D:\InfiniteAILive` user/temp klasörleri Windows yazma izni vermediği için aynı model/port komutu workspace altındaki yazılabilir runtime user/temp/input/output dizinleriyle başlatıldı.

## Final recommendation

**Qwen/story/grounding/Jung creative engine FROZEN olarak işaretlenmedi.** Authored oranı kabul eşiğini geçmedi; güvenli fallback üretim için korunuyor. Bu görev kapsamında daha fazla mikro-tuning, model araştırması veya mimari değişiklik yapılmayacaktır.

