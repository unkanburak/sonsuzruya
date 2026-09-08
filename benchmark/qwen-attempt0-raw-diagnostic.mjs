import fs from "node:fs/promises";
import { generateOptions } from "../app/lib/options.mjs";

const PROJECT_ROOT = new URL("../", import.meta.url);
const STATE_URL = new URL("../state/current.json", import.meta.url);
const OUTPUT_URL = new URL(process.env.QWEN_DIAGNOSTIC_OUTPUT || "./QWEN_ATTEMPT0_RAW_DIAGNOSTIC_2026-09-02.json", import.meta.url);
const QWEN_URL = "http://127.0.0.1:8080";
const CALLS = Number(process.env.QWEN_DIAGNOSTIC_CALLS || 6);

function parseJsonObjectPrefix(content) {
  const raw = String(content || "");
  const objectStart = raw.indexOf("{");
  const arrayStart = raw.indexOf("[");
  const starts = [objectStart, arrayStart].filter((value) => value >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) return null;
  for (const closer of ["}", "]"]) {
    for (let end = raw.lastIndexOf(closer); end > start; end -= 1) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {}
    }
  }
  return null;
}

function fullJson(content) {
  try {
    return JSON.parse(String(content || "").trim());
  } catch {
    return null;
  }
}

function candidateCount(parsed) {
  if (!parsed) return 0;
  const list = Array.isArray(parsed) ? parsed : (parsed.c ?? parsed.candidates);
  if (!Array.isArray(list)) return 0;
  return list.filter((item) => Array.isArray(item) && item.length >= 2).length;
}

function structurallyIncomplete(content) {
  const raw = String(content || "");
  let quote = false;
  let escaped = false;
  let curly = 0;
  let square = 0;
  for (const char of raw) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && quote) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quote = !quote;
      continue;
    }
    if (quote) continue;
    if (char === "{") curly += 1;
    if (char === "}") curly -= 1;
    if (char === "[") square += 1;
    if (char === "]") square -= 1;
  }
  return quote || curly !== 0 || square !== 0;
}

function classify({ content, finishReason, recovered }) {
  const complete = fullJson(content);
  const prefix = parseJsonObjectPrefix(content);
  const completeCount = candidateCount(complete);
  const prefixCount = candidateCount(prefix);
  if (Math.max(completeCount, prefixCount) >= 2 && recovered < 2) return "PARSER_LOSS";
  if (complete && completeCount === 1) return "COMPLETE_SINGLE";
  if (finishReason === "stop" && !complete && structurallyIncomplete(content)) return "PREMATURE_STOP";
  return "FORMAT_DEVIATION";
}

const state = JSON.parse(await fs.readFile(STATE_URL, "utf8"));
const nativeFetch = globalThis.fetch;
const rows = [];

for (let index = 0; index < CALLS; index += 1) {
  let requestCount = 0;
  let captured = null;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (!url.endsWith("/v1/chat/completions")) return nativeFetch(input, init);
    const attemptIndex = requestCount;
    requestCount += 1;
    if (attemptIndex > 0) {
      const error = new Error("DIAGNOSTIC_ATTEMPT1_BLOCKED");
      error.cause = { diagnostic: true };
      throw error;
    }
    const request = JSON.parse(String(init.body || "{}"));
    const startedAt = Date.now();
    const response = await nativeFetch(input, init);
    const responseBody = await response.clone().text();
    let body = null;
    try { body = JSON.parse(responseBody); } catch {}
    captured = {
      latencyMs: Date.now() - startedAt,
      request: {
        max_tokens: request.max_tokens ?? null,
        stop: Object.hasOwn(request, "stop") ? request.stop : "<OMITTED>",
        temperature: request.temperature ?? null,
        requestedCandidateCount: 2,
      },
      response: {
        httpStatus: response.status,
        finish_reason: body?.choices?.[0]?.finish_reason ?? null,
        outputTokenCount: body?.usage?.completion_tokens ?? null,
        messageContent: body?.choices?.[0]?.message?.content ?? "",
      },
    };
    return response;
  };

  let generated = null;
  try {
    generated = await generateOptions({
      storyState: state.storyState,
      previousOptions: state.storyState?.recent_options || state.previousOptions || [],
      qwenUrl: QWEN_URL,
      timeoutMs: 8000,
      maxTokens: 80,
      dreamPsyche: state.dreamPsyche || state.dream_psyche,
      fallbackOnFailure: false,
    });
  } finally {
    globalThis.fetch = nativeFetch;
  }

  const trace = generated?._qwenTrace || {};
  const attempt0 = trace.attempts?.find((attempt) => attempt.attemptIndex === 0) || {};
  const content = captured?.response?.messageContent || "";
  const prefix = parseJsonObjectPrefix(content);
  const recovered = Number(attempt0.candidatePairsRecovered ?? trace.candidatePairsRecovered ?? 0);
  rows.push({
    call: index + 1,
    ...captured,
    parseJsonObjectPrefix: prefix,
    parseJsonObjectPrefixSucceeded: Boolean(prefix),
    candidatePairsInParsedPrefix: candidateCount(prefix),
    candidatePairsRecovered: recovered,
    classification: classify({
      content,
      finishReason: captured?.response?.finish_reason ?? null,
      recovered,
    }),
    attempt1NetworkRequests: Math.max(0, requestCount - 1),
    note: requestCount > 1 ? "ATTEMPT 1 was blocked locally and never sent to Qwen." : null,
  });
}

const counts = Object.fromEntries(
  [...new Set(rows.map((row) => row.classification))]
    .map((classification) => [classification, rows.filter((row) => row.classification === classification).length]),
);

const output = {
  generatedAt: new Date().toISOString(),
  scope: "Isolated generateOptions ATTEMPT 0 only; production services/config unchanged.",
  stateSource: new URL(STATE_URL, PROJECT_ROOT).pathname,
  calls: rows.length,
  classificationCounts: counts,
  rows,
};

await fs.writeFile(OUTPUT_URL, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output, null, 2));
