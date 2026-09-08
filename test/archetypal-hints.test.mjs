import test from "node:test";
import assert from "node:assert/strict";
import { buildArchetypalVisualHint } from "../app/lib/jungian-dream-engine.mjs";

const pressure = (name, value = 0.95) => ({ archetype: name, archetypePressure: value, sceneNumber: 17 });

test("shadow uses an existing figure/light affordance", () => {
  const result = buildArchetypalVisualHint({ ...pressure("shadow"), manifest: { location: "front_path", entities: ["figür", "ışık"] }, visibleConsequence: "The figure is now visible." });
  assert.equal(result?.applied, true);
  assert.match(result.hint, /existing figure|existing light/i);
});

test("unsupported shadow scene returns no hint", () => {
  const result = buildArchetypalVisualHint({ ...pressure("shadow"), manifest: { location: "empty_field", entities: [] }, visibleConsequence: "The ground is unchanged." });
  assert.notEqual(result?.applied, true);
  assert.equal(result?.reason, "no_grounded_affordance");
});

test("persona uses reflection and never invents a mask", () => {
  const result = buildArchetypalVisualHint({ ...pressure("persona"), manifest: { location: "hallway", entities: ["pencere", "figür"] }, visibleConsequence: "The figure remains by the window." });
  assert.equal(result?.applied, true);
  assert.doesNotMatch(result.hint, /mask/i);
});

test("wise figure requires an existing figure", () => {
  const result = buildArchetypalVisualHint({ ...pressure("wise_figure"), manifest: { location: "room", entities: ["masa"] }, visibleConsequence: "The room is quiet." });
  assert.notEqual(result?.applied, true);
});

test("trickster stays on an existing machine", () => {
  const result = buildArchetypalVisualHint({ ...pressure("trickster"), manifest: { location: "machine_room", entities: ["makine"] }, visibleConsequence: "The machine is now running." });
  assert.equal(result?.applied, true);
  assert.doesNotMatch(result.hint, /portal|new object|vehicle/i);
});

test("result-state conflict rejects a contradictory hint", () => {
  const result = buildArchetypalVisualHint({ ...pressure("shadow"), manifest: { location: "front_path", entities: ["figür", "ışık"] }, visibleConsequence: "The figure is now hidden." });
  assert.notEqual(result?.reason, "applied");
});
