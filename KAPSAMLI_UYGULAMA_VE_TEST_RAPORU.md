> **Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.**

# Sonsuz Sürreal AI Yayını — kapsamlı uygulama ve test raporu

Rapor tarihi: 29 Ağustos 2026  
Çalışma dizini: `<PROJECT_ROOT>`  
Model/Comfy dizini: `D:\InfiniteAILive`

## 1. Yönetici özeti

MVP yerel olarak çalışıyor. İzleyici mantığı tam `1` veya `2` oyuyla bir seçeneği kazandırıyor; kazanan İngilizce aksiyon yeni görsel promptuna giriyor; yeni görsel hazırlanırken önceki görsel browser tabanlı zoom/pan/fog/noise hareketiyle ekranda kalıyor. Oy yokluğu, eşitlik, Qwen kesintisi, Comfy kesintisi ve Node yeniden başlatması döngüyü durdurmuyor.

İlk ve zorunlu LTX video benchmarkı RTX 3070 Ti üzerinde yapıldı. Üç profil de dondurulmuş fizibilite eşitsizliğini geçemedi. Bu nedenle başka video modeli denenmedi ve planın `AI image + motion` fallback’i seçildi.

İlk image-motion prototipinde LTX‑2B’nin son video karesi still image olarak kullanıldı. Bu sürüm teknik olarak 60 dakika kesintisiz çalıştı, fakat görüntü tekrar tekrar beslendikçe bulanıklaştı ve seçilen aksiyonları net göstermedi. Sonraki SD1.5 motoru hızlıydı fakat komut takibi tutarsız kaldı. Bunun üzerine aynı 10 komutla SD1.5 ve SDXL‑Lightning 4-step ölçüldü. SDXL sıcak G95’te yalnız yaklaşık 0,33 saniye daha yavaşken net okunabilen eylemleri 2/10’dan 4/10’a çıkardı; final image motoru SDXL‑Lightning seçildi.

Sonuç iki ayrı başlıkta değerlendirilmelidir:

- **Teknik süreklilik:** geçti. 60 dakikada 189 tur, 0 eksik medya, 0 HTTP hatası.
- **Semantik/görsel kalite:** iyileşti ama hâlâ kısmi. Sabit 10 komutta SDXL 4 net, 4 kısmi, 2 başarısız sonuç verdi. “Her oy videoda net görünür” iddiası hâlâ doğru değildir.

Gerçek YouTube liste dışı testi henüz yapılmadı; kanal aktivasyonu ve OAuth değerleri hesap sahibini bekliyor. Dolayısıyla “yerelde durmadan ilerliyor” doğrulandı, “YouTube’da 7/24 hazır” doğrulanmadı.

## 2. Donanım ve çalışma ortamı

| Bileşen | Değer |
|---|---|
| GPU | NVIDIA GeForce RTX 3070 Ti, 8192 MiB |
| GPU sürücüsü | 610.88 |
| CPU | Intel Core i5‑11400F, 6 çekirdek / 12 izlek |
| RAM | 32 GB |
| Node.js | v24.13.0 |
| npm | 11.6.2 |
| ComfyUI | 0.34.0 portable |
| Qwen | Qwen3‑4B Q4_K_M, 2.497 GB, CPU |
| Son image checkpoint | SDXL‑Lightning 4-step, 6.938 GB |

Tüm runtime servisleri yalnız loopback üzerinde dinliyor:

- MVP/OBS overlay: `127.0.0.1:3000`
- ComfyUI: `127.0.0.1:8188`
- llama.cpp/Qwen: `127.0.0.1:8080`

## 3. Uygulama sırası ve benchmark kararı

Plan gereği Node, Qwen, UI veya YouTube kurulmadan önce LTX benchmarkı yapıldı. ComfyUI portable, LTX‑Video 2B Distilled ve T5 encoder `D:\InfiniteAILive` altına kuruldu. Her profil için warm-up sonrası beş ölçüm alındı. İlk G95, beş başarılı sürenin en yavaşı olarak hesaplandı.

| Profil | G95 | Ham video | `raw/0.60` | `6 + G95 + 2` | Sonuç |
|---|---:|---:|---:|---:|---|
| 384×224 / 81 kare / 2 adım | 2,395 sn | 3,375 sn | 5,625 sn | 10,395 sn | geçmedi |
| 384×224 / 121 kare / 2 adım | 4,723 sn | 5,042 sn | 8,403 sn | 12,723 sn | geçmedi |
| 512×288 / 81 kare / 2 adım | 3,574 sn | 3,375 sn | 5,625 sn | 11,574 sn | geçmedi |

Tepe VRAM yaklaşık 7,7 GB’tı; OOM olmadı. Hiçbir profil gereken yayın penceresini sağlayamadığından 4/8 adım kalite denemelerine geçilmedi. Dondurulmuş karar uygulandı:

```text
LTX video başarısız
→ başka video modeli arama
→ AI image + browser motion
```

Ham benchmark verisi: `benchmark/ltx-benchmark-results.json`.

## 4. Son mimari

```text
YouTube Live Chat veya debug vote
                │
                ▼
        VoteManager (Map user→vote)
                │ 6 sn / gerçek chatten sonra 7–12 sn
                ▼
       kazanan aksiyon kilitlenir
          ┌─────┴──────────────┐
          ▼                    ▼
 SDXL‑Lightning görsel   Qwen N+1 seçenekleri
 ComfyUI / GPU           llama.cpp / CPU / 8 sn
          │                    │
          └─────┬──────────────┘
                ▼
 state diske yazılır + WebSocket yayını
                │
                ▼
 OBS Browser Source: crossfade + motion/fog/noise
```

Ana süreç tek Node.js uygulamasıdır. Express statik overlay/API sunar; `ws` frontend state’ini taşır. Aynı anda yalnız bir `closeVote()`/üretim işi çalışır. Canlı Comfy kuyruğu örneklemesinde toplam kuyruk hiçbir zaman 1’i aşmadı.

### Tur state makinesi

```text
PLAYING_VOTING
→ VOTE_LOCKED_GENERATING
→ NEXT_READY
→ PLAYING_VOTING
```

Kazanan kartı 1,5 saniye görünür; üretim aynı anda başlamıştır. Sonra kart kapanır ve hareketli bekleme sahnesi kalır. Yeni medya geldiğinde 200 ms opacity crossfade uygulanır.

## 5. Oy ve seçenek sistemi

- Yalnız literal `1` veya `2` kabul edilir; ` 1 ` kabul edilmez.
- Kullanıcı ID’si boş olamaz.
- `Map<userId, vote>` içinde kullanıcının ilk geçerli oyu tutulur.
- Tur sonunda map temizlenir.
- Oy yoksa veya eşitse rastgele seçim yapılır.
- Debug API ve gerçek YouTube aynı `acceptVote()` yolunu kullanır.
- Ham kullanıcı ID’si, mesaj veya chat metni loga yazılmaz.

Sahte chat E2E testinde 3–1 oy doğru kazananı verdi; aynı kullanıcının ikinci oyu reddedildi. Kazanan Türkçe metin overlay’e, eşleşen İngilizce aksiyon image promptuna girdi.

Qwen yalnız iki yeni seçeneği üretir. İstenen dört alan dışında veri kabul edilmez; seçenek başına sekiz kelime üst sınırı vardır. İkinci büyük harfle başlayan kelime gerçek kişi/özel isim ihtimaline karşı reddedilir. NSFW, şiddet, suç, nefret, marka, gerçek kişi ve bilinen telifli karakter terimleri blocklist ile elenir. Bozuk JSON bir kez yeniden denenir; toplam duvar saati sekiz saniyeyi aşarsa güvenli havuz kullanılır.

Qwen gerçek CPU testinde geçerli JSON’u 6,6 saniyede verdi. Qwen prosesi kapatıldığında tur güvenli havuz seçenekleriyle ilerledi. Qwen’in Türkçe kalitesi kusursuz değildir; “Merdiven asci” gibi bozuk ama güvenli örnekler görüldü. Bu, nihai raporda açık bir kalite borcudur.

## 6. Görsel üretim ve motion

### 6.1 Başarısız LTX still yaklaşımı

İlk image fallback, yeni model indirmemek için LTX‑2B image-to-video çıktısının son karesini alıyordu. Browser bu PNG üzerinde zoom/pan/fog/noise uyguluyordu. Teknik döngü çalıştı; fakat yüzlerce rekürsif tur sonunda görüntü renk bloklarına ve bulanıklığa çöktü. 25 ve 81 kare, 2/4 adım ve farklı strength denemelerinde “aynaya gir”, “kutuyu aç”, “gökyüzünü katla” gibi aksiyonlar net görünmedi.

Bu yaklaşım üretim motorundan çıkarıldı. Benchmark dosyaları geçmiş kararın kanıtı olarak korunuyor.

### 6.2 SD1.5 image-motion ara sürümü

Son motor her turu Stable Diffusion 1.5 ile sıfırdan üretir:

- 512×288
- 16 adım
- CFG 7
- DPM++ 2M / Karras
- fp16 ema-only checkpoint
- continuity yok; bu bilinçli MVP kararıdır

SD1.5 sıcak üretimleri kontrollü örneklerde 1,85–2,39 saniye sürdü. Üretim sürerken mevcut kare CSS drift, sis ve noise ile hareket eder. Comfy hata verirse medya URL’si değiştirilmez; siyah ekran yerine aynı kare hareket etmeyi sürdürür.

İlk açılış/fallback karesi üçüncü taraf bir görsel değildir. `scripts/create-seed.mjs` tarafından kodla üretilen özgün figür/kapı PNG’sidir.

### 6.3 Final SDXL‑Lightning image-motion motoru

29 Ağustos 2026’da aynı on İngilizce aksiyon ve aynı deterministik seed’lerle iki profil karşılaştırıldı:

| Profil | Ayar | Başarı | Sıcak G95 | Tepe VRAM | Net / kısmi / başarısız |
|---|---|---:|---:|---:|---:|
| SD1.5 | 512×288, 16 adım, CFG 7, DPM++ 2M/Karras | 10/10 | 1,71 sn | 3.994 MiB | 2 / 5 / 3 |
| SDXL‑Lightning | 768×448, 4 adım, CFG 1, Euler/sgm_uniform | 10/10 | 2,04 sn | 7.561 MiB | 4 / 4 / 2 |

SDXL’in ilk soğuk üretimi 6,98 saniyeydi. İzole benchmark sıcak G95’i 2,04 saniye; gerçek uygulama döngüsündeki son 20 üretim p95’i 2,92 saniye ve maksimumu 3,08 saniyeydi. OOM oluşmadı. Ancak 8 GB kartta yalnız yaklaşık 0,6 GB pay kaldığından yayın sırasında başka GPU modeli eşzamanlı çalıştırılmamalıdır; Qwen bu nedenle CPU’da kalır. Bu profil görüntü kompozisyonunu ve komut okunabilirliğini iyileştirir, gerçek video üretmez: sonuç hâlâ tek kare + browser motion’dır.

Ham özet: `benchmark/image-model-benchmark-summary.json`. Üretilen kareler ComfyUI `output/benchmark/image_models` klasöründedir.

## 7. Görsel kalite denetimi

Kaydedilen PNG’ler doğrudan açılıp görsel olarak incelendi. “Net”, aksiyonun veya hedef nesnenin yalnız bulunması değil, seçimin sahnede anlaşılır olmasıdır. “Kısmi”, ilgili nesnenin güçlü biçimde bulunup eylemin eksik olmasıdır.

### LTX still örnekleri

| Seçim | Sonuç | Gözlem |
|---|---|---|
| Aynaya gir | başarısız | soyut/deforme kare, ayna eylemi okunmuyor |
| Gökyüzünü katla | başarısız | seed’e çok yakın, eylem yok |
| Kutuyu aç | başarısız | kutu yok, eylem yok |

LTX still kalite: **0/3 net**.

### SD1.5 örnekleri

| Sahne | Seçim | Sınıf | Gözlem |
|---:|---|---|---|
| 280 | Merdiven çık | başarısız | figür/koridor var, merdiven net değil |
| 281 | Merdiven çık | net | figür merdivene yöneliyor |
| 282 | Merdiven çık | net | figür merdivenden yukarı çıkıyor |
| 289 | Portala atla | kısmi | portal çok net, atlama görünmüyor |
| 290 | Gizemli kutuyu aç | başarısız | figür var, kutu yok |
| 295 | Gökyüzünü katla | başarısız | manzara var, katlama yok |
| 296 | Zemini sıvıya dönüştür | kısmi | sıvımsı/geniş yüzey var, dönüşüm belirsiz |
| 297 | Perdenin arkasına bak | kısmi | perde çok net, bakan kişi/eylem yok |
| 298 | Tuhaf ışığı takip et | net | figür belirgin ışığa yönelmiş |

SD1.5 örnek özeti: **3 net / 3 kısmi / 3 başarısız**.

“En az üç karar AI çıktısında görünür karşılık bulur” kriteri, merdiven + ışık + portalın kısmi karşılığıyla asgari düzeyde karşılanabilir. Ancak “üç farklı aksiyonun tamamı net görünür” daha katı yorumunda yalnız merdiven ve ışık nettir; bu daha güçlü kriter geçmemiştir. Sistemin her seçimde semantik doğruluk garantisi yoktur.

### Eşit-komut SDXL karşılaştırması

Sabit on komutta SD1.5 sonucu **2 net / 5 kısmi / 3 başarısız**, SDXL‑Lightning sonucu **4 net / 4 kısmi / 2 başarısız** oldu. SDXL’de portal, sıvı zemin, tuhaf ışık ve tünel net okundu; kapı, merdiven, ayna ve katlanan gökyüzü kısmi kaldı; kutu ve perde komutları başarısızdı. Bu doğrudan görsel incelemedir, otomatik vision skoru değildir.

## 8. Test sonuçları

| Test | Sonuç | Kanıt/ölçüm |
|---|---|---|
| Unit testleri | geçti | 5/5 |
| Exact 1/2 ve ilk oy | geçti | boşluklu/kimliksiz oy reddi dahil |
| 3–1 sahte chat E2E | geçti | doğru kazanan, duplicate ret |
| WebSocket olayları | geçti | state/new_scene/vote_update/generation_started |
| Tek üretim kilidi | geçti | gözlenen azami Comfy kuyruğu 1 |
| Qwen normal | geçti | geçerli JSON 6,6 sn |
| Qwen kapalı fallback | geçti | tur ve medya ilerledi |
| Comfy kapalı fallback | geçti | iki tur, aynı medya, generation_failed |
| Comfy geri açılma | geçti | soğuk yükleme sonrası otomatik üretim |
| Node restart state | geçti | scene/media geri geldi; güvenli voting phase |
| Browser WS reconnect | uygulandı | close sonrası 1 sn reconnect |
| Log gizliliği | geçti | test user ID’leri logda yok |
| OBS koleksiyonu/profil | kuruldu | ayrı `SonsuzYayin`, 1280×720/30 |
| 60 dk yerel orkestrasyon soak | geçti | 716 örnek, 189 tur |
| SD1.5 tarihsel kısa smoke | geçti | 120 örnek, 54 tur, 0 eksik medya/hata |
| SD1.5 ↔ SDXL sabit-komut benchmarkı | geçti | iki profilde 10/10, OOM yok; SDXL seçildi |
| Final SDXL runtime smoke | geçti | scene 422→446, son-20 p95 2,92 sn, max 3,08 sn, medya 200, tüm health geçti |
| Gerçek YouTube list dışı | yapılmadı | OAuth/kanal sahibi gerekli |

### 60 dakikalık soak ayrıntısı

```text
Başlangıç: 2026-08-29 12:21:04Z
Bitiş:     2026-08-29 13:21:08Z
Örnek:     716
Sahne:     59 → 248
Tur:       189
Eksik medya örneği: 0
HTTP isteği hatası: 0
Fallback turu: 0
Üretim p50: 12,221 sn
Üretim p95: 16,943 sn
En kötü soğuk yükleme: 119,313 sn
```

Bu 60 dakikalık soak orkestrasyon, WebSocket/state ve fallback davranışını LTX-still motoruyla doğruladı. Semantik sorun nedeniyle motor sonradan SD1.5’e, ardından eşit-komut testiyle SDXL‑Lightning’e değiştirildi. Bu nedenle rapor 60 dakikalık sonucu final SDXL motoruna yanlış biçimde mal etmez. SD1.5 sürümünde ayrıca 10 dakikalık smoke; final SDXL sürümünde kısa runtime smoke yapılmıştır.

### Tarihsel SD1.5 smoke ayrıntısı

```text
Başlangıç: 2026-08-29 13:36:11Z
Bitiş:     2026-08-29 13:46:14Z
Örnek:     120
Sahne:     311 → 365
Tur:       54
Eksik medya örneği: 0
HTTP isteği hatası: 0
Sonuç:     GEÇTİ
```

## 9. Arıza davranışları

- **Qwen yok:** sekiz saniye beklemeden/timeout sonrası güvenli seçenek havuzu.
- **Comfy yok:** `generation_failed`, medya yolu korunur, CSS motion devam eder.
- **Üretim 120 sn üstü:** `comfy_generation_timeout`, son kare korunur.
- **Oy yok/eşit:** rastgele 1/2; state makinesi durmaz.
- **State JSON bozuk:** `current.png` varsa ondan, yoksa özgün `seed.png`ten açılır.
- **Node restart:** phase güvenli oylamaya, `generationInProgress=false` durumuna döner.
- **WebSocket kopar:** browser istemcisi bir saniye sonra yeniden bağlanır.
- **Hikâye saçmalar:** continuity düzeltilmez; yeni gerçeklik kabul edilir.

Comfy kapatma testinde iki tur boyunca `mediaUnchanged=true`, health `comfy=false` ve olay logunda `generation_failed: fetch failed` görüldü. Bu eski LTX-still motoru testinde Comfy geri geldiğinde ilk soğuk yükleme 98,7 saniye, sonraki tur 35,4 saniye, sıcak turlar yaklaşık 12 saniye sürdü. Final SDXL ölçümünde soğuk warm-up 6,98 saniye, sabit on sıcak üretimin G95’i 2,04 saniyedir.

## 10. Güvenlik ve platform riski

- Ham chat hiçbir prompta veya kalıcı loga girmez; yalnız `1/2` kontrol edilir.
- Kullanıcı ID’si loglanmaz.
- LLM çıktısı strict dört alan şeması ve güvenlik filtresinden geçer.
- Gerçek kişi/marka/telifli karakter ihtimalinde seçenek fallback havuzuyla değiştirilir.
- Görsel prompt anonim, yüzsüz, kurgusal kişi ister; marka, ünlü, telifli karakter, NSFW, gore ve silah negatif prompttadır.
- Başlangıç görseli özgün/prosedüreldir.
- Üçüncü taraf müzik veya medya kullanılmaz; yayın sessiz AAC olabilir.
- Overlay’de “AI tarafından üretilen interaktif kurgu” ibaresi vardır.
- Token, refresh token ve yayın anahtarı repo/state/log içinde tutulmaz.

Bu filtreler riski azaltır; açık kaynak görsel modelin hiçbir zaman riskli çıktı üretmeyeceğini garanti etmez. Vision/moderation modeli bilinçli olarak MVP kapsamına alınmadı. İlk gerçek yayın liste dışı ve gözetimli olmalıdır.

## 11. OBS ve YouTube

OBS için mevcut `İsimsiz` koleksiyon/profil değiştirilmeden iki yeni öğe kuruldu:

- `%APPDATA%\obs-studio\basic\scenes\SonsuzYayin.json`
- `%APPDATA%\obs-studio\basic\profiles\SonsuzYayin\basic.ini`

Browser Source URL `http://127.0.0.1:3000`, çözünürlük 1280×720, profil 30 FPS’tir. OBS arayüz otomasyonu çalışma çekirdeği `os error 3` verdiği için koleksiyonun UI içinden seçilmesi kullanıcıya bırakıldı; dosyalar ve JSON şeması doğrulandı.

YouTube adapter resmî `liveChat/messages.list` çağrısını kullanır. İlk geçmiş mesaj grubu oy sayılmaz; mesaj ID’leri tekrar sayımı engeller. 20 mesajın p95 gecikmesiyle:

```text
voteDuration = clamp(ceil(chatLatencyP95) + 4, 7, 12)
```

OAuth access token bellekte tutulur. Client ID/secret/refresh token verilirse token süresi dolmadan yenilenir; 401’de bir zorunlu refresh denenir.

## 12. Nasıl başlatılır

PowerShell’de proje dizininden:

```powershell
.\scripts\start-mvp.ps1
```

Sağlık:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

Beklenen:

```json
{
  "ok": true,
  "comfy": true,
  "qwen": true,
  "youtube": false,
  "engine": "IMAGE_MOTION"
}
```

Yerel önizleme `http://127.0.0.1:3000` adresidir. Bu public web sitesi değildir; OBS’nin yerel yayın katmanıdır. Sağ üstteki soluk Test 1/Test 2 düğmeleri sahte chat içindir.

YouTube için Node başlatılmadan önce:

```powershell
$env:YOUTUBE_LIVE_CHAT_ID='...'
$env:YOUTUBE_ACCESS_TOKEN='...'
$env:YOUTUBE_CLIENT_ID='...'
$env:YOUTUBE_CLIENT_SECRET='...'
$env:YOUTUBE_REFRESH_TOKEN='...'
```

## 13. “Durmadan ilerliyor mu?” sorusunun net cevabı

**Yerelde teknik olarak evet:** orkestrasyon 60 dakika boyunca 189 tur ilerledi; SD1.5 motorlu sürüm ayrıca 10 dakikada 54 tur tamamladı. Final SDXL motoru aynı orkestrasyona bağlandı, state 422’den devam etti ve smoke sırasında yeni sahneler üretip medya HTTP 200 verdi. Oy gelmeyince random seçme ve Qwen/Comfy fallback davranışları daha önce doğrulandı. Fakat 60 dakikalık test final SDXL checkpoint’iyle tekrarlanmadı; bu ayrım bilinçli olarak korunuyor.

**Görsel anlamda her karar net ilerliyor mu? Hayır:** eşit-komut testinde SDXL net aksiyonu 4/10, kısmi dahil görünür ilişkiyi 8/10 üretti. Bu SD1.5’ten iyi, fakat izleyici “seçimim birebir uygulandı” garantisi beklememelidir.

**Gerçek YouTube’da sonsuza kadar doğrulandı mı? Hayır:** kanal OAuth’u ve liste dışı yayın testi yapılmadı; gerçek chat gecikmesi ölçülmedi; 7/24 uzun dönem GPU/driver/OBS dayanıklılığı test edilmedi. MVP’nin iddiası bir saatlik yerel dayanıklılıktır.

## 14. Açık işler ve yayın öncesi karar

Hesap sahibinin yapması gerekenler:

1. YouTube canlı yayın aktivasyonunu tamamla.
2. OAuth client/refresh token ve aktif live chat ID üret.
3. OBS’de `SonsuzYayin` profil ve koleksiyonunu seç.
4. Sentetik/değiştirilmiş içerik açıklamasını etkinleştir.
5. Önce 10 dakikalık liste dışı bağlantı testi yap.
6. 20 gerçek chat mesajıyla p95 gecikmeyi ölç.
7. Sonra gözetimli 60 dakikalık liste dışı test yap.

MVP yayın açabilecek teknik seviyededir; SDXL görsel kaliteyi yükseltti fakat semantik kalite hâlâ deneysel seviyededir. En doğru konumlandırma “chat kontrollü fever dream”dir; “chat ne yazarsa kusursuz uygular” değildir. Vision ve continuity bu MVP’ye eklenmemelidir. İlk growth testinden sonra izleyici tutma verisi varsa kalite motoru ayrıca ele alınmalıdır.

## 15. Önemli dosyalar

- `README.md`: hızlı kullanım
- `config.json`: runtime ayarları
- `app/server.mjs`: tur orkestrasyonu/API/WebSocket
- `app/lib/comfy-image-engine.mjs`: SDXL‑Lightning üretimi
- `app/lib/options.mjs`: Qwen, şema ve güvenlik
- `app/lib/vote-manager.mjs`: oy kuralları
- `app/lib/youtube-chat.mjs`: YouTube chat/OAuth
- `public/`: OBS overlay
- `scripts/start-mvp.ps1`: tek komut başlatma
- `scripts/soak.mjs`: dayanıklılık ölçümü
- `scripts/create-seed.mjs`: özgün fallback görseli
- `state/soak-report-60m.json`: 60 dakika ham sonuç
- `state/soak-report-sd-smoke.json`: final SD kısa smoke sonucu
- `VALIDATION.md`: kısa doğrulama özeti
- `benchmark/ltx-benchmark-results.json`: ilk kararın ham verisi
- `benchmark/image-model-benchmark.mjs`: SD1.5/SDXL eşit-komut ölçüm betiği
- `benchmark/image-model-benchmark-summary.json`: image model hız/VRAM/kalite kararı

## 16. Nihai hüküm

Proje artık “tek bir hata bütün yayını bitirir” noktasında değildir. LTX video elendi, SDXL‑Lightning image-motion yolu çalışıyor, Qwen/Comfy/oy/restart fallback’leri doğrulandı ve orkestrasyon yerelde bir saat sürdü. En büyük kalan risk teknik süreklilik değil, seçilen aksiyonun görüntüde ne kadar anlaşılır üretildiğidir.

Bu nedenle sonuç:

```text
Teknik MVP: GEÇTİ
60 dk yerel orkestrasyon: GEÇTİ
10 dk SD1.5 orkestrasyon smoke: GEÇTİ
SDXL 10-komut benchmarkı + runtime smoke: GEÇTİ
Fallback dayanıklılığı: GEÇTİ
Görsel semantik kalite: KISMİ
Gerçek YouTube entegrasyonu: HESAP/OAUTH BEKLİYOR
Gerçek 7/24 iddiası: DOĞRULANMADI
```
