import { writeFile } from "node:fs/promises";
const url = process.env.QWEN_URL || "http://127.0.0.1:8080";
const prompt = `CURRENT SCENE: misty bridge; entities: cracked stone bridge, standing alone, silver fog. JUNG direction: connect or isolate. Use only these entities. Create exactly two different futures: one natural, one controlled-surprise. Each is [short Turkish action, short English visible AFTER-state], <=10 English words, no new props/places. JSON only: {"c":[["action","consequence"],["action","consequence"]]}`;
const rows = [];
for (let i = 0; i < 20; i += 1) {
  const started = Date.now(); let body = null; let error = null;
  try {
    const response = await fetch(`${url}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: "qwen3-4b", temperature: 0.85, max_tokens: 64, response_format: { type: "json_object" }, chat_template_kwargs: { enable_thinking: false }, messages: [{ role: "system", content: "Sadece JSON döndür. Açıklama yok." }, { role: "user", content: `${prompt} nonce ${i}` }] }) });
    const text = await response.text(); body = JSON.parse(text); const content = body?.choices?.[0]?.message?.content || ""; let parsed = null; try { parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || ""); } catch {}
    rows.push({ index: i + 1, elapsedMs: Date.now() - started, status: response.status, finishReason: body?.choices?.[0]?.finish_reason, outputTokens: body?.usage?.completion_tokens, contentBytes: Buffer.byteLength(content), completeJson: Boolean(parsed), pairCount: Array.isArray(parsed?.c) ? parsed.c.length : 0 });
  } catch (e) { error = String(e?.message || e); rows.push({ index: i + 1, elapsedMs: Date.now() - started, error }); }
}
const lat = rows.map((r) => r.elapsedMs).sort((a, b) => a - b); const report = { rows, summary: { count: rows.length, complete: rows.filter((r) => r.completeJson && r.pairCount >= 2).length, p50Ms: lat[Math.floor(lat.length * 0.5)], p95Ms: lat[Math.ceil(lat.length * 0.95) - 1], finishReasons: Object.fromEntries(rows.reduce((m, r) => { const k = r.finishReason || "error"; m.set(k, (m.get(k) || 0) + 1); return m; }, new Map())) } };
await writeFile("benchmark/qwen-two-candidate-probe-result.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.summary, null, 2));
