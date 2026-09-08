// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.

const el = Object.fromEntries(["scene", "scene-next", "scene-video", "scene-effects", "blink", "option1", "option1-en", "option2", "option2-en", "percent1", "percent2", "bar1", "bar2", "countdown", "vote-label", "vote-card", "result-card", "winner", "winner-note", "scene-number", "status", "chat-messages", "chat-form", "chat-input", "psyche-curiosity", "psyche-confrontation", "psyche-avoidance", "viewer-count", "ambient-audio", "sound-toggle", "save-dream"].map((id) => [id, document.getElementById(id)]));
let currentState = null;
let userVotedRound = null;
let transitionToken = 0;
let telemetryRound = null;
let interactiveAt = null;
let cueAudio = null;
let ambientTelemetryBound = false;
let lastCueSceneId = null;
let lastTransitionScene = null;
let audioUnlocked = false;
let pendingTapeCue = false;
// A user who explicitly muted the ambient should stay muted across votes and
// scene transitions.  Browser gesture unlock is still allowed until that
// explicit preference is set.
let audioDisabledByUser = false;
function viewerLabel(count) {
  const value = Math.max(0, Number(count) || 0);
  return window.matchMedia?.("(max-width: 760px)").matches ? `${value} KİŞİ` : `${value} KİŞİ — RÜYA GÖRÜYOR`;
}
const sessionId = (() => { try { const k = "fever_dream_session"; let v = sessionStorage.getItem(k); if (!v) { v = crypto.randomUUID(); sessionStorage.setItem(k, v); } return v; } catch { return `session-${Math.random().toString(36).slice(2)}`; } })();
function roundTelemetry(event, state = currentState, extra = {}) {
  if (!state) return;
  fetch("/api/metrics/round", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event, roundId: state.roundId, sceneId: state.sceneNumber, phase: state.phase, secondsLeft: state.secondsLeft, option1Votes: state.option1Votes || 0, option2Votes: state.option2Votes || 0, clientSessionId: sessionId, clientBuild: "viewer-polish-14", clientAt: Date.now(), clientPerf: performance.now(), ...extra }) }).catch(() => {});
}

async function unlockCueAudio() {
  try {
    cueAudio ||= new (window.AudioContext || window.webkitAudioContext)();
    audioUnlocked = true;
    if (cueAudio.state === "suspended") await cueAudio.resume();
  } catch {}
  startAmbient();
  if (pendingTapeCue && cueAudio?.state === "running") { pendingTapeCue = false; playTapeCue(); }
}
let ambientStarted = false;
function startAmbient() {
  const audio = el["ambient-audio"];
  if (!audio || ambientStarted) return;
  if (!ambientTelemetryBound) {
    ambientTelemetryBound = true;
    audio.addEventListener("canplay", () => roundTelemetry("AMBIENT_CANPLAY"));
    audio.addEventListener("playing", () => roundTelemetry("AMBIENT_PLAYING_EVENT"));
    audio.addEventListener("ended", () => roundTelemetry("AMBIENT_ENDED_UNEXPECTED"));
    audio.addEventListener("error", () => roundTelemetry("AMBIENT_ERROR", { errorCode: audio.error?.code || null }));
  }
  // Audible on ordinary laptop speakers while remaining beneath the image.
  audio.volume = 0.16;
  audio.muted = false;
  audio.play().then(() => { ambientStarted = true; el["sound-toggle"]?.classList.add("sound-on"); if (el["sound-toggle"]) el["sound-toggle"].textContent = "◉ SES AÇIK"; roundTelemetry("AMBIENT_PLAYING"); }).catch(() => { roundTelemetry("AMBIENT_BLOCKED"); });
}
function toggleAmbient() {
  const audio = el["ambient-audio"];
  if (!audio) return;
  if (audio.paused) { audioDisabledByUser = false; ambientStarted = false; startAmbient(); }
  else { audioDisabledByUser = true; audio.pause(); ambientStarted = false; el["sound-toggle"]?.classList.remove("sound-on"); if (el["sound-toggle"]) el["sound-toggle"].textContent = "◌ SESİ AÇ"; roundTelemetry("AMBIENT_PAUSED"); }
}
function playTapeCue() {
  try {
    if (!audioUnlocked || !cueAudio || cueAudio.state !== "running") { if (audioUnlocked) pendingTapeCue = true; return; }
    const now = cueAudio.currentTime;
    const osc = cueAudio.createOscillator(); const gain = cueAudio.createGain();
    const filter = cueAudio.createBiquadFilter();
    osc.type = "triangle"; osc.frequency.setValueAtTime(170, now); osc.frequency.exponentialRampToValueAtTime(78, now + 0.11);
    filter.type = "lowpass"; filter.frequency.setValueAtTime(1100, now); filter.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(filter).connect(gain).connect(cueAudio.destination); osc.start(now); osc.stop(now + 0.16);
    // A barely audible filtered noise tail gives the cut a cassette/relay
    // texture without adding another asset or competing with the ambient bed.
    const buffer = cueAudio.createBuffer(1, Math.ceil(cueAudio.sampleRate * 0.08), cueAudio.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = cueAudio.createBufferSource(); const noiseGain = cueAudio.createGain(); const noiseFilter = cueAudio.createBiquadFilter();
    noiseFilter.type = "bandpass"; noiseFilter.frequency.value = 900; noiseFilter.Q.value = 0.7;
    noiseGain.gain.setValueAtTime(0.0001, now); noiseGain.gain.exponentialRampToValueAtTime(0.012, now + 0.004); noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    noise.buffer = buffer; noise.connect(noiseFilter).connect(noiseGain).connect(cueAudio.destination); noise.start(now); noise.stop(now + 0.08);
    roundTelemetry("TAPE_CUE_PLAYING", currentState, { sceneId: currentState?.sceneNumber ?? null });
  } catch {}
}
function requestTapeCue() {
  if (!audioUnlocked || !cueAudio || cueAudio.state !== "running") { if (audioUnlocked) pendingTapeCue = true; return; }
  playTapeCue();
}

function sceneEffectFor(state, message = {}) {
  // Ambient scene effects are intentionally disabled: the generated frame
  // already owns its atmosphere, so synthetic rain/fog/glow must not repeat
  // on every scene or contradict the committed image.
  return "static";
}
function applySceneEffect(state, message = {}) { if (el["scene-effects"]) el["scene-effects"].dataset.effect = sceneEffectFor(state, message); }

function votes(option1Votes = 0, option2Votes = 0, secondsLeft = 0) {
  const total = option1Votes + option2Votes;
  const p1 = total ? Math.round(option1Votes * 100 / total) : 0;
  const p2 = total ? 100 - p1 : 0;
  el.percent1.textContent = total ? `${p1}%` : "—"; el.percent2.textContent = total ? `${p2}%` : "—";
  el.bar1.style.width = `${p1}%`; el.bar2.style.width = `${p2}%`;
  el.countdown.textContent = Math.max(0, secondsLeft);
  el.countdown.classList.toggle("urgent", secondsLeft > 0 && secondsLeft <= 2);
}

function renderPsyche(state) {
  const tendency = state?.collectiveTendency || state?.dreamPsyche?.collective_tendency;
  if (!tendency) return;
  const tension = Number(state?.collectiveTension?.confrontationAvoidance);
  const confrontation = Number.isFinite(tension) ? Math.round(Math.max(0, Math.min(1, tension)) * 100) : Math.round(Math.max(0, Math.min(1, Number(tendency.confrontation) || 0.5)) * 100);
  const values = {
    curiosity: Math.round(Math.max(0, Math.min(1, Number(tendency.curiosity) || 0.5)) * 100),
    confrontation,
    avoidance: Number.isFinite(tension) ? 100 - confrontation : Math.round(Math.max(0, Math.min(1, Number(tendency.avoidance) || 0.5)) * 100),
  };
  const dominant = Math.max(...Object.values(values));
  for (const key of ["curiosity", "confrontation", "avoidance"]) {
    const node = el[`psyche-${key}`];
    if (node) { node.textContent = `${values[key]}`; node.parentElement?.classList.toggle("dominant", values[key] === dominant); }
  }
}

function transitionToImage(media, sceneNumber) {
  if (!media || el.scene.dataset.media === media) return;
  const token = ++transitionToken;
  el["scene-video"].hidden = true;
  el["scene-video"].pause?.();
  el.scene.style.opacity = "1";
  const src = `${media}?scene=${sceneNumber}`;
  const next = el["scene-next"];
  const preload = new Image();
  preload.onload = async () => {
    if (token !== transitionToken) return;
    try { await preload.decode?.(); } catch {}
    next.src = src; next.dataset.media = media; next.style.opacity = "1";
    if (lastTransitionScene !== Number(sceneNumber)) {
      lastTransitionScene = Number(sceneNumber);
      el.blink?.classList.remove("blink-transition");
      void el.blink?.offsetWidth;
      el.blink?.classList.add("blink-transition");
      roundTelemetry("BLINK_TRIGGERED", currentState, { sceneId: Number(sceneNumber) });
    }
    // Keep the old still visible for the complete blink. The new still is
    // decoded and parked underneath, then appears in one atomic swap when the
    // blink ends; this avoids a half-faded old/new overlap.
    next.style.opacity = "0";
    const swapAfterBlink = () => {
      if (token !== transitionToken) return;
      next.style.opacity = "1";
      el.scene.style.opacity = "0";
      setTimeout(() => {
        if (token !== transitionToken) return;
        el.scene.src = src; el.scene.dataset.media = media; el.scene.style.opacity = "1";
        next.style.opacity = "0"; next.removeAttribute("src");
      }, 90);
    };
    setTimeout(swapAfterBlink, 620);
  };
  preload.onerror = () => { next.style.opacity = "0"; };
  preload.src = src;
}

function applyState(state) {
  currentState = state;
  renderPsyche(state);
  applySceneEffect(state);
  if (el["viewer-count"] && Number.isFinite(Number(state.activeViewerSessions))) el["viewer-count"].textContent = viewerLabel(state.activeViewerSessions);
  roundTelemetry("WS_STATE_RECEIVED", state);
  if (state.phase === "PLAYING_VOTING" && userVotedRound !== state.sceneNumber) userVotedRound = null;
  if (state.media) transitionToImage(state.media, state.sceneNumber);
  const optionsReady = state.optionsReady === true && state.options?.option_1_tr && state.options?.option_2_tr;
  el.option1.textContent = optionsReady ? state.options.option_1_tr : "Rüya düşünüyor…";
  el.option2.textContent = optionsReady ? state.options.option_2_tr : "";
  el["option1-en"].textContent = state.options?.option_1_en || state.options?.option_1_result_prompt_en || "";
  el["option2-en"].textContent = state.options?.option_2_en || state.options?.option_2_result_prompt_en || "";
  el["scene-number"].textContent = `RÜYA #${state.sceneNumber || 0}`;
  el.status.textContent = state.readiness === "warming_up" ? "…" : state.phase === "WAITING_FOR_OPTIONS" || state.phase === "INITIALIZING_DREAM" ? "RÜYA DÜŞÜNÜYOR…" : state.phase === "PLAYING_VOTING" ? "" : "GENERATING…";
  votes(state.option1Votes, state.option2Votes, state.secondsLeft);
  const generating = state.phase !== "PLAYING_VOTING" || !optionsReady;
  // Keep the two choices visible during generation (buttons are disabled below).
  // Hiding them made reconnects/fast rounds look like an automatic silent choice.
  el["vote-card"].hidden = state.readiness === "warming_up" || !optionsReady;
  el["result-card"].hidden = true;
  if (state.phase === "PLAYING_VOTING" && optionsReady && state.readiness !== "warming_up" && telemetryRound !== state.roundId) {
    telemetryRound = state.roundId;
    interactiveAt = performance.now();
    roundTelemetry("OPTIONS_RENDERED", state);
    roundTelemetry("COUNTDOWN_VISIBLE", state);
    roundTelemetry("VOTING_UI_INTERACTIVE", state);
  }
  document.querySelectorAll("[data-vote]").forEach((button) => { button.disabled = generating || state.readiness === "warming_up" || userVotedRound === state.sceneNumber; button.classList.toggle("user-voted", userVotedRound === state.sceneNumber); });
  if (state.winnerTr) el.winner.textContent = state.winnerTr;
}

function playMotion(message) {
  if (!el["scene-video"] || !message.media) return;
  if (!currentState || Number(message.sceneNumber) !== Number(currentState.sceneNumber)) return;
  const video = el["scene-video"];
  const started = performance.now();
  const sceneId = Number(message.sceneNumber);
  const report = (phase, extra = {}) => fetch("/api/metrics/playback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sceneNumber: sceneId, sceneId, phase, clientSessionId: sessionId, clientBuild: "viewer-polish-14", clientAt: Date.now(), clientElapsedMs: performance.now() - started, ...extra }) }).catch(() => {});
  let playbackAttempted = false;
  const attemptPlayback = () => {
    if (playbackAttempted) return;
    playbackAttempted = true;
    video.play().then(() => report("play_resolved", { trigger: "canplay" })).catch((error) => {
      report("play_rejected", { trigger: "canplay", errorMessage: String(error?.message || error) });
      video.hidden = true;
      el.scene.style.opacity = "1";
    });
  };
  // Keep the current static scene visible until the replacement really plays.
  video.hidden = true;
  // Loop assets are intentionally finite, subtle motion beds. Keep them
  // alive for the whole voting window; never let a four-second clip freeze on
  // its last frame while the scene is still active.
  video.loop = true;
  video.onloadstart = () => report("loadstart");
  video.onloadedmetadata = () => report("loadedmetadata", { duration: Number.isFinite(video.duration) ? video.duration : null });
  // Start only after the browser has decoded enough media. Calling play()
  // immediately after assigning src caused avoidable promise rejections on
  // slower/mobile clients even though the video was ultimately playable.
  video.oncanplay = () => { report("canplay"); attemptPlayback(); };
  video.onplaying = () => {
    if (!currentState || Number(message.sceneNumber) !== Number(currentState.sceneNumber)) { video.pause(); video.removeAttribute("src"); video.load(); return; }
    video.hidden = false; el.scene.style.opacity = "0"; el["scene-next"].style.opacity = "0";
    report("playing");
    el.status.textContent = "HAREKETLİ RÜYA";
  };
  video.onended = () => report("ended");
  video.onerror = () => { report("error", { errorCode: video.error?.code || null, errorMessage: video.error?.message || null }); video.hidden = true; el.scene.style.opacity = "1"; };
  video.src = `${message.media}?scene=${message.sceneNumber || Date.now()}`;
  video.load();
}

function flashWinner(winnerTr) {
  const rows = [document.querySelector('[data-option-row="1"]'), document.querySelector('[data-option-row="2"]')];
  rows.forEach((row) => row?.classList.remove("winner-flash", "loser-fade"));
  const winnerIndex = currentState?.options?.option_1_tr === winnerTr ? 0 : currentState?.options?.option_2_tr === winnerTr ? 1 : -1;
  rows.forEach((row, index) => {
    if (!row || winnerIndex < 0) return;
    row.classList.add(index === winnerIndex ? "winner-flash" : "loser-fade");
  });
}

function connect() {
  const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/?session=${encodeURIComponent(sessionId)}`);
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.type === "state") applyState(message);
    if (message.type === "vote_update") votes(message.option1Votes, message.option2Votes, message.secondsLeft);
    if (message.type === "generation_started") {
      flashWinner(message.winnerTr);
      // Keep both choices visible while the selected result is being generated.
      // This prevents the UI from looking like the system silently chose one.
      el["vote-card"].hidden = false; el["result-card"].hidden = true;
      el.winner.textContent = message.winnerTr;
      el["vote-label"].textContent = message.randomFallback ? "OY YOK/EŞİT — RASTGELE SEÇİM" : "SEÇİM KİLİTLENDİ — ÜRETİLİYOR";
      el.status.textContent = "GENERATING…";
      document.querySelectorAll("[data-vote]").forEach((button) => { button.disabled = true; });
      roundTelemetry("VOTE_LOCK_UI", currentState, { winner: message.winnerTr, visibleInteractiveWindowMs: interactiveAt == null ? null : performance.now() - interactiveAt });
      roundTelemetry("GENERATING_UI", currentState);
    }
    if (message.type === "generation_waiting") {
      el["result-card"].hidden = true; el.status.textContent = "GENERATING…";
    }
    if (message.type === "new_scene") {
      userVotedRound = null;
      if (currentState) {
        currentState.sceneNumber = message.sceneNumber;
        currentState.phase = message.options ? "PLAYING_VOTING" : "WAITING_FOR_OPTIONS";
        currentState.optionsReady = Boolean(message.options);
        // Keep the client-side state in sync with the options already rendered.
        // The following authoritative `state` broadcast normally arrives immediately,
        // but this prevents a brief stale-option window after a fast scene commit.
        if (message.options) {
          currentState.options = {
            ...currentState.options,
            option_1_tr: message.options.option1Tr || currentState.options?.option_1_tr,
            option_2_tr: message.options.option2Tr || currentState.options?.option_2_tr,
            option_1_en: message.options.option1En || currentState.options?.option_1_en,
            option_2_en: message.options.option2En || currentState.options?.option_2_en,
          };
        }
      }
      el["scene-number"].textContent = `RÜYA #${message.sceneNumber || 0}`;
      transitionToImage(message.media, message.sceneNumber);
      applySceneEffect(currentState, message);
      el.status.textContent = message.options ? "" : "RÜYA DÜŞÜNÜYOR…";
      el["vote-card"].hidden = !message.options;
      el["result-card"].hidden = true;
      el["vote-label"].textContent = message.options ? "OY VERME SÜRESİ" : "RÜYA DÜŞÜNÜYOR…";
      if (lastCueSceneId !== Number(message.sceneNumber)) {
        lastCueSceneId = Number(message.sceneNumber);
        requestTapeCue();
        roundTelemetry("TAPE_CUE_ATTEMPTED", currentState, { sceneId: Number(message.sceneNumber) });
      }
      if (message.options) {
        el.option1.textContent = message.options.option1Tr || el.option1.textContent;
        el.option2.textContent = message.options.option2Tr || el.option2.textContent;
        el["option1-en"].textContent = message.options.option1En || "";
        el["option2-en"].textContent = message.options.option2En || "";
      }
      document.querySelectorAll("[data-option-row]").forEach((row) => row.classList.remove("winner-flash", "loser-fade"));
      roundTelemetry("NEW_MEDIA_VISIBLE", currentState);
    }
    if (message.type === "motion_scene" || message.type === "loop_scene") playMotion(message);
    if (message.type === "viewer_count" && el["viewer-count"]) el["viewer-count"].textContent = viewerLabel(message.count);
    if (message.type === "chat_history") renderChat(message.messages || []);
    if (message.type === "chat_message") appendChat(message.message);
  });
  socket.addEventListener("close", () => {
    el.status.textContent = "…";
    setTimeout(connect, 1000);
  });
}

connect();

for (const button of document.querySelectorAll("[data-vote]")) {
  button.addEventListener("click", async () => {
    if (!currentState || currentState.phase !== "PLAYING_VOTING" || userVotedRound === currentState.sceneNumber) return;
    if (!audioDisabledByUser) unlockCueAudio();
    const round = currentState.sceneNumber; userVotedRound = round; applyState(currentState);
    roundTelemetry("USER_CLICK", currentState, { vote: button.dataset.vote });
    const response = await fetch("/api/debug/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: sessionId, vote: button.dataset.vote }) });
    roundTelemetry(response.ok ? "VOTE_ACK" : "VOTE_REJECTED", currentState, { vote: button.dataset.vote });
    if (!response.ok) { userVotedRound = null; applyState(currentState); el.status.textContent = "…"; }
  });
}

el["sound-toggle"]?.addEventListener("click", (event) => { event.stopPropagation(); if (!ambientStarted) void unlockCueAudio(); else toggleAmbient(); });
document.addEventListener("pointerdown", (event) => { if (!event.target.closest?.("#sound-toggle") && !ambientStarted) void unlockCueAudio(); }, { once: true, passive: true });
el["save-dream"]?.addEventListener("click", () => {
  const media = currentState?.media || el.scene?.dataset?.media;
  if (!media) return;
  const link = document.createElement("a");
  link.href = media;
  link.download = `ai-fever-dream-${currentState?.sceneNumber || "scene"}.png`;
  document.body.append(link); link.click(); link.remove();
});

function appendChat(message) {
  if (!message || !el["chat-messages"]) return;
  const row = document.createElement("div"); row.className = "chat-message";
  const name = document.createElement("b"); name.textContent = `${message.nickname || "Guest"}:`;
  const body = document.createElement("span"); body.textContent = ` ${message.text || ""}`;
  row.append(name, body); el["chat-messages"].append(row);
  while (el["chat-messages"].children.length > 50) el["chat-messages"].firstChild.remove();
  el["chat-messages"].scrollTop = el["chat-messages"].scrollHeight;
}
function renderChat(messages) { el["chat-messages"].replaceChildren(); messages.forEach(appendChat); }
el["chat-form"]?.addEventListener("submit", async (event) => {
  event.preventDefault(); const text = el["chat-input"].value.trim(); if (!text) return;
  const nickname = `Guest${Math.floor(Math.random() * 900 + 100)}`;
  const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, nickname, clientSessionId: sessionId }) });
  if (response.ok) el["chat-input"].value = "";
});
