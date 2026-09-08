# Sonsuz Sürreal AI Yayını — Revize MVP Planı

## 1. Ürün kararı

Amaç, mantıklı ve tutarlı bir hikâye anlatmak değil; modelin deformasyonlarını ve ani değişimlerini yayının sürreal estetiğine dönüştüren, chat tarafından yönetilen kesintisiz bir YouTube yayını kurmaktır.

İlk sürümde serbest chat önerisi kullanılmayacak. İzleyiciler her turda ekrandaki iki seçenekten birini chat'e `1` veya `2` yazarak seçecek.

Temel döngü:

```text
AI klibi oynar + oylama açılır
            ↓
20–30 saniye boyunca 1/2 oyları toplanır
            ↓
Kazanan seçenek açıklanır
            ↓
Son kare + kazanan aksiyon ComfyUI'ye gönderilir
            ↓
Üretim sırasında hareketli fallback gösterilir
            ↓
Yeni klip oynar ve iki yeni seçenek çıkar
```

Karakter veya mekân değişirse sistem bunu düzeltmez. Yeni görüntü, hikâyenin yeni gerçekliği kabul edilir.

## 2. Minimum teknik mimari

Ana uygulama tek bir Node.js projesi olacak. Ayrı çalışan tek bileşenler ComfyUI, yerel LLM ve OBS'dir.

### Node.js uygulaması

- `http://localhost:3000` adresinde OBS Browser Source arayüzünü sunar.
- Basit durum makinesini yönetir: `PLAYING/VOTING → RESULT → GENERATING → PLAYING`.
- Tur başına `Map<userId, vote>` tutar; kullanıcının ilk geçerli oyu sayılır.
- Oy gelmezse veya eşitlik olursa rastgele seçim yapar.
- Kazanan İngilizce aksiyonu kısa video promptuna yerleştirir.
- ComfyUI işini başlatır ve sonucunu takip eder.
- Yeni MP4'ü arayüze gönderir ve son kareyi sonraki üretim için saklar.
- Yeniden başlatıldığında son kareden veya varsayılan başlangıç görselinden devam eder.

### OBS arayüzü

OBS, 1280×720 Browser Source üzerinden yalnızca yerel web sayfasını yayınlar. Arayüz:

- Mevcut klibi oynatır.
- İki seçeneği, oy yüzdelerini ve geri sayımı gösterir.
- Kazananı yaklaşık 4 saniye gösterir.
- Üretim bitene kadar son kare üzerinde zoom, pan, sis, noise ve hafif glitch uygular.
- Yeni klibe crossfade ile geçer.

OBS bağlantısı AI üretiminden bağımsız kalacağı için ComfyUI veya LLM arızası siyah ekran oluşturmaz.

### Yerel LLM

Qwen3 4B Q4, CPU ağırlıklı çalışır ve yalnızca iki kısa seçenek üretir. Görsel analiz veya kapsamlı AI Director kurulmaz.

Girdi:

- Son sahnenin kısa açıklaması.
- Son kazanan aksiyon.
- Son birkaç seçenek; tekrarları azaltmak için.

Çıktı:

```json
{
  "option_1_tr": "Kapıyı aç",
  "option_2_tr": "Aynayı ye",
  "option_1_en": "Open the door",
  "option_2_en": "Eat the mirror"
}
```

Yanıt 15 saniyede gelmez veya ikinci denemede de geçerli JSON oluşmazsa güvenli hazır seçenek havuzu kullanılır.

### Video üretimi

- ComfyUI Portable, model ve çıktılar `D:\InfiniteAILive` altında tutulur.
- İlk aday: LTX‑Video 2B Distilled image-to-video.
- Başlangıç benchmark profili: 512×288, 49 kare, 8 adım.
- Her klibin son karesi sonraki klibin giriş görselidir.
- Büyük buffer kurulmaz; üretim gecikmesini hareketli fallback karşılar.

## 3. Güvenlik ve yayın kuralları

- `1` ve `2` dışındaki chat mesajları üretim zincirine hiçbir zaman girmez.
- LLM seçenekleri NSFW, grafik şiddet, nefret, suç/tehlikeli eylem öğretimi, gerçek kişi, marka ve telifli karakter açısından doğrulanır.
- Riskli seçenek güvenli hazır havuzdan bir seçenekle değiştirilir.
- Üçüncü taraf müzik ve görsel kullanılmaz; ilk sürüm sessiz AAC veya özgün prosedürel ambient ses kullanır.
- Yayın ve overlay açıkça “AI tarafından üretilen interaktif kurgu” olarak etiketlenir; YouTube AI içerik açıklaması açılır.
- Ham chat kaydedilmez. Yalnızca tur sonucu, toplam oylar, seçilen aksiyon, üretim süresi ve hata kodları loglanır.
- OBS içinde tek tuşla geçilebilen güvenli bekleme sahnesi bulunur.

## 4. Uygulama sırası ve stop-loss

### Aşama 0 — Hemen yapılacak manuel işlem

YouTube kanal doğrulaması ve canlı yayın özelliği etkinleştirilir. Aktivasyon beklenirken bütün sistem sahte chat ile yerelde geliştirilir.

### Aşama 1 — Video benchmarkı, en fazla 2 saat

- ComfyUI ve LTX‑Video 2B Distilled kurulur.
- Aynı profilde beş klip üretilir.
- Süre, OOM, hata ve yaklaşık VRAM kullanımı kaydedilir.
- Sürekli OOM veya iki dakikayı aşan medyan üretim varsa video modeliyle uğraşma bırakılır.
- Bu durumda aynı sistem, hızlı AI görsel + hareketli kamera ile devam eder.

### Aşama 2 — Yerel yayın döngüsü

- Node.js sunucu ve OBS arayüzü kurulur.
- Önce hazır kliplerle oynatma, oylama, fallback ve crossfade doğrulanır.
- Terminal/debug arayüzünden sahte kullanıcı oyları gönderilir.
- LLM seçenek üretimi ve güvenli seçenek havuzu eklenir.
- ComfyUI çağrısı bağlanarak tam döngü tamamlanır.

### Aşama 3 — Dayanıklılık testi

- OBS Browser Source ile sistem 60 dakika yerelde çalıştırılır.
- Test sırasında LLM ve ComfyUI ayrı ayrı kapatılarak fallback davranışı doğrulanır.
- Siyah ekran, kilitlenen tur veya manuel müdahale gerektiren hata kalmadan aşama tamamlanır.

### Aşama 4 — YouTube

- YouTube OAuth ve Live Chat API bağlanır.
- Gerçek kanal kullanıcı kimliği, turdaki tek oy anahtarı olarak kullanılır.
- Önce 10 dakikalık bağlantı testi, ardından 60 dakikalık liste dışı yayın yapılır.

Stop-loss kuralları:

- LTX debugging: en fazla 2 saat.
- Yerel LLM debugging: en fazla 1 saat.
- Kritik olmayan tek bir problem: en fazla 2 saat; ardından daha basit fallback.
- UI güzelleştirme, vision, karakter tutarlılığı ve gelişmiş hikâye hafızası MVP bitmeden yapılmaz.

## 5. Kabul kriterleri

MVP ancak aşağıdakilerin tamamı sağlandığında bitmiş sayılır:

- Sistem 60 dakika müdahalesiz çalışır ve OBS hiçbir an siyaha düşmez.
- En az 10 oylama turu tamamlanır.
- Kullanıcı başına turda yalnızca bir oy sayılır.
- Oy yokluğu ve eşitlik sistemi durdurmaz.
- Kazanan seçenek sonraki üretim promptuna girer.
- En az üç kazanan aksiyon AI çıktısında görsel olarak fark edilir.
- LLM kapalıyken hazır seçeneklerle, ComfyUI kapalıyken hareketli fallback ile yayın devam eder.
- Uygulama yeniden başlatıldığında son durumdan veya güvenli başlangıç sahnesinden kalkar.
- İlk kez gelen izleyici 10 saniye içinde `1` veya `2` yazarak yayını yönettiğini anlar.
- Hikâye, mekân veya karakter tutarlılığı başarı kriteri değildir.

## 6. MVP dışında

Serbest chat önerileri, vision modeli, ayrıntılı world state, karakter tutarlılığı, dashboard, üyelik/puan sistemi, seslendirme, AI müzik, otomatik Shorts, sosyal medya otomasyonu, cloud GPU ve gerçek 7/24 optimizasyonu sonraya bırakılır.

Ürün cümlesi:

> İnternetin topluca kontrol ettiği sonsuz bir AI fever dream: chat her turda 1 veya 2'yi seçiyor, AI sonucu üretmeye çalışıyor ve yayın ne kadar saçmalarsa saçmalasın devam ediyor.
