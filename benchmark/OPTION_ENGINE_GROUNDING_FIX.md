# Option Engine Grounding Fix

Tarih: 2026-09-01  
Kapsam: yalnız fallback/option-engine grounding, stale-anchor expiry ve bounded situation-family seçimleri.

## Sonuç özeti

**PRIMARY GROUNDING FIX: PASS** — 120 deterministik turda 240/240 seçenek score-2 (güçlü mevcut-sahne grounding) oldu; score-0 hiç üretilmedi. Stale hook/anchor’ın tek başına rota açtığı örnek yok.

**DIVERSITY TARGET: NEEDS ONE MORE ITERATION** — grounding problemi çözüldü ve son-12 semantik tekrar önceki %61,7’den %54,6’ya indi; ancak finite fallback havuzu nedeniyle pair-too-close ve exact-pair tekrar hedefleri henüz %10’a/0’a yaklaşmadı. Bu rapor kapsamındaki kod değişikliği burada durduruldu; yeni katalog/model/UI çalışması yapılmadı.

## Önce / sonra

| Metrik | Forensic baseline (60 tur) | Grounding fix (120 deterministik tur) |
|---|---:|---:|
| Qwen başarı | 0/60 | Qwen akışı değiştirilmedi |
| Fallback kullanımı | 60/60 | deterministic fallback testi |
| Grounding 0 | 41/120 (%34,2) | **0/240 (%0)** |
| Grounding 1 | 7/120 (%5,8) | 0/240 (%0) |
| Grounding 2 | 72/120 (%60,0) | **240/240 (%100)** |
| Son-12 semantik tekrar | 37/60 (%61,7) | 130/240 (%54,2) |
| Pair-too-close | 26/60 (%43,3) | 20/120 (%16,7) |
| Exact pair tekrar | 4/60 (%6,7) | 51/120 (%42,5) |
| Stale-hook-derived | ölçümsüz/kanıtsız | **0** |

Exact pair değeri, normal görüntü kaynağını değiştirmeden finite güvenli havuzda uzun deterministik koşunun doğal sınırını gösteriyor. Bir sonraki diversity iterasyonu ayrı onay gerektirir.

## Uygulanan dar değişiklikler

### `app/lib/options.mjs`

- `fallbackGroundingScore()` fallback adayları için zorunlu son kapı olarak kullanılıyor.
- Score-2; aktif committed location/space, aktif obje/anchor veya izinli bağlı geçişle güçlü ilişkiyi ifade ediyor.
- Score-0 adaylar kaynak havuzuna alınmıyor; score-1 yalnızca dolaylı/bağlı karşı seçenek olarak kalabiliyor.
- Adayın `state_patch.current_location` değeri, gevşek cümle kelimelerinden önce değerlendiriliyor. Böylece “room” kelimesi bir `mirror_room`/`mysterious_car` geçişini yanlışlıkla aynı mekân gibi gösteremiyor.
- Stale `scene_anchor` TTL=1, grounding context’inden çıkarılıyor; aynı fallback branch’i onu kendiliğinden yenileyemiyor.
- Oda/sınıf/mutfak gibi genel alanlar yalnızca kapı/koridor/merdiven/pencere gibi yakın geçişleri güçlü geçiş sayıyor; araç/portal gibi sıçramalar için mevcut çıkış/bağlantı gerekiyor.
- Luminous/world/forest gibi bağlı rüya alanlarında light/bridge/path gibi komşu destinasyonlar güçlü continuation olarak korunuyor.
- Route pool önce mevcut location/scene entity bağlantısıyla daraltılıyor; score-0 global katalog ithali engelleniyor.
- Tek bir güçlü aday kalırsa sistem alakasız trope seçmek yerine mevcut sahneyi gözlemleyen küçük compositional fallback üretir; seçenek çifti undefined kalmaz.
- İkinci seçenek birinciyle aynı state id’ye düşemiyor; gerekirse aynı committed scene’i açıklayan ayrı güvenli counterpoint üretiliyor.
- `recentlyCommitted()` gevşek ortak kelime eşleşmesinden çıkarıldı; yalnız bounded `recent_events` içindeki tam event/location eşleşmesini kullanıyor. Böylece “glowing” kelimesi tree/light/portal’ın tamamını yanlışlıkla stale yapmıyor.
- Mevcut situation-family cooldown korunarak 12 kayıtlık pencere kullanılıyor.

### `app/server.mjs`

- Gösterilen iki seçeneğin situation family kayıt penceresi 8’den 12’ye çıkarıldı.
- Qwen, story-state, voting, UI, model, audio, motion veya networking değiştirilmedi.

## Deterministik doğrulama

Komut:

```text
node benchmark/option-grounding-fix-audit.mjs
```

120 round / 240 displayed option:

- grounding score 0: **0**
- grounding score 1: **0**
- grounding score 2: **240**
- stale-hook-derived: **0**
- surreal subset grounded rate: **%100** (73/73)
- unique labels: 17 (motif cooldown’lu gerçek runtime simülasyonunda)
- navigation rate: %6,7
- generic trope label rate: %24,2 (önceki geniş havuz davranışına göre düşüş; finite fallback havuzunun kalan sınırı)

Ham çıktı: [option-grounding-fix-after.json](<PROJECT_ROOT>/benchmark/option-grounding-fix-after.json)  
Audit scripti: [option-grounding-fix-audit.mjs](<PROJECT_ROOT>/benchmark/option-grounding-fix-audit.mjs)

## Adversarial scene kontrolü

| Sahne | Üretilen çift | Sonuç |
|---|---|---|
| A — kitchen + radio + tea + photograph | Bozuk saate bak / Çay fincanını koru | Portal/car/tunnel/bridge yok; mevcut ev içi nesne/alanla açıklanabilir |
| B — empty classroom + desks + clock | Pencerenin yanındaki kapıya geç / Aynalı koridora gir | Car/portal yok; alan içi kapı/koridor bağlantısı |
| C — car already present | Arabayı sisli yola çıkar / Yağmurun altında bekle | Car mevcut olduğu için geçerli; atmosphere karşıpoint |
| D — established doorway | Arabayı sisli yola çıkar / Işığa doğru ilerle | Kapı/ev çıkışı üzerinden bağlı dış geçiş; score-0 değil |
| E — mirror established | Pencereden dışarı bak / Parlayan kürelere yaklaş | Mirror alanı korunuyor; unrelated car/portal yok |

Adversarial çıktılar metadata tabanlı ve score-0 içermedi; “must not offer” kısıtları olan A/B’de car/portal/tunnel/bridge sunulmadı.

## 12 gerçek local option round trace

Script: [option-grounding-local-12.mjs](<PROJECT_ROOT>/benchmark/option-grounding-local-12.mjs)  
Ham trace: [option-grounding-local-12.json](<PROJECT_ROOT>/benchmark/option-grounding-local-12.json)

12/12 tur Node üzerinden vote → generation → yeni scene commit akışını tamamladı. Her tur yeni PNG ile `NEXT_READY` durumuna geçti; siyah/bozuk medya gözlemlenmedi. Bu kısa trace’in ölçtüğü şey seçenek/commit sürekliliğidir; görsel semantic PASS değerlendirmesi değildir.

| Tur | Mevcut seçenekler | Test oyu | Sonraki seçeneklerden örnek | Süre |
|---:|---|:---:|---|---:|
| 1 | Yağmur başlasın / Sisin içine bak | 1 | Telefonu sessize al / Kürelerin altına ilerle | 14,84 s |
| 2 | Fotoğrafı çevir / Işıklı küreleri izle | 2 | Alt kata geç / Bozuk saate bak | 15,04 s |
| 3 | Basamakların sonuna ulaş / Yağmurun altında bekle | 1 | stairwell bottomnin ışığını izle / Merdivenden in | 14,91 s |
| 4 | Sis çöksün / Kürelerin altına ilerle | 2 | Fotoğrafı çevir / Sisin içine bak | 14,98 s |
| 5 | Sis yoğunlaşsın / Bozuk saate bak | 1 | Yağmurun altında bekle / Telefonu sessize al | 14,83 s |
| 6 | Basamakların sonuna ulaş / Işıklı küreleri izle | 2 | Alt kata geç / Kürelerin altına ilerle | 15,01 s |
| 7 | Merdivenden in / Fotoğrafı çevir | 1 | Bozuk saate bak / stairwell bottomnin ışığını izle | 14,95 s |
| 8 | Telefonu sessize al / Sis yoğunlaşsın | 2 | Yağmurun altında bekle / Sisin içine bak | 14,88 s |
| 9 | Basamakların sonuna ulaş / Sis çöksün | 1 | Fotoğrafı çevir / Kürelerin altına ilerle | 14,80 s |
| 10 | Bozuk saate bak / Işıklı küreleri izle | 2 | Telefonu sessize al / Sis yoğunlaşsın | 14,99 s |
| 11 | Alt kata geç / Sis çöksün | 1 | Basamakların sonuna ulaş / Sis çöksün | 14,81 s |
| 12 | Yağmurun altında bekle / Kürelerin altına ilerle | 2 | Bozuk saate bak / Işıklı küreleri izle | 14,92 s |

Local trace sırasında sistem health:

```json
{"ok":true,"comfy":true,"qwen":true,"youtube":false,"readiness":"ready","phase":"PLAYING_VOTING","engine":"IMAGE_MOTION"}
```

## Test doğrulaması

```text
node --test test/options.test.mjs test/story-state.test.mjs test/jungian-dream-engine.test.mjs test/runtime-hygiene.test.mjs test/vote-manager.test.mjs
```

**34/34 geçti.**

Özellikle doğrulananlar:

- Qwen-independent fallback roles
- aktif dream location continuation
- recent destination defer
- bounded psyche/family history
- displayed-option repeat guard
- stale anchor renewal engeli
- anchor TTL merge
- atomic state/runtime hygiene
- exact 1/2 vote ve first-vote semantics

## Son durum

- `IMAGE_MOTION` aktif ve production health `ready`.
- Qwen akışına dokunulmadı; mevcut timeout davranışı korunuyor.
- `ANIMATEDIFF_ENABLED=false`/YouTube off korunuyor.
- Frontend, audio, loop motion, SDXL ve Jung mimarisi değiştirilmedi.
- Grounding hedefi tamamlandı. Pair-too-close ve uzun vadeli çeşitlilik hedefi için yeni bir iterasyon gerekebilir; bu görevde kapsam genişletilmedi.
