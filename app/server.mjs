// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VoteManager } from "./lib/vote-manager.mjs";
import { applyStatePatch, defaultStoryState, futureSignature, generateOptions, normalizeStoryState, optionMeta, qwenPreviousOptions, recordRenderedComposition, recordRenderedVisualMotifs, sceneBoundRecoveryOptions, sceneMatchedOptionLibrary, situationFamilyForOption, psychologicalVectorForOption, psychologicalTargetForOption, validateDynamicOptions, validateOptions } from "./lib/options.mjs";
import { ComfyImageEngine } from "./lib/comfy-image-engine.mjs";
import { AnimateDiffVideoEngine } from "./lib/animatediff-video-engine.mjs";
import { YouTubeChat } from "./lib/youtube-chat.mjs";
import { LoopMotionEngine } from "./lib/loop-motion-engine.mjs";
import { AtomicStateStore, RotatingJsonlLog, MediaJanitor, directoryStats, pruneManagedDirectory } from "./lib/runtime-hygiene.mjs";
import { defaultDreamPsyche, normalizeDreamPsyche, updateDreamPsyche, rememberOptionPair, recurringMotifForPrompt, buildArchetypalVisualHint } from "./lib/jungian-dream-engine.mjs";
import { appendPhysicalScenePrompt } from "./lib/physical-memory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(ROOT, "config.json"), "utf8"));
const stateFile = path.join(ROOT, "state", "current.json");
const logsFile = path.join(ROOT, "state", "events.jsonl");
await mkdir(path.dirname(stateFile), { recursive: true });
const stateStore = new AtomicStateStore(stateFile);
const eventLog = new RotatingJsonlLog(logsFile, { maxBytes: 5 * 1024 * 1024, backups: 3 });
const newRoundId = (sceneNumber) => `r-${sceneNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const STORY_ENGINE_VERSION = "qwen_first_manifest_v9";
const FRESH_DREAM_RESULT = "An anonymous figure stands outside a red house at twilight, beside a cracked front path and a bare tree.";
const OPTIONS_LIVENESS_DEADLINE_MS = 6000;

const defaultDream = normalizeDreamPsyche(defaultDreamPsyche());
const defaultStory = normalizeStoryState(defaultStoryState());
const initialOpenedAt = Date.now();
const defaultState = {
  sceneNumber: 0,
  media: `/input-media/${config.initialInput}`,
  lastFrame: `/input-media/${config.initialInput}`,
  lastPrompt: FRESH_DREAM_RESULT,
  options: null,
  optionsReady: false,
  storyState: defaultStory,
  dreamPsyche: defaultDream,
  dream_psyche: defaultDream,
  previousOptions: [],
  phase: "INITIALIZING_DREAM",
  generationInProgress: false,
  activeProfile: "IMAGE_MOTION",
  recentGenerationTimes: [],
  currentPlaybackRate: 1,
  secondsLeft: config.voteSeconds,
  option1Votes: 0,
  option2Votes: 0,
  winnerTr: null,
  roundId: null,
  openedAt: initialOpenedAt,
  closesAt: initialOpenedAt + (Math.max(1, Number(config.voteSeconds) || 6) * 1000),
};

let state = defaultState;
let needsFreshDream = true;
try {
  const saved = await stateStore.read();
  const restoredStory = normalizeStoryState(saved.storyState || defaultStory);
  const restoredDream = normalizeDreamPsyche(saved.dreamPsyche || saved.dream_psyche || defaultDream);
  const persistedOptionLabels = [saved.options?.option_1_tr, saved.options?.option_2_tr].filter(Boolean).map((item) => String(item).toLowerCase());
  const restoredHistory = restoredStory.recent_options.filter((item) => !persistedOptionLabels.includes(String(item).toLowerCase()));
  const restoredOptions = validateDynamicOptions(saved.options, restoredHistory, restoredStory) || validateOptions(saved.options);
  if (restoredOptions) {
    restoredStory.recent_options = [...new Set([...restoredStory.recent_options, restoredOptions.option_1_tr, restoredOptions.option_2_tr])].slice(-20);
    const restoredRecords = [
      restoredOptions.option_1_tr ? { label_tr: restoredOptions.option_1_tr, result_prompt_en: restoredOptions.option_1_result_prompt_en || "", intent: restoredOptions.option_1_intent || "", source: "restored" } : null,
      restoredOptions.option_2_tr ? { label_tr: restoredOptions.option_2_tr, result_prompt_en: restoredOptions.option_2_result_prompt_en || "", intent: restoredOptions.option_2_intent || "", source: "restored" } : null,
    ].filter(Boolean);
    restoredStory.recent_option_records = [...(restoredStory.recent_option_records || []), ...restoredRecords].slice(-20);
  }
  needsFreshDream = saved.storyEngineVersion !== STORY_ENGINE_VERSION;
  state = {
    ...defaultState,
    ...saved,
    options: restoredOptions || null,
    optionsReady: Boolean(restoredOptions) && !needsFreshDream,
    storyState: restoredStory,
    dreamPsyche: restoredDream,
    dream_psyche: restoredDream,
    phase: needsFreshDream ? "INITIALIZING_DREAM" : (restoredOptions ? "PLAYING_VOTING" : "WAITING_FOR_OPTIONS"),
    generationInProgress: false,
    secondsLeft: config.voteSeconds,
    roundId: restoredOptions && !needsFreshDream ? (saved.roundId || newRoundId(saved.sceneNumber || 0)) : null,
    openedAt: initialOpenedAt,
    closesAt: initialOpenedAt + (Math.max(1, Number(config.voteSeconds) || 6) * 1000),
  };
} catch {
  const recoveredFrame = path.join(config.comfyRoot, "input", "current.png");
  if (existsSync(recoveredFrame)) {
    state = { ...defaultState, media: "/input-media/current.png", lastFrame: "/input-media/current.png" };
  }
}

const votes = new VoteManager();
const engine = new ComfyImageEngine({
  comfyUrl: config.comfyUrl,
  comfyRoot: config.comfyRoot,
  outputRoot: config.comfyOutputRoot || config.comfyRoot,
  profile: config.imageProfile,
  initialInput: config.initialInput,
  resetInterval: config.imageResetInterval,
  timeoutMs: config.generationTimeoutMs,
});
const animatediff = new AnimateDiffVideoEngine({ comfyUrl: config.animatediffUrl || "http://127.0.0.1:8191", comfyRoot: config.comfyRoot, timeoutMs: config.animatediff?.timeoutMs || 10000, profile: config.animatediff || {} });
const animatediffEnabled = process.env.ANIMATEDIFF_ENABLED === "1" || config.animatediff?.enabled === true;
const structuredPromptEnabled = process.env.STRUCTURED_PROMPT_ENABLED !== "0";
const archetypalVisualHintsEnabled = process.env.ARCHETYPAL_VISUAL_HINTS_ENABLED === "1";
const loopMotionEnabled = process.env.LOOP_MOTION_ENABLED === "1" || config.loopMotion?.enabled === true;
let readiness = "warming_up";
const runtimeMetrics = { loopTimes: [], loopSuccess: 0, loopErrors: 0, staleLoops: 0, generationFailures: 0 };
const chatMessages = [];
const chatRate = new Map();
const loopOutputRoot = path.join(ROOT, "runtime", "loops");
const loopEngine = new LoopMotionEngine({ outputRoot: loopOutputRoot, publicPrefix: "/loops", ffmpeg: process.env.FFMPEG_PATH || "D:\\InfiniteAILive\\ComfyUI_windows_portable\\python_embeded\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe", width: config.imageProfile?.width || 768, height: config.imageProfile?.height || 448, amplitude: Number(process.env.LOOP_MOTION_AMPLITUDE) || config.loopMotion?.amplitude || 0.07 });
const mediaJanitor = new MediaJanitor({ manifestFile: path.join(ROOT, "runtime", "managed-media.json"), keepScenes: 8, cleanupEvery: 10 });
await mediaJanitor.load();
const activeMediaName = path.basename(String(state.media || "").split("?")[0]);
await Promise.all([
  pruneManagedDirectory(path.join(config.comfyRoot, "output", "live"), { prefix: "scene_", keep: 24, protect: [activeMediaName] }),
  pruneManagedDirectory(path.join(config.comfyOutputRoot || "", "live"), { prefix: "scene_", keep: 24, protect: [activeMediaName] }),
  pruneManagedDirectory(path.join(config.comfyRoot, "input"), { prefix: "animatediff_input_", keep: 16 }),
  pruneManagedDirectory(loopOutputRoot, { prefix: "scene_", keep: 24 }),
]);
if (existsSync(path.join(config.comfyRoot, "input", "current.png"))) engine.currentInput = "current.png";
const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(ROOT, "public")));
app.use("/generated", express.static(config.comfyOutputRoot || path.join(config.comfyRoot, "output")));
app.use("/generated", express.static(path.join(config.comfyRoot, "output")));
app.use("/input-media", express.static(path.join(config.comfyRoot, "input")));
app.use("/loops", express.static(loopOutputRoot));
// The ambient bed is a local, user-owned asset and is intentionally served
// by Node with the same origin; Comfy/Qwen remain private.
app.use("/audio", express.static(path.join(ROOT, "assets", "audio")));

const server = createServer(app);
const wss = new WebSocketServer({ server });
// Viewer count is connection-authoritative (not a guess of unique humans).
// A session id lets a reconnect replace its stale socket instead of creating
// an unbounded count while the old TCP connection drains.
const viewerSessions = new Map();
const viewerHeartbeat = setInterval(() => {
  for (const [session, socket] of viewerSessions) {
    if (socket.isAlive === false) { viewerSessions.delete(session); try { socket.terminate(); } catch {} broadcast({ type: "viewer_count", count: viewerSessions.size }); continue; }
    socket.isAlive = false; try { socket.ping(); } catch { viewerSessions.delete(session); broadcast({ type: "viewer_count", count: viewerSessions.size }); }
  }
}, 30000);
viewerHeartbeat.unref?.();

function publicState() {
  const psyche = normalizeDreamPsyche(state.dreamPsyche || state.dream_psyche);
  const tendency = psyche.collective_tendency;
  const { dreamPsyche, dream_psyche, ...viewerState } = state;
  return { type: "state", ...viewerState, collectiveTendency: { curiosity: tendency.curiosity, confrontation: tendency.confrontation, avoidance: tendency.avoidance }, collectiveTension: { confrontationAvoidance: psyche.tensions?.confrontation_avoidance ?? 0.5 }, activeViewerSessions: viewerSessions.size, readiness };
}

function rememberDisplayedOptions(storyState, options, source = "unknown") {
  const current = normalizeStoryState(storyState);
  const labels = [options?.option_1_tr, options?.option_2_tr].filter(Boolean);
  const families = labels.map((label) => situationFamilyForOption(label));
  const selectedRecords = options?._selectedRecords || [];
  const activeArchetype = normalizeDreamPsyche(state.dreamPsyche || state.dream_psyche).dominant_archetypal_field;
  // Structured sibling of recent_options: keeps the visible consequence next
  // to each shown label (recent_options itself dedupes by label text, so a
  // repeated exact wording never gets a fresh slot there). Append-only, no
  // dedup, so genuinely different consequences under the same label both
  // stay visible to the semantic repeat check in options.mjs.
  const newRecords = [
    options?.option_1_tr ? (() => { const record = selectedRecords[0] || { label_tr: options.option_1_tr, result_prompt_en: options.option_1_result_prompt_en, intent: options.option_1_intent, state_patch: options.option_1_state_patch }; return { label_tr: options.option_1_tr, result_prompt_en: options.option_1_result_prompt_en || "", intent: options.option_1_intent || "", behavior_family: record.behavior_family || record.intent || "", route_type: record.route_type || "scene_local", next_location: record.next_location || record.state_patch?.current_location || "", source, psychological_vector: psychologicalVectorForOption(record), target_entity: psychologicalTargetForOption(record), resulting_state: record.entity_state_mutation?.to_state || record.state_patch?.entity_state_mutation?.to_state || record.next_location || "", future_signature: futureSignature(record), archetype: activeArchetype }; })() : null,
    options?.option_2_tr ? (() => { const record = selectedRecords[1] || { label_tr: options.option_2_tr, result_prompt_en: options.option_2_result_prompt_en, intent: options.option_2_intent, state_patch: options.option_2_state_patch }; return { label_tr: options.option_2_tr, result_prompt_en: options.option_2_result_prompt_en || "", intent: options.option_2_intent || "", behavior_family: record.behavior_family || record.intent || "", route_type: record.route_type || "scene_local", next_location: record.next_location || record.state_patch?.current_location || "", source, psychological_vector: psychologicalVectorForOption(record), target_entity: psychologicalTargetForOption(record), resulting_state: record.entity_state_mutation?.to_state || record.state_patch?.entity_state_mutation?.to_state || record.next_location || "", future_signature: futureSignature(record), archetype: activeArchetype }; })() : null,
  ].filter(Boolean);
  const pairKey = labels.map((label) => String(label).trim().toLocaleLowerCase("tr-TR")).sort().join(" || ");
  const recentPairs = pairKey ? [...(current.recent_option_pairs || []), pairKey].slice(-256) : (current.recent_option_pairs || []);
  return { ...current, recent_options: [...new Set([...current.recent_options, ...labels])].slice(-20), recent_option_records: [...current.recent_option_records, ...newRecords].slice(-20), recent_option_pairs: recentPairs, recent_situation_families: [...current.recent_situation_families, ...families].slice(-20) };
}

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) if (client.readyState === 1) client.send(data);
}

async function persist() {
  await stateStore.write(state);
}

async function logEvent(type, details = {}) {
  const safe = { at: new Date().toISOString(), type, ...details };
  await eventLog.append(safe);
}

function acceptVote(userId, vote, source = "debug") {
  if (state.phase !== "PLAYING_VOTING" || !state.optionsReady) return false;
  if (typeof userId !== "string" || userId.length === 0) return false;
  const accepted = votes.add(String(userId), String(vote));
  if (accepted) {
    const tally = votes.tally();
    state = { ...state, ...tally };
    broadcast({ type: "vote_update", ...tally, secondsLeft: state.secondsLeft });
    void logEvent("vote_accepted", { source, vote: String(vote) });
    void logForensic("VOTE_RECEIVED", { source, vote: String(vote), userId: String(userId) });
  }
  return accepted;
}

async function logForensic(event, details = {}) {
  const tally = votes.tally();
  await logEvent(event, {
    roundId: state.roundId,
    sceneId: state.sceneNumber,
    phase: state.phase,
    secondsLeft: state.secondsLeft,
    option1Votes: tally.option1Votes,
    option2Votes: tally.option2Votes,
    hasRealVote: tally.totalVotes > 0,
    winner: state.winnerTr || null,
    ...details,
  });
}

app.post("/api/debug/vote", (req, res) => {
  const accepted = acceptVote(req.body?.userId, req.body?.vote, "debug");
  res.status(accepted ? 202 : 400).json({ accepted });
});

app.get("/api/state", (_req, res) => res.json(publicState()));
app.get("/api/chat", (_req, res) => res.json({ messages: chatMessages.slice(-50) }));
app.post("/api/chat", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim().replace(/[<>]/g, "") : "";
  if (!text || text.length > 280) return res.status(400).json({ error: "invalid_message" });
  const key = String(req.ip || "local"); const now = Date.now(); const recent = chatRate.get(key) || [];
  const allowed = recent.filter((at) => now - at < 10000);
  if (allowed.length >= 5) return res.status(429).json({ error: "rate_limited" });
  allowed.push(now); chatRate.set(key, allowed);
  const message = { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, nickname: String(req.body?.nickname || "Guest").replace(/[^a-zA-Z0-9_ -]/g, "").slice(0, 24) || "Guest", text, at: new Date(now).toISOString() };
  chatMessages.push(message); if (chatMessages.length > 50) chatMessages.splice(0, chatMessages.length - 50);
  broadcast({ type: "chat_message", message });
  // A chat message containing only 1 or 2 is also a vote. Keep the chat
  // visible, but route the vote through the same single-vote gate as the
  // buttons. The client session id makes repeated chat submissions count
  // exactly like repeated button submissions (once per round).
  const chatVote = /^(1|2)$/.exec(text)?.[1] || null;
  const chatUserId = typeof req.body?.clientSessionId === "string" && req.body.clientSessionId.trim()
    ? req.body.clientSessionId.trim()
    : `${String(req.ip || "local")}:${message.nickname}`;
  const voteAccepted = chatVote ? acceptVote(chatUserId, chatVote, "chat") : false;
  await logEvent("chat_message", { length: text.length });
  res.status(202).json({ accepted: true, voteAccepted, message });
});
app.post("/api/metrics/playback", async (req, res) => {
  const { sceneNumber, sceneId, phase, clientAt, clientElapsedMs, clientSessionId, clientBuild } = req.body || {};
  if (Number.isFinite(sceneNumber) && Number.isFinite(clientAt) && typeof phase === "string") await logEvent("video_playback_telemetry", { sceneNumber, sceneId, phase, clientAt, clientElapsedMs, clientSessionId, clientBuild });
  res.sendStatus(204);
});
app.post("/api/metrics/round", async (req, res) => {
  const { event, roundId, sceneId, phase, secondsLeft, option1Votes, option2Votes, clientAt, clientPerf, winner, vote, clientSessionId, clientBuild } = req.body || {};
  if (typeof event !== "string" || event.length > 64) return res.sendStatus(400);
  await logEvent("round_telemetry", { event, roundId, sceneId, phase, secondsLeft, option1Votes, option2Votes, clientAt, clientPerf, winner, vote, clientSessionId, clientBuild });
  res.sendStatus(204);
});
app.get("/health", async (_req, res) => {
  let comfy = false;
  let qwen = false;
  try { comfy = (await fetch(`${config.comfyUrl}/system_stats`)).ok; } catch {}
  if (process.env.QWEN_DISABLED !== "1") {
    try { qwen = (await fetch(`${process.env.QWEN_URL || config.qwenUrl}/health`)).ok; } catch {}
  }
  res.json({ ok: true, comfy, qwen, youtube: youtube.configured(), readiness, phase: state.phase, engine: state.activeProfile });
});
app.get("/api/diagnostics", async (_req, res) => {
  let queue = { running: null, pending: null };
  try { const q = await (await fetch(`${config.comfyUrl}/queue`)).json(); queue = { running: q.queue_running?.length || 0, pending: q.queue_pending?.length || 0 }; } catch {}
  let logBytes = 0; try { logBytes = (await stat(logsFile)).size; } catch {}
  const loops = await directoryStats(loopOutputRoot, "scene_");
  const generated = await directoryStats(path.join(config.comfyRoot, "output", "live"), "scene_");
  const inputs = await directoryStats(path.join(config.comfyRoot, "input"), "animatediff_input_");
  res.json({
    at: new Date().toISOString(), sceneNumber: state.sceneNumber, phase: state.phase,
    node: { ...process.memoryUsage(), cpuUsageMicros: process.cpuUsage(), uptimeSeconds: process.uptime() },
    queue, loopEngine: loopEngine.stats(), media: { ...mediaJanitor.stats(), loopFiles: loops.files, loopBytes: loops.bytes, generatedFiles: generated.files, generatedBytes: generated.bytes, inputFiles: inputs.files, inputBytes: inputs.bytes },
    metrics: runtimeMetrics, recentGenerationTimes: state.recentGenerationTimes,
    websocketClients: wss.clients.size, storyStateBytes: Buffer.byteLength(JSON.stringify(state.storyState)), stateBytes: Buffer.byteLength(JSON.stringify(state)), logBytes,
  });
});

wss.on("connection", (socket, request) => {
  let session = "socket-" + Math.random().toString(36).slice(2, 12);
  try { session = new URL(request.url || "/", "http://localhost").searchParams.get("session") || session; } catch {}
  const prior = viewerSessions.get(session);
  if (prior && prior !== socket) { try { prior.close(1000, "reconnect"); } catch {} }
  socket.viewerSession = session; socket.isAlive = true;
  socket.on("pong", () => { socket.isAlive = true; });
  viewerSessions.set(session, socket);
  socket.on("close", () => { if (viewerSessions.get(session) === socket) { viewerSessions.delete(session); broadcast({ type: "viewer_count", count: viewerSessions.size }); } });
  socket.send(JSON.stringify(publicState())); socket.send(JSON.stringify({ type: "chat_history", messages: chatMessages.slice(-50) }));
  broadcast({ type: "viewer_count", count: viewerSessions.size });
});

async function nextRound() {
  if (!state.optionsReady || !state.options?.option_1_tr || !state.options?.option_2_tr) return;
  votes.reset();
  const openedAt = Date.now();
  const closesAt = openedAt + Math.max(1, Number(config.voteSeconds) || 6) * 1000;
  state = {
    ...state,
    phase: "PLAYING_VOTING",
    generationInProgress: false,
    secondsLeft: Math.ceil((closesAt - Date.now()) / 1000),
    option1Votes: 0,
    option2Votes: 0,
    winnerTr: null,
    roundId: newRoundId(state.sceneNumber),
    openedAt,
    closesAt,
  };
  await persist();
  await logForensic("VOTING_OPENED", { openedAt, closesAt });
  await logForensic("OPTIONS_BROADCAST", { option1: state.options?.option_1_tr, option2: state.options?.option_2_tr });
  broadcast(publicState());
}

let qwenJobInFlight = false;
let qwenRetryTimer = null;
let qwenFailures = 0;
let optionCycleSerial = 0;
let activeOptionCycle = null;

function newOptionCycle(sceneNumber) {
  return { id: `options-${sceneNumber}-${++optionCycleSerial}`, resolved: false, startedAt: Date.now() };
}

async function boundedOptionResult(optionsPromise, cycle) {
  const remaining = Math.max(0, OPTIONS_LIVENESS_DEADLINE_MS - (Date.now() - cycle.startedAt));
  if (remaining <= 0) return { kind: "liveness_deadline", value: null };
  let timer;
  const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve({ kind: "liveness_deadline", value: null }), remaining); });
  try {
    const value = await Promise.race([optionsPromise.then((result) => ({ kind: "result", value: result })).catch(() => ({ kind: "result", value: null })), deadline]);
    return value;
  } finally { clearTimeout(timer); }
}

async function publishRecoveryForCycle(cycle, previous, reason = "QWEN_INVALID") {
  if (!cycle || cycle.resolved || cycle.id !== activeOptionCycle?.id) return false;
  let recovery = sceneBoundRecoveryOptions({ storyState: state.storyState, previousOptions: previous, dreamPsyche: state.dreamPsyche });
  let source = "scene_bound_recovery";
  let exhausted = false;
  if (!recovery) {
    recovery = sceneBoundRecoveryOptions({ storyState: state.storyState, previousOptions: previous, dreamPsyche: state.dreamPsyche, exhausted: true });
    exhausted = Boolean(recovery);
    source = exhausted ? "bounded_recovery_exhausted" : source;
  }
  if (!recovery) {
    await logForensic("NO_SAFE_EXHAUSTED_RECOVERY_PAIR", { sceneNumber: state.sceneNumber, cycleId: cycle.id, reason, normalRecoveryFailed: true, emergencyRecoveryAttempted: true, manifest: state.storyState.current_scene_manifest });
    return false;
  }
  cycle.resolved = true;
  await logEvent("qwen_scene_bound_recovery", { sceneNumber: state.sceneNumber, cycleId: cycle.id, manifest: state.storyState.current_scene_manifest, qwenReason: reason, normalRecoveryFailed: exhausted, emergencyRecoveryAttempted: exhausted, source });
  await activateQwenOptions(recovery, source);
  return true;
}

async function qwenSlotsIdle() {
  const qwenUrl = process.env.QWEN_DISABLED === "1" ? null : (process.env.QWEN_URL || config.qwenUrl);
  if (!qwenUrl) return false;
  try {
    const response = await fetch(`${qwenUrl}/slots`);
    if (!response.ok) return false;
    const slots = await response.json();
    const list = Array.isArray(slots) ? slots : (Array.isArray(slots?.slots) ? slots.slots : []);
    return list.every((slot) => !(slot?.is_processing || slot?.processing || slot?.state === "processing"));
  } catch { return false; }
}

function optionPayload(options) {
  return options ? { option1Tr: options.option_1_tr, option2Tr: options.option_2_tr, option1En: options.option_1_en || options.option_1_result_prompt_en, option2En: options.option_2_en || options.option_2_result_prompt_en } : null;
}

async function activateQwenOptions(options, source = "qwen") {
  if (!options?.option_1_tr || !options?.option_2_tr) return false;
  const storyState = rememberDisplayedOptions(state.storyState, options, source);
  const dreamPsyche = rememberOptionPair(state.dreamPsyche || state.dream_psyche, options);
  state = { ...state, options, optionsReady: true, storyState, dreamPsyche, dream_psyche: dreamPsyche, phase: "NEXT_READY", generationInProgress: false, qwenRetryFailures: 0 };
  qwenFailures = 0;
  await persist();
  await logForensic("OPTIONS_CREATED", { source, qwenTrace: options._qwenTrace || null, psychologicalTrace: options._psychologicalTrace || null, currentSceneManifest: state.storyState.current_scene_manifest, finalOptions: [1, 2].map((index) => ({ action: options[`option_${index}_tr`], consequence: options[`option_${index}_result_prompt_en`] })) });
  await nextRound();
  return true;
}

function scheduleQwenRetry(reason = "QWEN_INVALID") {
  if (qwenRetryTimer) return;
  // One short retry preserves Qwen-first authorship. A second invalid answer
  // is handled by the bounded scene route below, so viewers never stare at a
  // permanent thinking screen or accumulate an invisible retry loop.
  const delay = qwenFailures <= 1 ? 3000 : 20000;
  qwenRetryTimer = setTimeout(() => {
    qwenRetryTimer = null;
    void prepareQwenOptions("retry");
  }, delay);
  qwenRetryTimer.unref?.();
  void logEvent("qwen_retry_scheduled", { reason, delayMs: delay, failures: qwenFailures });
}

async function prepareQwenOptions(origin = "scene") {
  if (state.optionsReady || state.generationInProgress) return null;
  const cycle = newOptionCycle(state.sceneNumber); activeOptionCycle = cycle;
  const previous = qwenPreviousOptions(state.storyState);
  const idle = await qwenSlotsIdle();
  if (!idle) return publishRecoveryForCycle(cycle, previous, "QWEN_SLOTS_BUSY") ? state.options : null;
  const qwenUrl = process.env.QWEN_DISABLED === "1" ? null : (process.env.QWEN_URL || config.qwenUrl);
  try {
    await logEvent("qwen_options_started", { origin, sceneNumber: state.sceneNumber, manifest: state.storyState.current_scene_manifest });
    const libraryOptions = sceneMatchedOptionLibrary(state.storyState, previous, state.dreamPsyche);
    if (libraryOptions) {
      cycle.resolved = true;
      await activateQwenOptions(libraryOptions, "library");
      return libraryOptions;
    }
    if (qwenJobInFlight) return publishRecoveryForCycle(cycle, previous, "QWEN_BUSY") ? state.options : null;
    qwenJobInFlight = true;
    const request = generateOptions({ storyState: state.storyState, previousOptions: previous, qwenUrl, timeoutMs: config.qwenTimeoutMs, dreamPsyche: state.dreamPsyche, fallbackOnFailure: false }).finally(() => { qwenJobInFlight = false; });
    const raced = await boundedOptionResult(request, cycle);
    const options = raced.kind === "result" ? raced.value : null;
    if (options?._qwenTrace?.finalValidationResult === "qwen") {
      if (cycle.resolved || cycle.id !== activeOptionCycle?.id) { await logForensic("QWEN_RESULT_STALE", { sceneNumber: state.sceneNumber, cycleId: cycle.id }); return null; }
      cycle.resolved = true;
      await activateQwenOptions(options, "qwen");
      return options;
    }
    qwenFailures += 1;
    await logForensic("QWEN_OPTIONS_REJECTED", { origin, qwenTrace: options?._qwenTrace || null, manifest: state.storyState.current_scene_manifest });
    const reason = raced.kind === "liveness_deadline" ? "QWEN_LIVENESS_DEADLINE" : (options?._qwenTrace?.fallbackReason || "QWEN_INVALID");
    return publishRecoveryForCycle(cycle, previous, reason) ? state.options : null;
  } finally { /* Qwen request owns its in-flight flag until it settles. */ }
}

function chooseComposition(story, resultText) {
  const recent = Array.isArray(story?.recent_compositions) ? story.recent_compositions.slice(-3) : [];
  const value = String(resultText || "").toLowerCase();
  const objectScene = /radio|watch|telephone|receipt|photograph|tea|cup|machine|key|table/.test(value);
  const seatedScene = /sitting|seated|chair|table|classroom/.test(value);
  const exteriorScene = /bridge|forest|street|road|shore|beach|desert|mountain|landscape|outdoor|outside|sky/.test(value);
  const candidates = objectScene
    ? [["object_interaction_close", "object-focused medium framing, the protagonist interacting with the required object, off-center composition"], ["object_profile", "close profile or over-the-shoulder framing focused on the object, not a centered standing silhouette"], ["object_partial", "partial-body composition with the object dominant in the foreground and the protagonist partly outside frame"]]
    : seatedScene
      ? [["seated_profile", "seated or profile composition, medium framing, protagonist off-center"], ["seated_object", "quiet medium shot focused on the seated situation and nearby objects"], ["seated_wide", "asymmetric wider composition with the seated protagonist small in the environment"]]
      : exteriorScene
        ? [["environment_wide", "asymmetric environmental wide shot, protagonist small or off-center"], ["exterior_profile", "side or over-the-shoulder exterior framing, avoid a centered silhouette"], ["exterior_detail", "medium environmental composition with one clear foreground landmark"]]
        : [["medium_profile", "medium profile or over-the-shoulder framing, protagonist off-center"], ["wide_asymmetric", "asymmetric environmental composition, no centered standing silhouette"], ["partial_architecture", "partial-body framing with architecture or a foreground object leading the image"]];
  return candidates.find(([id]) => !recent.includes(id)) || candidates[0];
}

function protagonistPresenceFor(resultText) {
  const value = String(resultText || "").toLowerCase();
  if (/gives?|passes?|exchange|another (?:anonymous )?(?:adult|figure)|two[- ]figure|iki kişi|başka bir figür/.test(value)) {
    return ["REQUIRED_INTERACTION", "PROTAGONIST: visible only as needed for the interaction. HUMAN FIGURES: both figures remain anonymous dream silhouettes; faces turned away, hidden in shadow, cropped or backlit. Show the exchange clearly without portrait lighting or actor-like frontal framing, using a side, rear or over-the-shoulder composition."];
  }
  if (/radio|photograph|photo|tea|cup|receipt|watch|telephone|table|spilled|spills|machine is activated|machine activated/.test(value)) {
    return ["ABSENT_OR_OBJECT_LED", "PROTAGONIST: exists in the dream but need not be visible. HUMAN FIGURES: omit the figure unless cropped hands are necessary; let the object or event carry the result, using an object-focused or hands-only frame when appropriate."];
  }
  if (/someone appears|outside the|distant figure|partial|house exterior|landscape|bridge|forest|shore|beach|desert|mountain/.test(value)) {
    return ["OPTIONAL_PARTIAL", "PROTAGONIST: may be partial, off-camera or small in the environment. HUMAN FIGURES: keep identity unreadable through back-facing posture, backlight, face shadow, reflection, distant scale or cropped body; do not force a full centered standing silhouette."];
  }
  return ["REQUIRED", "PROTAGONIST: show only as much of the same adult figure as the result requires. HUMAN FIGURES: anonymous dream figure with face obscured, shadowed, turned away or cropped; prefer profile, seated, partial-body, reflection or backlit framing over a centered standing silhouette or portrait."];
}

function buildImagePrompt(story, resultPrompt, winnerTr, psyche, sceneNumber = 0) {
  return appendPhysicalScenePrompt(buildImagePromptBase(story, resultPrompt, winnerTr, psyche, sceneNumber), story.current_scene_manifest || {});
}

function buildImagePromptBase(story, resultPrompt, winnerTr, psyche, sceneNumber = 0) {
  if (!structuredPromptEnabled) return `A cinematic surreal scene. ${resultPrompt} Visually clear central subject, atmospheric lighting, no text, no logo.`;
  if (config.imageProfile?.continuityMode === "SOFT_LOCK") {
    const mustShow = String(resultPrompt || winnerTr || "the selected result").trim().replace(/[.!?]+\s*$/, "").replace(/\s*The same (?:corridor|window|door|doorway|stairs|staircase|tunnel|bridge|room|car|path|tree|portal) remains part of the scene\.?/gi, "");
    const anchor = (story?.scene_anchors || []).slice(-1).map((item) => typeof item === "string" ? item : item?.text).find(Boolean);
    const staleArchitecture = anchor && /corridor|window|door|doorway|stairs|staircase|tunnel|bridge|room|car|path|tree|portal/i.test(anchor) && !new RegExp(String(anchor).split(/\s+/).filter((word) => word.length > 3).slice(0, 2).join("|"), "i").test(mustShow);
    const motif = anchor && !staleArchitecture ? ` CONTINUITY MOTIF: ${anchor}. Keep it as a small recognizable thread, never as a composition lock.` : "";
    const recurring = recurringMotifForPrompt(psyche, `${mustShow} ${anchor}`, sceneNumber);
    const recurringHint = recurring ? ` RECURRING DREAM MOTIF: ${recurring}. Include it subtly as a secondary visual detail; the current result state remains primary.` : "";
    const [compositionId, compositionText] = chooseComposition(story, mustShow);
    const [presenceMode, presenceText] = protagonistPresenceFor(mustShow);
    const archetype = psyche?.dominant_archetypal_field;
    const pressure = psyche?.archetypal_pressure?.[archetype] || 0;
    const visualHint = archetypalVisualHintsEnabled ? buildArchetypalVisualHint({ archetype, archetypePressure: pressure, manifest: story?.current_scene_manifest || {}, entityStates: story?.current_scene_manifest?.entity_states || {}, visibleConsequence: mustShow, location: story?.current_location || story?.current_scene_manifest?.location || "", sceneNumber, recentMotifs: story?.recent_visual_motifs || [] }) : null;
    const archetypalHint = visualHint?.applied ? ` ARCHETYPAL VISUAL DETAIL: ${visualHint.hint}` : "";
    return `WORLD: cinematic surreal realism, muted cool palette, restrained warm practical lighting. ${presenceText} STYLE: atmospheric haze, realistic materials, 35mm cinematic framing. PRESENCE MODE: ${presenceMode}. COMPOSITION: ${compositionText}.${motif}${recurringHint} CURRENT RESULT STATE: ${mustShow}. MUST SHOW: ${mustShow}.${archetypalHint} New result state has priority; do not preserve previous composition when the location changes. No text, no logo.`;
  }
  const anchors = (story?.scene_anchors || []).slice(-3).map((a) => typeof a === "string" ? a : a?.text).filter(Boolean).join("; ") || "broad atmospheric continuity";
  const previous = story?.current_location ? `The protagonist is currently in ${story.current_location}.` : "The previous scene established the current world.";
  const mustShow = String(resultPrompt || winnerTr || "the selected result").trim().replace(/[.!?]+\s*$/, "");
  return `WORLD: cinematic surreal realism, restrained palette, atmospheric volumetric light, realistic texture. PROTAGONIST: same lone adult protagonist, clear central silhouette, consistent clothing. CONTINUITY ANCHORS: ${anchors}. PREVIOUS STATE: ${previous} CURRENT RESULT STATE: ${mustShow}. MUST SHOW: ${mustShow}. No text, no logo.`;
}

async function closeVote() {
  if (state.phase !== "PLAYING_VOTING") return;
  const tallyAtLock = votes.tally();
  const randomFallback = tallyAtLock.totalVotes === 0 || tallyAtLock.option1Votes === tallyAtLock.option2Votes;
  const winner = votes.winner();
  const winnerTr = winner === "1" ? state.options.option_1_tr : state.options.option_2_tr;
  const winnerMeta = optionMeta(state.options, winner);
  await logForensic("VOTING_CLOSED", { closedAt: Date.now(), ...tallyAtLock });
  await logForensic("WINNER_RESOLVED", { winner });
  const nextScene = state.sceneNumber + 1;
  const pendingStoryState = applyStatePatch(state.storyState, winnerMeta.statePatch);
  const pendingDreamPsyche = updateDreamPsyche(state.dreamPsyche || state.dream_psyche, { label_tr: winnerTr, intent: winnerMeta.intent, psyche_delta: winnerMeta.psycheDelta, scene_anchors: winnerMeta.sceneAnchors, symbol_delta: winnerMeta.symbolDelta, context: pendingStoryState.current_location }, nextScene);
  const composition = chooseComposition(state.storyState, winnerMeta.resultPrompt);
  const prompt = buildImagePrompt(pendingStoryState, winnerMeta.resultPrompt, winnerTr, pendingDreamPsyche, nextScene);

  state = { ...state, phase: "VOTE_LOCKED_GENERATING", generationInProgress: true, winnerTr, lastPrompt: prompt };
  await logForensic("GENERATION_STARTED", { winner, winnerTr, randomFallback });
  broadcast({ type: "generation_started", winnerTr, profile: "IMAGE_MOTION", randomFallback, ...tallyAtLock, roundId: state.roundId, sceneId: state.sceneNumber });
  await persist();
  await logEvent("round_locked", { sceneNumber: state.sceneNumber, winner, winnerTr, ...votes.tally() });

  const previous = qwenPreviousOptions(state.storyState);
  const qwenUrl = process.env.QWEN_DISABLED === "1" ? null : (process.env.QWEN_URL || config.qwenUrl);
  // Qwen writes the next pair, never the fallback catalogue. It runs in
  // parallel with SDXL, but the viewer has an independent liveness deadline.
  const cycle = newOptionCycle(nextScene); activeOptionCycle = cycle;
  const libraryOptions = sceneMatchedOptionLibrary(pendingStoryState, previous, pendingDreamPsyche);
  let optionsPromise;
  if (libraryOptions) optionsPromise = Promise.resolve(libraryOptions);
  else if (qwenJobInFlight) optionsPromise = Promise.resolve(null);
  else {
    qwenJobInFlight = true;
    optionsPromise = generateOptions({ storyState: pendingStoryState, previousOptions: previous, qwenUrl, timeoutMs: config.qwenTimeoutMs, dreamPsyche: pendingDreamPsyche, fallbackOnFailure: false }).finally(() => { qwenJobInFlight = false; });
  }
  const mediaPromise = engine.generate({ prompt, sceneNumber: nextScene });
  const resultDelay = new Promise((resolve) => setTimeout(() => {
    broadcast({ type: "generation_waiting" });
    resolve();
  }, config.resultDisplayMs));
  const [mediaResult] = await Promise.allSettled([mediaPromise, resultDelay]);
  const racedOptions = await boundedOptionResult(optionsPromise, cycle);
  if (racedOptions.kind === "liveness_deadline") {
    void optionsPromise.then(async (late) => {
      if (cycle.resolved || cycle.id !== activeOptionCycle?.id) {
        await logForensic("QWEN_RESULT_STALE", { sceneNumber: nextScene, cycleId: cycle.id, lateResult: Boolean(late) });
      }
    }).catch(() => {});
  }
  const optionsResult = racedOptions.kind === "result" ? racedOptions.value : null;
  const options = (optionsResult?._libraryTrace || optionsResult?._qwenTrace?.finalValidationResult === "qwen") ? optionsResult : null;
  if (mediaResult.status !== "fulfilled") {
    runtimeMetrics.generationFailures += 1;
    // Transaction rollback: the old committed scene and its Qwen-authored
    // pair remain the only interactive reality. No catalogue substitution.
    state = { ...state, phase: "NEXT_READY", generationInProgress: false, winnerTr: null };
    await persist();
    await logEvent("generation_failed", { sceneNumber: nextScene, code: String(mediaResult.reason?.message || mediaResult.reason), rollback: true });
    broadcast({ type: "fallback_active" });
    await nextRound();
    return;
  }

  const media = mediaResult.value.media;
  const generationTime = mediaResult.value.generationTime;
  const committedStory = recordRenderedComposition(recordRenderedVisualMotifs(pendingStoryState, [winnerMeta.resultPrompt, ...winnerMeta.sceneAnchors].join(" ")), composition[0]);
  state = { ...state, storyEngineVersion: STORY_ENGINE_VERSION, sceneNumber: nextScene, media, lastFrame: media, lastPrompt: prompt, options: null, optionsReady: false, storyState: committedStory, dreamPsyche: pendingDreamPsyche, dream_psyche: pendingDreamPsyche, previousOptions: previous, phase: "WAITING_FOR_OPTIONS", generationInProgress: false, currentPlaybackRate: 1, recentGenerationTimes: [...state.recentGenerationTimes, generationTime].slice(-20) };
  await persist();
  await logEvent("sdxl_image_ready", { sceneNumber: nextScene, imageReadyAt: new Date().toISOString(), generationTime });
  await logForensic("NEXT_SCENE_COMMITTED", { nextScene, media, manifest: committedStory.current_scene_manifest });
  broadcast({ type: "new_scene", media, playbackRate: 1, options: null, staticReadyAt: Date.now(), optionsPending: true });
  broadcast(publicState());
  void mediaJanitor.register(nextScene, [mediaResult.value.sourcePath, mediaResult.value.inputImage]);
  if (loopMotionEnabled && mediaResult.value.inputImage) {
    const loopSceneId = nextScene;
    void loopEngine.enqueue({ inputImage: mediaResult.value.inputImage, sceneId: loopSceneId }).then(async (loop) => {
      if (state.sceneNumber !== loopSceneId) { runtimeMetrics.staleLoops += 1; await logEvent("loop_discarded_stale", { sceneNumber: loopSceneId, activeSceneNumber: state.sceneNumber }); return; }
      void mediaJanitor.register(loopSceneId, [loop.outputPath]); runtimeMetrics.loopSuccess += 1; runtimeMetrics.loopTimes = [...runtimeMetrics.loopTimes, loop.renderTime].slice(-100);
      broadcast({ type: "loop_scene", media: loop.media, sceneNumber: loopSceneId, sceneId: loopSceneId }); await logEvent("loop_ready", { sceneNumber: loopSceneId, renderTime: loop.renderTime, bytes: loop.bytes });
    }).catch(async (error) => { runtimeMetrics.loopErrors += 1; await logEvent("loop_error", { sceneNumber: loopSceneId, code: String(error?.message || error) }); });
  } else if (loopMotionEnabled && mediaResult.value.handoffError) {
    await logEvent("loop_input_handoff_failed", { sceneNumber: nextScene, code: mediaResult.value.handoffError });
  }
  await logEvent("scene_ready", { sceneNumber: nextScene, generationTime, fallback: false, optionsReady: Boolean(options) });
  if (options) await activateQwenOptions(options, options._libraryTrace ? "library" : "qwen");
  else {
    qwenFailures += 1;
    await logForensic("QWEN_OPTIONS_REJECTED", { origin: "parallel", qwenTrace: optionsResult?._qwenTrace || null, manifest: state.storyState.current_scene_manifest });
    const reason = racedOptions.kind === "liveness_deadline" ? "QWEN_LIVENESS_DEADLINE" : (optionsResult?._qwenTrace?.fallbackReason || "QWEN_INVALID");
    await publishRecoveryForCycle(cycle, previous, reason);
  }
}

async function startFreshDream() {
  const prior = state;
  const freshStory = normalizeStoryState(defaultStoryState());
  const freshPsyche = normalizeDreamPsyche(defaultDreamPsyche());
  const freshScene = 1;
  const prompt = buildImagePrompt(freshStory, FRESH_DREAM_RESULT, "Yeni rüya", freshPsyche, freshScene);
  state = { ...state, phase: "INITIALIZING_DREAM", generationInProgress: true, options: null, optionsReady: false, winnerTr: null, lastPrompt: prompt };
  await persist();
  broadcast(publicState());
  await logEvent("fresh_dream_started", { manifest: freshStory.current_scene_manifest });
  try {
    const generated = await engine.generate({ prompt, sceneNumber: `fresh_${Date.now()}` });
    const media = generated.media;
    state = { ...state, storyEngineVersion: STORY_ENGINE_VERSION, sceneNumber: freshScene, media, lastFrame: media, lastPrompt: prompt, options: null, optionsReady: false, storyState: freshStory, dreamPsyche: freshPsyche, dream_psyche: freshPsyche, previousOptions: [], phase: "WAITING_FOR_OPTIONS", generationInProgress: false, currentPlaybackRate: 1, recentGenerationTimes: [generated.generationTime].filter(Number.isFinite) };
    needsFreshDream = false;
    await persist();
    await logEvent("fresh_dream_committed", { sceneNumber: freshScene, media, generationTime: generated.generationTime, manifest: freshStory.current_scene_manifest });
    broadcast({ type: "new_scene", media, playbackRate: 1, options: null, staticReadyAt: Date.now(), optionsPending: true });
    broadcast(publicState());
    void mediaJanitor.register(freshScene, [generated.sourcePath, generated.inputImage]);
    if (loopMotionEnabled && generated.inputImage) {
      void loopEngine.enqueue({ inputImage: generated.inputImage, sceneId: freshScene }).then(async (loop) => {
        if (state.sceneNumber !== freshScene) { runtimeMetrics.staleLoops += 1; return; }
        void mediaJanitor.register(freshScene, [loop.outputPath]); runtimeMetrics.loopSuccess += 1; runtimeMetrics.loopTimes = [...runtimeMetrics.loopTimes, loop.renderTime].slice(-100);
        broadcast({ type: "loop_scene", media: loop.media, sceneNumber: freshScene, sceneId: freshScene });
        await logEvent("loop_ready", { sceneNumber: freshScene, renderTime: loop.renderTime, bytes: loop.bytes });
      }).catch(async (error) => { runtimeMetrics.loopErrors += 1; await logEvent("loop_error", { sceneNumber: freshScene, code: String(error?.message || error) }); });
    } else if (loopMotionEnabled && generated.handoffError) {
      await logEvent("loop_input_handoff_failed", { sceneNumber: freshScene, code: generated.handoffError });
    }
    await prepareQwenOptions("fresh_dream");
  } catch (error) {
    // A new dream is transactional: a failed first image leaves the previous
    // valid scene intact rather than persisting half-cleared story memory.
    state = { ...prior, generationInProgress: false };
    await persist();
    await logEvent("fresh_dream_failed", { code: String(error?.message || error), rollback: true });
    broadcast(publicState());
  }
}

let timerBusy = false;
setInterval(async () => {
  if (timerBusy || readiness !== "ready" || state.phase !== "PLAYING_VOTING") return;
  timerBusy = true;
  try {
    const remaining = state.closesAt ? Math.max(0, state.closesAt - Date.now()) : 0;
    state.secondsLeft = Math.ceil(remaining / 1000);
    const tally = votes.tally();
    state = { ...state, ...tally };
    broadcast({ type: "vote_update", ...tally, secondsLeft: state.secondsLeft });
    if (state.closesAt ? Date.now() >= state.closesAt : state.secondsLeft <= 0) await closeVote();
  } catch (error) {
    await logEvent("loop_error", { code: String(error?.message || error) });
    await nextRound();
  } finally {
    timerBusy = false;
  }
}, 1000);

const youtube = new YouTubeChat({
  onVote: acceptVote,
  onLatencyP95: (latencyP95) => {
    config.voteSeconds = Math.max(7, Math.min(12, Math.ceil(latencyP95) + 4));
  },
});
void youtube.start();

async function warmupAndStart(attempt = 1) {
  try {
    await engine.generate({ prompt: "A simple disposable warm-up scene. Do not use this as a story scene.", sceneNumber: "warmup", seed: 918273 });
    readiness = "ready";
    // A schema migration deliberately begins a clean red-house dream only
    // after its first SDXL frame succeeds. Existing committed state remains
    // intact if that first render fails.
    if (needsFreshDream) await startFreshDream();
    else if (state.optionsReady) await nextRound();
    else await prepareQwenOptions("startup_resume");
    await logEvent("startup_warmup_ready", { attempt });
  } catch (error) {
    await logEvent("startup_warmup_failed", { code: String(error?.message || error), attempt });
    // ComfyUI (or Qwen) can still be mid-startup (model load, custom node
    // import) when this process comes up first. Retry with a capped backoff
    // instead of leaving readiness stuck at "warming_up" forever, which would
    // freeze the periodic round timer (it only runs once readiness==="ready").
    const delayMs = Math.min(30000, 5000 * attempt);
    setTimeout(() => { void warmupAndStart(attempt + 1); }, delayMs);
  }
}

server.listen(config.port, "127.0.0.1", () => {
  console.log(`Surreal live MVP: http://127.0.0.1:${config.port}`);
  void warmupAndStart();
});
