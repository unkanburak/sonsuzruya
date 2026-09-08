# Causal Forcing++ Feasibility Spike — İlk Kontrol

Bu spike ana uygulamaya bağlanmadı ve mevcut image-motion sistemi değiştirilmedi.

## Doğrulananlar

- Resmî Causal Forcing deposu mevcut ve 1-step/2-step frame-wise T2V + I2V inference akışını dokümante ediyor.
- I2V, ilk latent frame’i koşullu görüntü olarak kullanıyor.
- Resmî kurulum ComfyUI native workflow’u değil; ayrı Python environment, bağımlılıklar ve `flash-attn` kurulumu istiyor.
- Resmî 1-step inference komutu `configs/causal_forcing_dmd_framewise_1step.yaml` kullanıyor.
- Bu config’in `real_name` değeri **`Wan2.1-T2V-14B`** görünse de kaynak kodunda `CausalInferencePipeline` generator varsayılanı `Wan2.1-T2V-1.3B`; `real_name` esas olarak eğitim/teacher tarafında kullanılıyor. Bu nedenle 1.3B iddiası tamamen yanlış değil, ancak config alanı kafa karıştırıcı.
- Aynı config’te `image_or_video_shape` 21×16×60×104, varsayılan çözünürlük 832×480 ve I2V kodu 480×832 resize kullanıyor.
- `framewise-1step.pt` checkpoint’i yaklaşık **5,68 GB**. Bu yalnızca Causal Forcing ağırlığıdır; Wan taban modeli ve diğer ağırlıklar ayrıca gereklidir.
- Kaynak kodu `WanTextEncoder` içinde **UMT5-XXL** yüklüyor; BERT-base kullanıldığına dair kanıt bulunmadı. Bu encoder CPU/GPU yükünü LTX kadar olmasa da hâlâ önemli kılar.
- Resmî repo README’si Windows, ComfyUI veya RTX 3070 Ti 8 GB için performans garantisi vermiyor.

## Yorum

Araştırmadaki “Wan2.1 1.3B + Causal Forcing++” ifadesi kısmen doğru; final generator kaynakta 1.3B varsayılanına dayanıyor. Ancak config’teki `real_name: Wan2.1-T2V-14B` ve UMT5-XXL encoder ayrıntıları gözden kaçırılmamalı. 3070 Ti 8 GB üzerinde beklenen `≤15 sn endToEndLatency` hâlâ desteklenmiş bir iddia değil; modelin sığması ve Windows’ta çalışması önce doğrulanmalı.

## Mevcut karar

Feasibility spike’ın ilk adımı başarıyla tamamlandı: adayın resmî varlığı ve gerçek bağımlılıkları kontrol edildi. Büyük checkpoint indirme ve saatler sürecek kurulum, 1.3B varsayımı doğrulanmadan başlatılmadı. Ana sistem image-motion olarak çalışmaya devam ediyor.

Kaynaklar: resmî repo inference/config açıklamaları ve checkpoint metadata’sı. citeturn21view0turn23view0
