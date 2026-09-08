// Lightweight deterministic dream psyche. It is a narrative control layer,
// not a psychological assessment or a replacement for the existing engine.

const ARCHETYPES = ["shadow", "persona", "anima_animus", "self", "child", "wise_figure", "trickster", "mother_field"];
const DIMENSIONS = ["curiosity", "confrontation", "avoidance", "control", "surrender"];
const ARCHETYPE_RESTING_PRESSURE = 0.08;
const DREAM_CYCLE_MAX = 256;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : (min + max) / 2));
const boundedList = (value, max) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(-max) : [];
const normalizeMap = (value, keys, fallback = 0.5) => Object.fromEntries(keys.map((key) => [key, value?.[key] === undefined ? fallback : clamp(value[key], 0, 1)]));

// Optional prompt-only layer. It never mutates story state: the returned
// sentence is a grounded visual treatment of an entity already in the scene.
const ARCHETYPE_HINT_RULES = Object.freeze({
  shadow: [
    ["figure_shadow", ["figure", "shadow", "light", "reflection"], "The existing figure casts a slightly longer, unreadable shadow across the same surface."],
    ["reflection_shadow", ["reflection", "mirror", "window", "glass"], "The existing reflection leaves the figure's face impossible to read."],
    ["light_edge", ["light", "dark", "shadow"], "The existing light leaves a denser, harder-to-read edge in the same scene."]
  ],
  persona: [
    ["reflection_face", ["figure", "face", "mirror", "window", "reflection", "glass"], "Use reflection and lighting only to make the existing figure's facial identity harder to read; keep the window, glass and architecture unchanged."],
    ["glass_mismatch", ["figure", "window", "reflection", "glass"], "Use only a subtle reflection mismatch on the existing glass; keep its geometry and physical state unchanged."]
  ],
  wise_figure: [
    ["figure_guidance", ["figure"], "Keep all architecture and structures unchanged; use only the established figure and available light to form a subtle guiding composition."],
    ["figure_stillness", ["figure"], "Keep the environment unchanged; use only framing and light to make the existing anonymous figure a quiet, steady focal point."]
  ],
  trickster: [
    ["machine_geometry", ["machine"], "The existing machine's visible geometry appears subtly impossible while remaining recognizably the same machine."],
    ["reflection_angle", ["reflection", "mirror", "window", "glass"], "The existing reflection angle no longer quite matches the scene."],
    ["shadow_direction", ["shadow", "light"], "The existing shadow points slightly against the available light."],
    ["photograph_subject", ["photograph", "photo"], "The existing photograph shows its subject subtly repositioned within the same frame."]
  ],
  anima_animus: [
    ["water_silhouette", ["water", "reflection", "glass", "silhouette"], "The existing surface holds a faint, unreadable human silhouette."],
    ["figure_double", ["figure", "reflection", "light", "silhouette"], "The existing figure reads as a soft, doubled silhouette in the available light."]
  ],
  self: [
    ["centered_light", ["light", "room", "scene", "path", "road", "street"], "The existing lines and light settle into a more balanced central focus."],
    ["converging_lines", ["path", "road", "street", "corridor", "bridge", "tunnel", "room"], "The established paths and edges appear to converge gently toward the scene's center."],
    ["existing_circle", ["circle", "round", "orb", "light"], "The existing circular geometry becomes a quiet point of visual unity."]
  ],
  child: [
    ["fragile_object", ["small", "fragile", "object", "photograph", "plant", "light"], "The existing small or fragile element becomes the clearest detail in the frame."],
    ["isolated_light", ["light", "figure", "photograph", "plant"], "The existing light gathers around one small, vulnerable detail."]
  ],
  mother_field: [
    ["enclosing_room", ["room", "enclosure", "doorway", "wall", "structure"], "The existing space feels more enclosing around the established figure and objects."],
    ["water_enclosure", ["water", "room", "structure", "vegetation"], "The existing environment forms a broad, enclosing frame around what is already present."]
  ]
});

function hintHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967296;
}

function hintTokens(manifest = {}) {
  const values = [manifest.location, manifest.summary, ...(manifest.entities || []), ...(manifest.visible_entities || []), ...(manifest.current_scene_entities || [])];
  const tokens = new Set(values.join(" ").toLocaleLowerCase("tr-TR").replaceAll("_", " ").split(/[^a-zçğıöşü0-9]+/i).filter(Boolean));
  const aliases = { "figür": "figure", "gölge": "shadow", "ışık": "light", "yansıma": "reflection", "makine": "machine", "pencere": "window", "cam": "glass", "su": "water", "oda": "room", "kapı": "doorway", "eşik": "threshold", "duvar": "wall", "yol": "path", "sokak": "street", "koridor": "corridor", "köprü": "bridge", "tünel": "tunnel", "fotoğraf": "photograph", "ayna": "mirror", "siluet": "silhouette", "küçük": "small", "kırılgan": "fragile", "bitki": "plant", "daire": "circle" };
  for (const [source, target] of Object.entries(aliases)) if (tokens.has(source)) tokens.add(target);
  return tokens;
}

function consequenceConflicts(hint, consequence) {
  const h = String(hint || "").toLocaleLowerCase("tr-TR");
  const c = String(consequence || "").toLocaleLowerCase("tr-TR");
  if (!h || !c) return false;
  if (/hidden|invisible|gone|disappears|omitted|gizlen|görünmez|kaybol/.test(c) && /figure|silhouette|more prominent|clearer|visible|belirgin|uzun|uzar/.test(h)) return true;
  if (/closed|shut|kapalı/.test(c) && /open|ajar|açık|eşik/.test(h)) return true;
  return false;
}

export function buildArchetypalVisualHint({ archetype, archetypePressure = 0, manifest = {}, entityStates = {}, visibleConsequence = "", location = "", sceneNumber = 0, recentMotifs = [] } = {}) {
  const key = ARCHETYPES.includes(archetype) ? archetype : null;
  const pressure = clamp(archetypePressure, 0, 1);
  if (!key) return null;
  if (pressure < 0.22) return { archetype: key, applied: false, reason: "low_pressure" };
  const tokens = hintTokens({ ...manifest, location: location || manifest.location });
  const blocked = new Set((recentMotifs || []).map((item) => String(item).toLowerCase()));
  const candidates = (ARCHETYPE_HINT_RULES[key] || []).filter(([family, required]) => required.some((token) => tokens.has(token)) && !blocked.has(`${key}:${family}`));
  if (!candidates.length) return { archetype: key, applied: false, reason: "no_grounded_affordance" };
  // A hidden/invisible figure cannot simultaneously receive a shadow-focused
  // visual treatment; preserve the winner's visible consequence instead.
  if (key === "shadow" && /hidden|invisible|gizlen|görünmez/.test(String(visibleConsequence || "").toLocaleLowerCase("tr-TR"))) return { archetype: key, applied: false, reason: "conflicts_with_result_state" };
  const gate = hintHash(`${sceneNumber}|${key}|${location}|${[...tokens].sort().join(",")}`);
  const gateThreshold = pressure >= 0.85 ? 0.98 : Math.min(0.82, pressure + 0.12);
  if (gate > gateThreshold) return { archetype: key, applied: false, reason: "deterministic_gate" };
  const [motifFamily, , hint] = candidates[Math.floor(hintHash(`${sceneNumber}|${key}|motif`) * candidates.length) % candidates.length];
  if (consequenceConflicts(hint, visibleConsequence)) return { archetype: key, motif_family: motifFamily, applied: false, reason: "conflicts_with_result_state" };
  return { archetype: key, motif_family: motifFamily, hint, applied: true, reason: "applied", entity_states: entityStates };
}

// Broad visual families are intentionally coarser than exact words. They are
// a small anti-trope memory for the fallback planner, not a fixed story
// ontology. A door, portal, gate and arch all consume the same THRESHOLD
// budget; corridor, tunnel, bridge and stairs consume PASSAGE together.
const VISUAL_MOTIF_RULES = Object.freeze({
  THRESHOLD: /\b(door|doorway|gate|portal|arch|threshold)\b|kapı|portal|geçit|eşik/i,
  PASSAGE: /\b(corridor|tunnel|bridge|stairs|staircase|path|road|street|passage)\b|koridor|tünel|köprü|merdiven|yol|sokak|geçit/i,
  LIGHT_EFFECT: /\b(light|glow|glowing|beam|luminous|crimson|red sky|red glow)\b|ışık|parla|kızıl|kırmızı/i,
  ATMOSPHERIC: /\b(fog|mist|smoke|haze|rain|snow)\b|sis|duman|pus|yağmur|kar/i,
  WINDOW: /\b(window|glass)\b|pencere|cam/i,
  LONE_NATURE: /\b(tree|forest|shore|beach|desert|mountain|landscape)\b|ağaç|orman|sahil|çöl|dağ|manzara/i,
  VEHICLE: /\b(car|train|vehicle|elevator)\b|araba|tren|araç|asansör/i,
  WATER: /\b(water|flooded|underwater|reflection)\b|su|sular|sel|suya|yansıma/i,
  MECHANICAL: /\b(machine|radio|clock|telephone|watch|washing machine)\b|makine|radyo|saat|telefon/i,
  DOMESTIC: /\b(table|receipt|coat|classroom|photograph|cart|cup|tea|kitchen|room)\b|masa|fiş|palto|sınıf|fotoğraf|arabağ|fincan|çay|mutfak|oda/i,
});

export function visualMotifFamiliesForText(text) {
  const value = String(text || "");
  return Object.entries(VISUAL_MOTIF_RULES).filter(([, rule]) => rule.test(value)).map(([family]) => family);
}

export function visualMotifHistoryForState(storyState = {}) {
  // Keep a little more memory than exact-option history: motif cooldown is
  // deliberately family-level and should look back across roughly the last
  // ten-to-twenty committed scenes without becoming a world-state database.
  return Array.isArray(storyState?.recent_visual_motifs) ? storyState.recent_visual_motifs.filter((item) => typeof item === "string").slice(-20) : [];
}

export function defaultDreamPsyche() {
  return {
    dominant_archetypal_field: "shadow",
    secondary_archetypal_field: "child",
    tensions: { confrontation_avoidance: 0.5, control_surrender: 0.5, connection_isolation: 0.5, order_chaos: 0.5 },
    collective_tendency: { curiosity: 0.5, confrontation: 0.5, avoidance: 0.5, control: 0.5, surrender: 0.5 },
    archetypal_pressure: { shadow: 0.35, persona: 0.2, anima_animus: 0.1, self: 0.05, child: 0.15, wise_figure: 0.05, trickster: 0.1, mother_field: 0 },
    compensation_pressure: 0.25,
    recurring_symbols: [],
    active_complexes: [],
    unresolved_motifs: [],
    intent_memory: [],
    recent_option_intents: [],
    recent_pairs: [],
    dream_cycle: { phase: "exposition", age: 0 },
  };
}

export function normalizeDreamPsyche(value) {
  const base = defaultDreamPsyche();
  const source = value && typeof value === "object" ? value : {};
  const symbols = Array.isArray(source.recurring_symbols) ? source.recurring_symbols.map((item) => {
    if (typeof item === "string") return { symbol: item.trim(), first_seen: 0, last_seen: 0, appearances: 1, unresolved: true, earned: false, strength: 0.2 };
    return item && typeof item.symbol === "string" ? {
      symbol: item.symbol.trim().slice(0, 64), first_seen: Math.max(0, Number(item.first_seen) || 0), last_seen: Math.max(0, Number(item.last_seen) || 0),
      appearances: Math.min(20, Math.max(1, Number(item.appearances) || 1)), unresolved: item.unresolved !== false,
      // Legacy persisted symbols had no earned bit. Treat only already
      // repeated legacy entries as earned during migration; new entries must
      // earn status through a meaningful interaction or changed context.
      earned: item.earned === undefined ? Number(item.appearances) >= 2 : item.earned === true, strength: clamp(item.strength, 0.05, 1),
      contexts: boundedList(item.contexts, 3).map((context) => context.slice(0, 80)), last_intent: typeof item.last_intent === "string" ? item.last_intent.slice(0, 32) : null,
    } : null;
  }).filter(Boolean).slice(-6) : [];
  const cycle = source.dream_cycle && typeof source.dream_cycle === "object" ? source.dream_cycle : {};
  return {
    dominant_archetypal_field: ARCHETYPES.includes(source.dominant_archetypal_field) ? source.dominant_archetypal_field : base.dominant_archetypal_field,
    secondary_archetypal_field: ARCHETYPES.includes(source.secondary_archetypal_field) ? source.secondary_archetypal_field : base.secondary_archetypal_field,
    tensions: { ...base.tensions, ...normalizeMap(source.tensions, Object.keys(base.tensions)) },
    collective_tendency: normalizeMap(source.collective_tendency, DIMENSIONS),
    archetypal_pressure: normalizeMap(source.archetypal_pressure, ARCHETYPES, 0.1),
    compensation_pressure: clamp(source.compensation_pressure, 0, 1),
    recurring_symbols: symbols,
    active_complexes: boundedList(source.active_complexes, 4),
    unresolved_motifs: boundedList(source.unresolved_motifs, 4),
    intent_memory: boundedList(source.intent_memory, 8),
    recent_option_intents: boundedList(source.recent_option_intents, 8),
    recent_pairs: boundedList(source.recent_pairs, 12),
    // Keep a bounded cycle counter that still advances after many hours; a
    // hard saturation at 999 would freeze compositional fallback variation.
    dream_cycle: { phase: ["exposition", "development", "culmination", "lysis"].includes(cycle.phase) ? cycle.phase : base.dream_cycle.phase, age: ((Math.floor(Number(cycle.age) || 0) % DREAM_CYCLE_MAX) + DREAM_CYCLE_MAX) % DREAM_CYCLE_MAX },
  };
}

// Match the performed verb before the visual noun. Without this ordering,
// "Tünele gir" could be classified as descend because it contains "tünel",
// and "Kapıdan çık" as enter because it contains "kapı". Intent is a small
// narrative signal, so that ambiguity would distort compensation/tendency.
const intentRules = [
  ["abandon", /\b(leave|abandon)\b|çık|terk|uzaklaş/], ["return", /\b(return)\b|geri dön|dön/],
  ["enter", /\b(enter|inside|gir)\b|içeri|aç/], ["descend", /\b(descend|down|in)\b|aşağı|alt kata|basement/],
  ["ascend", /\b(ascend|up)\b|yukarı|stairs|merdiven/], ["activate", /\b(activate|switch)\b|aktive|çalıştır|başlat/],
  ["listen", /\b(listen|whisper)\b|dinle|fısıltı/], ["inspect", /\b(look|watch|inspect|bak)\b|incele|ayna|mirror/],
  ["touch", /\b(touch)\b|dokun|elini/], ["surrender", /\b(surrender|wait)\b|bekle|teslim/],
  ["hide", /\b(hide|avoid)\b|saklan|kaçın/], ["confront", /\b(confront|face)\b|karşılaş|yüzleş/],
  ["follow", /\b(follow)\b|takip|izle|light|ışık|ses/], ["approach", /\b(approach|near|toward)\b|yaklaş|ilerle|sonuna|git/],
  ["preserve", /\b(preserve)\b|koru|sakla/],
];
export function inferIntent(text) {
  const value = String(text || "").toLowerCase();
  return intentRules.find(([, rule]) => rule.test(value))?.[0] || "observe";
}

function deltaForIntent(intent, text = "") {
  const delta = { curiosity: 0, confrontation: 0, avoidance: 0, control: 0, surrender: 0 };
  if (["inspect", "approach", "follow", "listen", "touch", "observe"].includes(intent)) delta.curiosity = 0.18;
  if (["confront", "activate"].includes(intent)) delta.confrontation = 0.2;
  if (["hide", "abandon"].includes(intent)) delta.avoidance = 0.2;
  if (["activate", "preserve", "enter"].includes(intent)) delta.control = 0.12;
  if (["surrender", "return", "listen"].includes(intent)) delta.surrender = 0.16;
  if (/portal|mirror|light|ışık|rüya|strange|garip/.test(String(text).toLowerCase())) delta.curiosity += 0.05;
  return delta;
}
export const psychologyDeltaForIntent = deltaForIntent;

function dominantDimension(tendency) {
  return DIMENSIONS.slice().sort((a, b) => (tendency[b] || 0) - (tendency[a] || 0))[0];
}

export function updateDreamPsyche(current, option = {}, sceneNumber = 0) {
  const psyche = normalizeDreamPsyche(current);
  const text = option.label_tr || option.option_tr || option.intent || "";
  const intent = option.intent || inferIntent(text);
  const delta = option.psyche_delta && typeof option.psyche_delta === "object" ? option.psyche_delta : deltaForIntent(intent, text);
  const tendency = { ...psyche.collective_tendency };
  for (const key of DIMENSIONS) {
    const target = clamp(0.5 + clamp(delta[key], -0.5, 0.5));
    tendency[key] = clamp(tendency[key] * 0.88 + target * 0.12);
  }
  const recent = [...psyche.intent_memory, intent].slice(-8);
  const repeats = recent.slice(-4).filter((item) => item === intent).length;
  const dominant = dominantDimension(tendency);
  const intentDimension = Object.entries(delta).sort((a, b) => Math.abs(Number(b[1]) || 0) - Math.abs(Number(a[1]) || 0))[0]?.[0];
  const compensationBump = repeats >= 3 ? 0.1 : (dominant === intentDimension ? 0.03 : 0.01);
  const compensation = clamp(psyche.compensation_pressure * 0.92 + compensationBump);
  const tensions = updateTensions(psyche.tensions, intent, text);
  const pressure = { ...psyche.archetypal_pressure };
  const archetype = intent === "confront" || intent === "activate" ? "shadow" : intent === "surrender" || intent === "listen" ? "wise_figure" : intent === "inspect" || intent === "approach" ? "child" : intent === "hide" ? "persona" : "trickster";
  // Keep a small resting pressure for every field. Without this floor, the
  // first few intents permanently erase all other archetypal directions.
  // The selected field still rises, but later audience choices can recover a
  // different direction instead of inheriting a saturated mode forever.
  for (const key of ARCHETYPES) {
    const target = key === archetype ? 0.24 : ARCHETYPE_RESTING_PRESSURE;
    pressure[key] = clamp(pressure[key] * 0.88 + target * 0.12);
  }
  const sorted = ARCHETYPES.slice().sort((a, b) => pressure[b] - pressure[a]);
  const symbols = updateSymbols(psyche.recurring_symbols, option, sceneNumber);
  const complexKey = `${intent}_complex`;
  const activeComplexes = repeats >= 3 && !psyche.active_complexes.includes(complexKey) ? [...psyche.active_complexes, complexKey].slice(-4) : psyche.active_complexes;
  const unresolvedMotifs = repeats >= 3 && !psyche.unresolved_motifs.includes(complexKey) ? [...psyche.unresolved_motifs, complexKey].slice(-4) : psyche.unresolved_motifs;
  const phase = sceneNumber % 16 >= 12 ? "lysis" : sceneNumber % 16 >= 8 ? "culmination" : sceneNumber % 16 >= 3 ? "development" : "exposition";
  return normalizeDreamPsyche({ ...psyche, tensions, collective_tendency: tendency, compensation_pressure: compensation, archetypal_pressure: pressure, dominant_archetypal_field: sorted[0], secondary_archetypal_field: sorted[1], intent_memory: recent, recurring_symbols: symbols, active_complexes: activeComplexes, unresolved_motifs: unresolvedMotifs, dream_cycle: { phase, age: psyche.dream_cycle.age + 1 } });
}

function updateTensions(current, intent, text = "") {
  const next = { ...defaultDreamPsyche().tensions, ...(current || {}) };
  const value = String(text || "").toLowerCase();
  const targets = {
    // The viewer-facing confrontation/avoidance axis must also reflect the
    // ordinary movement choices that make up most live rounds. Approaching,
    // entering or following the unknown is a gentle confrontation; listening,
    // observing or surrendering is a gentle retreat. Explicit confront/hide
    // actions remain the strong ends of the same bounded axis.
    confrontation_avoidance: ["confront", "activate"].includes(intent) ? 0.9 : ["hide", "abandon"].includes(intent) ? 0.1 : ["approach", "follow", "enter", "touch", "inspect"].includes(intent) ? 0.62 : ["listen", "surrender", "observe", "return", "preserve"].includes(intent) ? 0.42 : 0.5,
    control_surrender: ["activate", "enter", "preserve"].includes(intent) ? 0.82 : ["surrender", "listen", "return"].includes(intent) ? 0.18 : 0.5,
    connection_isolation: ["follow", "listen", "approach"].includes(intent) ? 0.72 : ["hide", "abandon"].includes(intent) ? 0.22 : 0.5,
    order_chaos: /portal|mirror|strange|garip|rüya/.test(value) || intent === "observe" ? 0.74 : ["preserve", "control"].includes(intent) ? 0.28 : 0.5,
  };
  for (const key of Object.keys(targets)) next[key] = clamp(next[key] * 0.88 + targets[key] * 0.12);
  return next;
}

function updateSymbols(existing, option, sceneNumber) {
  const anchors = Array.isArray(option.scene_anchors) ? option.scene_anchors : [];
  const source = [...anchors, ...(Array.isArray(option.symbol_delta) ? option.symbol_delta : [])].filter((item) => typeof item === "string");
  const symbolic = source.find((item) => /mirror|portal|light|lantern|machine|door|water|bridge|tree|child|voice|fısıltı|ayna|ışık|kapı|su|köprü/i.test(item));
  const next = existing.map((item) => ({ ...item, strength: clamp(item.strength * 0.96), unresolved: item.unresolved !== false, earned: item.earned === true }));
  if (!symbolic) return next.filter((item) => item.strength > 0.12).slice(-6);
  const key = symbolic.trim().toLowerCase();
  const context = String(option.context || option.current_location || "").trim().slice(0, 80);
  const intent = String(option.intent || inferIntent(option.label_tr || "")).slice(0, 32);
  // A generic SDXL/Qwen trope is not automatically a Jungian symbol. It earns
  // recurring status only after a meaningful relationship/decision (or an
  // explicit symbol delta) is present. Mere visual reappearance stays weak.
  const meaningful = ["inspect", "activate", "confront", "listen", "touch", "preserve", "observe", "hide", "return", "surrender"].includes(intent);
  const found = next.find((item) => item.symbol.toLowerCase() === key);
  if (found) {
    const priorContexts = Array.isArray(found.contexts) ? found.contexts : [];
    found.last_seen = sceneNumber; found.appearances += 1; found.strength = clamp(found.strength + 0.12);
    found.contexts = [...(found.contexts || []), context].filter(Boolean).slice(-3); found.last_intent = intent || found.last_intent || null;
    if (meaningful || (context && priorContexts.some((item) => item && item !== context))) found.earned = true;
  } else next.push({ symbol: symbolic.trim().slice(0, 64), first_seen: sceneNumber, last_seen: sceneNumber, appearances: 1, unresolved: true, earned: meaningful, strength: meaningful ? 0.45 : 0.18, contexts: context ? [context] : [], last_intent: intent || null });
  return next.slice(-6);
}

export function jungAwareFallbackOptions({ storyState, psyche, fallbackFactory, previousOptions = [] }) {
  const normalized = normalizeDreamPsyche(psyche);
  const story = storyState && typeof storyState === "object" ? storyState : {};
  let options = fallbackFactory(previousOptions, Math.random, storyState);
  const seenPairs = new Set(normalized.recent_pairs.map((pair) => String(pair).toLowerCase()));
  const recentIntents = normalized.recent_option_intents;
  const motifHistory = visualMotifHistoryForState(storyState);
  const motifCounts = motifHistory.reduce((map, family) => map.set(family, (map.get(family) || 0) + 1), new Map());
  const visualNoveltyPenalty = (candidate) => {
    // Preserve the established first-round fallback/archetype behavior. The
    // novelty layer becomes meaningful only after committed visual history
    // exists; without it there is no evidence that a motif is repetitive.
    if (motifHistory.length === 0) return 0;
    const text = [candidate?.option_1_result_prompt_en, candidate?.option_2_result_prompt_en, ...(candidate?.option_1_scene_anchors || []), ...(candidate?.option_2_scene_anchors || [])].join(" ");
    const families = visualMotifFamiliesForText(text);
    const repeated = families.reduce((sum, family) => sum + ((motifCounts.get(family) || 0) >= 2 ? 7 : (motifCounts.get(family) || 0)), 0);
    const routeCluster = (families.includes("THRESHOLD") || families.includes("PASSAGE")) && (families.includes("LIGHT_EFFECT") || families.includes("ATMOSPHERIC")) ? 5 : 0;
    const intents = [candidate?.option_1_intent || inferIntent(candidate?.option_1_tr), candidate?.option_2_intent || inferIntent(candidate?.option_2_tr)];
    const nonNavigation = intents.filter((intent) => ["inspect", "listen", "observe", "preserve", "touch", "activate", "surrender"].includes(intent)).length;
    return repeated + routeCluster - nonNavigation;
  };
  const rememberedSymbol = normalized.recurring_symbols
    .filter((item) => item && item.earned === true && item.appearances >= 2 && item.last_intent)
    .sort((a, b) => Number(b.last_seen || 0) - Number(a.last_seen || 0))[0];
  const preference = (intent, forCounterpoint = false) => {
    const tendency = normalized.collective_tendency;
    const tension = normalized.tensions;
    const dominant = dominantDimension(tendency);
    if (!forCounterpoint) return recentIntents.slice(-4).filter((item) => item === intent).length;
    const desired = tension.confrontation_avoidance > 0.62 || dominant === "confrontation" ? ["inspect", "listen", "surrender", "abandon", "observe"] : tension.confrontation_avoidance < 0.38 || dominant === "avoidance" ? ["approach", "enter", "follow", "confront"] : tension.control_surrender > 0.62 || dominant === "control" ? ["surrender", "listen", "observe", "return"] : tension.control_surrender < 0.38 || dominant === "surrender" ? ["activate", "enter", "approach"] : ["inspect", "follow", "listen", "observe"];
    const archetypalCounterpoint = {
      shadow: ["inspect", "listen", "surrender", "preserve"], persona: ["approach", "listen", "touch"],
      anima_animus: ["follow", "listen", "approach"], self: ["preserve", "return", "surrender"],
      child: ["follow", "approach", "enter"], wise_figure: ["listen", "surrender", "return"],
      trickster: ["observe", "approach", "enter"], mother_field: ["preserve", "listen", "return"],
    }[normalized.dominant_archetypal_field] || [];
    // When a motif returns, avoid handling it with exactly the same gesture
    // as its last appearance. This changes the relationship to the symbol,
    // not the required result-state or its renderability constraints.
    if (forCounterpoint && rememberedSymbol?.last_intent === intent) return 2;
    if (forCounterpoint && recentIntents.slice(-4).filter((item) => item === intent).length >= 2) return 1;
    if (archetypalCounterpoint.includes(intent)) return 0;
    return desired.includes(intent) ? 0 : (normalized.compensation_pressure > 0.5 ? 2 : 1);
  };
  let bestScore = Number.POSITIVE_INFINITY;
  let bestOptions = options;
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const pair = `${options.option_1_tr}|${options.option_2_tr}`.toLowerCase();
    const intent1 = inferIntent(options.option_1_tr);
    const intent2 = inferIntent(options.option_2_tr);
    const sameIntentPenalty = intent1 === intent2 ? 6 : 0;
    const counterpointSafe = ["inspect", "listen", "surrender", "preserve", "observe"];
    const counterpointPressure = normalized.tensions.confrontation_avoidance > 0.62 || dominantDimension(normalized.collective_tendency) === "confrontation";
    const counterpointPenalty = counterpointPressure && !counterpointSafe.includes(intent2) ? 20 : 0;
    const repetitionPenalty = (preference(intent1) + preference(intent2)) * 3 + (preference(intent2, true));
    const score = (seenPairs.has(pair) ? 100 : 0) + sameIntentPenalty + counterpointPenalty + repetitionPenalty + visualNoveltyPenalty(options);
    if (score < bestScore) { bestScore = score; bestOptions = options; }
    if (!seenPairs.has(pair) && score <= 1) break;
    options = fallbackFactory(previousOptions, Math.random, storyState);
  }
  options = bestOptions;
  options = contextualizeFallback(options, story, normalized, previousOptions);
  const firstIntent = options.option_1_intent || inferIntent(options.option_1_tr);
  let secondIntent = options.option_2_intent || inferIntent(options.option_2_tr);
  if (secondIntent === firstIntent) secondIntent = normalized.compensation_pressure > 0.5 ? "surrender" : "inspect";
  // Keep the counterpoint meaning genuinely non-confrontational when the
  // bounded collective pressure is saturated.  The physical option remains
  // grounded; only its Jung intent metadata is corrected.
  if ((normalized.tensions.confrontation_avoidance > 0.62 || dominantDimension(normalized.collective_tendency) === "confrontation") && !["inspect", "listen", "surrender", "preserve", "observe"].includes(secondIntent)) secondIntent = "observe";
  const decorate = (index, intent, role) => ({
    [`option_${index}_intent`]: intent,
    [`option_${index}_psyche_delta`]: deltaForIntent(intent, options[`option_${index}_tr`]),
    [`option_${index}_symbol_delta`]: options[`option_${index}_scene_anchors`] || [],
    [`option_${index}_archetypal_role`]: role,
  });
  return { ...options, ...decorate(1, firstIntent, "continuation"), ...decorate(2, secondIntent, "counterpoint") };
}

// Compose a small amount of scene-specific language around the safe fallback
// grammar. This keeps the fallback finite and safe while making the dream feel
// like one remembered world instead of a fixed phrase catalogue.
function contextualizeFallback(options, storyState, psyche, previousOptions) {
  const story = storyState && typeof storyState === "object" ? storyState : {};
  const anchors = Array.isArray(story.scene_anchors) ? story.scene_anchors.map((item) => typeof item === "string" ? item : item?.text).filter(Boolean) : [];
  const age = Number(psyche.dream_cycle?.age || 0);
  const symbols = psyche.recurring_symbols
    .filter((item) => item && item.earned === true && item.appearances >= 2 && age - Number(item.last_seen || 0) >= 3)
    .map((item) => item.symbol)
    .filter(Boolean);
  const objects = Array.isArray(story.important_objects) ? story.important_objects : [];
  // Open hooks guide Qwen, but unresolved hooks must not be injected into every
  // fallback image; otherwise one old doorway can lock the whole visual world.
  // The active location is the only automatic continuity context. Recurring
  // symbols may return in the result sentence, but are not silently renewed as
  // scene anchors unless the candidate explicitly proposes them.
  const activeContext = String(story.current_location || anchors.at(-1) || objects.at(-1) || "the current atmosphere");
  const previous = new Set(previousOptions.map((item) => String(item).toLowerCase()));
  const trWords = { bridge: "köprü", tunnel: "tünel", corridor: "koridor", room: "oda", house: "ev", door: "kapı", doorway: "kapı", window: "pencere", stairs: "merdiven", staircase: "merdiven", stairwell: "merdiven", car: "araba", forest: "orman", path: "yol", portal: "portal", mirror: "ayna", light: "ışık", glowing: "parıltı", glow: "parıltı", luminous: "parıltı", world: "dünya", lantern: "fener", water: "su", flooded: "su", rain: "yağmur", fog: "sis", machine: "makine", tree: "ağaç", orb: "küre", station: "istasyon", landscape: "manzara", shadowy: "gölge", crimson: "kızıl", silver: "gümüş", reflective: "yansıma", dark: "karanlık" };
  const stopWords = new Set(["a", "an", "the", "same", "current", "strange", "unknown", "environment", "beyond", "near", "of", "on", "in", "and", "with", "visible", "long", "dim", "dark", "clear", "large"]);
  const visualPriority = ["portal", "mirror", "light", "lantern", "machine", "water", "flooded", "bridge", "door", "doorway", "window", "tree", "orb", "car", "tunnel", "corridor", "stairs", "staircase", "stairwell", "forest", "path", "room", "house", "luminous", "world", "rain", "fog", "crimson", "shadowy", "silver", "reflective", "dark", "landscape"];
  const visualTokens = (value) => {
    const tokens = String(value || "").toLowerCase().replaceAll("_", " ").split(/[^a-zçğıöşü]+/).filter((word) => word && !stopWords.has(word) && trWords[word]);
    const chosen = visualPriority.find((word) => tokens.includes(word)) || tokens[0];
    return chosen ? [chosen] : [];
  };
  const toTr = (value) => visualTokens(value).map((word) => trWords[word]).join(" ") || "mevcut atmosfer";
  const toTrPossessive = (value) => {
    const root = toTr(value);
    const forms = { "köprü": "köprünün", "tünel": "tünelin", "koridor": "koridorun", "oda": "odanın", "ev": "evin", "kapı": "kapının", "pencere": "pencerenin", "merdiven": "merdivenin", "araba": "arabanın", "orman": "ormanın", "yol": "yolun", "portal": "portalın", "ayna": "aynanın", "ışık": "ışığın", "parıltı": "parıltının", "dünya": "dünyanın", "fener": "fenerin", "su": "suyun", "sis": "sisin", "yağmur": "yağmurun", "kızıl": "kızıl gökyüzünün", "manzara": "manzaranın", "ağaç": "ağacın", "küre": "kürelerin", "makine": "makinenin", "istasyon": "istasyonun", "sokak": "sokağın", "gölge": "gölgenin", "yansıma": "yansımanın", "karanlık": "karanlığın", "mevcut atmosfer": "mevcut atmosferin" };
    return forms[root] || `${root}n`;
  };
  const toEn = (value) => {
    const token = visualTokens(value)[0];
    const phrases = { luminous: "luminous world", glowing: "glowing light", glow: "glowing light", shadowy: "shadowy setting", reflective: "reflective water", flooded: "flooded room", water: "still reflective water", dark: "dark setting", crimson: "crimson sky", silver: "silver haze" };
    return (token && (phrases[token] || token)) || "the current atmosphere";
  };
  const decorate = (index, role) => {
    const baseTr = String(options[`option_${index}_tr`] || "").trim();
    const baseEn = String(options[`option_${index}_en`] || "").trim();
    // Keep the route grounded in the active location, but let the displayed
    // relationship phrase occasionally orbit a bounded anchor/object/motif.
    // This makes memory perceptible without forcing an obsolete composition
    // back into the result-state prompt.
    const focusPool = [...anchors, ...objects, ...symbols].filter(Boolean);
    const meaningfulContext = (value) => !/^(the )?(current|existing|present) atmosphere$/i.test(String(value || "").trim()) && !/mevcut atmosfer/i.test(String(value || ""));
    const context = focusPool.length ? focusPool[(age + index - 1) % focusPool.length] : activeContext;
    const contextRoot = toTr(context);
    const trContextPossessive = toTrPossessive(context);
    const enContext = toEn(context);
    const activeEnContext = toEn(activeContext);
    const suffixes = role === "continuation"
      ? [`— ${trContextPossessive} eşiğinde`, `— ${trContextPossessive} içinden`, `— ${trContextPossessive} gölgesinde`, `— ${trContextPossessive} kıyısında`, `— ${trContextPossessive} yankısına doğru`, `— ${trContextPossessive} ardında`, `— ${trContextPossessive} ışığında`, `— ${trContextPossessive} sessizliğinde`, `— ${trContextPossessive} uzağında`, `— ${trContextPossessive} ardından`, `— ${trContextPossessive} çevresinde`, `— ${trContextPossessive} altında`, `— ${trContextPossessive} ötesinde`, `— ${trContextPossessive} karşısında`, `— ${trContextPossessive} içinde`]
      : [`— ${trContextPossessive} yankısında`, `— ${trContextPossessive} karşısında`, `— ${trContextPossessive} sessizliğinde`, `— ${trContextPossessive} eşiğinde`, `— ${trContextPossessive} kıyısında`, `— ${trContextPossessive} yankısına doğru`, `— ${trContextPossessive} ardında`, `— ${trContextPossessive} ışığında`, `— ${trContextPossessive} içinden`, `— ${trContextPossessive} uzağında`, `— ${trContextPossessive} ardından`, `— ${trContextPossessive} çevresinde`, `— ${trContextPossessive} altında`, `— ${trContextPossessive} ötesinde`, `— ${trContextPossessive} içinde`];
    if (/yol|koridor|köprü|tünel|orman/.test(contextRoot)) suffixes.splice(8, 0, `— ${trContextPossessive} boyunca`);
    // A suffix is optional context, not the content of the choice. The old
    // fallback appended phrases such as “mevcut atmosferin kıyısında” to
    // every row, which read like a small catalogue and obscured the actual
    // action. Only add a relation when a concrete anchor/object exists and
    // rotate it sparsely; otherwise keep the short poetic base label.
    const genericContext = /^(the )?(current atmosphere|existing atmosphere|present atmosphere)$/i.test(String(enContext).trim()) || /mevcut atmosfer/i.test(String(context));
    const concreteContext = !genericContext && meaningfulContext(context);
    const suffix = suffixes[(age + index) % suffixes.length];
    const composedTr = concreteContext && ((age + index) % 3 === 0) ? `${baseTr} ${suffix}`.trim() : baseTr;
    if (!previous.has(composedTr.toLowerCase()) || previous.has(baseTr.toLowerCase())) options[`option_${index}_tr`] = composedTr;
    options[`option_${index}_intent`] = inferIntent(baseTr);
    const relation = role === "continuation" ? "toward" : "against";
    const enContextWithArticle = /^(the|a|an)\b/i.test(enContext) ? enContext : `the ${enContext}`;
    options[`option_${index}_en`] = `${baseEn} — ${relation} ${enContextWithArticle}`.trim();
    const baseResult = String(options[`option_${index}_result_prompt_en`] || "").trim();
    const continuitySubject = activeEnContext.startsWith("the ") ? activeEnContext.slice(4) : activeEnContext;
    const currentVisualTerms = visualTokens(activeContext);
    const resultVisualTerms = visualTokens(baseResult);
    const locationTerms = new Set(["room", "building", "corridor", "door", "window", "stairs", "bridge", "tunnel", "station", "car", "train", "elevator", "forest", "shore", "beach", "desert", "mountain", "path", "house", "world", "landscape"]);
    const resultChangesLocation = resultVisualTerms.some((term) => locationTerms.has(term)) && !resultVisualTerms.some((term) => currentVisualTerms.includes(term));
    // A location-changing result must not be followed by a sentence that
    // tells SDXL to keep the old location; that creates an avoidable scene lock.
    // Do not carry an architectural phrase ("same corridor/window/door")
    // into every object or atmosphere result. The bounded story anchors retain
    // continuity; repeating this sentence made stale visual baggage dominate
    // otherwise different situations.
    const objectOrAtmosphereResult = resultVisualTerms.some((term) => ["radio", "watch", "telephone", "receipt", "photograph", "tea", "cup", "fog", "rain", "snow", "light", "glow", "water"].includes(term));
    const continuitySentence = resultChangesLocation || resultVisualTerms.some((term) => currentVisualTerms.includes(term)) || objectOrAtmosphereResult ? "" : ` The same ${continuitySubject} remains part of the scene.`;
    const familiarSymbol = symbols.length ? toEn(symbols[(age + index) % symbols.length]) : "";
    const familiarSubject = /^(the |a )/.test(familiarSymbol) ? familiarSymbol.replace(/^(the |a )/, "") : familiarSymbol;
    const familiarPhrase = /^(light|water|fog|rain|glow|shadow|atmosphere)/i.test(familiarSubject) ? `${familiarSubject} motif` : familiarSubject;
    const symbolic = role === "counterpoint" && familiarPhrase ? ` A familiar ${familiarPhrase} returns.` : "";
    const cleanResult = baseResult.replace(/[.!?]+\s*$/, "");
    const baseWithPunctuation = cleanResult ? `${cleanResult}.` : "";
    let composedResult = `${baseWithPunctuation}${continuitySentence}`;
    const resultBudget = composedResult.split(/\s+/).filter(Boolean).length;
    if (symbolic && resultBudget + symbolic.split(/\s+/).filter(Boolean).length <= 24) composedResult += symbolic;
    const words = composedResult.split(/\s+/).filter(Boolean);
    options[`option_${index}_result_prompt_en`] = words.slice(0, 24).join(" ");
    if (options[`option_${index}_result_prompt_en`] && !/[.!?]$/.test(options[`option_${index}_result_prompt_en`])) options[`option_${index}_result_prompt_en`] += ".";
    const currentAnchors = Array.isArray(options[`option_${index}_scene_anchors`]) ? options[`option_${index}_scene_anchors`] : [];
    options[`option_${index}_scene_anchors`] = [...new Set(currentAnchors)].slice(-3);
    options[`option_${index}_state_patch`] = { ...(options[`option_${index}_state_patch`] || {}), scene_anchors: options[`option_${index}_scene_anchors`] };
  };
  decorate(1, "continuation");
  decorate(2, "counterpoint");
  return options;
}

export function rememberOptionPair(psyche, options) {
  const current = normalizeDreamPsyche(psyche);
  const pair = `${options?.option_1_tr || ""}|${options?.option_2_tr || ""}`.toLowerCase();
  const intents = [inferIntent(options?.option_1_tr), inferIntent(options?.option_2_tr)].filter(Boolean);
  return normalizeDreamPsyche({ ...current, recent_option_intents: [...current.recent_option_intents, ...intents].slice(-8), recent_pairs: pair === "|" ? current.recent_pairs : [...current.recent_pairs, pair].slice(-12) });
}

// Return at most one recently recurring visual motif for the image prompt.
// This is intentionally a hint, not a second scene: the selected result-state
// remains primary and stale/weak symbols are left out so they cannot lock the
// composition to an obsolete location.
export function recurringMotifForPrompt(psyche, resultPrompt = "", sceneNumber = 0) {
  const normalized = normalizeDreamPsyche(psyche);
  const currentScene = Math.max(0, Number(sceneNumber) || 0);
  const result = String(resultPrompt || "").toLowerCase();
  const stop = new Set(["a", "an", "the", "and", "with", "from", "near", "same", "strange", "large", "clear", "dark", "room"]);
  const candidates = normalized.recurring_symbols
    .filter((item) => item.earned === true && item.appearances >= 2 && item.strength >= 0.24 && (currentScene === 0 || (item.last_seen >= currentScene - 12 && currentScene - item.last_seen >= 3)))
    .filter((item) => {
      const words = String(item.symbol || "").toLowerCase().match(/[a-zçğıöşü]{4,}/g) || [];
      return !words.some((word) => !stop.has(word) && result.includes(word));
    })
    .sort((a, b) => (b.strength * 0.7 + b.appearances * 0.03) - (a.strength * 0.7 + a.appearances * 0.03));
  return candidates[0]?.symbol || "";
}

export function buildJungCandidateDirections({ storyState, psyche, fallbackFactory, previousOptions = [] }) {
  const value = jungAwareFallbackOptions({ storyState, psyche, fallbackFactory, previousOptions });
  return [1, 2].map((index) => ({ tr: value[`option_${index}_tr`], intent: value[`option_${index}_intent`], role: value[`option_${index}_archetypal_role`], result: value[`option_${index}_result_prompt_en`], anchors: value[`option_${index}_scene_anchors`] }));
}

export { ARCHETYPES, DIMENSIONS };
