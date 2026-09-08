# Local 22-Tur Gözlem ve Continuity A/B Raporu

Tarih: 29 Ağustos 2026

## Sonuç

Yerel image-motion döngüsü 22 tur boyunca siyah ekrana düşmeden ilerledi. SDXL üretimleri gerçek medya dosyaları olarak hazırlandı. Story state ve scene anchor bilgisi sahneler arasında taşındı.

Örnek zincirler:

```text
portal → dış kapı → köprü → araba → koridor → ışıklı yol → pencere → aynalı oda → portal
```

```text
köprü → araba → tünel → koridor → ışıklı yol → pencere → su basmış oda → araba
```

Mekân geçişleri tamamen gerçekçi değil; ancak fever-dream formatında önceki sahneden türeyen görsel landmark’lar korunuyor. Seçilen sonuçlar görsel olarak net karşılık buluyor: araba, tünel, köprü, portal, pencere, ayna, su, sis ve parlayan ağaç sahneleri üretildi.

## Anchor gözlemi

Anchor’lar artık kısa görsel ifadeler olarak taşınıyor:

```text
a mysterious car
a luminous portal
giant mirrors in a room
```

TTL davranışı çalışıyor:

- Tekrar önerilen anchor TTL `3` oluyor.
- Önerilmeyen mevcut anchor her başarılı commit’te `1` azalıyor.
- Yeni anchor TTL `3` ile ekleniyor.
- TTL `0` olan anchor siliniyor.
- Active state yalnızca başarılı SDXL üretiminden sonra güncelleniyor.

## Continuity A/B testi

Aynı 10 sahnelik zincir iki yöntemle çalıştırıldı. Zincirde aynı-mekân, normal mekân değişimi ve büyük sürreal mekân değişimi örnekleri vardı.

| Mod | Başarı | P50 | P95 | En yüksek süre |
|---|---:|---:|---:|---:|
| Text-anchor | 10/10 | 3,86 sn | 6,87 sn | 6,87 sn |
| Previous-image img2img | 10/10 | 3,18 sn | 90,88 sn | 90,88 sn |

Previous-image yöntemi ilk turda yaklaşık 90,9 saniye, ikinci turda 10,9 saniye sürdü. Bu nedenle canlı oylama temposu için kabul edilmedi.

Karar:

```text
TEXT_ANCHOR modu korunuyor.
PREVIOUS_IMAGE modu V2/prototip olarak rafa kaldırılıyor.
```

Görsel incelemede previous-image yöntemi bazı sahnelerde kompozisyon devamlılığı sağlayabildi; ancak ilk referans yükleme ve img2img maliyeti bunu yayın için uygun olmaktan çıkarıyor. Ayrıca 10 turda insan görsel kalite değerlendirmesi otomatikleştirilmedi; karar ölçülebilir süre ve canlılık kriterlerine göre verildi.

## UI durumu

Yerel arayüzde şu akış bağlı:

- Türkçe ve İngilizce seçenek satırları
- Oy yüzdeleri ve progress bar
- Kazanan seçenek için yeşil flash
- Kaybeden seçenek için fade
- Yeni görsel için 200 ms crossfade
- Oylama ve üretim kartları arasında geçiş

## Qwen notu

Qwen health endpoint’i çalışıyor; ancak genişletilmiş result-prompt + anchor + state-patch JSON’u 8 saniyelik sınırda çoğunlukla tamamlanamadı. Bu durumda güvenli fallback kullanıldı. Fallback sistemi yayın akışını durdurmadı.

Bu nedenle yerel zincirin sürekliliği ve görsel üretim başarısı doğrulandı; Qwen’in dinamik içerik oranı ayrıca optimize edilmeden YouTube’a bağlanılması önerilmez.

## YouTube durumu

Henüz yapılmayanlar:

- YouTube OAuth
- Gerçek Live Chat bağlantısı
- Chat latency p95 ölçümü
- Liste dışı 10 dakikalık YouTube testi
- Liste dışı 60 dakikalık YouTube testi

Yerel servis şu anda çalışıyor:

```text
http://127.0.0.1:3000/
```
