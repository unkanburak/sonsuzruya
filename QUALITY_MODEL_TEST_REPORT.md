# SDXL-Lightning Kontrollü Kalite Testi

Tarih: 29 Ağustos 2026  
Kapsam: Yalnızca görüntü üretim profili karşılaştırması. Story-state, continuity, Qwen, OBS ve yayın mimarisi değiştirilmedi.

## Mevcut üretim workflow'u

ComfyUI akışı: `CheckpointLoaderSimple → CLIP pozitif/negatif → EmptyLatentImage → KSampler → VAE Decode → SaveImage`.

| Ayar | Mevcut değer |
|---|---|
| Checkpoint | `sdxl_lightning_4step.safetensors` |
| Çözünürlük | `768×448` |
| Steps | `4` |
| CFG | `1` |
| Sampler | `euler` |
| Scheduler | `sgm_uniform` |
| Üretim modu | text-anchor continuity (mevcut sistem) |

## Test yöntemi

Aynı 10 kısa result-state promptu, aynı çözünürlükte ve aynı seed dizisiyle çalıştırıldı. B profilinde 4-step checkpoint 8 step'e zorlanmadı; eşleşen resmi `sdxl_lightning_8step.safetensors` checkpoint'i kullanıldı. Her iki profilde CFG 1, Euler ve `sgm_uniform` sabit tutuldu. Sampler, scheduler, negative prompt veya ek model tuning'i yapılmadı.

## Sonuç tablosu

| Profil | Checkpoint / steps | Başarı | Generation p50 | Generation p95 | OOM / hata | Peak VRAM |
|---|---|---:|---:|---:|---:|---|
| A — CURRENT BASELINE | 4-step, 768×448 | 10/10 | 2.43 sn | 2.88 sn | 0 | Comfy history/API bu değeri sunmuyor |
| B — QUALITY | eşleşen 8-step, 768×448 | 10/10 | 3.46 sn | 64.02 sn* | 0 | Comfy history/API bu değeri sunmuyor |

\* B'nin ilk üretiminde checkpoint yükleme/soğuk başlangıç nedeniyle 64.02 sn ölçüldü. Isınma sonrası 9 üretimde en yüksek süre 4.02 sn; sıcak p95 yaklaşık 4.02 sn. Canlı yayından önce checkpoint ısıtılabilir, ancak bu durum kalite kararını tek başına değiştirmiyor.

## 10 prompt görsel okunabilirliği

Her iki profil 10 promptun tamamında başarılı dosya üretti. Temel result-state'ler (oda, koridor, sokak, araba, tünel, köprü, ışık, portal dünyası, orman ve yüzen şehir) görsel olarak ayırt edilebildi.

Örnek karşılaştırma:

- **Araba:** İki profil de arabayı net verdi; B biraz daha temiz/parlak göründü.
- **Köprü:** İki profil de köprü ve silüeti verdi; B'de sağ üst bölgede ek geometrik bozulma görüldü.
- **Yüzen şehir:** İki profil de sahneyi okunur verdi; B farkı küçük kaldı.

Bu nedenle B için 10/10 teknik okunabilirlik olsa da, insan gözündeki kalite farkı genel ve belirgin bir sıçrama değil; bazı karelerde küçük temizlik artışı, bazı karelerde ise bozulma şeklinde.

## Karar

B profili görüntüleri yaklaşık %40–45 daha yavaş üretiyor (sıcak ölçümlerde yaklaşık 3.46 sn p50 / 4.02 sn p95), fakat 10 prompt genelinde result-state okunabilirliğini veya atmosfer/kompozisyonu belirgin biçimde iyileştirmiyor. Bu nedenle tek yüksek çözünürlük C testi çalıştırılmadı; kullanıcının karar kuralına göre B “belirgin kalite artışı” eşiğini geçmedi.

### Önerilen nihai ComfyUI profili

```text
checkpoint: sdxl_lightning_4step.safetensors
resolution: 768×448
steps: 4
CFG: 1
sampler: euler
scheduler: sgm_uniform
```

8-step checkpoint test amacıyla kurulu kalabilir, ancak üretim profili olarak seçilmedi. Mevcut image-motion sistemi bu 4-step profille çalışmaya devam ediyor. Bu test YouTube OAuth veya gerçek chat gecikmesini ölçmez.

Ham ölçüm: [`benchmark/sdxl-quality-ab-results.json`](<PROJECT_ROOT>/benchmark/sdxl-quality-ab-results.json)
