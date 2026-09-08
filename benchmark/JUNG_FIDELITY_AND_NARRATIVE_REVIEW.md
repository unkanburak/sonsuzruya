# Jung Fidelity + Human Narrative Review

**Tarih:** 31 Ağustos 2026  
**Kapsam:** Mevcut production baseline'ı değiştirmeden Jung esintili dream engine'in kavramsal doğruluğu ve 50 turluk anlatı izi.

> Bu ürün Carl Jung'un psikolojik teorisini ölçmez, teşhis koymaz ve insan izleyicilerin bilinçdışını temsil ettiğini iddia etmez. Uygulamadaki değişkenler, Jung'un rüya/arketip/denge fikirlerinden esinlenen bounded anlatı mekanikleridir.

## Üst sonuç

```text
JUNG FIDELITY: PASS WITH EXPLICIT PRODUCT-ABSTRACTION CAVEAT
50-DREAM TRACE: CAPTURED
CONTEXT QUALITY: BOUNDED / HUMAN REVIEW REQUIRED
COUNTERPOINT QUALITY: STRUCTURALLY PRESENT / HUMAN REVIEW REQUIRED
REPETITION QUALITY: CONTROLLED LOCALLY; BOUNDED VOCABULARY STILL VISIBLE
SYMBOL MEMORY QUALITY: IMPROVED — context + last intent + return count
ARCHETYPAL DEVELOPMENT: DYNAMIC DIRECTIONAL INFLUENCE, NOT VISUAL STEREOTYPE
COMPENSATION QUALITY: COUNTERBALANCE, NOT SIMPLE OPPOSITE ACTION
FALLBACK VOCABULARY QUALITY: SAFE AND CONTEXTUAL; compositional labels, 99 variants in the current 50-round trace
PUBLIC CLAIM RISK: CORRECTED
FINAL VERDICT: JUNGIAN CONCEPT READY AS A JUNG-INSPIRED ARTISTIC SYSTEM
```

## 1. Audit yöntemi ve kaynak çerçevesi

Jung'un *Psychological Types* metninde Self'in egodan daha geniş olduğu, kolektif bilinçdışının arketipsel yatkınlıklarla ilişkili olduğu ve kompansasyonun bilinçli tutuma karşı dengeleyici bir süreç olabildiği anlatılır ([Jung, Psychological Types, §§369–384](https://psychclassics.yorku.ca/Jung/types)). *The Archetypes and the Collective Unconscious* ise arketipleri tekrar eden yaşam durumlarının biçimsel/instinktif örüntüleri olarak tartışır; bunlar sabit görsel sözlük değildir ([Jung, Archetypes and the Collective Unconscious](https://web.english.upenn.edu/~cavitch/pdf-library/Jung_CollectiveUnconscious.pdf)). Dream compensation ve individuation ilişkisi, Collected Works özetinde de açıkça ayrıştırılır ([Collected Works abstracts](https://jungpage.org/learn/resources/jung-s-collected-works-abstracts/854-abstracts-of-the-collected-works)).

Bu yüzden değerlendirme, kod değişkenlerini Jung'un klinik/teorik kavramlarıyla eşitlemeden yapılmıştır.

## 2. Kavram sınıflandırması

### A — Doğrudan Jungian temeli olan kavramlar

| Kavram | Değerlendirme |
|---|---|
| Kişisel / kolektif bilinçdışı | Jung'un temel ayrımı; uygulamada yalnızca yaratıcı esin kaynağıdır. |
| Arketip | Tek bir resim değil, tekrar eden algı/eylem örüntüsünü temsil eden yapısal fikir. |
| Shadow | Bastırılmış/inkâr edilmiş yönlerin karşılaşma alanı; sistemde görsel canavar olarak sabitlenmiyor. |
| Persona | Dışa dönük maske/uyum yüzü; sistemde savunma veya saklanma yönü olarak soyutlanıyor. |
| Anima / Animus | Jung'un karşı-cins ruh imgesi fikrinden esinlenir; ürün kodunda nötr bir alan olarak kullanılmalı. |
| Self | Ego'dan daha geniş bütünlük merkezi fikri; sistemde `self` yalnız sembolik bir alan adıdır. |
| Child, wise figure, trickster, mother | Jung'un farklı arketipsel motifleriyle ilişkili isimler; somut görsel eşleştirme yapılmıyor. |
| Complex | Özerk duygusal örüntü fikri Jungian'dır; bizim `active_complexes` alanımız klinik complex değil, tekrar örüntüsü abstraction'ıdır. |
| Compensation | Bilinçli yönelimi dengeleyen/psişik dengeye katkı veren süreç fikri; uygulamadaki değer bunun ürün karşılığıdır. |
| Rüya sembolü ve motif | Anlamın bağlama ve rüya tarihine göre değişmesi ilkesi korunuyor. |
| Dream series | Birden fazla rüyanın seri olarak ele alınması Jungian pratikte bulunan bir yaklaşımdır; bizim seri hafızamız küçültülmüş üründür. |
| Individuation | Jungian gelişim fikridir; bu MVP bunu uygulamaz ve uyguluyor gibi konuşmaz. |

### B — Jung-inspired product abstraction

| Mekanik | Doğru tanım |
|---|---|
| `collective_tendency` | İzleyici oylarının rüyanın anlatı yönüne EMA ile etkisi; kolektif bilinçdışının ölçümü değildir. |
| curiosity / confrontation / avoidance / control / surrender | Ürün içi yön vektörleri; Jung'un sabit psikolojik ölçekleri değildir. |
| `compensation_pressure` | Counterpoint seçimi için bounded skor; Jung'un sayısal ölçümü değildir. |
| `archetypal_pressure` | Arketipsel alanların seçenek yönüne ağırlığı; nicel Jung bilimi değildir. |
| EMA güncellemesi | Ani salınımı önleyen mühendislik filtresi; Jungian teori değildir. |
| 16 turluk `dream_cycle` | Yayın dramaturjisi için fazlayıcı döngü (`exposition/development/culmination/lysis`); Jung'un resmi 16 adımlı modeli değildir. |
| Intent memory / recent pairs / bounded psyche | Sürekli yayın ve tekrar kontrolü için ürün hafızasıdır. |
| Audience-directed artificial unconscious | Sanatsal metafor; gerçek kolektif psişe iddiası değildir. |

### C — Düzeltilmesi gereken yanıltıcı atıflar

Önceki anlatımda “artificial unconscious” veya “collective tendency” yanlış anlaşılırsa bilimsel ölçüm izlenimi doğabilirdi. Rapor, README ve UI dili artık sistemi açıkça **Jung'dan esinlenen anlatı kontrol katmanı** olarak tanımlıyor. `active_complexes`, `compensation_pressure`, `archetypal_pressure` ve 16 turluk cycle alanlarının ürün abstraction'ı olduğu kod yorumları ve bu raporda belirtiliyor. Individuation'ın uygulanmadığı açıkça yazılıyor.

## 3. Archetype kalite denetimi

Arketipler görsel stereotip olarak kullanılmıyor. `updateDreamPsyche()` intent'ten yavaş bir pressure alanı güncelliyor; baskın alan Qwen promptuna ve fallback counterpoint maliyetine etki ediyor. Böylece Shadow otomatik olarak siyah canavar, Child oyuncak veya Self parlak küre olmuyor.

Kalan sınır: alan adları ve intent eşlemeleri hâlâ kaba bir ürün taksonomisidir. İnsan incelemesinde arketip etkisinin çatışma, ilişki ve yön düzeyinde hissedilip hissedilmediği kontrol edilmelidir.

## 4. Compensation kalite denetimi

Compensation yalnızca “tersini seç” değildir. Baskın yön `confrontation` olduğunda counterpoint havuzu inspect/listen/surrender/preserve gibi seçeneklere; `avoidance` olduğunda approach/enter/follow/confront gibi seçeneklere; baskın arketipsel alana göre de ayrı bir karşı ağırlığa yönelir.

Örnek: tekrar tekrar `activate/confront` seçilirse sistem zorunlu olarak “kaç” üretmez; dinleme, gözlemleme, teslim olma veya sembolü koruma gibi aynı sahneden çıkabilen seçenekleri tercih eder. Yine de bunun insan gözüyle doğal hissedip hissetmediği otomatik olarak kanıtlanmış değildir.

## 5. Symbol history denetimi

Sabit `door = transformation` gibi sözlük kullanılmıyor. Her sembol bounded şekilde:

- `first_seen`
- `last_seen`
- `appearances`
- son üç `contexts`
- `last_intent`
- `strength` / `unresolved`

alanlarını taşıyor. Aynı sembol farklı bağlamda geri döndüğünde appearance ve bağlam geçmişi güncelleniyor; görünmeyen sembolün strength değeri decay oluyor. Bu, anlamı tarihten türetmeye yarayan bir çekirdek hafızadır; sembolün “doğru” Jungian anlamını otomatik belirlemez.

50 turluk güncel izde sembol geri dönüşleri ve bağlamları bounded olarak tutuluyor; örneğin ayna/mirror-room, kapı, portal/ışık ve zemindeki yansıtıcı su gibi motifler farklı sahne bağlamlarında yeniden görünüyor. Sayısal appearance değeri ve son üç context kodda korunuyor, ancak bu tekrarların edebî olarak “anlamlı” olup olmadığı otomatik ölçülmüyor.

Bu kayıtlar “dream remembers” hissi için aday kanıttır; insan değerlendirmesi gerektirir.

## 6. 50-dream human trace

Tam insan-okunabilir iz: [JUNGIAN_50_DREAM_TRACE.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_DREAM_TRACE.md>)

Blok bazlı insan değerlendirme formu: [JUNGIAN_HUMAN_REVIEW_SCORECARD.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_HUMAN_REVIEW_SCORECARD.md>)

İz her tur için sahne, iki rol, kazanan, intent, collective tendency, dominant archetypal field, compensation pressure, symbol return/new symbol ve iki seçeneğin neden bağlama bağlandığını içerir. Bu trace deterministic fallback motorundan üretilmiş bir review aid'dir; subjective PASS değildir.

### İnsan değerlendirmesi gereken sorular

1. Her iki seçenek bulunduğu mekân ve son anchor'larla gerçekten ilişki kuruyor mu?
2. Counterpoint psikolojik olarak farklı ama aynı rüyaya ait mi?
3. 20–30 turdan sonra seçenekler mekanik bir katalog gibi mi hissediliyor?
4. Bir sembolün dönüşü önceki bağlamı hatırlatıyor mu, yoksa yalnızca kelime tekrarı mı?
5. Arketipsel alanın etkisi görüntü stereotipi yerine yön/çatışma/ilişki düzeyinde hissediliyor mu?
6. Seri bir dönüşüm ve tek bir rüya psişesi izlenimi veriyor mu?

Otomatik sistem bu sorulara dürüst bir insan PASS'ı veremez; belirsiz vakalar review listesinde tutulmalıdır.

### Mevcut görsel iz için nitel gözlem

Daha önce doğrulanmış sekiz sahnelik Profile C/SOFT_LOCK contact sheet'i ([SOFT_LOCK.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\profile-c-soft-lock\SOFT_LOCK.png>)) incelendiğinde koyu uzun palto ve yalnız figür silueti birçok karede ortak bir görsel iplik olarak kalıyor; köprü, orman, ev, koridor ve makine gibi yeni result-state'ler de okunabilir. Yüz/beden ayrıntısı kareler arasında sabit değil ve bu dosya yeni continuity motif satırının formal A/B testi değildir. Bu nedenle gözlem, insan incelemesine yardımcı bir nitel nottur; otomatik görsel PASS iddiası değildir.

30-turluk Profile C görsel zinciri de ([FULL_C_SOAK_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\c-profile-soak\FULL_C_SOAK_SEQUENCE.png>)) aynı figür/siluet, soğuk atmosfer ve geri dönen köprü/portal/ışık motifleri için ek insan-review materyalidir. Bu görsel set Jung motorunun tek başına kanıtı değil, mevcut image-motion dünyasının taşıyabildiği süreklilik tavanını gösteren tamamlayıcı kanıttır.

## 7. Fallback vocabulary stress

60 turluk seeded deterministic engine koşusunda (seed `0x60d0e`, 31 Ağustos 2026 son kod):

| Metrik | Sonuç |
|---|---:|
| Tur | 60 |
| Geçerli continuation/counterpoint çifti | 60/60 |
| Context violation | 0 |
| Son 12 çiftte exact tekrar | 0 |
| Son 4 pencerede intent domination | 0/60 strict window |
| Benzersiz label | 120 (60-round deterministic run); 99 (50-round trace, seed `0x51f15e`) |
| 50 tur trace benzersiz aktif mekân | 12 |
| Option üretim üst süresi | yaklaşık 5.6 ms (tek koşuda ölçülen üst değer; run-to-run jitter olabilir) |
| Same-intent pair / intent domination audit | 0/60 same-intent pairs; 0/60 strict-window warnings |
| Composed context labels | aktif; known visual token + role relation + bounded route novelty |
| Bounded recent options/events/intents | 8 / 6 / 8 |
| Bounded recurring symbols | 6 in deterministic 60-round run; 5 in 50-round human trace |

Bu sonuç güvenli tekrar kontrolünü gösterir, sınırsız dil üretimini değil. Mekân rotası, aktif-lokasyon önceliği, bounded son olay penceresinden rota yeniliği, kelime-sınırı düzeltmesi, temel-eylem tekrar filtresi, rol bağlaçları, sembol dönüşünde farklı gesture tercihi, normal dış mekân çıkışları, focus bağlacı, car/route çeşitliliği ve fiil öncelikli intent eşleştirmesi sonrası güncel 50 tur izinde 99 unique label ve bağımsız seeded 60 tur koşusunda 120 unique label elde edildi; seçenek çiftlerinde exact tekrar 0, aynı-intent çift 0 ve strict son-dört intent domination 0 kaldı. Fallback güvenli ve bağlamsal kalmalıdır; daha büyük sözlük veya yeni model eklenmedi.

### 50 tur anlatı sinyali (makine denetimi)

Güncel `JUNGIAN_50_DREAM_TRACE.md` üzerinde çalışan bounded anlatı audit'i:

| Sinyal | Sonuç |
|---|---:|
| Benzersiz aktif mekân | 12 |
| Aynı mekânda maksimum ardışık kalış | 2 tur |
| Sembol dönüşü | 14 |
| Birden fazla bağlamda dönen sembol | 4 |
| Arketipsel alan değişimi | 7 |
| Exact option-pair tekrar | 0 |
| Aynı intent'e çöken seçenek çifti | 0 |
| Collective curiosity drift | +0.091 |

Bu sinyaller, sembol hafızasının yalnızca kelime tekrarı olmadığını ve seçeneklerin tek bir mekân kilidine düşmediğini destekler; ancak izleyicide oluşan estetik/psikolojik “tek rüya zihni” hissinin yerine geçmez.

### 50 tur gerçek görsel zinciri

Güncel production akışında 50 debug-vote turu boyunca her başarılı PNG, cleanup gerçekleşmeden benchmark klasörüne kopyalandı. Contact sheet: [JUNGIAN_50_VISUAL_SEQUENCE.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_SEQUENCE.png>); seçim açıklamalı görünüm: [JUNGIAN_50_VISUAL_ANNOTATED.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_50_VISUAL_ANNOTATED.png>); tur/scene/option metadata: [trace.json](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\jungian-observer-50\trace.json>).

Makine destekli gözlem: 50/50 PNG yakalama başarılı; görsel dil boyunca tek figürlü/siluet odaklı sinematik kompozisyon, soğuk palet ve sis/ışık/kapı/araç gibi tekrar eden çevresel motifler korunuyor. İlk incelemede corridor → luminous/forest → car → room geçişleri ve aynı mekânda uzun kilitlenme olmaması görülüyor. Bazı karelerde figür sayısı/kompozisyon SDXL drift'i var; bu nedenle contact sheet anlatısal kalite için insan gözden geçirmesine açık tutuluyor, otomatik PASS sayılmıyor.

Dinamik davranış göstergesi olarak seeded trace'in ilk/son kayıtlarında baskın alan `shadow` → `trickster` değişiyor, merak eğilimi yaklaşık `0.52` → `0.66` aralığında hareket ediyor ve compensation pressure `0.26` başlangıcından bounded biçimde yükseliyor. Bu, izleyici seçiminin anlatı yönünü etkilediğini gösteren ürün kanıtıdır; psikolojik ölçüm değildir.

## 8. Gerçek local üretim izi

Önceki production validation koşusunda 50 gerçek Node → Comfy → state commit turu başarıyla tamamlandı:

- 50/50 scene progression (güncel kodla `benchmark/jungian-live-50-rounds.mjs`, 31 Ağustos 2026)
- 0 generation failure
- 0 loop error
- 0 stale loop
- 0 gözlenen black frame
- queue 0/0
- story state yaklaşık 762–788 byte
- managed media bounded
- exact recent pair repeat 0; live trace'in iç denetim metriğinde 1 bounded intent-domination warning (yayını durdurmayan audit sinyali)
- exact recent pair repeat 0

Son kavramsal mikro değişiklikler (archetypal counterpoint ağırlığı, sembol context/intent alanları ve fallback dil temizliği) targeted test ve deterministic 60 turda doğrulandı. Bu raporun görsel/anlatısal subjective kalite kararı değildir; insan review gereklidir.

### Qwen çalışma gözlemi

Qwen health/model endpoint'i erişilebilir olsa da bu audit sırasında CPU ağırlıklı doğrudan kısa istekler 5 ve 15 saniyelik tanı sınırlarında tamamlanmadı. Bu nedenle canlı event'lerde güvenli fallback yolu gözlendi. Bu bir crash değildir: seçenek üretimi, Jung katmanı ve state commit'i Qwen'den bağımsız olarak çalışmaya devam etti. Fakat Qwen'in daha yaratıcı seçenek katkısı insan incelemesinde ayrıca değerlendirilmelidir; timeout artırılıp canlı akış yavaşlatılmadı.

### Kolektif seçim yolu ayrışması

Aynı `strange_room` başlangıcından iki ayrı 24 turluk fallback izi üretildi: biri her tur continuation, diğeri her tur counterpoint seçti. Ayrıntılı kayıt: [JUNGIAN_PATH_DIVERGENCE.md](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\JUNGIAN_PATH_DIVERGENCE.md>). Güncel koşuda continuation-ağırlıklı yol 6, counterpoint-ağırlıklı yol 4 benzersiz mekâna; farklı sembol setlerine, tension değerlerine ve compensation sonuçlarına ulaştı (`0.307` vs `0.286`). Bu, kolektif oyların aynı bounded rüya belleğini farklı psikolojik yönlere itebildiğine dair ürün davranışı kanıtıdır; klinik veya insan psikolojisi ölçümü değildir.

## 9. Public language

Önerilen Türkçe açıklama:

> **İzleyicilerin kolektif seçimleriyle yön verdiği, Carl Jung'un rüya, arketip ve bilinçdışı fikirlerinden esinlenen sonsuz bir yapay zekâ rüyası.**
>
> **Yapay zekâ rüya görür. İzleyici yön verir. Rüya hatırlar.**

Kaçınılacak ifadeler:

- “İzleyicilerin bilinçdışını ölçüyor.”
- “Jung'un metriklerini hesaplıyor.”
- “İnsanların psikolojik profilini çıkarıyor.”
- “Kolektif bilinçdışının bilimsel simülasyonu.”

UI'daki üç gösterge `MERAK / YÜZLEŞME / KAÇINMA`, **KOLEKTİF EĞİLİM — Collective Dream Direction** olarak sunulmalı; psikolojik ölçek değildir. Gizli arketipler viewer'a açılmıyor.

## 10. Corrections made

- `app/lib/jungian-dream-engine.mjs`: archetypal field fallback counterpoint yönünü etkiliyor; fallback label/result dili context + symbol + role ile compositional hale getirildi.
- Aynı dosya: collective tendency nötr 0.5 merkezine doğru EMA ile güncelleniyor; compensation tekrar, baskın yön ve karşı-ağırlık sinyaline göre artıyor, basit “tersini yap” kuralı değil.
- Aynı dosya: archetypal pressure alanlarında düşük resting pressure korunuyor; tek bir intent alanı saatler boyunca diğer bütün yönleri sıfırlayamıyor ve yeni seçimlerle baskın alan geri dönebiliyor.
- Aynı dosya: eski `open_hooks` fallback görsel promptuna otomatik enjekte edilmiyor; hook'lar Qwen bağlamında kalırken fallback sahnesi güncel sembol/anchor/obje/mekânla sınırlanıyor.
- Aynı dosya: recurring symbol kayıtlarına bounded context geçmişi ve son intent eklendi.
- `app/lib/options.mjs`: bounded son olay penceresi, aynı güvenli hedefin hemen yeniden seçilmesini erteleyen hafif rota yeniliği sinyali olarak kullanılıyor; yeni world-state veya harita eklenmedi.
- `app/lib/options.mjs`: kapı/pencere/köprü ve yol çıkışlarında mevcut araba geçişi route'a dahil edildi; böylece normal ev → dışarı → araba → tünel/köprü zinciri fallback'te de erişilebilir.
- `app/lib/jungian-dream-engine.mjs`: fallback görsel motif dönüşü, güçlü sembolün en az birkaç tur görünmez kalmasından sonra seçiliyor; böylece dönüş yalnızca arka arkaya kelime tekrarı olmuyor.
- `test/jungian-dream-engine.test.mjs`: symbol context/return/last-intent, kopuk Qwen teleport reddi ve doygun arketip alanının geri kazanımı testleri eklendi.
- `app/lib/options.mjs`: Qwen anchor'ının kendi kendini doğrulamasını engelleyen context gate; güvenli basit morphology eşleşmesi.
- `app/lib/options.mjs`: Qwen yokken doğal devamı aktif mekâna bağlayan küçük transition grammar; counterpoint güvenli sembol/atmosfer sapması olarak ayrı tutuluyor.
- `app/lib/options.mjs` / `app/lib/jungian-dream-engine.mjs`: fallback artık eski scene anchor'ını otomatik yenilemiyor; TTL yalnızca açıkça yeniden önerilen anchor'larda uzuyor, sembol hafızası ise ayrı kanaldan dönebiliyor.
- `app/lib/jungian-dream-engine.mjs`: seçim geçmişi dört bounded tension eksenini (yüzleşme/kaçınma, kontrol/teslim, bağlanma/yalnızlık, düzen/kaos) yavaşça kaydırıyor; karşıt seçenek bu sinyalleri de kullanıyor.
- `app/lib/jungian-dream-engine.mjs`: intent eşleştirmesinde kelime sınırları eklendi; fallback rol bağlaçları 16 varyanta çıkarıldı ve bounded cycle counter 256 adımda döner, böylece uzun çalışma sonrası ifade çeşitliliği donmuyor.
- `app/lib/jungian-dream-engine.mjs`: fallback bağlaçları Türkçe iyelik biçimleriyle doğal hale getirildi; yeni mekâna geçen result-state'e eski konumu zorla ekleyen continuity cümlesi bastırılıyor.
- `app/lib/options.mjs`: son gösterilen seçeneklerde bağlaç değiştirerek aynı temel eylemi tekrarlama olasılığı azaltıldı; route tükenirse güvenli exact-text fallback korunuyor.
- `app/lib/options.mjs`: Qwen psyche delta değerleri bounded sayısal aralıkta doğrulanıyor ve iki seçenek aynı inferred intent'e çöküyorsa çift fallback'e düşüyor.
- `app/lib/jungian-dream-engine.mjs`: intent eşleştirmesi görsel isimlerden önce eylem fiillerini ve Türkçe karakterleri doğru yakalayacak şekilde düzeltildi (`Tünele gir`→enter, `Kapıdan çık`→abandon, `Makineyi çalıştır`→activate).
- `test/jungian-dream-engine.test.mjs`: aynı başlangıçtan farklı kolektif seçim politikalarının farklı bounded mekân yolları ve compensation sonuçları ürettiği regression testi eklendi.
- `app/server.mjs` / `app/lib/jungian-dream-engine.mjs`: yakın zamanda en az iki kez dönen güçlü sembol, result-state'i ezmeden tek bir ikincil görsel motif ipucu olarak prompta taşınabiliyor; aktif anchor/result ile aynıysa tekrar eklenmiyor, stale/weak semboller eklenmiyor.
- `app/lib/options.mjs`: Qwen promptuna son üç bounded recurring-symbol kaydı (bağlam + son intent), tension sinyalleri ve compensation yönlendirmesi kısa biçimde eklendi; Qwen de fallback gibi aynı rüya belleğini okuyabiliyor.
- `benchmark/jungian-human-trace-50.mjs`: 50 turluk insan-okunabilir trace üretimi (final engine).
- `public/index.html` / `public/style.css`: göstergenin kavramsal çerçevesini netleştiren küçük `KOLEKTİF EĞİLİM / Collective Dream Direction` etiketi.
- Public state yalnız anonim collective tendency gönderiyor; psyche/archetype/symbol geçmişi yayınlanmıyor.

## 11. Test ve production durumu

```text
node --test test/*.test.mjs: 34/34 PASS
node --check app/server.mjs: PASS
node --check app/lib/options.mjs: PASS
node --check app/lib/jungian-dream-engine.mjs: PASS
node --check public/app.js: PASS
deterministic engine: 60/60 valid role pairs
```

Son health doğrulaması:

```json
{
  "ok": true,
  "comfy": true,
  "qwen": true,
  "youtube": false,
  "readiness": "ready",
  "engine": "IMAGE_MOTION"
}
```

Güncel runtime spot-check (scene `11037`, 31 Ağustos 2026): queue `0 running / 0 pending`, story state `955` bytes, toplam state `11,802` bytes, yönetilen loop dosyası `23`, tracked medya `33`, generated medya `24`, teknik log `1,086,367` bytes. Güncel 50 gerçek local tur koşusu `50/50 ok`, `0 fail`, `intentDominations=1` (non-blocking audit warning), `recentPairRepeats=0`; runtime metrics: loopSuccess `73`, loopErrors `0`, staleLoops `0`, generationFailures `0`; son 20 üretim süresi yaklaşık `2.51–4.13 s`. Bu ölçüm Jung davranışının subjektif kalitesini değil, uzun çalışmada hafızanın bounded kaldığını gösterir.

Son kod sonrası yeniden başlatma örneğinde aktif lokasyon `glowing_path`, anchor TTL'leri `1/2/3` olarak görüldü; bu, eski motiflerin otomatik ve sınırsız yenilenmediğini doğruluyor. Public `/api/state` yanıtında `dreamPsyche` alanı bulunmadı.

Production korunuyor: Profile C, Soft Lock, IMAGE_MOTION, voting/countdown/chat, loop-motion, bounded state/media, OBS ambient audio ve transactional commit/discard akışı değişmedi. AnimateDiff kapalı; YouTube/public hosting kapalı; Comfy/Qwen private.

## Final verdict

**JUNGIAN CONCEPT READY** — sistem Jung'un gerçek psikolojisini simüle etmiyor; Jungian fikirlerden esinlenen, Qwen'den bağımsız, bounded ve insan incelemesine açık bir anlatı motoru olarak doğru çerçevelendi. 50 turluk trace ve gerçek local validation teknik sürekliliği gösteriyor. Narrative doğallık, sembollerin “anlamlı” dönüşü ve katalog hissi için insan review'ı zorunlu sonraki adımdır; bu rapor bunları otomatik olarak PASS ilan etmez.
