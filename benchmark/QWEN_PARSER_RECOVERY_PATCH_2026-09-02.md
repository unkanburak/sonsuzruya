# Qwen Complete-Tuple Parser Recovery — Patch Sonucu

Tarih: 2026-09-02  
Kapsam: Kanıtlanan eksik dış `c` array kapanışı için dar parser recovery  
Production prompt/model/token/timeout/retry/recovery: Değiştirilmedi

## Uygulanan tek davranış değişikliği

Parser sırası:

1. Mevcut strict parse denenir.
2. Strict parse başarısızsa raw metindeki dengeli biçimde kapanmış JSON array parçaları incelenir.
3. Yalnızca tam olarak üç adet boş olmayan string içeren tuple kabul edilir:

```text
[action, visible_consequence, allowed_place]
```

4. En az iki complete tuple varsa yalnız ilk ikisi in-memory `{ c: [candidate1, candidate2] }` yapısı olarak pipeline'a verilir.

Yapılmayanlar:

- Eksik alan tamamlama
- Yarım candidate kurtarma
- Metin üretme/değiştirme
- Generic malformed-JSON repair
- Prompt/model/max token/timeout/retry/recovery değişikliği

Telemetry:

- `parserRecovery="strict"`
- `parserRecovery="complete_tuple_reconstruction"`

## Deterministic fixture testi

Aynı kanıtlanmış malformed raw response altı kez çalıştırıldı.

Beklenti ve sonuç:

- `candidatePairsRecovered`: `1 → 2`
- Candidate metinleri raw response ile aynı: PASS
- Fixture: 6/6 PASS
- Hedefli test: 6/6 PASS
- Tüm test paketi: 40/40 PASS

## 12 gerçek outer Qwen call

Koşullar:

- Gerçek production `generateOptions()` yolu
- `timeoutMs=8000`
- `maxTokens=80`
- Production prompt ve temperature korunuyor
- Her outer call öncesi Qwen `/slots` boşluğu doğrulandı
- `fallbackOnFailure=false`
- Node, Comfy, OBS ve Cloudflare kapalı

### İstenen sayaçlar

| Metrik | Sonuç |
|---|---:|
| strict parse success | 0/12 |
| complete tuple reconstruction | 11/12 |
| 0 survivor | 1/12 |
| 1 survivor | 0/12 |
| 2 survivors | 11/12 |
| final Qwen pairs | 0/12 |
| Qwen unavailable/recovery path | 12/12 |
| attempt1 started | 11/12 |
| attempt1 timeout | 11/12 |

İlk çağrı cold/no-response timeout oldu. Kalan 11 çağrıda tuple reconstruction iki candidate'ı da kurtardı.

## En kritik sorunun cevabı

> Parser fix'ten sonra ilk defa 2-survivor oluşuyor mu?

**Evet: 11/12 outer call.**

Her 11 örnekte:

- `candidatePairsRecovered=2`
- grounded candidate = 2
- candidate-level accepted survivor = 2
- `selectQwenPair()` pair oluşturdu

> Final Qwen pair oluşuyor mu?

**Hayır: 0/12.**

Parser fix bir önceki bottleneck'i kaldırdı. Bir sonraki görünür gate:

```text
attempt0HasPair=true
attempt0HasValid=false
validationReason=recent_repeat
```

Yani iki candidate candidate-level doğrulamadan geçiyor ve pair seçiliyor; fakat final dynamic validation mevcut history nedeniyle `recent_repeat` veriyor. Ardından değiştirilmemiş retry davranışı ATTEMPT 1'i başlatıyor ve 11/11 kez kalan kısa shared budget içinde timeout oluyor.

Bu rapor kapsamında `recent_repeat` veya retry davranışına dokunulmadı.

## Örnek kurtarılan iki candidate

```text
Çatlak yolda ilerle
→ the cracked path is now visible
→ front_path

Ağacın gölgesini izle
→ the tree's shadow is now visible
→ red_house_exterior
```

Candidate diagnostics:

- static visible: PASS
- grounding: PASS
- safety: PASS
- candidate repeat: PASS
- accepted: true / true
- final pair validation: `recent_repeat`

## Sonuç

Dar parser patch hedefini gerçekleştirdi: ikinci complete tuple artık kaybolmuyor ve ilk kez düzenli olarak iki survivor üretiliyor.

Ancak final Qwen-authored pair henüz oluşmadı. Yeni en erken blocker parser değildir; final pair validation içindeki `recent_repeat` kapısıdır. Kullanıcı talimatı gereği başka müdahale yapılmadan burada duruldu.

