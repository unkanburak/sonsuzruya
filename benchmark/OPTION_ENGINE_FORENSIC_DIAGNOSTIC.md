# SEÇENEK MOTORU FORENSIC DIAGNOSTIC

Tarih: 2026-08-31  
Kapsam: yalnız seçenek üretimi; production prompt/UI/audio/motion/model değişikliği yapılmadı.

## 1. CURRENT PIPELINE

Gerçek akış:

```text
committed storyState + bounded psyche
  → generateOptions(pendingStoryState, recent_options[-8:])
  → Qwen (8 s deadline, en fazla 2 deneme)
  → validateDynamicOptions + contextuallyRelevant (yalnız Qwen başarıyla dönerse)
  → timeout/reject durumunda jungAwareFallbackOptions
  → fallbackOptions: current_location/context route + finite catalog variants
  → Jung intent/motif/repetition scoring ve contextualizeFallback
  → final option_1 / option_2
  → sonraki round’da yalnız son 8 gösterilen etiket tekrar filtresi
```

Static audit bulguları:

- Görsel pikselden/Browser’daki gerçek kareden seçenek çıkarımı yok; grounding yalnız story metadata (`current_location`, objects, anchors, hooks) ve metin result prompt üzerinden.
- `contextuallyRelevant()` Qwen çıktısına uygulanıyor; fallback çıktısı bu gate’ten tekrar geçirilmiyor.
- `fallbackOptions()` geniş route havuzları kullanıyor. Bir oda/utility/koridor bağlamı; radyo, fotoğraf, portal, sis, su, araba gibi geniş katalog ailesini aynı anda açabiliyor.
- `contextualizeFallback()` çoğunlukla sonuna ilişki eki ekliyor; base eylemin aktif nesne/mekânla açıklanabilir olduğunu zorunlu kılmıyor.
- `recent_options` yalnız son 8 gösterilen etiketi tutuyor. Uzun vadeli exact-pair engeli yok; Jung `recent_pairs` ayrı psyche belleğinde olsa da fallback seçiminde doğrudan hard-block değil.
- Anchor TTL bounded (3) olsa da `open_hooks` için aynı TTL/expiry mekanizması yok; en fazla 3 hook tutuluyor fakat patch ile kaldırılmadıkça eski hook route context’ine girebiliyor.
- Jung katmanı intent/motif puanı ve counterpoint tercihi sağlıyor; candidate pool’u gerçek sahne varlıklarına zorlayan bir family/grounding gate değil.

## 2. 60-ROUND METRICS

`benchmark/option-forensic-60.json` ile production akışı üzerinden 60 ardışık local tur kaydedildi.

| Metrik | Sonuç |
|---|---:|
| Tur / gösterilen seçenek | 60 / 120 |
| Qwen başarılı | 0 |
| Fallback kullanılan | 60 |
| Kaynak bilinmeyen | 0 |
| Benzersiz etiket | 51 |
| Exact pair tekrar | 4 / 60 (%6,7) |
| Son 12 tura göre tekrarlı çift | 37 / 60 (%61,7) |
| Semantik olarak fazla yakın çift | 26 / 60 (%43,3) |
| Grounding 2 (güçlü) | 72 / 120 (%60,0) |
| Grounding 1 (dolaylı) | 7 / 120 (%5,8) |
| Grounding 0 (kopuk/symbolic) | 41 / 120 (%34,2) |
| En uzun aynı-family koşusu | 3 |
| Vote→sonraki sahne p50 / p95 | 14,63 s / 15,15 s |

Sürreal motif alt kümesi (portal/mirror/orb/glow/luminous vb.): 20/120 seçenek. Bunların 19’u (95%) en az dolaylı grounding taşıyor, 1’i (%5) grounding-0. Yani sürrealizmin kendisi ana hata değil; sorun, sürreal adayın hangi sahnede açıldığı ve iki seçeneğin aynı ailede toplanması.

Bu tur süresi seçenek problemi için bağlamdır; image-engine latency ölçümü değildir.

## 3. REPETITION ANALYSIS

Sıralı family dağılımı (120 seçenek):

- ENVIRONMENT_TRANSFORMATION: 34
- FIGURE_ENCOUNTER: 22
- NAVIGATION: 19
- OBJECT_EXAMINATION: 13
- NON_ACTION: 15
- DISCOVERY: 9
- MEMORY: 7
- OBJECT_EXCHANGE: 1

Navigation oranı %15,8’e düşmüş olsa da environment/figure seçenekleri hâlâ belirli generic motiflerle dönüyor. En sık görülen etiketler ve adetleri:

- `Aralık kapıyı izle` — 12
- `Arabayı sisli yola çıkar` — 11
- `Suyun içindeki ışığı izle` — 9
- `Pencerenin yanındaki kapıya geç` — 8
- `Yansıyan koridora ilerle` — 8

Exact string tekrar oranı düşük görünse bile son-12 semantik tekrar %61,7. Bunun nedeni suffix/ilişki eklerinin yeni etiket gibi görünmesi; aynı eylem ailesi ve aynı görsel trope geri geliyor. Pair-too-close %43,3 de iki seçeneğin gerçek bir alternatif yerine aynı gesture/intent etrafında toplandığını gösteriyor.

İlk 25 gözlenen çift:

1. Basamakların sonuna ulaş / Fotoğrafı çevir
2. Uzun koridoru takip et / Aynalı odaya gir
3. Alt kata geç / Kürelerin altına ilerle
4. Aralık kapıyı izle / Sis yoğunlaşsın
5. Arabaya bin / Durgun suya yaklaş — parıltının uzağında
6. Masadaki fişi incele — kapının ardından / Sis çöksün
7. Telefonu sessize al / Boş sınıfta sessiz kal
8. Kapının eşiğine ilerle / Çay fincanını koru
9. Aralık kapıyı izle / Fotoğrafı çevir
10. Arabaya bin / En uzun aynaya bak
11. Pencereye yaklaş / Sisin içine bak
12. Penceredeki ışığı izle / Yağmur başlasın
13. Uzun koridoru takip et / Durgun suya yaklaş
14. Radyoyu dinle / Aynaların arasından ilerle — suyun eşiğinde
15. Aralık kapıyı izle / Sis çöksün
16. Koridorun sonuna ilerle / Sisin içine bak
17. Basamakların sonuna ulaş / Kürelerin altına ilerle
18. Kapının eşiğine ilerle / Durgun suya yaklaş
19. Arabanın camından bak / Fotoğrafı çevir
20. Arabaya bin / Boş sınıfta sessiz kal — parıltının uzağında
21. Pencereye yaklaş — kapının ardından / Yağmur başlasın
22. Penceredeki ışığı izle / Sisin içine bak
23. Basamakların sonuna ulaş / Durgun suya yaklaş — parıltının altında
24. Masadaki fişi incele — parıltının ötesinde / Aynalı odaya gir
25. Arabaya bin / Boş sınıfta sessiz kal

## 4. VISUAL GROUNDING ANALYSIS

60 turdaki 120 final seçenek için metadata tabanlı grounding:

- 72 güçlü: aktif mekân/nesne/anchor ile ilişki kurulabiliyor.
- 7 dolaylı: ilişki eki veya karakter sinyali var, fakat result-state bağlantısı zayıf.
- 41 grounding 0: aktif committed scene’den açıklaması zor; çoğunlukla stale hook/symbolic prior veya geniş route havuzundan geliyor.

Örnek problem: `outside_door`/utility-room bağlamında `Arabaya bin` veya `Aynalı odaya gir` gibi seçenekler; mevcut metadata içinde genel indoor/threshold eşleşmesi bulduğu için geçiyor, fakat kullanıcı ekrana bakarak bu sonucu zorunlu olarak çıkaramaz.

Görsel grounding’in zayıf olmasının ana teknik nedeni, sistemin gerçek PNG’yi analiz etmemesi ve fallback’in yalnızca metin metadata’sına dayanmasıdır. `current_location` geniş regex ile eşleşince aktif nesnelerden bağımsız geniş bir pool açılıyor.

## 5. QWEN VS FALLBACK CONTRIBUTION

Bu 60 turda Qwen başarıyla seçenek döndürmedi: **Qwen 0 / fallback 60**. Dolayısıyla gözlenen davranış pratikte fallback motorunun davranışıdır. Qwen promptu iyi niyetli biçimde “current place/object/atmosphere/hook” ve family farklılığı istiyor; fakat runtime’da 8 saniyelik deadline içinde cevap gelmediği için bu yaratıcı katman kullanılmıyor. Mevcut `OPTIONS_CREATED` event’i yalnız `source` yazıyor; timeout mu, HTTP hata mı, JSON/schema reject mi ayrıştırılmıyor. Bu alt neden bu tanı çalışmasında kanıtlanamıyor ve ayrı bir logging gap olarak kalıyor.

Fallback çıktısı güvenli ve renderable; fakat `validateDynamicOptions/contextuallyRelevant` gate’inin dışında kaldığı için scene-grounding zorunluluğu yok. Bu, “portala gir” benzeri alakasız bir adayın route pool’dan gelmesinin açıklamasıdır.

## 6. STALE HOOK / ANCHOR EFFECT

- `scene_anchors`: en fazla 3 ve TTL decay var; tekrar önerilirse yenileniyor, önerilmeyince azalıyor.
- `open_hooks`: en fazla 3 ile bounded fakat doğal expiry yok. Eski hook, `fallbackOptions` context/route eşleşmesine katkı verebilir.
- `contextualizeFallback` aktif location’ı öne alsa da candidate’ın base action’ını aktif object/figure/environment ile doğrulamıyor.
- Earned Jung symbol memory bounded; yine de counterpoint seçiminde generic görsel motifler düşük maliyetli olduğu için tekrar aday oluyor.

## 7. ROOT CAUSES

**TOP 1 ROOT CAUSE: Fallback için zorunlu scene-grounding gate yok.**  
Evidence: Qwen 0/60; 41/120 grounding-0; fallback sonucu `contextuallyRelevant()` ile yeniden reddedilmiyor.

**TOP 2 ROOT CAUSE: Fallback candidate pool’u geniş ve finite katalog ağırlıklı.**  
Evidence: 51 unique label’e rağmen son-12 semantik tekrar %61,7; en sık `kapı/araba/su-ışık/koridor` kümeleri dönüyor.

**TOP 3 ROOT CAUSE: Uzun vadeli family/pair hafızası ve hook expiry yetersiz.**  
Evidence: pair-too-close %43,3; exact pair %6,7 görünse de suffix çeşitliliği semantik tekrarı gizliyor; open_hooks için TTL yok.

### LLM kalitesi mi, pipeline mı?

Birincil problem LLM kalitesi değil; **option pipeline / fallback scoring / grounding mantığı**. Qwen’in 60 turda hiç kullanılmaması LLM kalitesini ölçmeyi zaten imkânsız kılıyor. Mevcut fallback’te daha iyi bir LLM olsa bile scene gate ve candidate pool aynı kaldığında generic motif sorunu sürebilir.

## 8. RECOMMENDED FIX ORDER (UYGULANMADI)

1. Fallback çıktısını da Qwen ile aynı şema + scene-grounding/context gate’inden geçir; aktif scene entity veya izinli bağlı geçiş bulunmuyorsa adayı reddet.
2. Candidate pool’u önce aktif committed scene’deki object/space/figure/environment ile daralt; Jung/symbolic counterpoint yalnız bu pool içinde çalışsın.
3. Family-level cooldown’u son 8 etiket yerine bounded son 8–12 situation ailesi için hard/soft kural yap; iki seçenek aynı aileye düşmesin.
4. `open_hooks` için basit TTL/decay ekle; stale hook yalnız açıkça yeniden kazanılmışsa route’a dönsün.
5. Bu katmanlar uygulanmadan prompt wording veya yeni model aramak düşük getirili olur.

## FINAL VERDICT

**PRIMARY PROBLEM =** fallback seçeneklerinin gerçek committed scene’e bağlanmasını zorunlu kılan gate bulunmaması.  
**SECONDARY PROBLEM =** geniş finite katalog + yetersiz family-level cooldown; suffix’ler semantik tekrarları gizliyor.  
**FIRST FIX TO APPLY NEXT =** fallback adaylarını aktif scene entity/space/anchor ile doğrulayan zorunlu grounding gate eklemek; geçmeyeni güvenli ama gerçekten contextual bir adayla değiştirmek.

Bu görevde patch uygulanmadı; production sistemi mevcut haliyle bırakıldı.
