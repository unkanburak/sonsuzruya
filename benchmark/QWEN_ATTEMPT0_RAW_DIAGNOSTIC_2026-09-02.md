# Qwen ATTEMPT 0 Raw Response Diagnostic

Tarih: 2026-09-02  
Kapsam: İzole `generateOptions()` harness, yalnız ATTEMPT 0  
Production davranışı/ayarları: Değiştirilmedi  
ATTEMPT 1: Yerel wrapper tarafından engellendi; Qwen sunucusuna gönderilmedi

## Sonuç

Altı kullanılabilir ham yanıtın tamamı aynı sonucu verdi:

- Birinci candidate tam yazılmış.
- İkinci candidate da üç alanıyla birlikte tam yazılmış.
- Ancak `c` dizisini kapatması gereken son `]` yazılmamış.
- Yanıt buna rağmen `finish_reason="stop"` ile bitmiş.
- Request payload içinde explicit `stop` veya stop sequence yok.
- `parseJsonObjectPrefix()` sonucu `null`.
- Production `parseQwenCandidates()` yalnız `1` candidate kurtarıyor.

Birincil sınıf:

`PREMATURE_STOP` — yapı kapanmadan model EOS/stop ile bitiyor.

İkincil gözlem:

Raw metinde iki candidate dizisi de tam bulunduğu halde parser yalnız birini kurtarıyor. Bu nedenle model ikinci candidate'ı hiç yazmıyor değildir; eksik dış kapanış nedeniyle ikinci candidate sonraki katmanda kullanılabilir hale gelemiyor.

## Request

Altı çağrıda da:

| Alan | Değer |
|---|---:|
| `max_tokens` | `80` |
| `stop` | `<OMITTED>` |
| `temperature` | `0.35` |
| requested candidate count | `2` |

Explicit stop sequence bulunmadığı için üretilen içeriğin bir request stop sequence ile çakışması mümkün değil.

## Altı ham response

Her altı çağrıda da response metni birebir aynıydı:

```json
{"c":[["çatlak yolda ilerle","the cracked path is now visible","front_path"],["ağacın gölgesini izle","the tree's shadow is now visible","red_house"]}
```

Geçerli JSON olması için sondaki `}` karakterinden önce bir `]` daha bulunmalıydı:

```json
{"c":[["çatlak yolda ilerle","the cracked path is now visible","front_path"],["ağacın gölgesini izle","the tree's shadow is now visible","red_house"]]}
```

### Örnek bazında ölçüm

| Örnek | Latency | finish_reason | Output token | Prefix parse | Recovered | Sınıf |
|---:|---:|---|---:|---|---:|---|
| 1 | 5275 ms | `stop` | 46 | `null` | 1 | `PREMATURE_STOP` |
| 2 | 5208 ms | `stop` | 46 | `null` | 1 | `PREMATURE_STOP` |
| 3 | 5044 ms | `stop` | 46 | `null` | 1 | `PREMATURE_STOP` |
| 4 | 4908 ms | `stop` | 46 | `null` | 1 | `PREMATURE_STOP` |
| 5 | 4823 ms | `stop` | 46 | `null` | 1 | `PREMATURE_STOP` |
| 6 | 4889 ms | `stop` | 46 | `null` | 1 | `PREMATURE_STOP` |

Latency p50 yaklaşık `4.98 s`, p95 yaklaşık `5.28 s`.

## Sınıflandırma

| Sınıf | Sonuç |
|---|---:|
| `COMPLETE_SINGLE` | 0/6 |
| `PREMATURE_STOP` | 6/6 |
| `PARSER_LOSS` | İkincil etki: iki tam candidate raw metinde var, yalnız biri recover ediliyor |
| `FORMAT_DEVIATION` | 0/6 kullanılabilir response |

## Sorunun cevabı

> İkinci candidate model tarafından hiç mi yazılmıyor, yoksa yazılırken/yazıldıktan sonra başka katmanda mı kayboluyor?

İkinci candidate **model tarafından yazılıyor**. Her iki candidate'ın action, visible consequence ve place alanları raw response içinde mevcut. Model yalnızca dış `c` dizisinin son kapanışını yazmadan EOS/`stop` ile bitiyor. Ardından mevcut parser bu malformed yapıda ikinci candidate'ı kullanıma kazandıramıyor.

Bu teşhis:

- `max_tokens` yetersizliği göstermiyor (`46/80`).
- explicit request stop sequence problemi göstermiyor (`stop` gönderilmiyor).
- “model yalnız tek candidate üretiyor” hipotezini desteklemiyor.
- yapı kapanışı + recovery parser davranışını işaret ediyor.

## Teşhis sırasında değiştirilmeyenler

- Production prompt
- `max_tokens`
- parser
- stop sequence
- retry davranışı
- route repeat
- Node/Comfy/UI/voting/story state

İlk model yükleme sırasında ham response üretmeden client timeout olan üç çağrı sınıflandırmaya dahil edilmedi. Kuyruk boşaldıktan sonra altı kullanılabilir ATTEMPT 0 response ile sonuç tamamlandı.

