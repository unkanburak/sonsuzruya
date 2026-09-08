// Reusable scene-matched option templates. These are not scene scripts: each
// template is activated only when its required physical tag is present.
export const OPTION_LIBRARY = [
  ["light_follow", "Parıltıyı takip et", "Follow the light", "observation", "follow", ["light"], ["glow"], "scene_local", "The established light now leads the eye across the scene"],
  ["light_examine", "Işığın kaynağını incele", "Examine the light source", "reveal", "inspect", ["light"], ["glow"], "scene_local", "The established light source is now clearly revealed"],
  ["shadow_watch", "Gölgeyi izle", "Watch the shadow", "observation", "observe", ["shadow"], ["figure"], "scene_local", "The established shadow now stretches across the scene"],
  ["shadow_trace", "Gölgenin izini sür", "Trace the shadow", "reveal", "follow", ["shadow"], [], "scene_local", "The shadow now points toward a hidden detail"],
  ["sound_listen", "Sesi dinle", "Listen to the sound", "observation", "listen", ["sound"], ["echo"], "scene_local", "The established sound is now coming from nearby"],
  ["echo_follow", "Yankıyı takip et", "Follow the echo", "movement", "follow", ["echo"], ["sound"], "scene_local", "The echo now answers from deeper in the scene"],
  ["trace_examine", "İzi incele", "Examine the trace", "reveal", "inspect", ["trace"], ["mark"], "scene_local", "The established trace now reveals a clear direction"],
  ["crack_examine", "Çatlağı incele", "Examine the crack", "reveal", "inspect", ["crack"], ["path"], "scene_local", "The established crack now opens a narrow line"],
  ["detail_examine", "Ayrıntıyı incele", "Examine the detail", "observation", "inspect", ["detail"], [], "scene_local", "A small established detail is now sharply visible"],
  ["door_approach", "Kapıya yaklaş", "Approach the door", "movement", "approach", ["door"], [], "scene_local", "The established door is now directly before the figure"],
  ["door_listen", "Kapının ardını dinle", "Listen beyond the door", "observation", "listen", ["door"], [], "scene_local", "A quiet sound is now audible beyond the established door"],
  ["door_open", "Kapıyı arala", "Open the door slightly", "interaction", "interact", ["door"], [], "scene_local", "The established door is now slightly open"],
  ["window_look", "Pencereden bak", "Look through the window", "observation", "observe", ["window"], [], "scene_local", "The window now reflects a changed part of the scene"],
  ["window_touch", "Pencereye dokun", "Touch the window", "interaction", "interact", ["window"], [], "scene_local", "The established window now carries a faint handprint"],
  ["stairs_descend", "Merdivenden in", "Go down the stairs", "movement", "descend", ["stairs"], [], "scene_local", "The figure is now lower on the established stairs"],
  ["stairs_watch", "Basamakları izle", "Watch the steps", "observation", "observe", ["stairs"], [], "scene_local", "The established steps now disappear into shadow"],
  ["path_continue", "Yolda ilerle", "Continue along the path", "movement", "move", ["path"], [], "scene_local", "The figure is now farther along the established path"],
  ["path_crack", "Yolun çatlağını izle", "Follow the path crack", "reveal", "follow", ["path"], ["crack"], "scene_local", "The path crack now forms a visible direction"],
  ["street_cross", "Sokağı takip et", "Follow the street", "movement", "move", ["street"], ["road"], "scene_local", "The figure is now farther along the established street"],
  ["bridge_cross", "Köprüden geç", "Cross the bridge", "movement", "cross", ["bridge"], [], "scene_local", "The figure is now beyond the established bridge"],
  ["bridge_edge", "Köprünün kenarına ilerle", "Move to the bridge edge", "movement", "approach", ["bridge"], [], "scene_local", "The figure is now at the bridge edge"],
  ["figure_approach", "Figüre yaklaş", "Approach the figure", "figure", "approach", ["figure"], [], "scene_local", "The anonymous figure is now closer in the scene"],
  ["figure_watch", "Figürü izle", "Watch the figure", "figure", "observe", ["figure"], [], "scene_local", "The anonymous figure now turns slightly away"],
  ["figure_shadow", "Figürün gölgesini izle", "Watch the figure shadow", "figure", "follow", ["figure"], ["shadow"], "scene_local", "The anonymous figure shadow now reaches across the scene"],
  ["figure_avoid", "Figürden uzaklaş", "Move away from the figure", "figure", "avoid", ["figure"], [], "scene_local", "The anonymous figure is now farther away"],
  ["radio_listen", "Radyoyu dinle", "Listen to the radio", "interaction", "listen", ["radio"], [], "scene_local", "The established radio is now quietly playing"],
  ["radio_turn", "Radyoyu sustur", "Silence the radio", "interaction", "interrupt", ["radio"], [], "scene_local", "The established radio is now silent"],
  ["photo_turn", "Fotoğrafı çevir", "Turn the photograph", "interaction", "interact", ["photograph"], ["photo"], "scene_local", "The established photograph now shows a missing face"],
  ["photo_hold", "Fotoğrafı koru", "Keep the photograph", "protect", "protect", ["photograph"], ["photo"], "scene_local", "The established photograph is now held face down"],
  ["machine_start", "Makineyi çalıştır", "Start the machine", "interaction", "activate", ["machine"], [], "scene_local", "The established machine is now glowing with blue light"],
  ["machine_leave", "Makineden uzaklaş", "Move away from the machine", "avoid", "avoid", ["machine"], [], "scene_local", "The established machine is now silent behind the figure"],
  ["button_press", "Düğmeye bas", "Press the button", "interaction", "interact", ["button"], [], "scene_local", "The established button is now illuminated"],
  ["mirror_examine", "Aynadaki yansımayı izle", "Watch the reflection", "reveal", "observe", ["mirror", "reflection"], [], "scene_local", "The established reflection now moves out of sync"],
  ["water_touch", "Suyun yüzeyine dokun", "Touch the water surface", "interaction", "interact", ["water"], [], "scene_local", "The established water surface now carries widening rings"],
  ["object_listen", "Objenin sesini dinle", "Listen to the object", "observation", "listen", ["object"], [], "scene_local", "The established object now gives off a faint sound"],
  ["object_move", "Objeyi yerinden al", "Move the object", "interaction", "interact", ["object"], [], "scene_local", "The established object is now in the figure's hand"],
  ["scene_wait", "Sessizce bekle", "Wait quietly", "passive", "wait", ["scene"], [], "scene_local", "The current scene is now completely still"],
  ["scene_breathe", "Nefesini dinle", "Listen to your breathing", "passive", "observe", ["scene"], [], "scene_local", "The surrounding silence now makes the figure's breathing distinct"],
  ["scene_darkness", "Karanlıkta oyalan", "Remain in the darkness", "avoidance", "avoid", ["scene"], [], "scene_local", "The darkness of the current scene now gathers at its edges"],
  ["scene_stillness", "Sessizliği bozma", "Keep the silence", "passive", "wait", ["scene"], [], "scene_local", "The current scene holds its breath without changing location"],
];

// Broad, reusable behavior surface. These are generated from entity classes,
// not locations: grounding still decides which records are eligible.
const EXPANDED_BEHAVIORS = {
  figure: [
    ["approach", "Figüre yaklaş", "Move closer to the figure", "The anonymous figure is now within a closer distance"],
    ["move_away", "Figürden uzaklaş", "Move away from the figure", "The anonymous figure is now farther away"],
    ["follow", "Figürü takip et", "Follow the figure", "The figure now leads through the existing scene"],
    ["ignore", "Figürü görmezden gel", "Ignore the figure", "The figure remains present at the edge of attention"],
    ["look_behind", "Figürün arkasına bak", "Look behind the figure", "A detail behind the figure becomes visible"],
    ["circle", "Figürün çevresinde dolaş", "Circle around the figure", "The relation between figure and space shifts"],
    ["hold_position", "Mesafeyi koru", "Hold the distance", "The distance between the figures stays suspended"],
    ["interact", "Figüre elini uzat", "Reach toward the figure", "The anonymous figure almost answers the gesture"],
    ["expose", "Figürün yüzüne ışık tut", "Expose the figure to light", "The figure remains unreadable in the restrained light"],
    ["hide", "Figürden saklan", "Hide from the figure", "The figure slips partly out of sight"],
  ],
  door: [
    ["approach", "Kapıya yaklaş", "Approach the door", "The established door is now directly before the figure"],
    ["open", "Kapıyı arala", "Open the door slightly", "The established door is now slightly open"],
    ["open_wide", "Kapıyı tamamen aç", "Open the door fully", "The established doorway opens onto the same adjacent threshold"],
    ["close", "Kapıyı kapat", "Close the door", "The established door closes and seals the current space"],
    ["look_behind", "Kapının arkasına bak", "Look behind the door", "The space behind the established door becomes visible"],
    ["listen", "Kapının ardını dinle", "Listen beyond the door", "A quiet sound is now audible beyond the established door"],
    ["hold_position", "Eşiğin önünde bekle", "Wait before the threshold", "The threshold holds the figure in place"],
    ["ignore", "Kapıyı görmezden gel", "Ignore the door", "The established door recedes into the background"],
  ],
  light: [
    ["approach", "Işığa yaklaş", "Approach the light", "The established light grows nearer without changing the place"],
    ["move_away", "Işıktan uzaklaş", "Move away from the light", "The established light fades toward the edge of the scene"],
    ["trace", "Işığın kaynağını ara", "Trace the source of the light", "The source of the established light becomes more legible"],
    ["follow", "Işığı takip et", "Follow the light", "The established light leads toward a declared opening"],
    ["hold_position", "Işığın altında bekle", "Wait beneath the light", "The figure remains beneath the established light"],
    ["avoid", "Işığın dışında kal", "Stay outside the light", "The figure remains just beyond the established light"],
    ["reveal", "Işığın vurduğu yere bak", "Look where the light falls", "A detail in the established light becomes visible"],
    ["alter", "Işığı gölgede bırak", "Leave the light in shadow", "The established light is partially swallowed by shadow"],
  ],
  shadow: [
    ["follow", "Gölgeyi izle", "Watch the shadow", "The established shadow now stretches across the scene"],
    ["trace", "Gölgenin kaynağını ara", "Trace the shadow's source", "The source of the established shadow becomes apparent"],
    ["approach", "Gölgeye yaklaş", "Approach the shadow", "The figure reaches the edge of the established shadow"],
    ["move_away", "Gölgeden uzaklaş", "Move away from the shadow", "The established shadow recedes behind the figure"],
    ["hide", "Gölgenin içinde kal", "Remain inside the shadow", "The figure is absorbed into the established shadow"],
    ["expose", "Gölgenin dışına çık", "Step outside the shadow", "The figure emerges at the edge of the established light"],
    ["compare", "Gölgeni karşılaştır", "Compare the shadows", "The established shadow no longer matches the figure"],
    ["circle", "Gölgenin çevresinde dolaş", "Circle the shadow", "The shadow shifts around the fixed scene"],
  ],
  path: [
    ["move_toward", "Yolda ilerle", "Continue along the path", "The figure is now farther along the established path"],
    ["trace", "Yolun çatlağını izle", "Follow the path crack", "The path crack now forms a visible direction"],
    ["avoid", "Yoldan kenara çekil", "Step aside from the path", "The figure leaves the center of the established path"],
    ["hold_position", "Yolun başında bekle", "Wait at the path's beginning", "The established path remains open ahead"],
    ["compare", "Yolun iki yönünü karşılaştır", "Compare the two directions", "The established path seems to divide without moving"],
    ["circle", "Yolun çevresinde dolaş", "Circle the path", "The path appears different from its other side"],
    ["reveal", "Yoldaki izi ortaya çıkar", "Reveal the trace on the path", "A trace already on the path becomes visible"],
    ["ignore", "Yolu geride bırak", "Leave the path behind", "The established path falls out of immediate attention"],
  ],
  stairs: [
    ["descend", "Merdivenden in", "Go down the stairs", "The figure is now lower on the established stairs"],
    ["approach", "Merdivene yönel", "Move toward the stairs", "The established stairs fill the figure's view"],
    ["inspect", "Basamakları incele", "Inspect the steps", "The established steps reveal a worn detail"],
    ["hold_position", "Merdivende bekle", "Wait on the stairs", "The stairwell holds the figure between levels"],
    ["move_away", "Merdivenden uzaklaş", "Move away from the stairs", "The established stairs fade behind the figure"],
    ["trace", "Korkuluğu takip et", "Follow the handrail", "The established handrail guides the next step"],
    ["look_behind", "Merdivenin arkasına bak", "Look behind the stairs", "A recess behind the established stairs becomes visible"],
    ["cross", "Basamakları geç", "Cross the steps", "The figure reaches the far side of the established stairs"],
  ],
  water: [
    ["touch", "Suyun yüzeyine dokun", "Touch the water surface", "The established water surface carries widening rings"],
    ["approach", "Suya yaklaş", "Approach the water", "The figure reaches the edge of the established water"],
    ["move_away", "Sudan uzaklaş", "Move away from the water", "The established water recedes from attention"],
    ["trace", "Suyun akışını takip et", "Follow the water's flow", "The established water points toward its existing outlet"],
    ["reveal", "Suyun altına bak", "Look beneath the water", "A submerged detail becomes visible in the established water"],
    ["hold_position", "Suyun kıyısında bekle", "Wait beside the water", "The water remains still beside the figure"],
    ["compare", "Suyun yansımasını karşılaştır", "Compare the water's reflection", "The established reflection differs from the figure"],
    ["cross", "Suyun ötesine geç", "Cross beyond the water", "The figure reaches the far edge of the established water"],
  ],
  machine: [
    ["activate", "Makineyi çalıştır", "Start the machine", "The established machine glows with blue light"],
    ["deactivate", "Makineyi sustur", "Silence the machine", "The established machine falls silent"],
    ["inspect", "Makinenin gövdesini incele", "Inspect the machine body", "A seam on the established machine becomes visible"],
    ["approach", "Makineye yaklaş", "Approach the machine", "The established machine fills the figure's view"],
    ["move_away", "Makineden uzaklaş", "Move away from the machine", "The established machine dims behind the figure"],
    ["touch", "Makineye dokun", "Touch the machine", "The established machine answers with a muted vibration"],
    ["follow", "Makinenin sesini takip et", "Follow the machine's sound", "The established machine's sound leads through the room"],
    ["reveal", "Makinenin içini açığa çıkar", "Reveal the inside of the machine", "A contained mechanism becomes visible without adding a new object"],
  ],
  window: [
    ["look_through", "Pencereden bak", "Look through the window", "The established window reflects a changed part of the scene"],
    ["touch", "Pencereye dokun", "Touch the window", "The established window carries a faint handprint"],
    ["approach", "Pencereye yaklaş", "Approach the window", "The figure reaches the established window"],
    ["move_away", "Pencereden uzaklaş", "Move away from the window", "The established window becomes distant"],
    ["listen", "Pencerenin ardını dinle", "Listen beyond the window", "A sound arrives from beyond the established window"],
    ["reveal", "Camdaki yansımayı ortaya çıkar", "Reveal the reflection in the glass", "The established reflection slips out of sync"],
    ["hold_position", "Pencerenin önünde bekle", "Wait before the window", "The light at the established window holds steady"],
    ["ignore", "Pencereyi görmezden gel", "Ignore the window", "The established window fades from attention"],
  ],
  radio: [
    ["listen", "Radyoyu dinle", "Listen to the radio", "The established radio quietly begins playing"],
    ["interrupt", "Radyoyu sustur", "Silence the radio", "The established radio is now silent"],
    ["activate", "Radyoyu aç", "Turn on the radio", "The established radio emits a distant voice"],
    ["inspect", "Radyonun düğmesini incele", "Inspect the radio dial", "The established radio dial points to an impossible frequency"],
    ["approach", "Radyoya yaklaş", "Approach the radio", "The established radio grows louder nearby"],
    ["move_away", "Radyodan uzaklaş", "Move away from the radio", "The established radio fades into the room"],
    ["touch", "Radyonun düğmesine dokun", "Touch the radio dial", "The established radio changes its quiet signal"],
    ["hold_position", "Radyonun yanında bekle", "Wait beside the radio", "The established radio keeps the silence suspended"],
  ],
  photograph: [
    ["interact", "Fotoğrafı çevir", "Turn the photograph", "The established photograph now shows a missing face"],
    ["protect", "Fotoğrafı koru", "Protect the photograph", "The established photograph remains face down"],
    ["inspect", "Fotoğrafın kenarını incele", "Inspect the photograph's edge", "A hidden mark appears on the established photograph"],
    ["approach", "Fotoğrafa yaklaş", "Move closer to the photograph", "The established photograph fills the figure's attention"],
    ["abandon", "Fotoğrafı geride bırak", "Leave the photograph behind", "The established photograph is now outside the figure's reach"],
    ["compare", "Fotoğrafı yansımayla karşılaştır", "Compare the photograph to the reflection", "The established image no longer matches its reflection"],
    ["hold_position", "Fotoğrafı elinde tut", "Hold the photograph", "The established photograph warms in the figure's hand"],
    ["reveal", "Fotoğrafın arkasını ortaya çıkar", "Reveal the back of the photograph", "Writing appears on the established photograph's reverse"],
  ],
  mirror: [
    ["inspect", "Aynadaki yansımayı izle", "Watch the reflection", "The established reflection moves out of sync"],
    ["approach", "Aynaya yaklaş", "Approach the mirror", "The established mirror fills the figure's view"],
    ["move_away", "Aynadan uzaklaş", "Move away from the mirror", "The established reflection remains behind"],
    ["touch", "Aynaya dokun", "Touch the mirror", "The established glass answers with a slow ripple"],
    ["look_behind", "Aynanın arkasına bak", "Look behind the mirror", "The edge behind the established mirror becomes visible"],
    ["compare", "Yansımayı karşılaştır", "Compare the reflection", "The established reflection shows a different posture"],
    ["hold_position", "Aynanın önünde bekle", "Wait before the mirror", "The established reflection holds its gaze"],
    ["ignore", "Aynayı görmezden gel", "Ignore the mirror", "The established mirror darkens at the edge of the scene"],
  ],
  object: [
    ["inspect", "Objeyi incele", "Inspect the object", "The established object reveals a small new detail"],
    ["touch", "Objeye dokun", "Touch the object", "The established object answers with a faint vibration"],
    ["move", "Objeyi yerinden al", "Move the object", "The established object is now in the figure's hand"],
    ["protect", "Objeyi sakla", "Protect the object", "The established object is sheltered from the scene"],
    ["abandon", "Objeyi geride bırak", "Leave the object behind", "The established object remains where it was found"],
    ["compare", "Objeyi gölgesiyle karşılaştır", "Compare the object to its shadow", "The established object and shadow no longer agree"],
    ["reveal", "Objenin altına bak", "Look beneath the object", "A mark beneath the established object becomes visible"],
    ["hold_position", "Objenin yanında bekle", "Wait beside the object", "The established object anchors the still scene"],
  ],
};

for (const [entity, behaviors] of Object.entries(EXPANDED_BEHAVIORS)) {
  for (const [family, label, en, consequence] of behaviors) {
    const id = `expanded_${entity}_${family}_${OPTION_LIBRARY.length}`;
    OPTION_LIBRARY.push([id, label, en, entity === "figure" ? "figure" : "interaction", family, [entity], [], "scene_local", consequence]);
  }
}

// A still PNG cannot communicate sound, smell or an internal feeling. Keep
// the existing short actions where they remain useful, but make their result
// an observable change on the already-established entity. No new prop is
// introduced by these replacements.
const VISIBLE_CONSEQUENCE_OVERRIDES = Object.freeze({
  door_listen: "The shadow beneath the established door is now visibly displaced",
  radio_listen: "The established radio dial is now visibly pulsing",
  radio_turn: "The established radio dial is now dark",
  machine_leave: "The established machine is now farther behind the figure",
  object_listen: "The established object is now visibly tilted",
});

for (const template of OPTION_LIBRARY) {
  if (VISIBLE_CONSEQUENCE_OVERRIDES[template[0]]) template[8] = VISIBLE_CONSEQUENCE_OVERRIDES[template[0]];
  const [id, , , , family, required] = template;
  const target = required?.[0];
  if (target === "door" && family === "listen") template[8] = "The shadow beneath the established door is now visibly displaced";
  if (target === "window" && family === "listen") template[8] = "The established window reflection is now shifted toward one edge";
  if (target === "machine" && family === "touch") template[8] = "A thin light line is now visible across the established machine";
  if (target === "machine" && family === "follow") template[8] = "The established machine light now points across the room";
  if (target === "machine" && family === "deactivate") template[8] = "The established machine indicators are now dark";
  if (target === "radio" && family === "listen") template[8] = "The established radio dial is now visibly pulsing";
  if (target === "radio" && family === "activate") template[8] = "The established radio dial is now glowing";
  if (target === "radio" && family === "interrupt") template[8] = "The established radio dial is now dark";
  if (target === "radio" && family === "approach") template[8] = "The established radio now fills the foreground";
  if (target === "radio" && family === "touch") template[8] = "The established radio dial is now turned to a new position";
  if (target === "radio" && family === "hold_position") template[8] = "The established radio dial now holds a steady glow";
  if (target === "photograph" && family === "hold_position") template[8] = "The established photograph is now held closer to the figure";
  if (target === "object" && family === "touch") template[8] = "The established object's orientation is now visibly changed";
}

// Named metadata view for diagnostics/tests and future callers.  The compact
// tuple remains the storage format so existing production consumers stay
// compatible, while every template exposes the same semantic fields.
const PSYCHOLOGICAL_VECTOR_BY_BEHAVIOR = Object.freeze({
  approach: "approach", move_toward: "approach", enter: "explore", descend: "explore", cross: "explore", move: "explore",
  avoid: "avoid", move_away: "withdraw", abandon: "abandon", ignore: "refuse",
  follow: "follow", trace: "follow", look_behind: "reveal", look_through: "reveal", reveal: "reveal", expose: "reveal",
  hide: "conceal", close: "conceal", protect: "protect", block: "protect",
  open: "confront", open_wide: "confront", activate: "control", deactivate: "interrupt", interrupt: "interrupt",
  touch: "approach", interact: "approach", alter: "alter", compare: "separate", circle: "explore",
  observe: "observe", inspect: "observe", listen: "observe", hold_position: "accept", wait: "wait",
});

export function psychologicalVectorForBehavior(behavior) {
  return PSYCHOLOGICAL_VECTOR_BY_BEHAVIOR[String(behavior || "").toLowerCase()] || "observe";
}

export function optionTemplateMeta(template) {
  const [id, label_tr, label_en, category, behavior_family, required_tags = [], optional_tags = [], route_type = "scene_local", visible_consequence = "", mutation = null] = template || [];
  return { id, label_tr, label_en, category, behavior_family, psychological_vector: psychologicalVectorForBehavior(behavior_family), required_tags: [...required_tags], optional_tags: [...optional_tags], forbidden_tags: [], route_type, visible_consequence, mutation: mutation ? { ...mutation, opens: [...(mutation.opens || [])], closes: [...(mutation.closes || [])] } : null };
}

// Only observable world changes become entity state. This avoids the previous
// generic `*_done` markers while keeping the state vocabulary bounded.
// Navigation remains mutation-free because it hydrates a destination manifest.
const BOUNDED_STATE_BY_FAMILY = Object.freeze({
  approach: "near", avoid: "far", follow: "leading", ignore: "peripheral",
  hide: "obscured", expose: "lit", circle: "repositioned", hold_position: "held",
  touch: "touched", interact: "altered", alter: "altered", compare: "mismatched",
  reveal: "revealed", inspect: "inspected", observe: "observed", trace: "traced",
  look_behind: "revealed", look_through: "revealed", protect: "protected",
  abandon: "abandoned", interrupt: "off", move: "moved", move_toward: "advanced",
  move_away: "far", descend: "lower", cross: "crossed", wait: "still",
});

function boundedMutationFor(template) {
  const [id, label, , , family, required = []] = template;
  const target = required[0] || "scene";
  const action = String(label || "").toLocaleLowerCase("tr-TR");
  if (family === "listen" && target === "door") return { target_entity: "scene", from_state: null, to_state: "door_shadow_shifted", opens: [], closes: [id] };
  if (family === "listen" && target === "window") return { target_entity: "window", from_state: null, to_state: "reflection_shifted", opens: [], closes: [id] };
  if (family === "listen" && target === "radio") return { target_entity: "radio", from_state: null, to_state: "dial_pulsing", opens: [], closes: [id] };
  if (family === "listen" && target === "object") return { target_entity: "object", from_state: null, to_state: "tilted", opens: [], closes: [id] };
  if (target === "door") {
    if (family === "open_wide") return { target_entity: "door", from_state: "ajar", to_state: "open", opens: ["door_close", "door_look_behind"], closes: [id, "door_open"] };
    if (family === "open" || (family === "interact" && /arala|aç/.test(action))) return { target_entity: "door", from_state: "closed", to_state: "ajar", opens: ["door_open_wide", "door_look_behind"], closes: [id] };
    if (family === "close") return { target_entity: "door", from_state: "open", to_state: "closed", opens: ["door_open"], closes: [id] };
  }
  if (target === "machine") {
    if (family === "activate") return { target_entity: "machine", from_state: null, to_state: "on", opens: ["machine_deactivate", "machine_inspect"], closes: [id] };
    if (family === "deactivate") return { target_entity: "machine", from_state: "on", to_state: "off", opens: ["machine_activate"], closes: [id] };
  }
  if (target === "radio") {
    if (family === "activate") return { target_entity: "radio", from_state: null, to_state: "on", opens: ["radio_interrupt", "radio_listen"], closes: [id] };
    if (family === "interrupt") return { target_entity: "radio", from_state: "on", to_state: "off", opens: ["radio_activate"], closes: [id] };
  }
  if (family === "open" || family === "open_wide") return { target_entity: target, from_state: null, to_state: "open", opens: [], closes: [id] };
  if (family === "close") return { target_entity: target, from_state: "open", to_state: "closed", opens: [], closes: [id] };
  if (family === "activate") return { target_entity: target, from_state: null, to_state: "on", opens: [], closes: [id] };
  if (family === "deactivate") return { target_entity: target, from_state: "on", to_state: "off", opens: [], closes: [id] };
  const next = BOUNDED_STATE_BY_FAMILY[family];
  return next ? { target_entity: target, from_state: null, to_state: next, opens: [], closes: [id] } : null;
}

for (const template of OPTION_LIBRARY) {
  if (template[7] !== "scene_local") continue;
  template[9] = boundedMutationFor(template);
}
