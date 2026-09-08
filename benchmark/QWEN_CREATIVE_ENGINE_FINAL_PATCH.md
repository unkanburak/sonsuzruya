# Qwen Creative Story Engine — Action + Visible Consequence

**Tarih:** 2026-09-01  
**Kapsam:** Yalnızca story-state / Qwen option engine. UI, voting, audio, motion, SDXL/Profile C ve networking değiştirilmedi.

## Sonuç özeti

| Ölçüm | Sonuç |
|---|---:|
| Historical object fiziksel-varlık sızıntısı | 0 (kod yolu ayrıştırıldı) |
| 4-candidate isolated format denemesi | 15/20 Qwen, 5/20 timeout/fallback |
| 3-candidate isolated format denemesi (64 output token diagnostic) | 15/20 Qwen, 5/20 fallback |
| 3-candidate Qwen latency (cache-miss çağrı) | p50 6.744 s / p95 7.613 s |
| 20 local sequential trace | 20/20 tur tamamlandı |
| Local kaynak dağılımı | 2 Qwen / 18 güvenli fallback |
| Aynı-eylem çifti | 0/20 isolated, 0/20 local |
| Targeted test suite | **30/30 geçti** |
| Qwen format geçici kararı | **BORDERLINE — canlı 8 s timeout içinde, ancak p95 6 s hedefini aşabiliyor** |

> İlk 4-candidate ölçümünde üretim/benchmark kuyruğunun etkisi görüldü. 3-candidate/64-token ölçümü temiz koşulda tamamlandı; 48-token denemesi üretim Node’u ile çakıştığı için geçersiz sayıldı ve karara katılmadı. Bu nedenle 48-token üretim profili için ayrıca iyimser latency iddiası yapılmıyor; güvenli 8 s timeout korunuyor.

## Uygulanan davranış

### 1. Fiziksel sahne ve hafıza ayrımı

`normalizeStoryState()` artık iki bounded alan tutuyor:

- `current_scene_entities`: son commit’te gerçekten kurulmuş mekân, figür, obje ve canlı anchor’lar (en fazla 5).
- `memory_entities`: uzun dönem hatırlanan nesneler (en fazla 12); fiziksel olarak mevcut kabul edilmez.

Eski `important_objects` state’i silinmedi; geriye dönük uyumluluk için `memory_entities` içine migrate edilip son 5 kayıtlık alias olarak tutuluyor. Eski state dosyasında hangi nesnenin hâlen kadrajda olduğu bilinmiyorsa güvenli varsayım kullanılıyor: yalnızca konum, figür ve canlı anchor’lar mevcut sayılıyor.

`applyStatePatch()` yeni sahne varlıklarını `current_scene_entities_add` ile commit eder, eski nesneleri memory’de tutar ve yeni konum/anchor değişiminde fiziksel sahne listesini bounded biçimde yeniler.

### 2. İcat edilmiş affordance kaldırıldı

Qwen manifest’i artık bir oda için otomatik kapı/pencere/masa/merdiven, köprü için fener veya araba için radyo varsaymıyor. Manifest yalnızca şu action type’ları bildiriyor:

`observe surroundings`, `remain still`, `move within current space`, `interact with current figure` ve gerçekten kurulmuş entity’lerle etkileşim.

Eski nesneler normal fiziksel grounding’e giremiyor. Fallback object branch’leri de yalnızca literal current-scene entity bulunduğunda geçerli sayılıyor.

### 3. Qwen eylem + görünür sonuç üretiyor

Normal istek şeması:

```json
{"c":[
  ["Eylem", "English visible AFTER-state"],
  ["Eylem", "English visible AFTER-state"],
  ["Eylem", "English visible AFTER-state"]
]}
```

İlk denemede 4 aday istendi; 8 saniyelik canlı bütçede 3 adayın daha güvenilir olduğu görüldüğü için normal istek 3 aday istiyor. Son kullanıcıya her zaman davranış olarak ayrışan 2 dal seçiliyor. Qwen’in consequence metni doğrudan `option_*_result_prompt_en` ve dolayısıyla SDXL result-state promptunun temeli oluyor. `resultStateFromLabel()` yalnızca legacy/bozuk Qwen cevabında emergency recovery olarak kalıyor.

Her candidate için:

- kısa Türkçe action,
- görsel ve eylem-sonrası İngilizce consequence,
- en fazla pratikte 10–12 kelime,
- current entity grounding,
- küçük state patch,
- recent event/anchor güncellemesi

oluşturuluyor.

### 4. Jung yalnızca anlam yönü veriyor

Manifest’te bounded `meaning_direction` bulunuyor:

`confront_or_avoid`, `preserve_or_destroy`, `connect_or_isolate`, `control_or_surrender`, `remember_or_suppress`.

Jung yönü fiziksel nesne icat edemiyor; yalnızca mevcut nesne üzerinde psikolojik baskıyı değiştiriyor. Örneğin mevcut fotoğrafa karşılaşma yönü, yeni portal icat etmek yerine fotoğraftaki yüzün silinmesi gibi kontrollü dönüşüme çevrilebiliyor.

### 5. Gerçekten farklı gelecekler

Pair seçimi artık yalnızca `intent` eşitliğine bakmıyor. Action hedefi ve consequence davranış ailesi de karşılaştırılıyor. Aynı eylemin “yakından incele” gibi kozmetik varyantları reddediliyor; farklı davranış/consequence ailesi yoksa Qwen çifti gösterilmiyor.

## Grounding ve güvenlik kapıları

Bir aday şu durumlarda reddediliyor:

- action veya consequence görünmeyen current prop kullanıyorsa,
- eski memory entity’yi fiziksel gerçeklik gibi kullanıyorsa,
- mevcut sahnede kurulmamış yeni konuma sıçrıyorsa,
- render edilemez/çok uzun consequence içeriyorsa,
- güvenlik blacklist’ine giriyorsa,
- iki seçenek aynı action/consequence ailesine düşüyorsa,
- son 8 gösterilen action’dan gereksiz tekrar yapıyorsa.

Fallback normal içerik kaynağı değil; Qwen timeout/bozuk şema/grounding ihlalinde güvenli kurtarma katmanı.

## Test kanıtı

### Isolated action + consequence benchmark

Dosya: `benchmark/qwen-action-consequence-20-result.json`

- 20 ardışık çağrı
- benzersiz scene context’leri
- 3 aday kompakt şema
- current/memory entity ayrımı
- p50: **6.744 s**
- p95: **7.613 s**
- min/max: **5.612 / 7.660 s**
- Qwen: **15/20**
- güvenli fallback: **5/20**
- aynı action çifti: **0**

4 adayın ilk kontrollü denemesi p95’i 9.354 s’e kadar çıkardı; bu nedenle 3 aday yolu seçildi. 3 adayın kalitesi iki final branch üretmek için yeterli olduğu görüldü.

### 20 local sequential trace

Dosya: `benchmark/qwen-action-consequence-local-20-result.json`

Her turda şu alanlar kaydedildi:

- committed scene,
- current physical entities,
- memory-only entities,
- sanitize edilmiş Qwen adayları (varsa),
- final action + visible consequence çiftleri,
- Qwen/fallback kaynağı,
- kazananın state patch’i sonrası sonraki scene.

20/20 tur state transition ile tamamlandı. Local endpoint testinde 8 s gate nedeniyle Qwen 2/20, fallback 18/20 oldu; bu dağılım altyapı/CPU latency koşulunun sınırda olduğunu gösteriyor, story-state transaction’ı bozulmadı. Fallback’e düşen turlarda bile seçenekler current committed scene üzerinden güvenli tutuldu; eski memory entity’ler fiziksel affordance olarak kullanılmadı.

## Değişen dosyalar

- `app/lib/options.mjs` — scene/memory entity ayrımı, action-type affordance, action+consequence parser, grounding ve pair diversity.
- `app/server.mjs` — `OPTIONS_CREATED` forensic kaydına bounded current/memory entity, sanitize edilmiş adaylar ve final consequence trace’i eklendi. Raw chat kaydedilmiyor.
- `test/options.test.mjs` — historical object ayrımı ve Qwen consequence propagation testleri.
- `benchmark/qwen-action-consequence-20.mjs` — 20 isolated ölçüm runner’ı.
- `benchmark/qwen-action-consequence-local-20.mjs` — 20 stateful local trace runner’ı.

Üretim state transaction, Qwen’in pending-state çağrısı ve SDXL commit/discard akışı korunmuştur.

## Final değerlendirme

**Kod ve grounding hedefleri uygulandı.** Qwen artık yalnızca altı etiket üreten bir fikir kaynağı değil; action + görünür consequence yazan yaratıcı katmandır. Consequence doğrudan SDXL’e taşınır. Historical objects fiziksel sahne olarak sızamaz; Jung fiziksel kelime dağarcığını genişletemez; iki branch aynı geleceği tarif edemez.

**Canlılık durumu: BORDERLINE.** 3-candidate format 8 saniyelik production timeout içinde çalışabiliyor, ancak temiz ölçüm p95’i 7.613 saniye ve tercih edilen 6 saniye hedefini aşıyor. Bu nedenle güvenli fallback aktif kalır; Qwen performans araştırması yeniden açılmadı.

## Son sistem durumu

- `http://127.0.0.1:3000/health`: `ok=true`, `comfy=true`, `qwen=true`, `youtube=false`, `engine=IMAGE_MOTION`
- `http://127.0.0.1:8188/system_stats`: HTTP 200
- Profile C / SDXL, UI, voting, audio, motion ve networking değiştirilmedi.
- `ANIMATEDIFF_ENABLED=false`
- YouTube/public hosting kapalı.
