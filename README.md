> **Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.**

# Sonsuz Sürreal AI Yayını — çalışan MVP

Detaylı uygulama, kalite ve test değerlendirmesi: `KAPSAMLI_UYGULAMA_VE_TEST_RAPORU.md`.

RTX 3070 Ti benchmarkı sonucunda dondurulmuş karar ağacı uygulandı: hiçbir LTX video profili zamanlama şartını geçmedi, bu yüzden image-motion yoluna geçildi. Son eşit-komut karşılaştırmasında **SDXL‑Lightning 4-step + browser motion**, SD1.5’e göre daha okunaklı sonuç verdiği için final image motoru seçildi.

## Durum

- Yerel yayın: `http://127.0.0.1:3000`
- ComfyUI: `http://127.0.0.1:8188`
- Qwen3 4B Q4 CPU: `http://127.0.0.1:8080`
- OBS: 1280×720, 30 FPS, Browser Source hazır
- YouTube adapter: hazır; kanal/OAuth değerleri verilince etkinleşir
- Anlatı hafızası: bounded story-state + recurring symbol memory + collective direction; public payload yalnız anonim yön göstergelerini paylaşır.

Her şeyi başlatmak için PowerShell:

```powershell
.\scripts\start-mvp.ps1
```

Test oyları arayüzün sağ üstündeki soluk `Test 1/Test 2` düğmelerinden veya API ile gönderilebilir:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/debug/vote -Method Post -ContentType application/json -Body '{"userId":"u1","vote":"1"}'
```

## Benchmark kararı

| Profil | G95 | Ham süre | Azami efektif süre | Gerekli süre | Sonuç |
|---|---:|---:|---:|---:|---|
| 384×224 / 81 / 2 | 2,395 sn | 3,375 sn | 5,625 sn | 10,395 sn | geçmedi |
| 384×224 / 121 / 2 | 4,723 sn | 5,042 sn | 8,403 sn | 12,723 sn | geçmedi |
| 512×288 / 81 / 2 | 3,574 sn | 3,375 sn | 5,625 sn | 11,574 sn | geçmedi |

Ham LTX sonucu: `benchmark/ltx-benchmark-results.json`. Image model karşılaştırması: `benchmark/image-model-benchmark-summary.json`.

## Çalışma döngüsü

Tam `1` veya `2` oyları kullanıcı başına ilk oy kuralıyla sayılır. Altı saniye sonunda oy yoksa veya eşitse rastgele kazanan seçilir. Vote kilidinde kazananın pending story-state'i ile medya ve tahmini N+1 seçenekleri paralel hazırlanır; görsel başarıyla oluşmadan state commit edilmez. Qwen bozulur ya da toplam sekiz saniyeyi aşarsa Jung-aware güvenli fallback kullanılır. SDXL‑Lightning her turda kısa WORLD/PROTAGONIST/STYLE ve mevcut son durum bağlamıyla yeniden üretilir; eski kompozisyon zorlanmadan bounded sembol ve yön hafızası korunur. Comfy üretimi bozulur veya 120 saniyeyi aşarsa mevcut son kare motion/fog/noise ile kesintisiz kalır. State `state/current.json`, güvenli olaylar `state/events.jsonl` içindedir; ham chat yazılmaz.

Kontrol:

```powershell
npm test
Invoke-RestMethod http://127.0.0.1:3000/health
npm run soak
```

## OBS

Hazır koleksiyon ve profil:

- `obs/SonsuzYayin.json`
- `obs/basic.ini`

Kurulu OBS’ye de `SonsuzYayin` koleksiyonu/profili kopyalanmıştır. OBS’yi açıp üst menüden **Sahne Koleksiyonu → SonsuzYayin** ve **Profil → SonsuzYayin** seç. Kaynak URL’si `http://127.0.0.1:3000`, boyut 1280×720’dir. Yayın anahtarı bu repoda tutulmaz.

## YouTube’u bağlama

Uygulama resmî Live Chat API `liveChat/messages.list` adaptörünü kullanır, ilk geçmiş mesaj grubunu yok sayar, tekrarları ID ile eler ve 20 mesajlık p95 gecikmeye göre oylamayı 7–12 saniyeye ayarlar.

Node’u şu değişkenlerle yeniden başlat:

```powershell
$env:YOUTUBE_LIVE_CHAT_ID='...'
$env:YOUTUBE_ACCESS_TOKEN='...'
npm start
```

Uzun yayında otomatik token yenileme için access token yerine/yanında `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` ve `YOUTUBE_REFRESH_TOKEN` verilebilir. Bu değerler yalnız process belleğinde kalır.

Kanal aktivasyonu, OAuth onayı, liste dışı yayın oluşturma ve YouTube’daki “değiştirilmiş/sentetik içerik” açıklamasını etkinleştirme hesap sahibi tarafından tamamlanmalıdır. Token ve yayın anahtarı loglara ya da state’e yazılmaz.

## Bilinçli kapsam dışı

Serbest chat, vision, world state, continuity, dashboard, üyelik, seslendirme, AI müzik, otomatik Shorts, sosyal medya otomasyonu, cloud GPU, gelişmiş analytics ve gerçek 7/24 optimizasyonu yoktur.
