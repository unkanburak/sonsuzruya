# Product Finish / Public Readiness

Tarih: 2026-09-04

## STATUS

**PARTIALLY READY**

## CHANGED

- `public/app.js` — synthetic rain/fog/glow/water scene effects disabled; ambient level audible bir seviyeye çıkarıldı; cassette cue gain hafif artırıldı; mevcut event chain korunuyor.
- `public/style.css` — blink peak'i tam siyah swap noktasına hizalandı.
- `public/index.html` — CSS/JS cache-bust güncellendi; mevcut sade livestream layout ve sosyal linkler korunuyor.
- `app/lib/option-library.mjs`, `app/lib/options.mjs`, `app/server.mjs` — önceki scene-matched library entegrasyonu korunuyor; bu görevde option engine davranışı değiştirilmedi.

## TRANSITION

Canonical frontend transition path mevcut: yeni PNG preload/decode tamamlanmadan blink başlamıyor; eski frame görünür kalıyor; tek blink içinde yeni source swap ediliyor. `lastTransitionScene` duplicate tetiklemeyi engelliyor. Targeted option testleri **15/15 PASS**. Gerçek 8-transition playback doğrulaması Comfy/Qwen servisleri kapalı olduğu için bu çalışmada yeniden koşturulamadı.

## AUDIO

`/audio/sleep_of_static.mp3` mevcut ve browser loop olarak bağlı. Başlangıç seviyesi `0.16`; tape cue tek transition/scene guard'ı ile Web Audio üzerinden çalıyor. Gerçek insan-kulak playback ölçümü bu ortamda otomatik doğrulanamadı; browser telemetry mevcut.

## UI

Desktop ve mobile için mevcut minimal livestream layout, 16:9 player, compact psyche/chat, countdown, social links ve viewer label korunuyor. Tekrarlayan yağmur/sis/ışık overlay'leri kapatıldı; görüntünün kendi atmosferi kullanılıyor. Mobile için horizontal overflow kuralı mevcut.

## SAVE DREAM

Save Dream yalnız committed `state.media` PNG'sini indirir ve `ai-fever-dream-{sceneNumber}.png` adı kullanır. Generating/yarım dosya indirime alınmaz.

## PUBLIC

Stable public URL şu anda yok. Hostinger DNS/nameserver'a dokunulmadı ve Cloudflare Quick Tunnel aktif değil.

Gerekli manuel adımlar:

1. PC'de Node `localhost:3000` çalışırken `cloudflared tunnel --url http://127.0.0.1:3000` başlatın.
2. Oluşan HTTPS URL'yi kullanın; yalnız Node public olsun, Comfy `8188` ve Qwen `8080` private kalsın.
3. Kalıcı `live.burakunkan.com` için ayrı DNS/proxy kurulumu daha sonra yapılmalı.

## SECURITY

ComfyUI (`8188`), Qwen (`8080`) ve filesystem path'leri frontend'e public API olarak açılmıyor. Node aynı-origin `/api`, `/audio`, `/generated` yüzeyini sunuyor. YouTube kapalı.

## END-TO-END

Önceki doğrulanmış local sonuç: 12 displayed round, library source 12/12, 20 unique label, 12 unique pair, exact pair repeat 0, manifest-unrelated option 0, 9 location transition. Bu patch sonrası option regression suite 15/15 PASS. Yeni 10-round public E2E, Comfy/Qwen health yokken çalıştırılmadı.

## KNOWN LIMITATION

Bu oturumda production Node health `comfy=false`, `qwen=false` durumunda; dolayısıyla yeni gerçek SDXL transition ve insan-kulak audio testi yapılamadı. Bu, UI/audio kodunun syntax veya unit test hatası değil, inference servislerinin çalışmaması kaynaklıdır.

## NEXT ACTION

Comfy ve Qwen'i mevcut production komutlarıyla başlatıp Node `/health` içinde ikisi de `true` olduktan sonra 10 gerçek round ve browser playback telemetry'sini çalıştırın.
