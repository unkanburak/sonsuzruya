# AnimateDiff-Lightning feasibility spike

Tarih: 29 Ağustos 2026  
Donanım: RTX 3070 Ti 8 GB  
Kapsam: Ana Node.js/story-state/OBS sistemi değiştirilmeden, ayrı ComfyUI örneğinde test.

## Sonuç

AnimateDiff-Lightning 2-step, 384×224 ve 16 karelik kısa kliplerde çalıştı. Üç T2V ve üç image-conditioned testin tamamı başarılı oldu; OOM görülmedi. Warm üretim süresi T2V’de 2,17–2,50 sn, I2V benzeri testte 5,60–8,47 sn aralığındaydı. Bu nedenle 15 saniyelik warm E2E eşiğini geçiyor ve generative-motion katmanı için ciddi adaydır.

Bu test 16 kare/8 fps ile 2,0 saniyelik klip ölçer. 3–5 saniyelik klip, gerçek OBS `canplay/playing` süresi ve tam vote-lock orkestrasyonu bu spike’ta ölçülmedi.

## Kurulum ve profil

- `ComfyUI-AnimateDiff-Evolved` ve `ComfyUI-VideoHelperSuite` kuruldu.
- ByteDance’in resmi `animatediff_lightning_2step_comfyui.safetensors` checkpoint’i kullanıldı.
- SD1.5 taban: `DreamShaper_8_pruned.safetensors`.
- 384×224, 16 kare, 8 fps.
- 2 step, CFG 1, Euler, `sgm_uniform`, AnimateDiff `sqrt_linear` beta schedule.
- ComfyUI ayrı olarak 8191 portunda, `--lowvram` olmadan Dynamic/NORMAL VRAM ile çalıştırıldı.

ByteDance’in resmi model kartı stylized SD1.5/SDXL tabanları ve 2/4/8-step checkpoint’leri tarif ediyor; ComfyUI kullanımı için AnimateDiff-Evolved ve VideoHelperSuite’i işaret ediyor. [Resmi model kartı](https://huggingface.co/ByteDance/AnimateDiff-Lightning)

## T2V ölçümü

| Sahne | Durum | Süre | Görsel okunabilirlik |
|---|---:|---:|---|
| Araba | cold ilk çalıştırma | 14,47 sn | 3/3 kabul |
| Tünel | warm | 2,50 sn | 3/3 kabul |
| Sürreal portal | warm | 2,17 sn | 3/3 kabul |

Özet: 3/3 başarı, OOM yok. Warm örnek sayısı yalnızca iki olduğu için istatistiksel p95 güvenilir değildir; gözlenen warm aralık 2,17–2,50 sn, cold süre 14,47 sn’dir.

Görüntülerde araba, sisli tünel ve kırmızı sis içindeki portal net biçimde ayırt edildi. Stilize ve düşük çözünürlüklü sonuçlar canlı bir motion layer için okunabilir bulundu.

## Image-conditioned hareket ölçümü

Mevcut SDXL result-state görseli ComfyUI input’una alındı. AnimateDiff-Lightning’in native first-frame I2V modeli olmadığı için bu test, SDXL latentinin 16 kareye tekrarlanıp AnimateDiff ile hareketlendirilmesini kullanan yaklaşık bir image-conditioned yöntemdir; native I2V sonucu olarak yorumlanmamalıdır.

| Sahne | Süre | Başarı | Gözlem |
|---|---:|---:|---|
| Araba | 8,47 sn | başarılı | Önceki kompozisyon/landmark korunuyor, hafif hareket |
| Tünel | 5,60 sn | başarılı | Ana yapı korunuyor, karakter silueti okunuyor |
| Portal | 5,79 sn | başarılı | Portal, kırmızı atmosfer ve merkez figür korunuyor |

Üç klipte de başlangıç görselinin ana mimarisi korunuyor; hareket sınırlı ve daha çok atmosferik/şekilsel. Bu, tam fiziksel continuation değil ama mevcut image-motion yaklaşımından daha gerçek video çıktısı verir.

## End-to-end KPI durumu

Bu spike ana uygulamaya bağlanmadı; bu nedenle `vote_lock → SDXL result image ready` bölümü yeniden çalıştırılmadı. İzole testte ölçülen pratik proxy:

- SDXL image ready → animated video dosyası hazır: **5,60–8,47 sn warm I2V-benzeri**.
- T2V ilk cold: **14,47 sn**; warm gözlenen: **2,17–2,50 sn**.
- Gerçek Browser Source/OBS `canplay` veya `playing` anı ölçülmedi; süreler Comfy job tamamlanması ve çıktı dosyasının erişilebilir olmasıdır.
- Dolayısıyla gerçek `warm E2E p95` için daha fazla warm tur ve izole frontend playback ölçümü gerekir. Mevcut gözlemler 15 sn hedefinin altında olsa da p95 iddiası için örnek sayısı henüz yeterli değildir.

## VRAM ve hata durumu

RTX 3070 Ti toplam VRAM: 8192 MiB. Benchmark sırasında ayrı per-node peak-VRAM örnekleyicisi kurulmadığından güvenilir peak değeri raporlanmamıştır; son kontrol benchmark sonrası yaklaşık 3935 MiB kullanım gösterdi. Altı işin tamamı başarılı, OOM veya Comfy execution hatası yok.

## 4-step kararı

2-step sonuçları üç sahnede de okunabilir olduğundan, kullanıcı talimatındaki koşul oluşmadı; eşleşen 4-step checkpoint testi çalıştırılmadı. 4-step ancak 2-step görseli bozuk kabul edilirse tek seferlik kalite kontrolü olarak yapılmalıdır.

## Karar

AnimateDiff-Lightning 2-step şu an **ana uygulamaya bağlanmış değildir**, fakat RTX 3070 Ti üzerinde kısa generative-motion katmanı için teknik olarak yaşanabilir bir adaydır. En güçlü bulgu warm üretim hızıdır. En önemli sınırlama, kullanılan I2V testinin native first-frame continuation olmaması ve gerçek OBS playback latency’sinin henüz ölçülmemesidir.

Ana image-motion sistemi ve story-state mimarisi korunmuştur. Causal Forcing++ kurulumu sürdürülmemiştir. Sonraki adım ancak bu izole sonucu kabul ederseniz, 3–5 saniyelik klip ve gerçek Browser Source playback ölçümü yapmak olmalıdır; model arama veya ana mimari değişikliği bu testin kapsamı değildir.
