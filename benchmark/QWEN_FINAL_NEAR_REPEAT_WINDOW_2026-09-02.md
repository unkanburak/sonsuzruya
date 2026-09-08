# Qwen Final Validator Near-Repeat Window — Sonuç

Tarih: 2026-09-02

## Uygulanan tek değişiklik

`validateDynamicOptions()` içindeki exact-label geçmişi:

```js
previous
```

yerine:

```js
previous.slice(-NEAR_REPEAT_WINDOW)
```

kullanıyor.

`recent_repeat` kaldırılmadı. Son iki gösterilmiş seçenek içindeki exact label hâlâ final validator tarafından reddediliyor.

Parser, retry, prompt, token, timeout, route repeat, semantic history ve recovery değiştirilmedi.

## Deterministic regression

| Test | Sonuç |
|---|---|
| A — Label near window içindeyse `recent_repeat` | PASS |
| B — Label eski history'de, near window dışında ve visible future farklı | PASS |
| C — İki option aynı label ise mevcut `labels` gate | PASS |

Hedefli testler: `19/19 PASS`  
Tüm test paketi: `43/43 PASS`

## 12 gerçek outer Qwen call

| Metrik | Sonuç |
|---|---:|
| 2 survivors | 11/12 |
| final Qwen pair | 11/12 |
| `recent_repeat` rejects | 0 |
| diğer final validator reject reasons | 0 |
| recovery / Qwen unavailable | 1/12 |
| attempt1 started | 0/12 |
| attempt1 timeout | 0/12 |

Ek parser dağılımı:

- strict parse: 0/12
- complete tuple reconstruction: 11/12
- 0 survivor: 1/12
- 1 survivor: 0/12

İlk cold çağrı `QWEN_TIMEOUT` oldu. Bu bir final-validator reject değildir. Kalan 11 çağrının tamamı:

```text
candidatePairsRecovered=2
survivors=2
finalValidationResult=qwen
fallbackReason=QWEN_SUCCESS
```

ile tamamlandı.

## PASS kriteri

> İlk kez final Qwen pair > 0 mı?

**Evet: 11/12.**

Parser fix sonrasında görünür hale gelen legacy full-history `recent_repeat` gate'i near window'a indirildiğinde Qwen pair doğrudan final doğrulamadan geçti. Başarılı çağrılarda Attempt 1 doğal olarak hiç başlamadı; retry starvation bu örneklerde devreden çıktı.

Talimat gereği burada duruldu. Production dream flow başlatılmadı ve başka davranış değiştirilmedi.

