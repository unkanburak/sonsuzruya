# Qwen-First Seçenek Motoru + Yeni Ambient Loop

## Durum

- Uygulama tarihi: 1 Eylül 2026
- Üretim motoru: Profile C / SDXL-Lightning 4-step / 1024×576 — değiştirilmedi.
- AnimateDiff: kapalı.
- YouTube: kapalı.
- Yeni davranış: Qwen dışındaki hiçbir kaynak normal canlı akışta seçenek yazmaz.

## Uygulanan değişiklikler

1. `Sleep of Static.mp3`, `assets/audio/sleep_of_static.mp3` olarak eklendi. Eski `ambient_main.mp3` silinmedi.
2. Tarayıcı ambient’i yeni MP3’ü native `loop` ile çalıyor; başlangıç ses düzeyi `0.08`.
3. Her `new_scene` için mevcut Web Audio cassette/relay cue korunarak hafifletildi. Ambient’i durdurmaz ve tarayıcı sesi kullanıcı tarafından açılmadan çalmaz.
4. Oylama süresi `8` saniyeye çıkarıldı.
5. Yeni rüya state’i atomik olarak sıfırlandı: alacakaranlıkta kırmızı ev dışı, kapalı ön kapı, çatlak ön yol, çıplak ağaç ve anonim figür. İlk SDXL PNG başarılı olmadan eski state silinmiyor.
6. `current_scene_manifest` eklendi. Manifest yalnızca güncel konumu, güncel somut varlıkları, komşu geçişleri ve kısa sahne özetini taşır. Eski `memory_entities` fiziksel eylemleri ground edemez.
7. Qwen promptu iki adaylık kompakt şemaya geçirildi: `[Türkçe eylem, İngilizce görünür sonuç, next_location]`.
8. Koridor, portal, sis, yağmur, ışık, küre ve ayna; manifestte yoksa Qwen sonucunda reddedilir. Result-state en az üç kelimelik, tek karede görünür İngilizce bir after-state olmalıdır.
9. Qwen yanlış/yarım/tekrarlı cevap verirse katalog fallback, rastgele yeni motif veya sahte seçenek oluşturulmaz. Sahne ve loop kalır, UI `RÜYA DÜŞÜNÜYOR…` durumunda kalır; `/slots` boş olduğunda tek retry başlatılır. İlk ve sonraki hata retry aralığı 20 saniyedir.
10. SDXL hata verirse pending state commit edilmez; önceki geçerli sahne ve seçenekler korunur.

## Canlı akış doğrulaması

- `/health`: Node, Comfy ve Qwen erişilebilir; YouTube kapalı.
- Yeni başlangıç SDXL render’ı: 4.35 sn.
- Başlangıç loop render’ı: 1.04 sn; 84,681 byte.
- Yeni MP3 HTTP doğrulaması: `200`, `audio/mpeg`, `7,746,482` byte.
- İlk canlı Qwen başarılı örneğinde iki grounded dal üretildi:
  - `Kapıya yaklaş` → `The closed front door is near the anonymous figure`
  - `Yolu izle` → `The cracked front path leads away from the red house`
- Qwen’in sonraki bazı ham cevapları eksik JSON, Türkçe sonuç veya önceki eylemin tekrarıydı. Yeni gate bunları doğru biçimde reddetti: seçenek yerine `WAITING_FOR_OPTIONS` korundu; sahne/loop/medya bozulmadı.

Bu son bulgu özellikle önemlidir: eski sistemde bu noktada katalogdan sis/yağmur/koridor/küre türetiliyordu. Yeni sistem yanlış sahneyle devam etmek yerine kontrollü olarak bekler.

## Hedefli testler

Çalıştırılan hedefli suite:

```text
node --test test/options.test.mjs test/story-state.test.mjs test/qwen-first-manifest.test.mjs
18/18 PASS
```

Kapsanan kontroller:

- dış mekân manifestinde koridor/portal/sis/küre reddi,
- iki Qwen dalının farklı görünür sonucu,
- memory-only entity’nin fiziksel entity sayılamaması,
- `fallbackOnFailure: false` iken hiçbir fallback seçeneği dönmemesi,
- displayed-option tekrar penceresi,
- transactional state ve anchor sınırları.

## 20 tur hedefi ve mevcut karar

Gerçek yerel akışta yeni motorla temiz başlangıç, SDXL commit, loop ve Qwen retry akışı doğrulandı. Ancak mevcut yerel Qwen’in bazı cevapları strict manifest/after-state/repetition gate’inden geçmediği için sistem bilinçli olarak bekleme moduna kaldı. Bu nedenle 20/20 yaratıcı tur tamamlandı diye raporlanmamıştır.

Bu bir altyapı çökmesi değildir: sahne görüntüsü, loop, state ve Node/Comfy sağlıklı kaldı; kabul edilemez Qwen cevabı izleyiciye gösterilmedi. Planın “alakasız fallback yerine ritmi uzat” tercihi uygulanmıştır.

## Dosyalar

- `app/lib/options.mjs` — manifest, strict Qwen parse/grounding/after-state gate.
- `app/server.mjs` — fresh-dream transaction, Qwen-only option activation, single-flight retry.
- `public/index.html` — yeni ambient asset.
- `public/app.js` — 0.08 ambient, hafif cue ve `RÜYA DÜŞÜNÜYOR…` UI.
- `config.json` — 8 saniye vote.
- `test/qwen-first-manifest.test.mjs` — yeni manifest testleri.

## Son durum

- `ANIMATEDIFF_ENABLED=false`
- IMAGE_MOTION aktif.
- Comfy ve Qwen private/local.
- Eski ambient geri alma asset’i mevcut.
- Fallback katalog uyumluluk/test kodunda kalır; normal canlı seçenek akışında çağrılmaz.
