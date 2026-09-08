import { readFile, writeFile } from "node:fs/promises";
import { generateOptions } from "../app/lib/options.mjs";

const qwenUrl = process.env.QWEN_URL || "http://127.0.0.1:8080";
const outputFile = process.env.RESULT_FILE || "benchmark/qwen-parser-recovery-12-result.json";
const source = JSON.parse(await readFile("state/current.json", "utf8"));
const storyState = source.storyState;
const previousOptions = storyState?.recent_options || source.previousOptions || [];
const dreamPsyche = source.dreamPsyche || source.dream_psyche;

async function waitForIdleSlots(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${qwenUrl}/slots`);
      if (response.ok) {
        const slots = await response.json();
        if (Array.isArray(slots) && slots.every((slot) => !slot.is_processing)) return true;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

const rows = [];
for (let index = 0; index < 12; index += 1) {
  const queueCleanBefore = await waitForIdleSlots();
  if (!queueCleanBefore) throw new Error(`Qwen slots did not become idle before call ${index + 1}`);
  const started = Date.now();
  const result = await generateOptions({
    storyState,
    previousOptions,
    qwenUrl,
    timeoutMs: 8000,
    maxTokens: 80,
    dreamPsyche,
    fallbackOnFailure: false,
  });
  const trace = result?._qwenTrace || {};
  const diagnostics = Array.isArray(trace.candidateDiagnostics) ? trace.candidateDiagnostics : [];
  const survivors = diagnostics.filter((candidate) => candidate.accepted).length;
  const attempt1 = trace.attempts?.find((attempt) => attempt.attemptIndex === 1) || null;
  rows.push({
    call: index + 1,
    elapsedMs: Date.now() - started,
    queueCleanBefore,
    parserRecovery: trace.parserRecovery || null,
    candidatePairsRecovered: trace.candidatePairsRecovered ?? 0,
    survivors,
    finalValidationResult: trace.finalValidationResult || null,
    fallbackReason: trace.fallbackReason || null,
    qwenPair: trace.finalValidationResult === "qwen",
    recovery: Boolean(result?._qwenUnavailable),
    attempt1Started: Boolean(attempt1),
    attempt1Timeout: Boolean(attempt1 && (attempt1.timeoutFiredAtMs != null || trace.fallbackReason === "QWEN_TIMEOUT")),
    options: result?._qwenUnavailable ? null : [result?.option_1_tr, result?.option_2_tr],
    trace,
  });
  await waitForIdleSlots();
}

const summary = {
  calls: rows.length,
  strictParseSuccess: rows.filter((row) => row.parserRecovery === "strict").length,
  tupleReconstruction: rows.filter((row) => row.parserRecovery === "complete_tuple_reconstruction").length,
  zeroSurvivor: rows.filter((row) => row.survivors === 0).length,
  oneSurvivor: rows.filter((row) => row.survivors === 1).length,
  twoSurvivors: rows.filter((row) => row.survivors >= 2).length,
  finalQwenPairs: rows.filter((row) => row.qwenPair).length,
  recovery: rows.filter((row) => row.recovery).length,
  attempt1Started: rows.filter((row) => row.attempt1Started).length,
  attempt1Timeout: rows.filter((row) => row.attempt1Timeout).length,
};

const output = { generatedAt: new Date().toISOString(), conditions: { calls: 12, timeoutMs: 8000, maxTokens: 80, productionGenerateOptionsPath: true, queueCleanBeforeEveryCall: true }, summary, rows };
await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
