# Seçenek Motoru Uçtan Uca Forensic Audit

Tarih: 2026-09-02  
Kapsam: Mevcut çalışan Node.js + Qwen + SDXL/Profile C + IMAGE_MOTION sistemi  
Bu turda: seçenek motoru değiştirilmedi; yalnızca kod ve mevcut event logları incelendi.

## Kısa sonuç

Seçenekleri normalde Qwen üretmeye çalışıyor. Ancak Qwen yanıtı zaman aşımına uğradığında veya doğrulamadan geçemediğinde Node tarafındaki \`sceneBoundRecoveryOptions()\` devreye giriyor. Bu recovery katmanı kod içinde seçenek yazıyor. Yani kullanıcının gördüğü her çiftin Qwen tarafından yazıldığı doğru değil.

Mevcut tekrar döngüsünün ana nedeni:

1. Qwen çağrısı çoğunlukla \`QWEN_TIMEOUT\` ile sonuçlanıyor.
2. İki başarısızlıktan sonra recovery seçeneği otomatik etkinleşiyor.
3. Recovery, mevcut scene manifestinden güvenli bir çift kuruyor.
4. Tekrar kontrolü gösterilen basit Türkçe etiket ile recovery kaydının sonuç-ağırlıklı signature’ı arasında tam eşleşmediği için aynı fiziksel eylem farklı turlarda yeniden seçilebiliyor.
5. Aynı küçük rota grafiği ve aynı mevcut varlıklar kaldığı için seçenekler kelime değiştirerek aynı geleceğe dönüyor.

Sonuç: Sorun yalnızca “Qwen yaratıcı değil” değil. Qwen’in timeout/rejection oranı ile Node recovery ve tekrar kimliği birlikte aynı döngüyü üretiyor.

## Mevcut sistemde gerçekten hangi hafıza tutuluyor?

Sistem tam rüya hikâyesini tek bir sınırsız dizi olarak saklamıyor.

\`normalizeStoryState()\` sınırları:

- \`recent_events\`: son 6 olay.
- \`recent_options\`: son 20 gösterilen seçenek.
- \`recent_situation_families\`: son 20 aile.
- \`recent_visual_motifs\`: son 20 motif.
- \`recent_compositions\`: son 6 kompozisyon.
- \`scene_anchors\`: en fazla 3, TTL ile azalıyor.
- \`open_hooks\`: en fazla 3.
- \`memory_entities\`: en fazla 12.
- \`important_objects\`: memory görünümünün son 5 kaydı.
- \`current_scene_entities\`: yalnızca normalize edilmiş mevcut manifest varlıkları.

Dolayısıyla seçenek geçmişi için pratik hafıza yaklaşık son 10 turdur (tur başına 2 seçenek). Eski olayların tamamı story-state içine taşınmıyor. Teknik event logu ayrı bir geçmiş kaydıdır; bu log, seçenek üretim bağlamı olarak Qwen’e verilmez.

## Uçtan uca tur akışı

\`\`\`text
Browser/WebSocket veya YouTube oyu
        |
        v
acceptVote()
  - yalnız PLAYING_VOTING kabul edilir
  - userId başına ilk geçerli oy tutulur
        |
        v
nextRound() tarafından açılmış 8 saniyelik pencere kapanır
        |
        v
closeVote()
  - kazanan çözülür
  - eşitlik/oy yoksa random winner kullanılır
  - winnerMeta = optionMeta(active options, winner)
  - active state değiştirilmeden pendingStoryState oluşturulur
        |
        +-----------------------------+
        |                             |
        v                             v
SDXL/Profile C                  Qwen generateOptions()
result-state image              pendingStoryState +
                                  son 20 seçenek
+-----------------------------+-----------------------------+
                              |
                              v
                    Promise.allSettled()
                              |
              +---------------+----------------+
              |                                |
       SDXL başarısız                    SDXL başarılı
              |                                |
       rollback; eski medya             yeni medya commit edilir
       ve eski state korunur             storyState diske yazılır
              |                                |
              |                         loop-motion async başlar
              |                                |
              +---------------+----------------+
                              v
                    Qwen sonucu incelenir
                              |
             +----------------+----------------+
             |                                 |
      geçerli Qwen çifti                 geçersiz/timeout
             |                                 |
      activateQwenOptions()          qwenFailures artırılır
      recent_options’a eklenir       ilk aşamada WAITING
      nextRound() açılır              iki başarısızlık sonrası
                                      sceneBoundRecoveryOptions()
                                      açılır
\`\`\`

## Qwen’in rolü

Qwen çağrısı \`app/lib/options.mjs\` içindeki \`generateOptions()\` fonksiyonunda yapılır.

Qwen’e verilen ana bilgiler:

- mevcut konum (\`S\`),
- mevcut fiziksel varlıklar (\`V\`),
- yalnızca ilan edilmiş komşu rota düğümleri (\`N\`),
- kullanılabilir route hint’leri (\`R\`),
- görünür entity’den türetilmiş action hint’leri (\`E\`),
- son 20 gösterilmiş etiket,
- bounded Jung/dream memory sinyalleri.

İstenen çıktı biçimi:

\`\`\`json
{
  "c": [
    ["Türkçe eylem", "English visible result after action", "allowed_place"],
    ["Türkçe eylem", "English visible result after action", "allowed_place"]
  ]
}
\`\`\`

Qwen’den beklenen:

- bir doğal devam,
- bir kontrollü sürpriz,
- kısa Türkçe imperatif eylem,
- eylem sonrası görünür İngilizce sonuç,
- mevcut sahne veya ilan edilmiş komşu konum.

Qwen görüntü dosyasını/piksellerini görmüyor. Yalnızca committed scene manifestini ve state metnini görüyor. Bu yüzden manifest doğruysa seçenek fiziksel bağlam açısından kontrol edilebilir; SDXL’in görüntüyü prompttan farklı çizmesini vision olmadan tespit edemez.

## Qwen yanıtı nasıl filtreleniyor?

Qwen yanıtı doğrudan ekrana basılmıyor. Sırasıyla:

1. JSON/pair parser çalışıyor (\`parseQwenCandidates\`).
2. Her aday \`qwenCandidateRecord()\` ile normalize ediliyor.
3. \`qwenCandidateGrounded()\` adayın mevcut manifestteki entity veya izinli route ile bağını kontrol ediyor.
4. \`evaluateCandidate()\` şu kontrolleri yapıyor:
   - Türkçe eylem,
   - kelime sayısı,
   - safety,
   - görünür sonuç,
   - mevcut scene grounding,
   - location/route geçerliliği,
   - aynı action/future/route tekrarları.
5. \`selectQwenPair()\` iki farklı gelecek oluşturan çifti seçmeye çalışıyor.
6. \`validateDynamicOptions()\` şema, patch, result prompt, anchor ve tekrar kontrollerini son kez uyguluyor.
7. Başarılıysa \`_qwenTrace.finalValidationResult = "qwen"\` olur ve çift active seçenek olur.

Dolayısıyla Qwen’in bir şey yazmış olması, o şeyin kullanıcıya gösterileceği anlamına gelmiyor. Geçersiz, tekrarlı veya context dışı yanıtlar eleniyor.

## Recovery ve kodun seçenek yazdığı yerler

### 1. \`sceneBoundRecoveryOptions()\`

Dosya: \`app/lib/options.mjs\`

Server tarafında Qwen iki kez başarısız olduğunda çağrılıyor:

\`\`\`js
if (qwenFailures >= 2) {
  const recovery = sceneBoundRecoveryOptions(...);
  if (recovery) await activateQwenOptions(recovery, "scene_bound_recovery");
}
\`\`\`

Bu fonksiyon Qwen’den yeni fikir istemiyor. Kod içinde mevcut manifest ve komşu route’lardan kayıt üretiyor.

Öncelik sırası:

1. Mevcut entity’den türetilen local action’lar:
   - \`Makineyi çalıştır\`
   - \`Makinenin ışığını izle\`
   - \`Ön kapıyı aç\`
   - \`Kapının ardını dinle\`
   - \`Çatlak yolda ilerle\`
   - \`Yolun çatlağını izle\`
   - vb.
2. İlan edilmiş adjacent route kayıtları.
3. Hiçbir uygun çift kalmazsa eski liveness çifti:
   - \`Mekânda sessizce kal\`
   - \`Figüre yaklaş\`

Recovery sonuçları güvenli ve scene-bound olsa da yaratıcı kaynak değildir. Aynı manifest uzun süre değişmezse aynı kayıtlar yeniden üretilebilir.

### 2. \`fallbackOptions()\` / \`jungAwareFallbackOptions()\`

Bu iki katmanda daha geniş tarihî fallback katalogları hâlâ kodda bulunmaktadır. Bunlar eski uyumluluk ve test yolu içindir. Normal server akışında \`generateOptions(..., fallbackOnFailure: false)\` kullanıldığı için Qwen failure doğrudan geniş katalogdan seçenek almaz; server önce WAITING, sonra scene-bound recovery kullanır.

Yine de \`generateOptions()\` başka bir caller tarafından \`fallbackOnFailure: true\` ile çağrılırsa Jung-aware fallback ve katalog devreye girebilir. Bu nedenle “kodlarda hiç seçenek yazılmıyor” ifadesi mevcut kod için doğru değildir.

## Neden farklı kelimelerle aynı döngü oluşuyor?

### Gözlenen tekrar

Son event loglarında aynı mevcut sahnede şu çift defalarca görülmüş:

\`\`\`text
Makineyi çalıştır
Makinenin ışığını izle
\`\`\`

### Teknik nedenler

1. **Qwen timeout oranı yüksek.** Qwen çağrısı için production config şu an 8 saniye sınırında. Yanıt bu süreyi geçerse client \`QWEN_TIMEOUT\` döndürüyor.

2. **Recovery tekrar kullanılabilir.** İki Qwen failure sonrası recovery otomatik olarak aktifleşiyor ve her yeni sahne/round sonrasında tekrar çağrılabiliyor.

3. **Tekrar hafızası çoğunlukla string label.** \`recent_options\` gösterilen Türkçe etiketleri tutuyor. Recovery adayının \`futureSignature()\` değeri ise action ailesi + target + consequence ailesi + intent içeriyor. Önceki kayıt yalnız string olduğunda aynı fiziksel gelecek her zaman aynı signature olarak hesaplanamıyor.

4. **Aynı varlık tekrar tekrar seçilebilir.** \`machine_room\` içindeki \`machine\` ve \`anonymous figure\` uzun süre current manifestte kalıyor. Yeni bir route commit edilmezse entity action pool’u değişmiyor.

5. **Family geçmişi yumuşak sinyal.** \`recent_situation_families\` çoğunlukla ranking/cooldown sinyali; recovery için fiziksel action/future bazında sert bir yasak değil.

6. **Rota grafiği dar.** \`SCENE_ADJACENCY\` birkaç sabit route düğümünden oluşuyor. Route seçeneği elendikten sonra aynı mekândaki entity seçenekleri baskın kalıyor.

7. **Qwen’in sonucu görüntüyle doğrulanmıyor.** Qwen current manifesti doğru kullansa bile fiziksel image composition aynı kalabilir; vision olmadığı için bu ayrı bir doğrulama katmanı yok.

Bu yüzden görünen problem “aynı Türkçe cümle birebir tekrar ediyor”dan daha geniştir: aynı target ve aynı consequence ailesi, farklı fiillerle tekrar tekrar seçilebiliyor.

## Mevcut log kanıtı

Kaynak: \`state/events.jsonl\`, son 500 event.

\`\`\`text
QWEN_OPTIONS_REJECTED: 29
QWEN_OPTIONS_WAITING: 15
qwen_scene_bound_recovery: 14
qwen_options_started: 14
NEXT_SCENE_COMMITTED: 15
sdxl_image_ready: 15
loop_ready: 15
VOTING_OPENED: 15
VOTING_CLOSED: 15
\`\`\`

Son rejection nedenleri:

\`\`\`text
QWEN_TIMEOUT: 30 gözlem
\`\`\`

Son recovery kayıtlarında aynı \`machine_room\` manifestinde tekrar eden çift:

\`\`\`text
Makineyi çalıştır / Makinenin ışığını izle
\`\`\`

Bu kanıt, o anda kullanıcının gördüğü seçeneklerin önemli bölümünün Qwen tarafından değil, timeout sonrası Node recovery katmanından geldiğini gösteriyor.

## Seçenek kaynağı için gerçek karar ağacı

\`\`\`text
Qwen URL var mı?
  hayır -> _qwenUnavailable -> server retry/recovery
  evet
    |
    Qwen slots boş mu?
      hayır -> retry schedule
      evet
        |
        tek Qwen çağrısı + bounded retry
          |
          geçerli iki Qwen adayı?
            evet -> source=qwen -> active seçenekler
            hayır/timeout
              |
              qwenFailures < 2 -> WAITING + retry timer
              qwenFailures >= 2 -> source=scene_bound_recovery
                                      |
                                      entity local pair
                                      -> route pair
                                      -> generic liveness pair
\`\`\`

## Jung katmanı şu anda ne yapıyor?

Jungian motor anlam yönünü ve intent metadata’sını etkiliyor:

- curiosity,
- confrontation,
- avoidance,
- control,
- surrender,
- recurring symbols,
- compensation,
- archetypal role.

Normal Qwen promptunda \`DREAM MEMORY SIGNALS\` ve counterbalance yönü bulunuyor. Fakat Jung motoru Qwen’in yerine seçenek yazmıyor; Qwen’e yön veriyor. Qwen timeout olduğunda kullanılan scene-bound recovery fiziksel olarak Jung motorundan bağımsız, manifest-temelli bir güvenlik çiftidir. \`jungAwareFallbackOptions()\` ise legacy fallback caller’ları içindir.

Bu nedenle mevcut sistemde Jung anlatı yönü kullanılıyor, ancak kullanıcıya gösterilen her seçeneğin Jung tarafından üretildiği söylenemez.

## Fotoğrafa uyan seçenek konusu

Mevcut garanti seviyesi:

\`\`\`text
committed scene manifest
+ current_scene_entities
+ current_location
+ result summary
+ bounded recent options
\`\`\`

Bu yapı “manifestte olmayan koridor/portal/küreyi normal seçenek olarak ekleme” sorununu sınırlar. Ancak gerçek PNG pikselleri okunmadığı için:

- fotoğrafta manifestte olmayan bir nesne varsa sistem bunu göremez,
- SDXL prompttan saparsa seçenek motoru bunu algılayamaz,
- composition değişiklikleri seçenek doğrulamasına girmez.

Bu, mevcut mimarinin bilinen sınırıdır; vision eklenmeden çözülemez.

## Zoom durumu

Bu audit sırasında zoom filtresine dokunulmadı. Mevcut \`app/lib/loop-motion-engine.mjs\` halen loop asset içinde merkez sabitli hafif zoom filtresini kullanıyor. Bu rapor seçenek motoru içindir; zoom kaldırma/değiştirme ayrı bir uygulama işlemidir.

## İncelenen ana dosyalar

- \`app/server.mjs\`
  - vote lifecycle, Qwen retry, scene commit, recovery activation.
- \`app/lib/options.mjs\`
  - state normalization, Qwen parser, grounding, validation, pair selection, recovery ve legacy fallback.
- \`app/lib/jungian-dream-engine.mjs\`
  - psyche, recurring symbol, fallback intent/dekorasyon katmanı.
- \`app/lib/loop-motion-engine.mjs\`
  - statik PNG’den MP4 loop üretimi; bu auditte değiştirilmedi.
- \`config.json\`
  - \`voteSeconds=8\`, \`qwenTimeoutMs=8000\`, Profile C image ayarları.
- \`state/events.jsonl\`
  - runtime event kanıtı.

## Sonuç

Mevcut seçenek motoru üç ayrı davranışın birleşimidir:

1. **Qwen creative path:** normalde beklenen ana yol.
2. **Node scene-bound recovery:** Qwen timeout/rejection sonrası gerçek seçenek yazarı gibi davranan kod yolu.
3. **Legacy Jung/fallback catalogue:** normal canlı akışta ana yol değil, fakat kodda mevcut uyumluluk yolu.

Bu nedenle aynı seçenek ailesinin farklı kelimelerle dönmesi beklenebilir: Qwen’in yaratıcı üretimi kesildiğinde sistem, mevcut manifestteki aynı fiziksel varlıklardan tekrar tekrar güvenli seçenekler türetiyor; mevcut tekrar kontrolü label düzeyinde tam semantik future kimliği taşımıyor.

Bu rapor herhangi bir çözüm veya production değişikliği önermemektedir. Sadece mevcut davranışın kaynağını ve sınırlarını belgelemektedir.

