# Jungian Dream — Human Review Scorecard

Bu dosya otomatik PASS raporu değildir. Amaç, 50 turluk akışın insan tarafından aynı soruyla değerlendirilmesini kolaylaştırmaktır:

> “Bu seçenekler ve görseller, rastgele üretimler yerine hafızası olan tek bir rüya zihninden mi geliyor?”

## İncelenecek materyal

- [50 turluk metin trace](<<PROJECT_ROOT>\benchmark\JUNGIAN_50_DREAM_TRACE.md>)
- [30 turluk Profile C görsel zinciri](<<PROJECT_ROOT>\benchmark\c-profile-soak\FULL_C_SOAK_SEQUENCE.png>)
- [8 turluk Soft Lock görsel zinciri](<<PROJECT_ROOT>\benchmark\profile-c-soft-lock\SOFT_LOCK.png>)
- [Kolektif seçim yolları ayrışma trace'i](<<PROJECT_ROOT>\benchmark\JUNGIAN_PATH_DIVERGENCE.md>)
- [50 tur gerçek görsel zinciri](<<PROJECT_ROOT>\benchmark\JUNGIAN_50_VISUAL_SEQUENCE.png>)
- [50 tur seçim açıklamalı görsel zinciri](<<PROJECT_ROOT>\benchmark\JUNGIAN_50_VISUAL_ANNOTATED.png>)
- [50 tur görsel zincir metadata'sı](<<PROJECT_ROOT>\benchmark\jungian-observer-50\trace.json>)

## Her blok için sorular

Her 5 turluk blokta 0–2 arasında işaretle:

- **0:** yok / rastgele hissediyor
- **1:** kısmen var
- **2:** açıkça var

1. Önceki durumdan doğan bir devam hissi var mı?
2. Counterpoint aynı rüyaya ait ama yön olarak farklı mı?
3. Daha önce görülen bir sembol anlamlı bir bağlamda geri dönüyor mu?
4. Kazanan seçim sonraki sahne ve seçeneklerin yönünü değiştiriyor mu?
5. Blok sonunda “bir sonraki turu merak ediyorum” hissi oluşuyor mu?

| Blok | Turlar | Mekân rotası / motif özeti | Devam | Karşıtlık | Motif hafızası | Seçim etkisi | Merak | İnsan notu |
|---|---|---|---:|---:|---:|---:|---:|---|
| 1 | 1–5 | Trace’in başlangıç yönünü ve ilk motif oluşumunu izle |  |  |  |  |  |  |
| 2 | 6–10 | İlk sembol dönüşlerinin bağlamını karşılaştır |  |  |  |  |  |  |
| 3 | 11–15 | Devam/karşıtlık ayrımının doğal görünüp görünmediğini incele |  |  |  |  |  |  |
| 4 | 16–20 | Kolektif tercihin mekân ve niyet yönünü izle |  |  |  |  |  |  |
| 5 | 21–25 | Yeni motifin önceki motiflerle ilişkisini değerlendir |  |  |  |  |  |  |
| 6 | 26–30 | Aynı sembolün dönüşünü yalnız kelime tekrarı olarak görüp görmediğini not et |  |  |  |  |  |  |
| 7 | 31–35 | Arketip/gerilim yön değişiminin seçenek diline yansımasını incele |  |  |  |  |  |  |
| 8 | 36–40 | Counterpoint’in dünyadan kopmadan sürpriz üretip üretmediğini değerlendir |  |  |  |  |  |  |
| 9 | 41–45 | Uzun izde tekrar, hafıza ve sembol yoğunluğunu kontrol et |  |  |  |  |  |  |
| 10 | 46–50 | 50. turda hâlâ aynı rüya zihni hissi var mı, karar ver |  |  |  |  |  |  |

## Son karar

- Toplam puan: ____ / 100
- En güçlü insan anlatı kanıtı: ______________________________
- En zayıf blok/tur: _________________________________________
- Sembol dönüşleri kelime tekrarı mı, bağlamlı hafıza mı? ______
- Counterpoint gerçek bir karşıtlık mı, yalnızca ikinci seçenek mi? ______
- 50 tur sonunda tek rüya zihni hissi: **EVET / KISMEN / HAYIR**

## Makine tarafından doğrulanmış sınırlar

- 34/34 otomatik test PASS
- 60/60 geçerli continuation/counterpoint rol çifti
- 60 turda context violation: 0
- 60 turda exact recent pair repeat: 0
- 60 turda aynı-intent çifti: 0
- 50 tur trace'inde sembol kayıtları bounded; context, appearance ve last intent tutuluyor

Güncel trace makine audit'i: 12 benzersiz aktif mekân, aynı mekânda maksimum 2 ardışık tur, 14 sembol dönüşü, 4 sembolün birden fazla bağlamda geri gelişi, 7 arketipsel alan değişimi, 0 exact çift tekrarı ve 0 aynı-intent çifti. Bu sinyaller insan puanının yerine geçmez; yalnızca incelenecek davranışın gerçekten üretildiğini doğrular.

Bu sınırlar anlatı kalitesini otomatik olarak kanıtlamaz; yalnızca insan kararının güvenli teknik zeminde yapılmasını sağlar.
