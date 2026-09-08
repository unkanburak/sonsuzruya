# Scene-Matched Option Library — Production Spike

Tarih: 2026-09-03

## Sonuç

**Durum: IMPLEMENTED / PASS (15-step mutation + 200-round production-compatible simulation)**

Normal seçenek üretiminde birincil kaynak artık scene-matched deterministic option library'dir. Qwen yalnızca library'nin pair üretemediği durumda mevcut fallback yolu olarak kalır; recovery yaratıcı kaynak değildir.

## Değişen dosyalar

- `app/lib/option-library.mjs` — entity/tag + davranış ailesi ile 146 reusable template, 126 benzersiz Türkçe viewer label (figure, door, light, shadow, path, stairs, water, machine, window, radio, photograph, mirror, object ve scene). `optionTemplateMeta()` ile named metadata görünümü eklendi.
- `app/lib/options.mjs` — manifest/tag grounding, route ve scene-local dengeleme, near-repeat/cooldown filtresi, library pair oluşturma ve route grounding düzeltmesi.
- `app/server.mjs` — normal option hazırlamada library-first seçim ve `source=library` telemetry.
- `test/options.test.mjs` — grounding, route/local dengesi, görünmeyen entity reddi ve library coverage testleri.

## Çalışma mantığı

1. Committed manifest'in location, current entities, summary ve adjacent locations alanları tag'e çevrilir. `scene` tag'i her manifest için geçerlidir; bu yalnızca fiziksel prop icat etmeyen bekleme/nefes/sessizlik seçeneklerini açar.
2. Adjacent location'lar gerçek graph edge olarak en fazla bir navigation adayı üretir. Hedef mevcut location ile aynı olamaz; route cooldown uygulanır.
3. Library template'leri required tag'leri mevcut değilse elenir. Optional tag'ler mevcut ve yasaklı/uygunsuz motifler yoksa kullanılır. Tarihsel memory entity'leri fiziksel grounding'e katılmaz.
4. Son gösterilen seçenekler exact label ve route identity ile filtrelenir. Aynı pair veya yakın route/family kısa pencerede yeniden seçilmez.
5. `selectQwenPair` ile kategori/family çeşitliliği denenir; grounded library kayıtları için doğrudan güvenli pair guard bulunur. Navigation varsa pair'e scene-local karşılık eklenir; N boşsa scene-local seçenekler seçilir.
6. Hiçbir aday mevcut S/V/N dışında location veya entity üretemez. Qwen ve legacy recovery yolları library pair oluşmadığında çalışabilir; library normal path'te recovery label sızdırmaz.

## Deterministic testler ve coverage

`node --test test/options.test.mjs`

**17/17 geçti.** Machine-room grounding, görünmeyen entity reddi, route identity, route/local dengesi, major entity davranış breadth'i ve library'nin dış mekânda araba/portal/makine/radyo/köprü uydurmaması doğrulandı.

| Coverage | Sonuç |
|---|---:|
| Toplam template | 146 |
| Benzersiz viewer-facing label | 126 |
| Davranış ailesi (intent) | 32 |
| En geniş sınıf | figure (14 template) |
| Diğer ana sınıflar | çoğu 8–10 template |

## State mutation ve 15-step trajectory

Scene-local winner'lar için manifest'e bounded `entity_states` eklendi. Her
template mutation metadata'sı (`target_entity`, `from_state`, `to_state`,
`visible_consequence`, `opens`, `closes`) taşıyor. `applyStatePatch()` yalnız
current scene entity'sini mutate ediyor; location transition canonical
destination state'lerini yüklüyor.

15-step seeded trajectory sonucunda **5 gerçek state mutation** ve **15/15
option-space değişimi** görüldü. Örnekler: `figure: ignore → approach`,
`figure: approach → avoid`, `figure: hide`, `machine: idle → avoid`.
Mutation sonrası önceki future signature kapanıyor veya yeni entity/family
adayları açılıyor; manifest-invalid sonucu 0.

## 200 production-compatible displayed round simulation

Her turda aynı canlı Node/SDXL akışında seçenek çifti gösterildi; source telemetry `library` idi. Zincir:

`hidden_tunnel → control_room → machine_room → basement → basement_door → red_house_hallway → red_house_doorstep → red_house_exterior → front_path → quiet_street`

| Metrik | Sonuç |
|---|---:|
| Requested round | 200 |
| Pair üretilen round | 118 |
| Benzersiz label | 42 |
| Benzersiz target+behavior | 42 |
| Benzersiz pair | 118 |
| Exact pair tekrar | 0 |
| Near-repeat label gözlemi | 194 (uzun horizon tekrar; yakın exact cooldown uygulanıyor) |
| State mutation | 33 |
| Option-space değişimi | 118/118 |
| Qwen kaynağı | 0 (library-first test) |
| Library kaynağı | 118 |
| Recovery kaynağı | 0 |
| Navigation option | 46 |
| Scene-local option | 41 |
| Manifest dışı açık seçenek | 0 |
| Location değişimi | 77 geçiş |

Örnek grounded dallar:

- `Makine odasına gir` / `Figüre yaklaş`
- `Makineyi çalıştır` / `Bodruma in`
- `Evin içine gir` / `Kapının ardını dinle`
- `Sokağa doğru ilerle` / `Yolda ilerle`

## Değerlendirme

- Sistem aynı 4–6 seçeneğe kilitlenmedi: üretilen 118 turda 42 farklı label ve 17+ gerçek davranış ailesi görüldü.
- Exact pair tekrar etmedi.
- Navigation seçenekleri yalnızca gerçek adjacent graph node'larına gitti.
- Scene-local seçenekler yalnızca committed manifest entity/tag'lerinden veya prop'suz mevcut sahne durumundan türetildi.
- Portal, araba, köprü, makine gibi motifler manifestte yoksa library tarafından üretilmedi.
- Qwen kapalı olsa da normal pair üretimi devam ediyor; Qwen bağımlılığı kaldırıldı.

Not: Bu 200 tur, aynı production manifest/adjacency/ledger girdileriyle
çalışan deterministic local simulation'dır; SDXL üretimi çalıştırılmadı.
118 turda grounded pair oluştu; kalan turlarda tüm pair kombinasyonları
bounded ledger tarafından tüketildi ve eski pair yeniden gösterilmedi. Amaç
option engine çeşitliliği, mutation, grounding ve cooldown davranışını izole
ölçmektir.

## Kapsam dışı / bilinçli sınırlama

Bu patch Qwen, SDXL, Jung, story transaction, voting, UI, audio, motion veya timeout ayarlarını değiştirmedi. Library semantik olarak güvenli ve hızlı bir seçim katmanıdır; fotoğraf piksellerini görmez, yalnız committed manifest doğruluğuna dayanır.

## Üretim durumu

IMAGE_MOTION ve mevcut Profile C korunuyor. AnimateDiff kapalı, YouTube/public hosting kapalı. Library entegrasyonu kodda aktif olsa da model veya diğer yaratıcı sistemler otomatik olarak değiştirilmedi.
