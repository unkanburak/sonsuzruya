> **Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.**

# Sonsuz Sürreal AI Yayını — Güncel Sistem, Çalışma ve Test Raporu

Rapor tarihi: 29 Ağustos 2026  
Proje: `<PROJECT_ROOT>`  
Runtime: `D:\InfiniteAILive`

## 1. Kısa sonuç

Çalışan ve dondurulan ürün **gerçek image-to-video değil, SDXL image-motion MVP’dir**.

Her turda:

```text
1/2 oylaması
→ kazanan sonuç-durumu seçilir
→ SDXL yeni tek kare üretir
→ browser zoom/pan/fog/noise hareketi uygulanır
→ yeni kare crossfade ile yayına gelir
```

SDXL, mevcut 6 saniyelik oylama temposuna yetişmektedir. Sıcak üretim benchmark G95’i 2,04 saniye, gerçek uygulama döngüsünde gözlenen son-20 p95’i 2,92 saniyedir. Qwen’in ID-only sürümü p95 3,43 saniyedir. Bu yüzden yerel yayında siyah ekran olmadan tur ilerler; ancak Qwen veya SDXL gecikirse yeni kare gelene kadar önceki kare hareket etmeye devam eder.

İnsan karakterinin kolu, bacağı veya yürümesi mevcut sistemde gerçek anlamda hareket etmez. Bu davranış ancak ayrıca image-to-video modeli eklenirse mümkün olur. LTX tabanlı iki aday pre-generation denemesi oylama kilidine yetişemediği için V2 olarak rafa kaldırılmıştır.

## 2. Amaçlanan nihai MVP çalışma şekli

### İzleyici açısından

İzleyici ekranda iki güvenli ve görsel olarak üretilebilir seçenek görür:

```text
1 — Portaldan geç
2 — Köprüden geç
```

Kazanan seçildiğinde sistem bunu doğrudan serbest bir cümle olarak modele bırakmaz. İçeride seçeneğin güvenilir bir sonuç-durumu eşlemesi bulunur:

```text
Portaldan geç
→ A glowing portal appears

Köprüden geç
→ A misty bridge appears
```

Böylece SDXL’den “yürüme eylemini anatomik olarak doğru çizmesi” beklenmez; portal veya köprü gibi görüntüde bulunması kolay bir sonuç ürettirilir.

### Sistem açısından

1. Node.js, 1280×720 OBS Browser Source sayfasını ve WebSocket state’ini sunar.
2. VoteManager yalnız tam `1` veya `2` mesajlarını kabul eder.
3. Aynı kullanıcı tur başına yalnızca bir kez sayılır.
4. Altı saniye sonunda çoğunluk kazanır; oy yoksa veya eşitse rastgele seçim yapılır.
5. Kazananın İngilizce sonuç-durumu SDXL promptuna girer.
6. SDXL‑Lightning 4-step ComfyUI üzerinde 768×448 görsel üretir.
7. Mevcut kare üretim boyunca tarayıcı hareketleriyle oynar.
8. Yeni kare hazır olduğunda 200 ms crossfade uygulanır.
9. Yeni seçenek çifti Qwen’den alınır; Qwen yalnız katalog ID’leri seçer.
10. Qwen geç kalır, çöker veya katalog dışı ID verirse güvenli katalog fallback’i kullanılır.
11. State diske yazılır ve yeni tur başlar.

## 3. Mevcut teknik bileşenler

| Bileşen | Mevcut değer |
|---|---|
| Orkestrasyon | Tek Node.js uygulaması |
| Web arayüzü | `http://127.0.0.1:3000` |
| ComfyUI | `http://127.0.0.1:8188` |
| Qwen | Qwen3‑4B Q4, llama.cpp, CPU |
| Image modeli | SDXL‑Lightning 4-step |
| Görsel ayarı | 768×448, 4 step, CFG 1 |
| Sampler | Euler / `sgm_uniform` |
| GPU | RTX 3070 Ti 8 GB |
| Oylama | Yerelde 6 saniye |
| Qwen timeout | 8 saniye |
| Comfy generation timeout | 120 saniye |
| OBS | 1280×720, 30 FPS Browser Source |
| Ses | Üçüncü taraf müzik yok; sessiz/prosedürel yaklaşım |

SDXL tepe VRAM kullanımı yaklaşık 7.56 GB’tır. Bu nedenle Qwen GPU’ya yüklenmez; CPU’da çalışır ve yayın sırasında başka GPU modeli açılmaz.

## 4. Seçenek üretim sistemi

### Qwen’in gerçek rolü

Qwen artık uzun Türkçe/İngilizce metin veya görsel prompt yazmaz. Kompakt bir katalogdan iki ID seçer:

```json
{"option1":"portal","option2":"bridge"}
```

Kod bu ID’leri doğrulanmış Türkçe/İngilizce çiftlere çevirir. Görsel promptu da kod sabitler. Böylece yaratıcı seçim mantığı korunur, fakat Qwen’in görsel modelin anlayamayacağı “aynaya gir”, “gökyüzünü katla” gibi zor eylemler uydurması engellenir.

### Güvenilir katalog

Mevcut katalog dokuz sonuç-durumundan oluşur:

- Parlayan portal ortaya çıksın
- Koridor ışıkla dolsun
- Uçan küreler belirsin
- Sisli köprü ortaya çıksın
- Parlayan ağaç büyüsün
- Kapı parlak ışığa açılsın
- Gökyüzü kızıla dönsün
- Oda suyla dolsun
- Zemin dev aynaya dönüşsün

Katalog dışı ID, güvenlik filtresinden geçmeyen metin, aynı seçenek veya yakın geçmişteki seçenek reddedilir. Fallback son altı seçenekte kullanılanları mümkün olduğunca dışarıda bırakır. Dokuz sınıfın tamamı tüketilirse havuz baştan karıştırılabilir; aynı sınıfın SDXL görseli seed nedeniyle yine farklı olabilir.

Bu katalog yaratıcı özgürlüğü tamamen kaldırmaz; yaratıcılığı modelin görüntüde güvenilir biçimde kurabildiği sonuçlara sınırlar.

## 5. Zaman çizelgesi ve süreler

### Yerel bir tur

Tipik sıcak çalışma:

```text
0.0–6.0 sn   Oylama; mevcut görsel zoom/pan/fog/noise ile oynar
6.0 sn       Kazanan kilitlenir, SDXL ve Qwen başlar
~7.7–9.0 sn  SDXL yeni görseli hazırlar; Qwen de çoğunlukla tamamlanır
hazır olunca  200 ms crossfade ve yeni sahne
```

Gerçek tur süresini `max(SDXL, Qwen, 1.5 saniyelik overlay beklemesi)` belirler. Qwen’in ID-only p95’i 3,43 saniye olduğu için tipik tam tur yaklaşık 9–10 saniyedir. Qwen 8 saniyeyi aşarsa seçenek fallback’i kullanılabilir; eski görsel bu sırada yayında kalır.

### Ölçülmüş süreler

| İşlem | Ölçüm |
|---|---:|
| SDXL ilk soğuk üretim | 6,98 sn (model yükleme dahil) |
| SDXL izole sıcak G95 | 2,04 sn |
| SDXL gerçek runtime son-20 p95 | 2,92 sn |
| SDXL gerçek runtime maksimum örnek | 3,08 sn |
| Qwen eski serbest JSON | yaklaşık 6,6 sn |
| Qwen ID-only JSON p50 | 1,63 sn |
| Qwen ID-only JSON p95 | 3,43 sn |
| Kazanan overlay | 1,5 sn; üretimi bekletmez |
| Yeni sahne crossfade | 200 ms |

## 6. Yayına yansıyan süreklilik

### Siyah ekran ve medya sürekliliği

Yerel testlerde sistem siyaha düşmeden ilerledi. Yeni üretim sırasında mevcut medya URL’si korunur. ComfyUI hata verirse `fallback_active` olayı yayınlanır ve aynı kare browser motion ile oynatılmaya devam eder. Yeni medya geldiğinde crossfade yapılır.

Bu nedenle teknik süreklilik şu an şöyledir:

```text
Yeni AI görseli hazır değil
→ eski görsel ekranda kalır
→ hareket efekti devam eder
→ yeni görsel hazır olunca geçiş yapılır
```

### Karakter hareketi

Bu sistemde kişi sabit bir görselin parçasıdır. Browser motion kamerayı ve atmosferi hareket ettirir; kişinin gerçek yürümesini veya portalın fiziksel olarak açılmasını üretmez. “Videolaşma” burada görselin yayın içinde hareketli görünmesi anlamındadır, AI image-to-video anlamında değildir.

## 7. Yapılan testler

### Birim ve davranış testleri

- Unit testleri: **5/5 geçti**.
- Yalnız tam `1`/`2` kabulü: geçti.
- Kullanıcı başına ilk geçerli oy: geçti.
- Eşitlik ve boş oy: rastgele seçimle geçti.
- WebSocket state/vote/generation/new-scene olayları: geçti.
- Tek üretim kilidi: geçti.
- Qwen kapalı fallback: geçti.
- ComfyUI kapalıyken medya korunması: geçti.
- ComfyUI geri açıldığında toparlanma: geçti.
- Node restart sonrası state toparlanması: geçti.
- Browser WebSocket reconnect: uygulandı.
- Ham chat metni ve user ID kalıcı loglara yazılmıyor: geçti.

### Model karşılaştırması

Aynı on komutla yapılan ölçüm:

| Model | Başarı | Sıcak G95 | Tepe VRAM | Görsel değerlendirme |
|---|---:|---:|---:|---:|
| SD1.5, 512×288, 16 step | 10/10 | 1,71 sn | 3,99 GB | 2 net / 5 kısmi / 3 başarısız |
| SDXL‑Lightning, 768×448, 4 step | 10/10 | 2,04 sn | 7,56 GB | 4 net / 4 kısmi / 2 başarısız |

SDXL kalite farkı hız farkına değdiği için final image modeli olarak seçildi. Üretim görüntüleri yine otomatik garanti taşımaz; sistem “chat kontrollü fever dream” olarak konumlandırılmalıdır.

### Dayanıklılık

- 60 dakikalık yerel orkestrasyon soak: **716 örnek, 189 tur, 0 eksik medya, 0 istek hatası**.
- SD1.5 motorlu tarihsel 10 dakikalık smoke: **120 örnek, 54 tur, 0 eksik medya, 0 istek hatası**.
- Final SDXL runtime smoke: state **422’den 446’ya**, medya HTTP 200, Node/Comfy/Qwen health başarılı.
- Daha sonraki yerel çalışma: state **516’dan 532’ye**, engine `IMAGE_MOTION`, Node/Comfy/Qwen health başarılı.

60 dakikalık soak SDXL ile yeniden çalıştırılmadı; bu sonuç bilinçli olarak SDXL’e mal edilmemektedir. SDXL için yapılan runtime smoke, kesintisiz ilerleme ve medya erişimini kısa sürede doğrulamıştır.

## 8. Image-to-video V2 denemesi ve karar

İki aday videoyu oylama kilidinden önce hazırlama fikri ayrı benchmark olarak denendi:

```text
Seçenek 1 görseli → LTX video
Seçenek 2 görseli → LTX video
6. saniyede ikisi de hazır mı?
```

Sonuç:

- 81 karelik LTX dalı ilk turda 180 saniyelik timeout’a takıldı.
- 25 karelik kısa profil ile 10 tur tamamlandı.
- İki adayın 6 saniyelik kilitten önce birlikte hazır olma oranı: **0/10 = %0**.
- Bu nedenle pre-generation ve gerçek AI hareketli video ana MVP’ye alınmadı.

Bu testin sonucu “LTX hiçbir koşulda çalışmaz” anlamına gelmez. Sonuç, bu GPU/ComfyUI kuyruğu/model yükleme düzeninde iki aday image-to-video dalının 6 saniyelik interaktif oylamaya yetişmediği anlamına gelir.

## 9. YouTube ve OBS durumu

### Yapılanlar

- OBS Browser Source koleksiyonu/profili hazırlandı.
- Yerel Node overlay’i 1280×720 sunuyor.
- YouTube Live Chat adapter’ı mevcut.
- Gerçek mesajlarda yalnız `1` ve `2` değerlendirilmesi tasarlandı.
- İlk geçmiş mesaj grubunu yok sayma ve tekrar mesaj ID’si filtreleme kodu mevcut.
- Gerçek chat gecikmesine göre oylama süresini 7–12 saniyeye ayarlayan mantık mevcut.

### Henüz yapılmayanlar

- YouTube OAuth bağlantısı yapılmadı.
- Kanal canlı yayın aktivasyonu hesap sahibi tarafından yapılmadı.
- Gerçek live chat ID/access token verilmedi.
- OBS → YouTube → chat → Node uçtan uca gecikme ölçülmedi.
- 20 gerçek chat mesajının latency p95’i ölçülmedi.
- 10 dakikalık ve 60 dakikalık gerçek liste dışı YouTube testi yapılmadı.

Bu nedenle şu anki güvenli ifade şudur:

> Yerel image-motion döngüsü çalışıyor ve siyah ekrana düşmeden ilerliyor. YouTube chat gecikmesi ve gerçek yayın dayanıklılığı henüz doğrulanmadı.

## 10. Güvenlik ve kapsam

- Ham chat prompta veya kalıcı loga girmez.
- Seçenekler katalog ve güvenlik filtresinden geçer.
- NSFW, grafik şiddet, nefret, suç/tehlikeli eylem, gerçek kişi, marka ve telifli karakter filtreleri bulunur.
- Üçüncü taraf müzik/görüntü kullanılmaz.
- Overlay’de AI tarafından üretilen interaktif kurgu açıklaması bulunur.
- YouTube sentetik/değiştirilmiş içerik açıklaması yayın sahibi tarafından etkinleştirilmelidir.

Kapsam dışında bırakılanlar: vision kalite kontrolü, world state, continuity, serbest chat, üyelik, dashboard, AI ses, AI müzik, Shorts otomasyonu, sosyal medya otomasyonu, cloud GPU ve 7/24 uzun dönem optimizasyon.

## 11. Başlatma ve önemli dosyalar

Başlatma:

```powershell
.\scripts\start-mvp.ps1
```

Kontrol:

```powershell
npm test
Invoke-RestMethod http://127.0.0.1:3000/health
```

Önemli dosyalar:

- `config.json`: SDXL ve süre ayarları
- `app/server.mjs`: tur, oy, state ve WebSocket orkestrasyonu
- `app/lib/options.mjs`: katalog, Qwen ID seçimi, güvenlik ve fallback
- `app/lib/comfy-image-engine.mjs`: SDXL image üretimi
- `public/`: OBS Browser Source overlay’i
- `scripts/start-mvp.ps1`: ComfyUI, Qwen ve Node başlatma
- `state/current.json`: kalıcı sahne state’i
- `state/events.jsonl`: güvenli olay logu
- `benchmark/image-model-benchmark-summary.json`: SD1.5/SDXL karşılaştırması
- `benchmark/pregeneration-benchmark-results.json`: rafa kaldırılan V2 pre-generation testi

## 12. Nihai hüküm

```text
Çalışan yerel image-motion MVP        GEÇTİ
SDXL hız/kalite seçimi                GEÇTİ
Siyah ekransız yerel süreklilik       GEÇTİ
Qwen ID-only seçenek sistemi          GEÇTİ
Güvenilir seçenek kataloğu            UYGULANDI
Gerçek karakter hareketi              YOK
Image-to-video pre-generation V2      %0 hazır olma, RAFA KALDIRILDI
OBS yerel entegrasyonu                HAZIR
YouTube gerçek chat testi             HENÜZ YAPILMADI
Gerçek 7/24 yayın iddiası             DOĞRULANMADI
```

İlk growth stunt’ı için doğru kapsam budur: SDXL’in ürettiği tek kareyi browser motion ile canlı ve güvenli biçimde göstermek, chat’i katalog içinden yönlendirici olarak kullanmak ve YouTube gecikmesini ayrıca ölçmek. Image-to-video ancak ayrı bir V2 projesi olarak, daha hızlı bir model veya daha güçlü donanım bulunduğunda yeniden ele alınmalıdır.
