import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";

const endpoint = process.env.QWEN_URL || "http://127.0.0.1:8080";
const started = performance.now();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 120_000);
const row = { endpoint, timeoutMs: 120_000, httpStatus: null, latencyMs: null, content: null, usage: null, error: null };
try {
  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: "qwen3-4b",
      temperature: 0.7,
      max_tokens: 96,
      response_format: { type: "json_object" },
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        { role: "system", content: "Return JSON only. No explanation." },
        { role: "user", content: "CURRENT SCENE: a misty bridge with one lantern. Give two short choices as JSON fields option_1_tr, option_2_tr." }
      ]
    })
  });
  row.httpStatus = response.status;
  const body = await response.json();
  row.latencyMs = Number((performance.now() - started).toFixed(1));
  row.content = body?.choices?.[0]?.message?.content || null;
  row.usage = body?.usage || null;
} catch (error) {
  row.latencyMs = Number((performance.now() - started).toFixed(1));
  row.error = `${error?.name || "Error"}: ${error?.message || error}`;
} finally { clearTimeout(timer); }
await fs.writeFile("benchmark/qwen-single-probe-result.json", JSON.stringify(row, null, 2));
console.log(JSON.stringify(row, null, 2));
