import { writeFile } from "node:fs/promises";
import { applyStatePatch, defaultStoryState, fallbackOptions, optionMeta } from "../app/lib/options.mjs";
import { defaultDreamPsyche, jungAwareFallbackOptions, rememberOptionPair, updateDreamPsyche } from "../app/lib/jungian-dream-engine.mjs";

const makeRandom = (initial) => {
  let state = initial >>> 0;
  return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; };
};

async function runPath(name, seed, choose) {
  const previousRandom = Math.random;
  Math.random = makeRandom(seed);
  let story = defaultStoryState();
  let psyche = defaultDreamPsyche();
  let previous = [];
  const rows = [];
  for (let turn = 1; turn <= 24; turn += 1) {
    const options = jungAwareFallbackOptions({ storyState: story, psyche, fallbackFactory: fallbackOptions, previousOptions: previous });
    const winner = choose(turn, options);
    const winnerMeta = optionMeta(options, winner);
    const winnerLabel = options[`option_${winner}_tr`];
    const nextPsyche = rememberOptionPair(updateDreamPsyche(psyche, {
      label_tr: winnerLabel,
      intent: winnerMeta.intent,
      psyche_delta: winnerMeta.psycheDelta,
      scene_anchors: winnerMeta.sceneAnchors,
      symbol_delta: winnerMeta.symbolDelta,
      context: story.current_location,
    }, turn), options);
    story = applyStatePatch(story, winnerMeta.statePatch);
    story.recent_options = [...new Set([...story.recent_options, options.option_1_tr, options.option_2_tr])].slice(-8);
    previous = story.recent_options.slice(-8);
    rows.push({
      turn,
      from: rows.at(-1)?.to || "strange_room",
      to: story.current_location,
      winner,
      role: options[`option_${winner}_archetypal_role`],
      label: winnerLabel,
      intent: winnerMeta.intent,
      symbol: nextPsyche.recurring_symbols.at(-1)?.symbol || null,
      archetype: nextPsyche.dominant_archetypal_field,
      curiosity: Number(nextPsyche.collective_tendency.curiosity.toFixed(3)),
      confrontation: Number(nextPsyche.collective_tendency.confrontation.toFixed(3)),
      avoidance: Number(nextPsyche.collective_tendency.avoidance.toFixed(3)),
      compensation: Number(nextPsyche.compensation_pressure.toFixed(3)),
      confrontationAvoidance: Number(nextPsyche.tensions.confrontation_avoidance.toFixed(3)),
      controlSurrender: Number(nextPsyche.tensions.control_surrender.toFixed(3)),
    });
    psyche = nextPsyche;
  }
  Math.random = previousRandom;
  return { name, rows, story, psyche };
}

const continuation = await runPath("CONTINUATION AĞIRLIKLI", 0xa11ce, () => "1");
const counterpoint = await runPath("KARŞITLIK AĞIRLIKLI", 0xc0ffee, () => "2");
const summarize = (path) => ({
  turns: path.rows.length,
  locations: [...new Set(path.rows.map((row) => row.to))],
  locationCount: new Set(path.rows.map((row) => row.to)).size,
  intents: [...new Set(path.rows.map((row) => row.intent))],
  symbols: [...new Set(path.rows.map((row) => row.symbol).filter(Boolean))],
  archetypes: [...new Set(path.rows.map((row) => row.archetype))],
  finalTendency: path.rows.at(-1) && { curiosity: path.rows.at(-1).curiosity, confrontation: path.rows.at(-1).confrontation, avoidance: path.rows.at(-1).avoidance },
  finalTensions: path.rows.at(-1) && { confrontationAvoidance: path.rows.at(-1).confrontationAvoidance, controlSurrender: path.rows.at(-1).controlSurrender },
  finalCompensation: path.rows.at(-1)?.compensation,
});
const md = [
  "# Collective Choice Path Divergence",
  "",
  "> Same bounded dream engine and starting state; only the audience's repeated choice policy differs. This is a product-behavior trace, not a psychological measurement.",
  "",
  "## Summary",
  "",
  "| Path | Unique locations | Intents | Symbols | Archetypal fields | Final curiosity | Final confrontation | Final compensation |",
  "|---|---:|---|---|---|---:|---:|---:|",
  ...[continuation, counterpoint].map((path) => { const s = summarize(path); return `| ${path.name} | ${s.locationCount} | ${s.intents.join(", ")} | ${s.symbols.join(", ") || "none"} | ${s.archetypes.join(" → ")} | ${s.finalTendency.curiosity} | ${s.finalTendency.confrontation} | ${s.finalCompensation} |`; }),
  "",
  "## Divergence evidence",
  "",
  "The two runs begin with the same `strange_room` state but finish with different location sets, symbol memories, archetypal fields, tension values and compensation pressure. This is the observable mechanism behind collective choice shaping one bounded dream mind.",
  "",
  ...[continuation, counterpoint].map((path) => [
    `### ${path.name}`,
    "",
    ...path.rows.map((row) => `- ${row.turn}. ${row.from} → ${row.to}; ${row.role}; “${row.label}”; intent=${row.intent}; symbol=${row.symbol || "none"}; archetype=${row.archetype}; curiosity=${row.curiosity}; compensation=${row.compensation}`),
    "",
  ].join("\n")),
].join("\n");
await writeFile(new URL("./JUNGIAN_PATH_DIVERGENCE.md", import.meta.url), md, "utf8");
console.log(JSON.stringify({ continuation: summarize(continuation), counterpoint: summarize(counterpoint), output: "benchmark/JUNGIAN_PATH_DIVERGENCE.md" }, null, 2));
