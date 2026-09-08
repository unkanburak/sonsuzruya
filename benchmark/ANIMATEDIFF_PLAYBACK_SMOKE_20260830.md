# AnimateDiff local playback smoke

Feature flag test süresince `ANIMATEDIFF_ENABLED=1` olarak açıldı; test bitince tekrar kapatıldı. Model, çözünürlük, step, timeout, Qwen ve story-state ayarları değiştirilmedi.

## 3 tur sonucu

| Tur | vote_lock | SDXL image ready | AnimateDiff start | video file ready | Browser video playing | Sonuç |
|---:|---|---|---|---|---|---|
| 2084 | 21:06:21.702 | 21:07:13.585 | 21:07:13.588 | yok | yok | fallback |
| 2085 | 21:07:19.018 | 21:07:44.600 | 21:07:44.602 | yok | yok | fallback |
| 2086 | 21:07:50.323 | 21:08:15.429 | 21:08:15.431 | yok | yok | fallback |

AnimateDiff üç turda da Comfy validation aşamasında reddedildi:

```text
node 7: LoadImage
image - Invalid image file: current_scene_02084.png
```

Aynı hata 02085 ve 02086 için de tekrarlandı. Bu yüzden 3/3 video başarısı oluşmadı; talimat gereği 10–20 warm tur çalıştırılmadı.

## Ölçüm özeti

- SDXL vote_lock → image ready: 25,10–51,88 sn (mevcut düşük-VRAM ana hat koşulunda).
- Image ready → AnimateDiff start: yaklaşık 0,00 sn.
- Video file ready: 0/3.
- Browser video playing: 0/3.
- Video success: 0/3.
- Video fallback: 3/3.
- Gerçek E2E p50/p95: hesaplanmadı; video-ready örneği yok.

Ana sistem test sonrasında `ANIMATEDIFF_ENABLED=false` ile ve `IMAGE_MOTION` modunda bırakıldı. Bu smoke test, AnimateDiff hızını değil, mevcut Node→Comfy input snapshot’ının AnimateDiff `LoadImage` tarafından bulunamadığını gösterdi. Yeni bir çözüm veya optimizasyon bu test kapsamında uygulanmadı.
