// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.
import { buildJungCandidateDirections, inferIntent, jungAwareFallbackOptions, normalizeDreamPsyche, psychologyDeltaForIntent, visualMotifFamiliesForText, visualMotifHistoryForState } from "./jungian-dream-engine.mjs";
import { OPTION_LIBRARY, optionTemplateMeta, psychologicalVectorForBehavior } from "./option-library.mjs";
import { applyEntityMutation, entityStateForMutation, normalizePhysicalManifest, normalizePhysicalMemory, rememberPhysicalManifest, restorePhysicalManifest, visiblePhysicalEntity } from "./physical-memory.mjs";
import { hydrateCanonicalManifestations, normalizeManifestationRecords, rejectUncommittedManifestationAdds } from "./manifestation-layer.mjs";

const BLOCKED = [
  /\b(nsfw|nude|naked|sex|porn|çıplak|seks)\b/i,
  /\b(kill|murder|suicide|blood|gore|stab|shoot|torture|öldür|intihar|kanlı|bıçak|vur|işkence)\b/i,
  /\b(bomb|weapon|gun|terror|poison|hack|steal|rob|bomba|silah|terör|zehir|çal|soy)\b/i,
  /\b(hate|racist|nazi|nefret|ırkçı)\b/i,
  /\b(disney|marvel|batman|superman|pokemon|mickey|harry potter|star wars|mario|sonic|shrek)\b/i,
  /\b(apple|google|youtube|tiktok|instagram|nike|adidas|coca.?cola|elon musk|trump|putin|erdoğan|messi|ronaldo|taylor swift)\b/i,
];

const RENDERABLE_TERMS = [
  "room", "building", "house", "hallway", "basement", "corridor", "door", "window", "stairs", "road", "street", "bridge", "tunnel", "station", "car", "train", "elevator", "forest", "shore", "beach", "desert", "mountain", "landscape", "exterior",
  "fog", "mist", "rain", "snow", "night", "light", "glow", "red sky", "shadow", "lantern", "key", "orb", "mirror", "clock", "radio", "stone", "tree", "portal", "water", "ceiling", "wall", "path",
  "table", "watch", "telephone", "receipt", "coat", "classroom", "washing machine", "photograph", "cart", "tea", "kitchen", "cup", "figure", "silhouette", "character", "scene", "environment",
];

const FALLBACK_CATALOG = [
  { state_id: "fallback_doorway", label_tr: "Kapıdan çık", result_prompt_en: "The character is now standing just outside a strange doorway.", group: "travel", renderability: "high", state_patch: { current_location: "outside_door", character_state: "standing_alone", recent_event: "stepped_out_through_the_door" } },
  { state_id: "fallback_corridor", label_tr: "Koridordan ilerle", result_prompt_en: "The character is now standing in a long dim corridor.", group: "travel", renderability: "high", state_patch: { current_location: "long_corridor", character_state: "walking_alone", recent_event: "entered_the_long_corridor" } },
  { state_id: "fallback_stairs", label_tr: "Merdivenden in", result_prompt_en: "The character is now at the bottom of a shadowy staircase.", group: "travel", renderability: "high", state_patch: { current_location: "stairwell_bottom", character_state: "standing_alone", recent_event: "descended_the_staircase" } },
  { state_id: "fallback_bridge", label_tr: "Sisli köprüye ilerle", result_prompt_en: "The character is now standing on a misty bridge.", group: "travel", renderability: "high", state_patch: { current_location: "misty_bridge", character_state: "standing_alone", recent_event: "reached_the_misty_bridge" } },
  { state_id: "fallback_tunnel", label_tr: "Tünele gir", result_prompt_en: "The character is now inside a dark tunnel with a distant light.", group: "travel", renderability: "high", state_patch: { current_location: "dark_tunnel", character_state: "standing_near_light", open_hooks_add: ["distant_tunnel_light"], recent_event: "entered_the_dark_tunnel" } },
  { state_id: "fallback_car", label_tr: "Arabaya bin", result_prompt_en: "The character is now sitting inside a mysterious car.", group: "travel", renderability: "high", state_patch: { current_location: "mysterious_car", character_state: "sitting_alone", recent_event: "entered_the_mysterious_car" } },
  { state_id: "fallback_window", label_tr: "Pencereye yaklaş", result_prompt_en: "The character is now standing beside a window overlooking a strange landscape.", group: "discovery", renderability: "high", state_patch: { current_location: "window_room", character_state: "standing_by_window", open_hooks_add: ["strange_landscape"], recent_event: "approached_the_window" } },
  { state_id: "fallback_fog", label_tr: "Sis çöksün", result_prompt_en: "The current environment is now covered in thick silver fog.", group: "environment", renderability: "high", state_patch: { recent_event: "the_environment_filled_with_fog", tone: "mysterious_surreal" } },
  { state_id: "fallback_rain", label_tr: "Yağmur başlasın", result_prompt_en: "Rain is now falling across the visible environment.", group: "environment", renderability: "high", state_patch: { recent_event: "rain_started_falling", tone: "mysterious_surreal" } },
  { state_id: "fallback_portal", label_tr: "Portala gir", result_prompt_en: "The character is now inside a strange luminous world beyond a portal.", group: "surreal", renderability: "high", state_patch: { current_location: "luminous_world", character_state: "standing_alone", open_hooks_add: ["luminous_world"], recent_event: "entered_the_luminous_portal", tone: "fever_dream" } },
  { state_id: "fallback_mirror", label_tr: "Aynalı odaya gir", result_prompt_en: "The character is now standing inside a room lined with giant mirrors.", group: "surreal", renderability: "high", state_patch: { current_location: "mirror_room", character_state: "standing_alone", open_hooks_add: ["mirror_reflection"], recent_event: "entered_the_mirror_room", tone: "fever_dream" } },
  { state_id: "fallback_orbs", label_tr: "Parlayan kürelere yaklaş", result_prompt_en: "Several large glowing orbs are now floating in the room.", group: "object", renderability: "high", state_patch: { important_objects_add: ["glowing_orbs"], open_hooks_add: ["source_of_orbs"], recent_event: "found_floating_glowing_orbs", tone: "fever_dream" } },
  { state_id: "fallback_tree", label_tr: "Parlayan ağaca yaklaş", result_prompt_en: "A large glowing tree is now visible in the landscape.", group: "object", renderability: "high", state_patch: { current_location: "glowing_forest", important_objects_add: ["glowing_tree"], recent_event: "found_the_glowing_tree", tone: "mysterious_surreal" } },
  { state_id: "fallback_red_sky", label_tr: "Kızıl gökyüzünü izle", result_prompt_en: "The sky is now deep crimson above the current landscape.", group: "environment", renderability: "high", state_patch: { recent_event: "the_sky_turned_crimson", tone: "fever_dream" } },
  { state_id: "fallback_water", label_tr: "Suyla kaplanan odaya gir", result_prompt_en: "The room is now covered with still reflective water.", group: "transformation", renderability: "medium", state_patch: { current_location: "flooded_room", recent_event: "the_room_filled_with_water", tone: "fever_dream" } },
  { state_id: "fallback_light", label_tr: "Uzak ışığı takip et", result_prompt_en: "The character is now following a clear glowing light along a dark path.", group: "discovery", renderability: "high", state_patch: { current_location: "glowing_path", character_state: "following_glowing_light", open_hooks_add: ["source_of_light"], recent_event: "followed_the_glowing_light" } },
  { state_id: "fallback_radio", label_tr: "Radyoyu dinle", result_prompt_en: "The character is now beside an old radio playing in the quiet room.", group: "object_action", renderability: "high", state_patch: { important_objects_add: ["old_radio"], recent_event: "listened_to_the_old_radio" } },
  { state_id: "fallback_watch", label_tr: "Bozuk saate bak", result_prompt_en: "The character is now examining a broken wristwatch on a wooden table.", group: "object_action", renderability: "high", state_patch: { important_objects_add: ["broken_watch"], recent_event: "examined_the_broken_watch" } },
  { state_id: "fallback_photo", label_tr: "Fotoğrafı çevir", result_prompt_en: "The character is now holding an old family photograph face down on the table.", group: "object_action", renderability: "high", state_patch: { important_objects_add: ["old_photograph"], recent_event: "turned_the_old_photograph" } },
  { state_id: "fallback_table", label_tr: "Masadaki fişi incele", result_prompt_en: "The character is now studying a single paper receipt on a kitchen table.", group: "object_action", renderability: "high", state_patch: { important_objects_add: ["paper_receipt"], recent_event: "studied_the_paper_receipt" } },
  { state_id: "fallback_telephone", label_tr: "Telefonu sessize al", result_prompt_en: "The character is now beside a silent old telephone on a small table.", group: "object_action", renderability: "high", state_patch: { important_objects_add: ["old_telephone"], recent_event: "silenced_the_old_telephone" } },
  { state_id: "fallback_washer", label_tr: "Çamaşır makinesini bekle", result_prompt_en: "The character is now watching an old washing machine in a plain utility room.", group: "object_action", renderability: "high", state_patch: { current_location: "utility_room", important_objects_add: ["old_washing_machine"], recent_event: "waited_by_the_washing_machine" } },
  { state_id: "fallback_classroom", label_tr: "Boş sınıfta sessiz kal", result_prompt_en: "The character is now sitting alone in an empty classroom with wooden desks.", group: "object_action", renderability: "high", state_patch: { current_location: "empty_classroom", character_state: "sitting_alone", recent_event: "sat_silently_in_the_empty_classroom" } },
  { state_id: "fallback_tea", label_tr: "Çay fincanını koru", result_prompt_en: "The character is now protecting a warm cup of tea on a kitchen table.", group: "object_action", renderability: "high", state_patch: { important_objects_add: ["warm_tea"], recent_event: "protected_the_warm_cup" } },
];

const FALLBACK_BY_ID = new Map(FALLBACK_CATALOG.map((item) => [item.state_id, item]));
const FALLBACK_BY_LABEL = new Map(FALLBACK_CATALOG.map((item) => [item.label_tr.toLowerCase(), item]));
const FALLBACK_EN_LABELS = {
  fallback_doorway: "Step outside",
  fallback_corridor: "Walk through the corridor",
  fallback_stairs: "Go down the stairs",
  fallback_bridge: "Walk toward the misty bridge",
  fallback_tunnel: "Enter the tunnel",
  fallback_car: "Get into the car",
  fallback_window: "Approach the window",
  fallback_fog: "Let the fog descend",
  fallback_rain: "Let the rain begin",
  fallback_portal: "Enter the portal",
  fallback_mirror: "Enter the mirror room",
  fallback_orbs: "Approach the glowing orbs",
  fallback_tree: "Approach the glowing tree",
  fallback_red_sky: "Watch the crimson sky",
  fallback_water: "Enter the flooded room",
  fallback_light: "Follow the distant light",
  fallback_radio: "Listen to the old radio",
  fallback_watch: "Examine the broken watch",
  fallback_photo: "Turn the photograph over",
  fallback_table: "Study the paper receipt",
  fallback_telephone: "Silence the telephone",
  fallback_washer: "Wait by the washing machine",
  fallback_classroom: "Stay silent in the classroom",
  fallback_tea: "Protect the cup of tea",
};
const FALLBACK_ANCHORS = {
  fallback_doorway: "a strange doorway",
  fallback_corridor: "a long dim corridor",
  fallback_stairs: "a shadowy staircase",
  fallback_bridge: "a cracked stone bridge",
  fallback_tunnel: "a dark tunnel and distant light",
  fallback_car: "a mysterious car",
  fallback_window: "a strange landscape beyond the window",
  fallback_fog: "thick silver fog",
  fallback_rain: "rain on the environment",
  fallback_portal: "a luminous portal",
  fallback_mirror: "giant mirrors in a room",
  fallback_orbs: "large glowing orbs",
  fallback_tree: "a large glowing tree",
  fallback_red_sky: "a deep crimson sky",
  fallback_water: "still reflective water on the floor",
  fallback_light: "a clear glowing light on a dark path",
  fallback_radio: "an old radio on a quiet table",
  fallback_watch: "a broken wristwatch on a wooden table",
  fallback_photo: "an old photograph on the table",
  fallback_table: "a paper receipt on a kitchen table",
  fallback_telephone: "an old telephone on a small table",
  fallback_washer: "an old washing machine in a utility room",
  fallback_classroom: "empty classroom with wooden desks",
  fallback_tea: "a warm cup of tea on a kitchen table",
};
const FALLBACK_VARIANTS = {
  fallback_doorway: [
    ["Kapıdan çık", "The character is now standing just outside a strange doorway."],
    ["Kapının eşiğine ilerle", "The character is now standing at the threshold of a strange doorway."],
    ["Aralık kapıyı izle", "The character is now facing a slightly open strange doorway."]
  ],
  fallback_corridor: [
    ["Koridordan ilerle", "The character is now standing in a long dim corridor."],
    ["Koridorun sonuna ilerle", "The character is now near the far end of a long dim corridor."],
    ["Uzun koridoru takip et", "The character is now farther along a long dim corridor."]
  ],
  fallback_stairs: [
    ["Merdivenden in", "The character is now at the bottom of a shadowy staircase."],
    ["Alt kata geç", "The character is now standing on the lower landing of a shadowy staircase."],
    ["Basamakların sonuna ulaş", "The character is now at the final steps of a shadowy staircase."]
  ],
  fallback_bridge: [
    ["Sisli köprüye ilerle", "The character is now standing on a misty bridge."],
    ["Köprünün sonuna ilerle", "The character is now near the far end of a misty bridge."],
    ["Köprüyü geç", "The character is now standing beyond the misty bridge."]
  ],
  fallback_fog: [
    ["Sis çöksün", "The current environment is now covered in thick silver fog."],
    ["Sisin içine bak", "The current environment is now veiled by thick silver fog."],
    ["Sis yoğunlaşsın", "The current environment is now filled with denser silver fog."]
  ],
  fallback_rain: [
    ["Yağmur başlasın", "Rain is now falling across the visible environment."],
    ["Yağmurun altında bekle", "The character is now standing beneath steady rain."],
    ["Yağmur cama vursun", "Rain is now streaking across the visible window and scene."]
  ],
  fallback_light: [
    ["Uzak ışığı takip et", "The character is now following a clear glowing light along a dark path."],
    ["Işığa doğru ilerle", "The character is now closer to a clear glowing light on a dark path."],
    ["Işığın kaynağına yaklaş", "The character is now standing near the source of a clear glowing light."]
  ],
  fallback_tunnel: [
    ["Tünele gir", "The character is now inside a dark tunnel with a distant light."],
    ["Tüneldeki ışığa ilerle", "The character is now closer to a distant light inside a dark tunnel."],
    ["Tünelin sonuna ulaş", "The character is now near the end of a dark tunnel with pale light."],
    ["Tünel duvarını izle", "The character is now beside a dark tunnel wall with a thin line of light."]
  ],
  fallback_car: [
    ["Arabaya bin", "The character is now sitting inside a mysterious car."],
    ["Arabanın camından bak", "The character is now looking through the window of a mysterious car."],
    ["Arabayı tünele sür", "The character is now inside a mysterious car beneath a dark tunnel."],
    ["Arabayı sisli yola çıkar", "The character is now inside a mysterious car on a misty road."]
  ],
  fallback_window: [
    ["Pencereye yaklaş", "The character is now standing beside a window overlooking a strange landscape."],
    ["Penceredeki ışığı izle", "The character is now beside a window with a distant glowing light."],
    ["Pencereden dışarı bak", "The character is now looking through a window at a dark street."],
    ["Pencerenin yanındaki kapıya geç", "The character is now standing between a window and a strange doorway."]
  ],
  fallback_portal: [
    ["Portala gir", "The character is now inside a strange luminous world beyond a portal."],
    ["Portaldaki ışığa ilerle", "The character is now standing before a luminous portal filled with pale light."],
    ["Kızıl portala yaklaş", "The character is now near a glowing portal in a red foggy field."],
    ["Portaldan öteye geç", "The character is now beyond a luminous portal in a strange open landscape."]
  ],
  fallback_mirror: [
    ["Aynalı odaya gir", "The character is now standing inside a room lined with giant mirrors."],
    ["Aynaların arasından ilerle", "The character is now between giant mirrors in a dim room."],
    ["En uzun aynaya bak", "The character is now facing one giant mirror in a dim room."],
    ["Aynalı koridora gir", "The character is now standing in a long corridor of giant mirrors."]
  ],
  fallback_orbs: [
    ["Parlayan kürelere yaklaş", "Several large glowing orbs are now floating in the room."],
    ["Kürelerin altına ilerle", "The character is now standing beneath several large glowing orbs."],
    ["Işıklı küreleri izle", "Several large glowing orbs are now suspended above the character."],
    ["Kürelerin çevresinde bekle", "The character is now surrounded by several large glowing orbs in a room."]
  ],
  fallback_tree: [
    ["Parlayan ağaca yaklaş", "A large glowing tree is now visible in the landscape."],
    ["Parlayan ağacın gölgesine git", "The character is now standing beneath a large glowing tree in a forest."],
    ["Ağacın ışığına yaklaş", "The character is now near the light of a large glowing tree."],
    ["Ormandaki ağacı izle", "The character is now facing a large glowing tree in a misty forest."]
  ],
  fallback_red_sky: [
    ["Kızıl gökyüzünü izle", "The sky is now deep crimson above the current landscape."],
    ["Kızıl gökyüzünün altına çık", "The character is now beneath a deep crimson sky over a dark landscape."],
    ["Kızıl ufku takip et", "The character is now facing a deep crimson horizon beyond the path."],
    ["Gökyüzündeki ışığı izle", "A bright light is now visible beneath the deep crimson sky."]
  ],
  fallback_water: [
    ["Suyla kaplanan odaya gir", "The room is now covered with still reflective water."],
    ["Suyun içindeki ışığı izle", "The flooded room now reflects a clear glowing light."],
    ["Yansıyan koridora ilerle", "The character is now standing in a flooded corridor with reflective water."],
    ["Durgun suya yaklaş", "The character is now standing beside still reflective water on the floor."]
  ]
};

// Concise bilingual labels for variant fallback actions.  These are display
// labels only (not result-state prompts), so they stay within the same short
// safe-option grammar as the base catalogue while preserving the meaning of
// each Turkish variant.
const FALLBACK_VARIANT_EN_LABELS = {
  "Kapıdan çık": "Step outside",
  "Kapının eşiğine ilerle": "Approach the doorway",
  "Aralık kapıyı izle": "Watch the ajar doorway",
  "Koridordan ilerle": "Walk through the corridor",
  "Koridorun sonuna ilerle": "Reach the corridor far end",
  "Uzun koridoru takip et": "Follow the long corridor",
  "Merdivenden in": "Go down the stairs",
  "Alt kata geç": "Move to the lower floor",
  "Basamakların sonuna ulaş": "Reach the final steps",
  "Sisli köprüye ilerle": "Walk toward the misty bridge",
  "Köprünün sonuna ilerle": "Reach the bridge far end",
  "Köprüyü geç": "Cross beyond the bridge",
  "Sis çöksün": "Let the fog descend",
  "Sisin içine bak": "Look into the fog",
  "Sis yoğunlaşsın": "Let the fog grow denser",
  "Yağmur başlasın": "Let the rain begin",
  "Yağmurun altında bekle": "Wait beneath the rain",
  "Yağmur cama vursun": "Let rain strike the window",
  "Uzak ışığı takip et": "Follow the distant light",
  "Işığa doğru ilerle": "Move toward the glowing light",
  "Işığın kaynağına yaklaş": "Approach the light source",
  "Tünele gir": "Enter the tunnel",
  "Tüneldeki ışığa ilerle": "Move toward the tunnel light",
  "Tünelin sonuna ulaş": "Reach the tunnel end",
  "Tünel duvarını izle": "Watch the tunnel wall",
  "Arabaya bin": "Get into the car",
  "Arabanın camından bak": "Look through the car window",
  "Arabayı tünele sür": "Drive into the tunnel",
  "Arabayı sisli yola çıkar": "Take the car onto the misty road",
  "Pencereye yaklaş": "Approach the window",
  "Penceredeki ışığı izle": "Watch the window light",
  "Pencereden dışarı bak": "Look outside the window",
  "Pencerenin yanındaki kapıya geç": "Move to the door beside the window",
  "Portala gir": "Enter the portal",
  "Portaldaki ışığa ilerle": "Move toward the portal light",
  "Kızıl portala yaklaş": "Approach the crimson portal",
  "Portaldan öteye geç": "Move beyond the portal",
  "Aynalı odaya gir": "Enter the mirror room",
  "Aynaların arasından ilerle": "Walk between the mirrors",
  "En uzun aynaya bak": "Face the longest mirror",
  "Aynalı koridora gir": "Enter the mirror corridor",
  "Parlayan kürelere yaklaş": "Approach the glowing orbs",
  "Kürelerin altına ilerle": "Stand beneath the glowing orbs",
  "Işıklı küreleri izle": "Watch the glowing orbs",
  "Kürelerin çevresinde bekle": "Wait around the glowing orbs",
  "Parlayan ağaca yaklaş": "Approach the glowing tree",
  "Parlayan ağacın gölgesine git": "Go to the tree's shadow",
  "Ağacın ışığına yaklaş": "Approach the tree's light",
  "Ormandaki ağacı izle": "Watch the tree in the forest",
  "Kızıl gökyüzünü izle": "Watch the crimson sky",
  "Kızıl gökyüzünün altına çık": "Move beneath the crimson sky",
  "Kızıl ufku takip et": "Follow the crimson horizon",
  "Gökyüzündeki ışığı izle": "Watch the light in the sky",
  "Suyla kaplanan odaya gir": "Enter the flooded room",
  "Suyun içindeki ışığı izle": "Watch the light beneath the water",
  "Yansıyan koridora ilerle": "Move along the flooded corridor",
  "Durgun suya yaklaş": "Approach the still water",
};

// A small transition grammar keeps the deterministic fallback feeling like
// one navigable dream rather than a random catalogue.  It is deliberately
// finite: Qwen remains the normal creative source, while this map only
// chooses safe local continuations when Qwen is unavailable or rejected.
const FALLBACK_CONTEXT_ROUTES = [
  { match: /strange_room|outside_door|house|hall|window_room|kitchen|classroom|utility_room/, natural: ["fallback_radio", "fallback_watch", "fallback_table", "fallback_telephone", "fallback_doorway", "fallback_corridor", "fallback_window", "fallback_stairs", "fallback_car"], surprise: ["fallback_photo", "fallback_washer", "fallback_classroom", "fallback_tea", "fallback_mirror", "fallback_water"] },
  { match: /long_corridor|stairwell|basement|dark_tunnel/, natural: ["fallback_radio", "fallback_watch", "fallback_photo", "fallback_doorway", "fallback_stairs", "fallback_tunnel", "fallback_light"], surprise: ["fallback_table", "fallback_telephone", "fallback_washer", "fallback_mirror", "fallback_water", "fallback_orbs", "fallback_fog"] },
  { match: /mirror_room/, natural: ["fallback_watch", "fallback_photo", "fallback_radio", "fallback_doorway", "fallback_corridor", "fallback_window", "fallback_stairs"], surprise: ["fallback_orbs", "fallback_light", "fallback_fog", "fallback_portal"] },
  { match: /glowing_forest/, natural: ["fallback_radio", "fallback_watch", "fallback_light", "fallback_bridge", "fallback_tree", "fallback_doorway"], surprise: ["fallback_photo", "fallback_classroom", "fallback_portal", "fallback_mirror", "fallback_red_sky", "fallback_fog"] },
  { match: /misty_bridge|bridge|glowing_path|road|street/, natural: ["fallback_radio", "fallback_watch", "fallback_car", "fallback_light", "fallback_tunnel", "fallback_bridge", "fallback_tree"], surprise: ["fallback_fog", "fallback_rain", "fallback_portal", "fallback_red_sky"] },
  { match: /mysterious_car|train|station|elevator/, natural: ["fallback_radio", "fallback_watch", "fallback_tunnel", "fallback_bridge", "fallback_window", "fallback_light"], surprise: ["fallback_photo", "fallback_telephone", "fallback_fog", "fallback_rain", "fallback_portal", "fallback_red_sky"] },
  { match: /flooded_room|water|mirror_room/, natural: ["fallback_radio", "fallback_watch", "fallback_table", "fallback_doorway", "fallback_corridor", "fallback_light", "fallback_window"], surprise: ["fallback_photo", "fallback_washer", "fallback_portal", "fallback_mirror", "fallback_orbs", "fallback_fog"] },
  { match: /luminous_world|glowing_forest|portal|orb/, natural: ["fallback_radio", "fallback_watch", "fallback_tree", "fallback_light", "fallback_bridge", "fallback_portal"], surprise: ["fallback_photo", "fallback_classroom", "fallback_tea", "fallback_mirror", "fallback_red_sky", "fallback_water"] },
];
const VALID_INTENTS = new Set(["enter", "approach", "descend", "ascend", "follow", "inspect", "confront", "hide", "listen", "touch", "activate", "abandon", "return", "surrender", "preserve", "observe"]);
const APPROVED_PAIRS = new Map([
  ["a glowing portal appears", "parlayan portal ortaya çıksın"],
  ["the corridor fills with light", "koridor ışıkla dolsun"],
  ["floating orbs appear", "uçan küreler belirsin"],
  ["a misty bridge appears", "sisli köprü ortaya çıksın"],
  ["a glowing tree grows", "parlayan ağaç büyüsün"],
  ["a doorway opens into bright light", "kapı parlak ışığa açılsın"],
  ["the sky turns crimson", "gökyüzü kızıla dönsün"],
  ["the room fills with water", "oda suyla dolsun"],
  ["the floor becomes a giant mirror", "zemin dev aynaya dönüşsün"],
]);
for (const item of FALLBACK_CATALOG) APPROVED_PAIRS.set(item.label_tr.toLowerCase(), item.label_tr.toLowerCase());

export function defaultStoryState() {
  const current_scene_manifest = hydrateCanonicalManifestations({ location: "red_house_exterior", entities: ["red house exterior", "closed front door", "cracked front path", "bare tree", "anonymous figure"], adjacent_locations: ["red_house_doorstep", "front_path"], entity_states: { door: "closed", light: "steady" }, summary: "An anonymous figure stands outside a red house at twilight." });
  return { current_location: "red_house_exterior", location_dwell_turns: 0, character_state: "anonymous_figure", current_scene_entities: current_scene_manifest.entities.slice(-8), current_scene_manifest, memory_entities: [], important_objects: [], open_hooks: [], hook_ttls: {}, scene_anchors: [], recent_events: ["arrived_outside_the_red_house"], recent_options: [], recent_option_records: [], recent_option_pairs: [], recent_situation_families: [], recent_visual_motifs: [], recent_compositions: [], tone: "mysterious_surreal" };
}

const SCENE_ADJACENCY = Object.freeze({
  red_house_exterior: ["red_house_doorstep", "front_path"],
  red_house_doorstep: ["red_house_exterior", "red_house_hallway"],
  front_path: ["red_house_exterior", "quiet_street"],
  quiet_street: ["front_path", "red_house_exterior", "alley_mouth"],
  alley_mouth: ["quiet_street", "hidden_tunnel"],
  red_house_hallway: ["red_house_doorstep", "stairwell", "basement_door"],
  stairwell: ["red_house_hallway", "basement"],
  basement_door: ["red_house_hallway", "basement"],
  basement: ["basement_door", "machine_room"],
  machine_room: ["basement", "control_room"],
  control_room: ["machine_room", "hidden_tunnel"],
  hidden_tunnel: ["control_room", "alley_mouth"],
});

// Local physical vocabulary for the small declared route graph. These are
// scene facts, not generic room affordances: they prevent a return to the red
// house from forgetting the already established door/path/tree.
const SCENE_DEFAULT_ENTITIES = Object.freeze({
  red_house_exterior: ["red house exterior", "closed front door", "cracked front path", "bare tree", "anonymous figure"],
  red_house_doorstep: ["red house doorstep", "closed front door", "anonymous figure"],
  front_path: ["cracked front path", "bare tree", "anonymous figure"],
  quiet_street: ["quiet street", "cracked front path", "anonymous figure"],
  red_house_hallway: ["red house hallway", "anonymous figure"],
  stairwell: ["stairwell", "anonymous figure"],
  basement_door: ["basement door", "anonymous figure"],
  basement: ["underground basement", "anonymous figure"],
  // The machine is a physical part of this node's canonical vocabulary.
  // Keeping it here prevents a location transition from committing a
  // machine_room manifest that Qwen rejects while recovery invents machine
  // actions for the same scene.
  machine_room: ["machine room", "machine", "anonymous figure"],
  alley_mouth: ["narrow side alley", "anonymous figure"],
  control_room: ["control room panel", "anonymous figure"],
  hidden_tunnel: ["hidden tunnel", "anonymous figure"]
});
const SCENE_DEFAULT_ENTITY_STATES = Object.freeze({
  red_house_exterior: { door: "closed", light: "steady" },
  red_house_doorstep: { door: "closed" },
  red_house_hallway: { light: "steady" },
  machine_room: { machine: "idle", light: "steady" },
  control_room: { machine: "idle", light: "steady" },
  basement: { water: "still" }
});

// Only these values describe a physical fact that can survive leaving and
// re-entering a location.  Interaction outcomes such as `observed`, `far`,
// `moved` or `touched` are bounded history, not world facts; carrying them
// into every later manifest progressively closes the local option pool.

export function sceneManifestFor(storyState = defaultStoryState()) {
  const story = storyState && typeof storyState === "object" ? storyState : defaultStoryState();
  const source = story.current_scene_manifest && typeof story.current_scene_manifest === "object" ? story.current_scene_manifest : {};
  const requestedLocation = typeof story.current_location === "string" ? story.current_location.trim() : "";
  const sourceLocation = typeof source.location === "string" && /^[a-z0-9_ -]{1,80}$/i.test(source.location.trim()) ? source.location.trim() : "";
  const location = requestedLocation || sourceLocation || "red_house_exterior";
  const entities = sourceLocation === location && Array.isArray(source.entities) ? source.entities : story.current_scene_entities;
  const knownLocations = Object.keys(SCENE_ADJACENCY);
  const filteredEntities = (entities || [])
    .filter((item) => typeof item === "string" && item.trim() && item.trim().split(/\s+/).length <= 5)
    .map((item) => item.trim())
    // A committed manifest is the physical scene, not the long-term memory
    // list. Drop location entities that clearly belong to another route node
    // (for example a stale basement carried into machine_room), while keeping
    // ordinary props and the current location's own vocabulary intact.
    .filter((item) => {
      const normalized = item.toLowerCase().replaceAll("_", " ");
      if (normalized === location.replaceAll("_", " ")) return true;
      return !knownLocations.some((other) => other !== location && normalized.includes(other.replaceAll("_", " ")));
    });
  // An explicitly committed manifest is authoritative for the current still.
  // Canonical vocabulary is hydrated at real location transitions in
  // applyStatePatch; do not invent omitted props when inspecting a sparse
  // manifest that intentionally declares only its visible entities.
  const canonicalEntities = sourceLocation === location && Array.isArray(source.entities) ? [] : (SCENE_DEFAULT_ENTITIES[location] || []);
  // Canonical manifests can contain their five established scene facts plus a
  // small, registry-authored optional manifestation set. Qwen/state-patch
  // validation retains its stricter input cap; this only preserves committed
  // physical truth already authored by trusted hydration.
  const safeEntities = [...new Set([...canonicalEntities, ...filteredEntities])].slice(-8);
  const adjacent = Array.isArray(source.adjacent_locations) ? source.adjacent_locations : (SCENE_ADJACENCY[location] || [location]);
  const adjacent_locations = [...new Set(adjacent.filter((item) => typeof item === "string" && /^[a-z0-9_ -]{1,80}$/i.test(item.trim())).map((item) => item.trim()))].slice(0, 3);
  const summary = typeof source.summary === "string" && source.summary.trim() ? source.summary.trim().slice(0, 180) : "The committed scene remains visible.";
  const rawStates = sourceLocation === location && source.entity_states && typeof source.entity_states === "object" ? source.entity_states : (SCENE_DEFAULT_ENTITY_STATES[location] || {});
  const entity_states = Object.fromEntries(Object.entries(rawStates).filter(([key, value]) => /^[a-z][a-z0-9_]{0,40}$/i.test(key) && typeof value === "string" && value.trim().length <= 48).slice(0, 12));
  const physicalText = safeEntities.join(" ").toLowerCase().replaceAll("_", " ");
  const inferredDefaults = [["door", "closed"], ["machine", "idle"], ["radio", "off"], ["window", "closed"], ["light", "steady"], ["shadow", "faint"], ["water", "still"], ["figure", "far"]];
  for (const [entity, state] of inferredDefaults) if (!(entity in entity_states) && physicalText.includes(entity)) entity_states[entity] = state;
  return normalizePhysicalManifest({ location, entities: safeEntities, adjacent_locations: adjacent_locations.length ? adjacent_locations : [location], entity_states, summary,
    entity_physical_states: sourceLocation === location ? source.entity_physical_states : {},
    entity_interactions: sourceLocation === location ? source.entity_interactions : {},
    entity_manifestations: sourceLocation === location ? normalizeManifestationRecords(source.entity_manifestations, location, safeEntities) : [] });
}

export function normalizeStoryState(value) {
  const base = defaultStoryState();
  if (!value || typeof value !== "object") return base;
  const text = (input, fallback) => typeof input === "string" && /^[a-z0-9_ -]{1,80}$/i.test(input.trim()) ? input.trim() : fallback;
  const list = (input, max) => {
    if (!Array.isArray(input)) return [];
    const values = input.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
    const seen = new Set(); const unique = [];
    for (let index = values.length - 1; index >= 0; index -= 1) {
      const key = values[index].toLocaleLowerCase("tr-TR").replaceAll("_", " ");
      if (seen.has(key)) continue;
      seen.add(key); unique.unshift(values[index]);
    }
    return unique.slice(-max);
  };
  const anchors = Array.isArray(value.scene_anchors) ? value.scene_anchors.map((item) => typeof item === "string" ? { text: item, ttl: 3 } : item).filter((item) => item && typeof item.text === "string" && item.text.trim().toLowerCase() !== "the current surreal environment" && Number(item.ttl) > 0).map((item) => ({ text: item.text.trim(), ttl: Math.min(3, Math.max(1, Number(item.ttl))) })).slice(-3) : [];
  const hooks = list(value.open_hooks, 3);
  const hook_ttls = Object.fromEntries(hooks.map((hook) => [hook, Math.min(3, Math.max(1, Number(value.hook_ttls?.[hook] ?? 3)))]));
  const legacyMemory = list(value.important_objects, 12);
  const memoryEntities = [...new Set([...list(value.memory_entities, 12), ...legacyMemory])].slice(-12);
  // Older state files only had important_objects, which was historical memory
  // rather than proof of physical presence.  Migrate conservatively: location,
  // figure and live anchors are current; legacy objects remain memory-only.
  const suppliedCurrent = list(value.current_scene_entities, 8);
  const resolvedLocation = text(value.current_location, base.current_location);
  const resolvedCharacter = text(value.character_state, base.character_state);
  const currentEntityValues = [...(suppliedCurrent || []).filter((item) => item !== base.current_location && item !== base.character_state), ...anchors.slice(-2).map((anchor) => anchor.text), resolvedLocation, resolvedCharacter];
  const currentEntities = list(currentEntityValues, 8);
  // Structured, bounded sibling of recent_options: unlike recent_options
  // (deduplicated by label, so a repeated exact wording never gets a second
  // slot), this keeps the visible consequence alongside each shown label so
  // a later semantic repeat check can tell two same-labelled but genuinely
  // different futures apart. Append-only by recency, no label dedup — a
  // legacy state simply has none yet, no fabricated entries.
  const recentOptionRecords = Array.isArray(value.recent_option_records)
    ? value.recent_option_records
        .filter((item) => item && typeof item === "object" && typeof item.label_tr === "string" && item.label_tr.trim())
        .map((item) => ({ label_tr: String(item.label_tr).trim().slice(0, 120), result_prompt_en: typeof item.result_prompt_en === "string" ? item.result_prompt_en.trim().slice(0, 200) : "", intent: typeof item.intent === "string" ? item.intent.trim().slice(0, 40) : "", behavior_family: typeof item.behavior_family === "string" ? item.behavior_family.trim().slice(0, 40) : "", route_type: item.route_type === "navigation" ? "navigation" : "scene_local", next_location: typeof item.next_location === "string" ? item.next_location.trim().slice(0, 80) : "", source: typeof item.source === "string" ? item.source.trim().slice(0, 40) : "unknown", psychological_vector: typeof item.psychological_vector === "string" ? item.psychological_vector.trim().slice(0, 32) : "", target_entity: typeof item.target_entity === "string" ? item.target_entity.trim().slice(0, 64) : "", resulting_state: typeof item.resulting_state === "string" ? item.resulting_state.trim().slice(0, 64) : "", future_signature: typeof item.future_signature === "string" ? item.future_signature.trim().slice(0, 240) : "", archetype: typeof item.archetype === "string" ? item.archetype.trim().slice(0, 32) : "" }))
        .slice(-20)
    : [];
  // Pair history is an append-only bounded ledger. Unlike labels and other
  // set-like state, duplicate pair signatures are meaningful here: the
  // selector uses their frequency to rotate away from combinations that have
  // already dominated a long-running dream. Keep the newest 256 entries
  // without collapsing repeated signatures.
  const recentPairs = Array.isArray(value.recent_option_pairs)
    ? value.recent_option_pairs
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim().slice(0, 256))
        .slice(-256)
    : [];
  const normalized = { current_location: text(value.current_location, base.current_location), location_dwell_turns: Math.max(0, Math.min(8, Math.trunc(Number(value.location_dwell_turns) || 0))), character_state: text(value.character_state, base.character_state), current_scene_entities: currentEntities, memory_entities: list(memoryEntities, 12), important_objects: list(memoryEntities, 5), open_hooks: hooks, hook_ttls, scene_anchors: anchors, recent_events: list(value.recent_events, 6), recent_options: list(value.recent_options, 20), recent_option_records: recentOptionRecords, recent_option_pairs: recentPairs, recent_situation_families: list(value.recent_situation_families, 20), recent_visual_motifs: list(value.recent_visual_motifs, 20), recent_compositions: list(value.recent_compositions, 6), tone: text(value.tone, base.tone) };
  normalized.current_scene_manifest = sceneManifestFor({ ...normalized, current_scene_manifest: value.current_scene_manifest });
  normalized.physical_memory = rememberPhysicalManifest(normalizePhysicalMemory(value.physical_memory, Object.keys(SCENE_ADJACENCY)), normalized.current_scene_manifest, Object.keys(SCENE_ADJACENCY));
  normalized.current_location = normalized.current_scene_manifest.location;
  normalized.current_scene_entities = list([...normalized.current_scene_manifest.entities, normalized.current_location, normalized.character_state], 8);
  return normalized;
}

export function qwenPreviousOptions(storyState) {
  const story = normalizeStoryState(storyState);
  const displayed = story.recent_option_records
    .slice(-8)
    .map((record) => String(record?.label_tr || "").trim())
    .filter(Boolean);
  return displayed.length ? displayed : story.recent_options.slice(-20);
}

export function mergeSceneAnchors(current = [], proposed = []) {
  const previous = normalizeStoryState({ scene_anchors: current }).scene_anchors;
  const next = Array.isArray(proposed) ? [...new Set(proposed.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()))].slice(0, 3) : [];
  const proposedKeys = new Set(next.map((item) => item.toLowerCase()));
  const merged = previous.filter((anchor) => !proposedKeys.has(anchor.text.toLowerCase())).map((anchor) => ({ text: anchor.text, ttl: anchor.ttl - 1 })).filter((anchor) => anchor.ttl > 0);
  for (const text of next) merged.push({ text, ttl: 3 });
  return merged.slice(-3);
}

export function applyStatePatch(storyState, patch = {}) {
  const current = normalizeStoryState(storyState);
  const next = { ...current };
  const hookTtls = Object.fromEntries(current.open_hooks.map((hook) => [hook, Math.max(1, Number(current.hook_ttls?.[hook] ?? 3)) - 1]));
  next.open_hooks = current.open_hooks.filter((hook) => hookTtls[hook] > 0);
  next.hook_ttls = Object.fromEntries(next.open_hooks.map((hook) => [hook, hookTtls[hook]]));
  const locationChanged = typeof patch.current_location === "string" && patch.current_location.trim() !== current.current_location;
  next.location_dwell_turns = locationChanged ? 0 : (typeof patch.recent_event === "string" && patch.recent_event.trim() ? Math.min(8, Number(current.location_dwell_turns || 0) + 1) : Number(current.location_dwell_turns || 0));
  for (const key of ["current_location", "character_state", "tone"]) if (typeof patch[key] === "string") next[key] = patch[key].trim();
  const legacyAdds = Array.isArray(patch.important_objects_add) ? patch.important_objects_add.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
  const currentPhysicalEntities = next.current_scene_manifest?.entities || [];
  // Text/state patches can retain optional entity names as memory, but cannot
  // promote them into physical presence. Only trusted canonical hydration may
  // add an absent light/window/stairs/water entity.
  const physicalLegacyAdds = rejectUncommittedManifestationAdds(legacyAdds, currentPhysicalEntities);
  const sceneAdds = rejectUncommittedManifestationAdds(Array.isArray(patch.current_scene_entities_add) ? patch.current_scene_entities_add.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [], currentPhysicalEntities);
  const memoryAdds = [...legacyAdds, ...sceneAdds];
  next.memory_entities = [...new Set([...(next.memory_entities || []), ...next.important_objects, ...memoryAdds])].slice(-12);
  next.important_objects = next.memory_entities.slice(-5);
  if (locationChanged || sceneAdds.length || physicalLegacyAdds.length) {
    const baseEntities = locationChanged ? [next.current_location, next.character_state] : (next.current_scene_entities || []);
    next.current_scene_entities = [...new Set([...baseEntities, ...sceneAdds, ...physicalLegacyAdds])].slice(-8);
  }
  if (Array.isArray(patch.open_hooks_add)) {
    const additions = patch.open_hooks_add.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
    next.open_hooks = [...new Set([...next.open_hooks, ...additions])].slice(-3);
    next.hook_ttls = Object.fromEntries(next.open_hooks.map((hook) => [hook, additions.includes(hook) ? 3 : Number(next.hook_ttls?.[hook] || 1)]));
  }
  if (Array.isArray(patch.scene_anchors)) next.scene_anchors = mergeSceneAnchors(next.scene_anchors, patch.scene_anchors);
  const mutation = patch.entity_state_mutation && typeof patch.entity_state_mutation === "object" ? patch.entity_state_mutation : null;
  if (mutation && !locationChanged) {
    next.current_scene_manifest = applyEntityMutation(next.current_scene_manifest, mutation);
  }
  if (Array.isArray(patch.scene_anchors) && (locationChanged || sceneAdds.length || legacyAdds.length)) next.current_scene_entities = [...new Set([...(next.current_scene_entities || []), ...patch.scene_anchors])].slice(-5);
  if (typeof patch.recent_event === "string" && patch.recent_event.trim()) next.recent_events = [...next.recent_events, patch.recent_event.trim()].slice(-6);
  if (patch.current_scene_manifest && typeof patch.current_scene_manifest === "object") {
    const patchEntities = rejectUncommittedManifestationAdds(patch.current_scene_manifest.entities, currentPhysicalEntities);
    next.current_scene_manifest = { ...patch.current_scene_manifest, entities: patchEntities, entity_states: { ...(patch.current_scene_manifest.entity_states || {}), ...(next.current_scene_manifest?.entity_states || {}) }, entity_physical_states: next.current_scene_manifest?.entity_physical_states, entity_interactions: next.current_scene_manifest?.entity_interactions, entity_manifestations: next.current_scene_manifest?.entity_manifestations };
  }
  else {
    const location = next.current_location;
    next.current_scene_manifest = {
      location,
      entities: locationChanged
        ? (SCENE_DEFAULT_ENTITIES[location] || next.current_scene_entities)
        : [...new Set([...(next.current_scene_manifest?.entities || next.current_scene_entities), ...physicalLegacyAdds, ...sceneAdds])].slice(-8),
      adjacent_locations: SCENE_ADJACENCY[location] || [location],
      entity_states: locationChanged ? (SCENE_DEFAULT_ENTITY_STATES[location] || {}) : { ...(next.current_scene_manifest?.entity_states || {}) },
      entity_physical_states: locationChanged ? {} : next.current_scene_manifest?.entity_physical_states,
      entity_interactions: locationChanged ? {} : next.current_scene_manifest?.entity_interactions,
      summary: typeof patch.result_summary === "string" ? patch.result_summary : (next.current_scene_manifest?.summary || "The committed scene remains visible."),
    };
  }
  if (locationChanged) {
    const location = next.current_location;
    const supplied = Array.isArray(next.current_scene_manifest?.entities) ? next.current_scene_manifest.entities : [];
    const canonical = SCENE_DEFAULT_ENTITIES[location] || [];
    const entities = [...new Set(canonical.length ? canonical : supplied)].slice(0, 8);
    next.current_scene_manifest = restorePhysicalManifest(hydrateCanonicalManifestations({
      ...(next.current_scene_manifest || {}),
      location,
      entities,
      adjacent_locations: SCENE_ADJACENCY[location] || next.current_scene_manifest?.adjacent_locations || [location],
      entity_states: { ...(SCENE_DEFAULT_ENTITY_STATES[location] || {}) },
      entity_physical_states: {}, entity_interactions: {},
    }), current.physical_memory);
    next.current_scene_entities = [...new Set([...entities, location, next.character_state])].slice(-8);
  }
  return normalizeStoryState(next);
}

// Record only committed scene/result text. This is deliberately bounded and
// family-level: it prevents door→portal→gate or corridor→tunnel→bridge from
// reading as fresh visual situations forever.
export function recordRenderedVisualMotifs(storyState, text) {
  const current = normalizeStoryState(storyState);
  const families = visualMotifFamiliesForText(text);
  return normalizeStoryState({ ...current, recent_visual_motifs: [...visualMotifHistoryForState(current), ...families].slice(-20) });
}

export function recordRenderedComposition(storyState, compositionId) {
  const current = normalizeStoryState(storyState);
  if (typeof compositionId !== "string" || !compositionId.trim()) return current;
  return normalizeStoryState({ ...current, recent_compositions: [...current.recent_compositions, compositionId.trim().slice(0, 48)].slice(-6) });
}

function short(text, max = 8) { return typeof text === "string" && text.trim().split(/\s+/).length <= max; }
function intentGroup(text) {
  const value = String(text || "").toLowerCase();
  if (/door|kapı|corridor|koridor|stairs|merdiv|bridge|köprü|tunnel|tünel|road|yol|street|sokak|car|araba|train|tren|enter|gir|çık|outside/.test(value)) return "travel";
  if (/fog|sis|rain|yağmur|snow|kar|sky|gökyüz|light|ışık|glow|parla/.test(value)) return "atmosphere";
  if (/window|pencere|follow|takip|approach|yaklaş|look|izle|listen|ses/.test(value)) return "discovery";
  if (/portal|ayna|mirror|luminous|boyut|world|dünya/.test(value)) return "surreal";
  if (/orb|küre|tree|ağaç|machine|makine|key|anahtar|clock|saat|radio|radyo/.test(value)) return "object";
  return "other";
}

// A compact category signal keeps the two visible choices from collapsing
// into the same generic navigation move. It is intentionally heuristic and
// bounded; Qwen remains the creative source and the fallback remains safe.
export function optionCategory(text) {
  const value = String(text || "").toLowerCase();
  if (/radio|radyo|watch|saat|photo|fotoğraf|receipt|fiş|telephone|telefon|tea|çay|cup|fincan|machine|makine|key|anahtar|mirror|ayna/.test(value)) return "object_interaction";
  if (/fog|sis|rain|yağmur|snow|kar|water|su|flood|sel|sky|gökyüz|light|ışık|glow|parla/.test(value)) return "environmental_shift";
  if (/memory|hatır|whisper|fısıltı|trace|iz|echo|yankı|photograph|fotoğraf/.test(value)) return "memory_trace";
  if (/figure|figür|someone|biri|another|başka|encounter|karşılaş/.test(value)) return "interpersonal_encounter";
  if (/feel|hisset|dream|rüya|shadow|gölge|silence|sessiz|wait|bekle/.test(value)) return "psychological_shift";
  if (/ritual|ritüel|circle|çember|arrange|diz|place|yerleştir|protect|koru/.test(value)) return "ritual_action";
  if (/change|dönüş|transform|dönüş|activate|aktive|open|aç|break|kır/.test(value)) return "consequence";
  if (/door|kapı|corridor|koridor|stairs|merdiv|bridge|köprü|tunnel|tünel|road|yol|street|sokak|car|araba|train|tren|enter|gir|çık|outside/.test(value)) return "travel";
  return "other";
}

// Coarse, bounded situation memory used only to keep deterministic fallback
// choices from collapsing into one action family.
export function situationFamilyForOption(value) {
  const text = typeof value === "object" ? [value.label_tr, value.result_prompt_en, value.option_1_tr, value.option_1_result_prompt_en].filter(Boolean).join(" ") : String(value || "");
  const lower = text.toLowerCase();
  if (/exchange|give|take|pass|share|trade|hand|\bver\b|\bal\b|değiş|bırak/.test(lower)) return "OBJECT_EXCHANGE";
  if (/break|repair|activate|switch|open|close|spill|flood|turns|becomes|kır|onar|aktive|\baç\b|kapa|dök|dol/.test(lower)) return "OBJECT_TRANSFORMATION";
  if (/figure|someone|another|person|voice|answer|call|invite|encounter|figür|biri|ses|ara|yanıt|davet/.test(lower)) return "FIGURE_ENCOUNTER";
  if (/wait|listen|silent|refuse|preserve|observe|bekle|dinle|sessiz|reddet|koru|izle/.test(lower)) return "NON_ACTION";
  if (/memory|photograph|photo|trace|echo|hatıra|fotoğraf|iz|yankı/.test(lower)) return "MEMORY";
  if (/destroy|erase|remove|ignore|interrupt|yık|sil|yok|engelle/.test(lower)) return "DESTRUCTION";
  if (/ritual|circle|arrange|repeat|ritüel|çember|diz/.test(lower)) return "RITUAL";
  if (/fog|rain|snow|water|light|glow|sky|sis|yağmur|kar|su|ışık|parla|gökyüz/.test(lower)) return "ENVIRONMENT_TRANSFORMATION";
  if (/radio|watch|look|inspect|touch|mirror|machine|key|clock|table|bak|incele|dokun|ayna|makine|anahtar|saat/.test(lower)) return "OBJECT_EXAMINATION";
  if (/door|corridor|stairs|bridge|tunnel|road|street|car|train|enter|follow|approach|exit|kapı|koridor|merdiv|köprü|tünel|yol|sokak|araba|tren|gir|takip|yaklaş|çık/.test(lower)) return "NAVIGATION";
  return "DISCOVERY";
}

function diversityGate(value, storyState = {}, previous = []) {
  const first = [value?.option_1_tr, value?.option_1_result_prompt_en].filter(Boolean).join(" ");
  const second = [value?.option_2_tr, value?.option_2_result_prompt_en].filter(Boolean).join(" ");
  // Compare the user-facing action labels for family diversity.  Result-state
  // prompts intentionally repeat the current location, which must not make
  // two different actions look like the same category.
  // Two choices may legitimately share a broad family (for example, two
  // different ways out of a bridge).  Behavioural diversity is enforced by
  // the intent check in validateDynamicOptions; rejecting the whole family
  // here made grounded navigation pairs fall back unnecessarily.
  const history = visualMotifHistoryForState(storyState);
  const recentFamilies = new Map();
  history.slice(-16).forEach((family) => recentFamilies.set(family, (recentFamilies.get(family) || 0) + 1));
  const familySets = [visualMotifFamiliesForText(first), visualMotifFamiliesForText(second)];
  // A motif may return, but not as the only idea in both choices after it has
  // dominated the recent window. This is a soft cooldown, not a hard route
  // ontology, so active scene relevance still wins.
  const staleOnly = familySets.map((families) => families.length > 0 && families.every((family) => (recentFamilies.get(family) || 0) >= 3));
  if (staleOnly[0] && staleOnly[1]) return false;
  const recent = new Set(previous.slice(-8).map((item) => String(item).trim().toLowerCase()));
  return !recent.has(String(value?.option_1_tr || "").trim().toLowerCase()) && !recent.has(String(value?.option_2_tr || "").trim().toLowerCase());
}
function safe(text) {
  if (typeof text !== "string" || !short(text) || BLOCKED.some((pattern) => pattern.test(text))) return false;
  return text.trim().split(/\s+/).slice(1).every((word) => !/^[A-ZÇĞİÖŞÜ]/.test(word));
}
function renderablePrompt(text) { if (typeof text !== "string" || text.trim().split(/\s+/).length > 24 || BLOCKED.some((pattern) => pattern.test(text))) return false; const lower = text.toLowerCase(); return RENDERABLE_TERMS.some((term) => lower.includes(term)); }

function contextuallyRelevant(value, storyState, candidates) {
  // Compact Qwen pairs are built only after each label passes the current
  // scene grounding gate and their result prompts are deterministic summaries
  // of that same scene. Avoid applying the broader fallback-route gate again;
  // it incorrectly discards valid adjacent actions and inflates fallback use.
  if (value && String(value.option_1_id || "").startsWith("qwen_") && String(value.option_2_id || "").startsWith("qwen_")) return true;
  const story = normalizeStoryState(storyState);
  const current = [story.current_location, story.character_state, ...story.current_scene_entities, ...story.scene_anchors.map((item) => item.text), ...story.open_hooks].join(" ").toLowerCase();
  const activeFamilies = new Set(visualMotifFamiliesForText(current));
  const cooledFamilies = new Set(story.recent_visual_motifs.slice(-10));
  return [1, 2].every((index) => {
    const result = String(value[`option_${index}_result_prompt_en`] || "").toLowerCase();
    const candidate = candidates?.[index - 1] || {};
    // A Qwen patch cannot make an arbitrary teleport valid by merely naming
    // the new location. The result must connect to the active scene or to the
    // deterministic candidate direction supplied by the Jung engine.
    // Never let Qwen's own proposed anchors self-authorize an unrelated teleport.
    // Only active story context and the deterministic safe direction may bridge
    // a result-state prompt into the renderable grammar.
    const bridge = [current, candidate.tr, candidate.result, ...(candidate.anchors || [])].join(" ").toLowerCase();
    const hasTerm = (text, term) => {
      const normalized = String(text || "").toLowerCase();
      const wanted = String(term || "").toLowerCase();
      if (wanted.includes(" ")) return normalized.includes(wanted);
      const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
      // Permit simple English morphology (glow/glowing, door/doorway,
      // room/rooms) without allowing substring false positives such as
      // car/character.
      return tokens.some((token) => token === wanted || (wanted.length >= 4 && token.startsWith(wanted)));
    };
    const visualTerms = RENDERABLE_TERMS.filter((term) => hasTerm(result, term));
    const introducedCooledFamily = visualMotifFamiliesForText(result).some((family) => cooledFamilies.has(family) && !activeFamilies.has(family));
    if (introducedCooledFamily) return false;
    return visualTerms.some((term) => hasTerm(bridge, term));
  });
}
export function jungContextGate(value, storyState, candidates) { return contextuallyRelevant(value, storyState, candidates); }

function validNumericDelta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = ["curiosity", "confrontation", "avoidance", "control", "surrender"];
  return Object.keys(value).every((key) => allowed.includes(key) && Number.isFinite(Number(value[key])) && Number(value[key]) >= -0.5 && Number(value[key]) <= 0.5);
}

function validPatch(patch, diagnostics = null) {
  const reject = (reason = "invalid") => { if (diagnostics && !diagnostics.reason) diagnostics.reason = reason; return false; };
  if (!patch || typeof patch !== "object") return reject("not_object");
  const allowed = new Set(["current_location", "character_state", "important_objects_add", "current_scene_entities_add", "open_hooks_add", "scene_anchors", "recent_event", "tone", "current_scene_manifest", "result_summary", "entity_state_mutation"]);
  if (Object.keys(patch).some((key) => !allowed.has(key))) return reject("unknown_key");
  for (const key of ["current_location", "character_state", "recent_event", "tone"]) if (patch[key] !== undefined && !safe(patch[key])) return reject(key);
  for (const key of ["important_objects_add", "open_hooks_add"]) if (patch[key] !== undefined && (!Array.isArray(patch[key]) || patch[key].length > 3 || patch[key].some((item) => !safe(item, 4)))) return reject(key);
  if (patch.current_scene_entities_add !== undefined && (!Array.isArray(patch.current_scene_entities_add) || patch.current_scene_entities_add.length > 3 || patch.current_scene_entities_add.some((item) => typeof item !== "string" || !item.trim() || item.trim().split(/\s+/).length > 5))) return reject("current_scene_entities_add");
  if (patch.scene_anchors !== undefined && (!Array.isArray(patch.scene_anchors) || patch.scene_anchors.length < 1 || patch.scene_anchors.length > 3 || patch.scene_anchors.some((item) => !renderablePrompt(item)))) return reject("scene_anchors");
  if (patch.current_scene_manifest !== undefined && (!patch.current_scene_manifest || typeof patch.current_scene_manifest !== "object" || !/^[a-z0-9_ -]{1,80}$/i.test(String(patch.current_scene_manifest.location || "").trim()) || !Array.isArray(patch.current_scene_manifest.entities) || patch.current_scene_manifest.entities.length > 5 || patch.current_scene_manifest.entities.some((item) => typeof item !== "string" || !item.trim() || item.trim().split(/\s+/).length > 5))) return reject("scene_manifest");
  if (patch.entity_state_mutation !== undefined) {
    const mutation = patch.entity_state_mutation;
    const allowedMutationKeys = new Set(["target_entity", "from_state", "to_state", "opens", "closes"]);
    if (!mutation || typeof mutation !== "object" || Array.isArray(mutation) || Object.keys(mutation).some((key) => !allowedMutationKeys.has(key))) return reject("entity_state_mutation");
    if (!/^[a-z][a-z0-9_]{0,40}$/i.test(String(mutation.target_entity || "")) || !/^[a-z][a-z0-9_]{0,47}$/i.test(String(mutation.to_state || ""))) return reject("entity_state_mutation");
    if (mutation.from_state !== null && mutation.from_state !== undefined && !/^[a-z][a-z0-9_]{0,47}$/i.test(String(mutation.from_state))) return reject("entity_state_mutation");
    for (const key of ["opens", "closes"]) if (mutation[key] !== undefined && (!Array.isArray(mutation[key]) || mutation[key].length > 8 || mutation[key].some((item) => typeof item !== "string" || !/^[a-z0-9_]{1,80}$/i.test(item)))) return reject("entity_state_mutation");
  }
  if (patch.result_summary !== undefined && !renderablePrompt(patch.result_summary)) return reject("result_summary");
  return true;
}

export function validateDynamicOptions(value, previous = [], storyState = {}, diagnostics = null) {
  const reject = (reason = "validation") => { if (diagnostics && !diagnostics.reason) diagnostics.reason = reason; return null; };
  if (!value || typeof value !== "object") return reject("not_object");
  const keys = ["option_1_tr", "option_2_tr", "option_1_result_prompt_en", "option_2_result_prompt_en", "option_1_scene_anchors", "option_2_scene_anchors", "option_1_state_patch", "option_2_state_patch"];
  const optional = ["option_1_id", "option_2_id", "option_1_en", "option_2_en", "option_1_intent", "option_2_intent", "option_1_psyche_delta", "option_2_psyche_delta", "option_1_symbol_delta", "option_2_symbol_delta", "option_1_archetypal_role", "option_2_archetypal_role"];
  if (Object.keys(value).some((key) => !keys.includes(key) && !optional.includes(key)) || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return reject("schema_keys");
  if (!safe(value.option_1_tr) || !safe(value.option_2_tr) || value.option_1_tr.trim().toLowerCase() === value.option_2_tr.trim().toLowerCase()) return reject("labels");
  if ((value.option_1_en !== undefined && !safe(value.option_1_en)) || (value.option_2_en !== undefined && !safe(value.option_2_en))) return reject("english_labels");
  const recent = new Set(previous.slice(-NEAR_REPEAT_WINDOW).map((item) => String(item).trim().toLowerCase()));
  if (recent.has(value.option_1_tr.trim().toLowerCase()) || recent.has(value.option_2_tr.trim().toLowerCase())) return reject("recent_repeat");
  if (routeRepeat({ label_tr: value.option_1_tr, result_prompt_en: value.option_1_result_prompt_en }, previous) || routeRepeat({ label_tr: value.option_2_tr, result_prompt_en: value.option_2_result_prompt_en }, previous)) return reject("route_repeat");
  const groups = [intentGroup(value.option_1_tr), intentGroup(value.option_2_tr)];
  if (behaviorSignature({ label_tr: value.option_1_tr }) === behaviorSignature({ label_tr: value.option_2_tr })) return reject("same_behavior");
  // Natural and surprising choices may share a broad group (e.g. two different
  // ways out of a room). Only suppress a group after it has dominated recent
  // displayed choices, preserving legitimate travel branches.
  const recentGroups = previous.slice(-4).map(intentGroup);
  const qwenPair = String(value.option_1_id || "").startsWith("qwen_") && String(value.option_2_id || "").startsWith("qwen_");
  if (!qwenPair && groups.some((group) => group !== "other" && recentGroups.filter((item) => item === group).length >= 4)) return reject("group_cooldown");
  if (!renderablePrompt(value.option_1_result_prompt_en) || !renderablePrompt(value.option_2_result_prompt_en)) return reject("result_prompt");
  if (!staticVisibleConsequence(value.option_1_result_prompt_en) || !staticVisibleConsequence(value.option_2_result_prompt_en)) return reject("static_visibility");
  if (value.option_1_result_prompt_en.trim().toLowerCase() === value.option_2_result_prompt_en.trim().toLowerCase()) return reject("same_consequence");
  if (!Array.isArray(value.option_1_scene_anchors) || !Array.isArray(value.option_2_scene_anchors) || value.option_1_scene_anchors.length < 1 || value.option_1_scene_anchors.length > 3 || value.option_2_scene_anchors.length < 1 || value.option_2_scene_anchors.length > 3 || value.option_1_scene_anchors.some((item) => !renderablePrompt(item)) || value.option_2_scene_anchors.some((item) => !renderablePrompt(item))) return reject("anchors");
  const patch1Diagnostics = {}; const patch2Diagnostics = {};
  if (!validPatch(value.option_1_state_patch, patch1Diagnostics) || !validPatch(value.option_2_state_patch, patch2Diagnostics)) return reject(`patch:${patch1Diagnostics.reason || patch2Diagnostics.reason || "invalid"}`);
  for (const index of ["1", "2"]) {
    if (value[`option_${index}_intent`] !== undefined && (typeof value[`option_${index}_intent`] !== "string" || value[`option_${index}_intent`].length > 24 || !VALID_INTENTS.has(value[`option_${index}_intent`].trim().toLowerCase()))) return reject("intent");
    if (value[`option_${index}_psyche_delta`] !== undefined && !validNumericDelta(value[`option_${index}_psyche_delta`])) return reject("psyche_delta");
    if (value[`option_${index}_symbol_delta`] !== undefined && (!Array.isArray(value[`option_${index}_symbol_delta`] ) || value[`option_${index}_symbol_delta`].length > 3)) return reject("symbol_delta");
    if (value[`option_${index}_archetypal_role`] !== undefined && !["continuation", "counterpoint"].includes(value[`option_${index}_archetypal_role`])) return reject("role");
  }
  const intent1 = value.option_1_intent || inferIntent(value.option_1_tr);
  const intent2 = value.option_2_intent || inferIntent(value.option_2_tr);
  // Keep the pair meaningfully directional: two cosmetic phrasings of one
  // intent do not give the audience a real continuation/counterpoint choice.
  if (intent1 === intent2 && consequenceFamily(value.option_1_result_prompt_en) === consequenceFamily(value.option_2_result_prompt_en)) return reject("same_intent");
  if (futureSignature({ label_tr: value.option_1_tr, result_prompt_en: value.option_1_result_prompt_en }) === futureSignature({ label_tr: value.option_2_tr, result_prompt_en: value.option_2_result_prompt_en })) return reject("same_future");
  // Qwen pairs have already passed the grounded-candidate and distinct-future
  // gates above. Do not let the deterministic motif cooldown reject both
  // authored branches merely because the current scene has a recently common
  // visual family; that was the last source of valid Qwen answers being
  // mislabeled as invalid.
  if (!qwenPair && !diversityGate(value, storyState, previous)) return reject("diversity");
  return { ...value, option_1_tr: value.option_1_tr.trim(), option_2_tr: value.option_2_tr.trim(), option_1_result_prompt_en: value.option_1_result_prompt_en.trim(), option_2_result_prompt_en: value.option_2_result_prompt_en.trim() };
}

export function validateOptions(value) {
  const keys = ["option_1_tr", "option_2_tr", "option_1_en", "option_2_en"];
  const optional = ["option_1_result_prompt_en", "option_2_result_prompt_en", "option_1_scene_anchors", "option_2_scene_anchors", "option_1_state_patch", "option_2_state_patch", "option_1_id", "option_2_id", "option_1_intent", "option_2_intent", "option_1_psyche_delta", "option_2_psyche_delta", "option_1_symbol_delta", "option_2_symbol_delta", "option_1_archetypal_role", "option_2_archetypal_role"];
  if (!value || typeof value !== "object" || Object.keys(value).some((key) => !keys.includes(key) && !optional.includes(key)) || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return null;
  if (!keys.every((key) => safe(value[key]))) return null;
  if (value.option_1_en.trim().toLowerCase() === value.option_2_en.trim().toLowerCase()) return null;
  const hasMetadata = optional.some((key) => Object.prototype.hasOwnProperty.call(value, key));
  if (!hasMetadata) for (const index of ["1", "2"]) if (APPROVED_PAIRS.get(value[`option_${index}_en`].trim().toLowerCase()) !== value[`option_${index}_tr`].trim().toLowerCase()) return null;
  return { ...value, ...Object.fromEntries(keys.map((key) => [key, value[key].trim()])) };
}

function fallbackRecord(items, storyState = defaultStoryState()) {
  // Do not blindly carry the previous anchor into every fallback patch. That
  // would renew its TTL forever and make an obsolete portal/doorway dominate
  // unrelated locations. Anchors must be explicitly proposed again to renew;
  // recurring symbols remain available through the bounded psyche memory.
  const anchors1 = [FALLBACK_ANCHORS[items[0].state_id] || items[0].result_prompt_en].slice(-3);
  const anchors2 = [FALLBACK_ANCHORS[items[1].state_id] || items[1].result_prompt_en].slice(-3);
  const englishLabel = (item) => {
    const baseLabel = FALLBACK_CATALOG.find((candidate) => candidate.state_id === item.state_id)?.label_tr;
    // Variants change the displayed action (e.g. “look through the car
    // window”), so the base catalogue translation can become misleading.
    // Keep a concise validated display translation rather than exposing the
    // longer result-state sentence as an option label.
    if (item.label_tr !== baseLabel) return FALLBACK_VARIANT_EN_LABELS[item.label_tr] || FALLBACK_EN_LABELS[item.state_id] || "";
    return FALLBACK_EN_LABELS[item.state_id] || String(item.result_prompt_en || "").trim();
  };
  return { option_1_tr: items[0].label_tr, option_2_tr: items[1].label_tr, option_1_en: englishLabel(items[0]), option_2_en: englishLabel(items[1]), option_1_result_prompt_en: items[0].result_prompt_en, option_2_result_prompt_en: items[1].result_prompt_en, option_1_scene_anchors: anchors1, option_2_scene_anchors: anchors2, option_1_state_patch: { ...items[0].state_patch, scene_anchors: anchors1 }, option_2_state_patch: { ...items[1].state_patch, scene_anchors: anchors2 }, option_1_id: items[0].state_id, option_2_id: items[1].state_id };
}

function candidateMotifFamilies(item) {
  return visualMotifFamiliesForText([item?.label_tr, item?.result_prompt_en, FALLBACK_ANCHORS[item?.state_id] || ""].filter(Boolean).join(" "));
}

export function visualMotifPenalty(item, storyState = {}) {
  const history = visualMotifHistoryForState(storyState);
  const counts = new Map();
  for (const family of history) counts.set(family, (counts.get(family) || 0) + 1);
  const cooled = new Set(history.slice(-4));
  return candidateMotifFamilies(item).reduce((sum, family) => sum + (cooled.has(family) ? 20 : (counts.get(family) || 0) >= 3 ? 14 : (counts.get(family) || 0) >= 2 ? 8 : (counts.get(family) || 0)), 0);
}

const SCENE_ENTITY_ALIASES = {
  kitchen: ["kitchen", "room", "oda"], classroom: ["classroom", "room", "sınıf", "desk"], utility: ["utility", "room", "oda"],
  house: ["house", "building", "ev"], outside_door: ["door", "doorway", "house", "kapı"], strange_room: ["room", "oda"],
  bridge: ["bridge", "köprü"], under_bridge: ["bridge", "köprü"], dark_tunnel: ["tunnel", "tünel"], mysterious_car: ["car", "araba"],
  mirror_room: ["mirror", "room", "ayna", "oda"], luminous_world: ["world", "light", "dünya", "ışık"], glowing_forest: ["forest", "tree", "orman"],
  flooded_room: ["room", "water", "flooded", "oda", "su"], window_room: ["window", "room", "pencere", "oda"],
};
const SCENE_LOCATION_WORDS = ["room", "house", "building", "corridor", "door", "doorway", "window", "stairs", "bridge", "tunnel", "station", "car", "train", "elevator", "forest", "shore", "beach", "desert", "mountain", "path", "street", "kitchen", "classroom", "utility", "world"];
const FALLBACK_SCENE_ALIASES = {
  fallback_watch: ["clock", "saat", "wristwatch"],
  fallback_radio: ["radio", "radyo"],
  fallback_photo: ["photograph", "photo", "fotoğraf"],
  fallback_tea: ["tea", "cup", "çay", "fincan"],
  fallback_table: ["table", "masa", "receipt", "fiş"],
  fallback_telephone: ["telephone", "phone", "telefon"],
};
const tokenizeScene = (value) => String(value || "").toLowerCase().replaceAll("_", " ").split(/[^a-zçğıöşü]+/).filter((token) => token.length > 2);
function sceneEntityTokens(story) {
  const location = String(story.current_location || "").toLowerCase();
  // TTL=1 is the final decay tick: it may be committed by the current turn,
  // but it must not independently authorize a fresh fallback route.  Exclude
  // it from the grounding context so stale portal/doorway anchors cannot
  // resurrect themselves after expiry.
  const activeAnchors = story.scene_anchors.filter((anchor) => Number(anchor?.ttl ?? 3) > 1);
  // Character state is a figure descriptor, not a physical prop.  Keep a
  // stable figure token for grounded interaction without letting generic words
  // such as "standing" authorize unrelated catalogue routes.
  return new Set([...tokenizeScene(location), ...(SCENE_ENTITY_ALIASES[location] || []), ...story.current_scene_entities.flatMap(tokenizeScene), ...activeAnchors.flatMap((anchor) => tokenizeScene(anchor.text)), "figure"]);
}
function candidateSceneTokens(item) {
  return new Set([...tokenizeScene(item.state_id), ...tokenizeScene(item.label_tr), ...tokenizeScene(item.result_prompt_en), ...tokenizeScene((FALLBACK_ANCHORS[item.state_id] || "")), ...(FALLBACK_SCENE_ALIASES[item.state_id] || [])]);
}

// Hard grounding gate for deterministic fallback options. Hooks and Jung
// symbols are intentionally excluded: they may rank an already grounded
// option, but cannot introduce a new prop or location by themselves.
export function fallbackGroundingScore(item, storyState = defaultStoryState()) {
  const story = normalizeStoryState(storyState);
  const expiredAnchors = story.scene_anchors.filter((anchor) => Number(anchor?.ttl ?? 3) <= 1).map((anchor) => String(anchor.text).trim().toLowerCase());
  const candidateAnchor = String(FALLBACK_ANCHORS[item?.state_id] || "").trim().toLowerCase();
  // An expiring anchor cannot be renewed merely by selecting the same
  // catalogue branch again.  It may return only after a later committed scene
  // explicitly establishes it anew.
  if (candidateAnchor && expiredAnchors.includes(candidateAnchor)) return 0;
  const scene = sceneEntityTokens(story);
  const candidate = candidateSceneTokens(item);
  const objectTokens = ["radio", "radyo", "watch", "saat", "photograph", "fotoğraf", "receipt", "fiş", "telephone", "telefon", "tea", "çay", "cup", "fincan", "washer", "machine", "makine", "mirror", "ayna", "orb", "küre", "tree", "ağaç", "lantern", "fener", "key", "anahtar", "table", "masa"];
  // An old important object is memory, not proof of presence. Object-led
  // fallback branches therefore require a literal current-scene entity.
  if (item?.group === "object_action" && !objectTokens.some((token) => candidate.has(token) && scene.has(token))) return 0;
  const direct = [...candidate].some((token) => scene.has(token));
  const candidateLocations = [...candidate].filter((token) => SCENE_LOCATION_WORDS.includes(token));
  const sceneLocations = [...scene].filter((token) => SCENE_LOCATION_WORDS.includes(token));
  // Prefer the explicit state patch target over loose words in a sentence.
  // This prevents an object such as "mirror" from looking like a same-room
  // action merely because both prompts contain the generic word "room".
  const targetLocation = String(item?.state_patch?.current_location || "").toLowerCase();
  const introducesNewLocation = targetLocation
    ? targetLocation !== String(story.current_location || "").toLowerCase()
    : candidateLocations.some((token) => !sceneLocations.includes(token));
  const adjacentEstablished = ["door", "doorway", "window", "road", "path", "street", "bridge", "tunnel", "stairs", "station", "car", "train", "room", "house", "building"].some((token) => scene.has(token));
  const connectedDreamSpace = scene.has("world") || scene.has("luminous") || scene.has("forest") || scene.has("house") || scene.has("room") || scene.has("building") || scene.has("kitchen") || scene.has("classroom") || scene.has("utility");
  const connectedDestination = ["path", "bridge", "forest", "house", "road"].some((token) => candidate.has(token));
  const roomLike = ["room", "kitchen", "classroom", "utility"].some((token) => scene.has(token));
  const roomAdjacent = ["door", "doorway", "corridor", "stairs", "stairwell", "window"].some((token) => candidate.has(token));
  const establishedExit = ["door", "doorway", "house", "road", "street", "path", "bridge", "tunnel", "car", "station"].some((token) => scene.has(token));
  if (direct && !introducesNewLocation) return 2;
  if (direct && introducesNewLocation && adjacentEstablished) return 1;
  // A connected dream-space transition is a valid strong continuation when
  // the destination is one of the small, renderable adjacent spaces.  Treat
  // it as score 2 so the hard fallback gate does not collapse a luminous
  // world/forest/house into a single recently-used object candidate.
  if (introducesNewLocation && connectedDreamSpace && (roomAdjacent || connectedDestination && (!roomLike || establishedExit))) return 2;
  // Object/environment actions that keep the current space and do not import
  // a new location are valid transformations of the committed scene.
  if (!introducesNewLocation && direct && ["object", "object_action", "environment", "discovery", "transformation"].includes(item.group)) return 2;
  return 0;
}

export function fallbackOptions(previous = [], random = Math.random, storyState = defaultStoryState()) {
  const stripRoleSuffix = (value) => String(value || "").split(/\s+—\s+/)[0].trim().toLowerCase();
  const blocked = new Set(previous.map((item) => String(item).toLowerCase()));
  const blockedBase = new Set(previous.map(stripRoleSuffix));
  const story = normalizeStoryState(storyState);
  const recentSituationFamilies = story.recent_situation_families || [];
  const familyCounts = recentSituationFamilies.reduce((map, family) => map.set(family, (map.get(family) || 0) + 1), new Map());
  // Prefer the active location itself when selecting a route. Anchors and
  // hooks enrich the scene, but should not make an old motif hijack the next
  // physical transition.
  const locationContext = String(story.current_location || "").toLowerCase();
  const context = [locationContext, story.character_state, ...story.current_scene_entities, ...story.scene_anchors.map((a) => a.text)].join(" ").toLowerCase();
  const related = (item) => {
    const id = item.state_id;
    if (/portal|luminous|mirror|orb|glow|surreal/.test(context)) return ["fallback_light", "fallback_bridge", "fallback_tree", "fallback_red_sky", "fallback_portal", "fallback_mirror", "fallback_orbs", "fallback_fog"].includes(id);
    if (/bridge|under_bridge|road|street/.test(context)) return ["fallback_car", "fallback_radio", "fallback_watch", "fallback_tunnel", "fallback_bridge", "fallback_light", "fallback_fog", "fallback_rain", "fallback_orbs", "fallback_portal", "fallback_red_sky", "fallback_tree"].includes(id);
    if (/tunnel|basement|corridor|hall|room|house|door|window|stair|building|kitchen|classroom|utility/.test(context)) return ["fallback_radio", "fallback_watch", "fallback_photo", "fallback_table", "fallback_telephone", "fallback_washer", "fallback_classroom", "fallback_tea", "fallback_doorway", "fallback_corridor", "fallback_stairs", "fallback_window", "fallback_car", "fallback_fog", "fallback_rain", "fallback_light", "fallback_portal", "fallback_mirror", "fallback_orbs", "fallback_water"].includes(id);
    if (/car|train|station|elevator/.test(context)) return ["fallback_car", "fallback_corridor", "fallback_window", "fallback_light", "fallback_fog", "fallback_rain", "fallback_tunnel", "fallback_portal", "fallback_red_sky"].includes(id);
    return ["fallback_radio", "fallback_watch", "fallback_photo", "fallback_table", "fallback_telephone", "fallback_washer", "fallback_classroom", "fallback_tea", "fallback_doorway", "fallback_corridor", "fallback_window", "fallback_stairs", "fallback_fog", "fallback_rain", "fallback_portal", "fallback_mirror", "fallback_orbs", "fallback_tree", "fallback_water"].includes(id);
  };
  const expanded = FALLBACK_CATALOG.flatMap((item) => (FALLBACK_VARIANTS[item.state_id] || [[item.label_tr, item.result_prompt_en]]).map(([label_tr, result_prompt_en]) => ({ ...item, label_tr, result_prompt_en })));
  const exactAvailable = expanded.filter((item) => !blocked.has(item.label_tr.toLowerCase()));
  const diverseAvailable = exactAvailable.filter((item) => !blockedBase.has(stripRoleSuffix(item.label_tr)));
  // Prefer a genuinely different action, not merely a new contextual suffix.
  // If the bounded route is exhausted, relax to exact-text filtering so the
  // stream can never dead-end.
  const available = diverseAvailable.length >= 2 ? diverseAvailable : exactAvailable;
  const contextual = available.filter(related);
  const routePool = (contextual.length >= 2 ? contextual : available.length >= 2 ? available : FALLBACK_CATALOG).slice();
  const grounded = routePool.filter((item) => fallbackGroundingScore(item, story) >= 2);
  const plausible = routePool.filter((item) => fallbackGroundingScore(item, story) >= 1);
  // Never expose score-0 catalog imports. Score-1 is reserved for a direct
  // adjacent transition and can only be selected as the counterpoint.
  let source = (grounded.length >= 2 ? grounded : plausible.length >= 2 ? plausible : grounded).slice();
  // A custom/current location can legitimately leave only one catalogue
  // candidate.  Add a tiny compositional observation of that committed space
  // rather than importing an unrelated score-0 trope or returning undefined.
  if (source.length < 2) {
    const location = String(story.current_location || "current_scene").replaceAll("_", " ").trim();
    const slug = location.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "scene";
    const sceneCandidate = {
      state_id: `fallback_scene_${slug}`,
      label_tr: `${location}yi gözle`,
      result_prompt_en: `The current ${location} remains clearly visible in the dream scene.`,
      group: "discovery",
      renderability: "high",
      state_patch: { recent_event: `observed_${slug}` },
    };
    if (!source.length) source.push(sceneCandidate);
    if (source.length < 2) source.push({
      ...sceneCandidate,
      state_id: `fallback_scene_observe_${slug}`,
      label_tr: `${location}nin ışığını izle`,
      result_prompt_en: `The light within the current ${location} remains clearly visible in the dream scene.`,
      state_patch: { recent_event: `observed_light_in_${slug}` },
    });
  }
  const route = FALLBACK_CONTEXT_ROUTES.find((candidate) => candidate.match.test(locationContext) || candidate.match.test(context));
  const byIds = (ids) => {
    const order = new Map(ids.map((id, index) => [id, index]));
    return source.filter((item) => order.has(item.state_id)).sort((a, b) => order.get(a.state_id) - order.get(b.state_id));
  };
  // Keep the pair varied: the first option follows the current route, while
  // the second bends it through a bounded symbolic/environmental surprise.
  const novelty = (pool) => {
    const scored = pool.map((item) => ({ item, penalty: visualMotifPenalty(item, story) }));
    const minimum = scored.reduce((min, entry) => Math.min(min, entry.penalty), Number.POSITIVE_INFINITY);
    const fresh = scored.filter((entry) => entry.penalty < 8);
    const selected = fresh.length >= 2 ? fresh : scored.filter((entry) => entry.penalty === minimum);
    return (selected.length ? selected : scored).map((entry) => entry.item);
  };
  const naturalCandidates = novelty(route ? byIds(route.natural) : source.filter((item) => item.group === "travel" || item.group === "discovery" || item.group === "object_action"));
  // A continuation should normally move the dream into a new connected
  // place. Keep same-location actions available only when all route exits are
  // blocked or exhausted; the counterpoint remains free to linger and alter
  // the current scene.
  const movedNatural = naturalCandidates.filter((item) => item.state_patch?.current_location && item.state_patch.current_location !== locationContext);
  const objectNatural = naturalCandidates.filter((item) => item.group === "object_action");
  // Use the already-bounded event window as a light novelty signal. It is not
  // a world map and does not add memory: it only prevents a safe destination
  // that appeared in the last few committed events from being selected again
  // when another connected route is available.
  const recentEventText = story.recent_events.join(" ").toLowerCase();
  const recentlyCommitted = (item) => {
    const event = String(item.state_patch?.recent_event || "").toLowerCase();
    const target = String(item.state_patch?.current_location || "").toLowerCase();
    // State patches have a stable, bounded event id. Prefer it for the
    // recency check, then fall back to the location token when available.
    // Do not compare loose words from the event history: a shared word such
    // as "glowing" would incorrectly mark every light/tree/portal branch as
    // recently committed and collapse the connected route pool.
    return (event && recentEventText.includes(event)) || (target && recentEventText.includes(target));
  };
  // Keep the established opening/empty-memory route stable. Ordinary-object
  // actions become part of the continuation pool once committed visual
  // history exists, which is when trope novelty has evidence to work from.
  // A natural continuation may be a same-space interaction (follow the
  // established light, inspect the radio) as well as a move to a new place.
  // Keep route candidates available; the grounding gate and recent-event
  // filter, rather than a blanket location-change requirement, decide what
  // can be shown.
  const naturalItems = movedNatural.length ? [...movedNatural, ...objectNatural] : naturalCandidates;
  const naturalBase = [...new Map(naturalItems.map((item) => [item.state_id, item])).values()];
  const freshNatural = naturalBase.filter((item) => !recentlyCommitted(item));
  const nonStaleSource = source.filter((item) => !recentlyCommitted(item));
  const naturalPool = freshNatural.length ? freshNatural : nonStaleSource.length ? nonStaleSource : naturalBase.length ? naturalBase : source;
  const surprisePool = novelty(route ? byIds(route.surprise) : source.filter((item) => item.group === "environment" || item.group === "surreal" || item.group === "object" || item.group === "object_action" || item.group === "transformation"));
  const freshSurprise = surprisePool.filter((item) => !recentlyCommitted(item));
  const familyPenalty = (item) => {
    const family = situationFamilyForOption(item);
    const count = familyCounts.get(family) || 0;
    // Keep a natural route available, but when one family has dominated the
    // bounded history prefer a contextual alternative from another family.
    return count >= 3 ? 40 : count >= 2 ? 12 : count;
  };
  // Include the bounded displayed-option window in deterministic rotation so
  // the finite safe pool does not settle into the same ordered pair after a
  // location cycle. This is still bounded memory, not a growing transcript.
  const rotationSeed = [...story.recent_events, ...story.current_scene_entities, ...story.scene_anchors.map((a) => a.text), ...previous.slice(-8)].join("|");
  const stableOrder = (item) => {
    let hash = 0; for (const char of `${rotationSeed}|${item.state_id}|${item.label_tr}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash;
  };
  const pick = (pool) => {
    const ranked = pool.map((item) => ({ item, score: familyPenalty(item) }));
    const best = ranked.length ? Math.min(...ranked.map((entry) => entry.score)) : 0;
    const candidates = ranked.filter((entry) => entry.score === best).map((entry) => entry.item).sort((a, b) => stableOrder(a) - stableOrder(b));
    return candidates[Math.floor(random() * candidates.length)] || source[Math.floor(random() * source.length)];
  };
  const first = pick(naturalPool.length ? naturalPool : source);
  const secondSource = freshSurprise.length ? freshSurprise : surprisePool.length ? surprisePool : source;
  const firstIntent = inferIntent(first.label_tr);
  const firstCategory = optionCategory(first.label_tr);
  // Prefer a different category inside the route's surprise pool. If that
  // pool is intentionally homogeneous (e.g. two atmospheric counterpoints),
  // keep the route's own choices rather than teleporting to an unrelated
  // object solely to satisfy a heuristic.
  const categoryDiverse = secondSource.filter((item) => item.state_id !== first.state_id && optionCategory(item.label_tr) !== firstCategory);
  const differentIntent = (categoryDiverse.length ? categoryDiverse : secondSource).filter((item) => inferIntent(item.label_tr) !== firstIntent);
  let secondCandidates = (differentIntent.length ? differentIntent : (categoryDiverse.length ? categoryDiverse : secondSource)).filter((item) => item.state_id !== first.state_id);
  const nonDominantFamily = secondCandidates.filter((item) => situationFamilyForOption(item) !== situationFamilyForOption(first));
  if (nonDominantFamily.length) secondCandidates = nonDominantFamily;
  const distinctSource = source.filter((item) => item.state_id !== first.state_id);
  if (!secondCandidates.length && !distinctSource.length) {
    const location = String(story.current_location || "current scene").replaceAll("_", " ").trim();
    secondCandidates = [{ state_id: `fallback_scene_counter_${location.replace(/[^a-z0-9]+/gi, "_")}`, label_tr: `${location}nin sessizliğini izle`, result_prompt_en: `The quiet atmosphere of the current ${location} remains clearly visible.`, group: "environment", renderability: "high", state_patch: { recent_event: `observed_quiet_${location.replace(/[^a-z0-9]+/gi, "_")}` } }];
  }
  const second = pick(secondCandidates.length ? secondCandidates : distinctSource);
  return fallbackRecord([first, second], story);
}

export function optionMeta(options, winner) {
  const index = winner === "1" ? "1" : "2";
  const id = options?.[`option_${index}_id`];
  const fallback = FALLBACK_BY_ID.get(id) || FALLBACK_BY_LABEL.get(String(options?.[`option_${index}_tr`] || "").toLowerCase());
  const sceneAnchors = options?.[`option_${index}_scene_anchors`] || fallback?.state_patch?.scene_anchors || [];
  const statePatch = options?.[`option_${index}_state_patch`] || fallback?.state_patch || { recent_event: "entered_a_new_strange_scene" };
  const label = options?.[`option_${index}_tr`] || fallback?.label_tr || "";
  return { resultPrompt: options?.[`option_${index}_result_prompt_en`] || options?.[`option_${index}_en`] || fallback?.result_prompt_en || "A strange new environment is now visible.", statePatch: sceneAnchors.length ? { ...statePatch, scene_anchors: sceneAnchors } : statePatch, sceneAnchors, intent: options?.[`option_${index}_intent`] || inferIntent(label), psycheDelta: options?.[`option_${index}_psyche_delta`] || psychologyDeltaForIntent(options?.[`option_${index}_intent`] || inferIntent(label), label), symbolDelta: options?.[`option_${index}_symbol_delta`] || sceneAnchors, archetypalRole: options?.[`option_${index}_archetypal_role`] || (index === "1" ? "continuation" : "counterpoint") };
}

function compactSceneManifest(storyState = defaultStoryState(), psyche = normalizeDreamPsyche()) {
  const story = normalizeStoryState(storyState);
  const visibleAnchors = story.scene_anchors.filter((anchor) => Number(anchor?.ttl ?? 3) > 1).slice(-3).map((anchor) => anchor.text);
  const psycheSymbols = (psyche.recurring_symbols || []).slice(-2).flatMap((item) => [item.symbol, ...(item.contexts || []).slice(-1)]).filter(Boolean);
  const memory = { recent_events: story.recent_events.slice(-4), earned_symbols: psycheSymbols, relevant_anchors: visibleAnchors };
  const dominant = Object.entries(psyche.tensions || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || "curiosity";
  const meaningDirection = dominant === "confrontation" ? "confront_or_avoid" : dominant === "control" ? "control_or_surrender" : dominant === "avoidance" ? "remember_or_suppress" : "connect_or_isolate";
  const jung = { dominant_tension: dominant, meaning_direction: meaningDirection, compensation: psyche.compensation_pressure >= 0.5 ? "preserve_or_observe" : "counterbalance", collective_tendency: psyche.collective_tendency || psyche.field || "threshold", unresolved_motif: (psyche.open_loops || [])[0] || null };
  const affordances = sceneAffordances(story.current_location, story.current_scene_entities);
  return { CURRENTLY_VISIBLE_OR_COMMITTED: { location: story.current_location, entities: story.current_scene_entities.slice(-5), figures: [story.character_state], environment: visibleAnchors.slice(-2), event: story.recent_events.at(-1) || null, spatial_action_types: affordances }, MEMORY: { ...memory, entities: story.memory_entities.slice(-8) }, JUNG_STATE: jung, STALE_OR_UNCONFIRMED: { hooks: story.open_hooks.slice(-3) } };
}

function compactManifestText(manifest) {
  const visible = manifest.CURRENTLY_VISIBLE_OR_COMMITTED || {}; const memory = manifest.MEMORY || {}; const jung = manifest.JUNG_STATE || {}; const stale = manifest.STALE_OR_UNCONFIRMED || {};
  return `CURRENT_SCENE_ENTITIES (physically present and authoritative): location=${visible.location || "current_scene"}; entities=${(visible.entities || []).join(",") || "none"}; figure=${(visible.figures || []).join(",") || "none"}; environment=${(visible.environment || []).join(",") || "none"}; event=${visible.event || "none"}; allowed_action_types=${(visible.spatial_action_types || []).slice(0, 6).join(",")}. MEMORY_ENTITIES (not physically present unless explicitly remembered): ${(memory.entities || []).join(",") || "none"}; recent_events=${(memory.recent_events || []).slice(-2).join(",") || "none"}; symbols=${(memory.earned_symbols || []).slice(-2).join(",") || "none"}. JUNG_STATE: tension=${jung.dominant_tension || "curiosity"}; meaning_direction=${jung.meaning_direction || "connect_or_isolate"}; compensation=${jung.compensation || "counterbalance"}; collective=${typeof jung.collective_tendency === "string" ? jung.collective_tendency : "bounded"}. STALE_OR_UNCONFIRMED: hooks=${(stale.hooks || []).slice(-1).join(",") || "none"}.`;
}

function sceneAffordances(location = "", objects = []) {
  const established = Array.isArray(objects) ? objects.map((item) => String(item).replaceAll("_", " ")).filter(Boolean) : [];
  const actions = ["observe surroundings", "remain still", "move within current space", "interact with current figure"];
  for (const entity of established.slice(-4)) actions.push(`interact with established ${entity}`);
  if (established.some((item) => /light|ışık|path|yol|bridge|köprü|door|kapı|tunnel|tünel/.test(item.toLowerCase()))) actions.push("move toward an established feature");
  return actions.slice(0, 7);
}

const TR_RESULT_TERMS = [
  ["fener", "the old lantern"], ["lantern", "the old lantern"], ["sis", "the silver fog"], ["fog", "the silver fog"], ["mist", "the silver fog"], ["köprü", "the misty bridge"], ["bridge", "the misty bridge"], ["su", "the distant water"], ["water", "the distant water"], ["figür", "the anonymous figure"], ["figure", "the anonymous figure"], ["ışık", "a visible light"], ["light", "a visible light"], ["kapı", "the doorway"], ["door", "the doorway"], ["pencere", "the window"], ["window", "the window"], ["merdiv", "the stairs"], ["stairs", "the stairs"], ["koridor", "the corridor"], ["corridor", "the corridor"], ["tünel", "the tunnel"], ["tunnel", "the tunnel"], ["araba", "the mysterious car"], ["car", "the mysterious car"], ["radyo", "the old radio"], ["radio", "the old radio"], ["makine", "the strange machine"], ["makin", "the strange machine"], ["machine", "the strange machine"], ["mavi", "blue light"], ["blue", "blue light"], ["yans", "blue reflections"], ["reflection", "blue reflections"], ["anahtar", "the iron key"], ["key", "the iron key"], ["ağaç", "the overgrown tree"], ["tree", "the overgrown tree"], ["ayna", "the mirror"], ["mirror", "the mirror"], ["orman", "the forest"], ["forest", "the forest"], ["masa", "the wooden table"], ["table", "the wooden table"], ["fotoğraf", "the old photograph"], ["photograph", "the old photograph"], ["saat", "the broken watch"], ["watch", "the broken watch"], ["çay", "the warm tea"], ["tea", "the warm tea"], ["yağmur", "the rain"], ["rain", "the rain"], ["gölge", "the shadow"], ["shadow", "the shadow"]
];

function resultStateFromLabel(label, storyState) {
  const location = String(storyState?.current_location || "current scene").replaceAll("_", " ");
  const lower = String(label || "").toLowerCase();
  const matches = TR_RESULT_TERMS.filter(([term]) => lower.includes(term)).map(([, english]) => english);
  const subject = matches.slice(0, 2).join(" and ") || "the visible surroundings";
  if (/alt|aşağı|beneath/.test(lower) && /köprü|bridge/.test(`${lower} ${location}`)) return `The anonymous figure is now beneath the misty bridge near the water.`;
  if (/sonuna|ilerle|yaklaş|geç/.test(lower) && /köprü|bridge/.test(`${lower} ${location}`)) return `The anonymous figure is now farther along the misty bridge.`;
  if (/yanıyor|parla|ışık/.test(lower)) return `${subject} is now visibly glowing in the ${location}.`;
  if (/yoğun|çök|kapla|artar/.test(lower) && /sis/.test(lower)) return `Silver fog now visibly covers the ${location}.`;
  if (/gizli|ortaya|belir/.test(lower)) return `A subtle new detail is now visible within the ${location}: ${subject}.`;
  return `The ${location} now clearly shows ${subject}.`;
}

function englishLabelFromTurkish(label) {
  const replacements = [["yaklaş", "approach"], ["uzaklaş", "move away"], ["ilerle", "move forward"], ["takip et", "follow"], ["gir", "enter"], ["çık", "go out"], ["dön", "return"], ["gözlemle", "observe"], ["gözle", "observe"], ["incele", "inspect"], ["dokun", "touch"], ["aç", "open"], ["kapat", "close"], ["bekle", "wait"], ["kal", "stay"], ["fener", "lantern"], ["sis", "fog"], ["köprü", "bridge"], ["su", "water"], ["figür", "figure"], ["ışık", "light"], ["kapı", "door"], ["pencere", "window"], ["merdiven", "stairs"], ["koridor", "corridor"], ["tünel", "tunnel"], ["araba", "car"], ["radyo", "radio"], ["makine", "machine"], ["ayna", "mirror"], ["orman", "forest"], ["masa", "table"], ["saat", "watch"], ["fotoğraf", "photograph"], ["bodrum", "basement"], ["yağmur", "rain"], ["gölge", "shadow"]];
  let text = String(label || "").toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim();
  const phrases = [["makine odasını incele", "inspect the machine room"], ["figürü gözlemle", "observe the anonymous figure"], ["figürden uzaklaş", "move away from the figure"], ["kırmızı eve yaklaş", "approach the red house"], ["evin içine gir", "enter the house"], ["çatlak yolda ilerle", "walk along the cracked path"], ["bodrum kapısını aç", "open the basement door"], ["bodrum kapısına yaklaş", "approach the basement door"], ["bodruma in", "go down to the basement"], ["merdivene yönel", "move toward the stairwell"], ["sokağa doğru ilerle", "move toward the quiet street"], ["koridora gir", "enter the corridor"]];
  const phrase = phrases.find(([tr]) => text === tr);
  if (phrase) return phrase[1].replace(/^./, (char) => char.toUpperCase());
  return text.split(/\s+/).map((word) => replacements.find(([tr]) => word === tr || (tr.length >= 3 && word.startsWith(tr)))?.[1] || word).join(" ").replace(/^./, (char) => char.toUpperCase());
}

function candidateIntent(label, index) {
  const clean = String(label || ""); const inferred = inferIntent(clean); if (inferred !== "observe") return inferred;
  const category = optionCategory(clean); if (category === "travel") return index % 2 ? "approach" : "follow";
  if (category === "object_interaction") return index % 2 ? "inspect" : "activate";
  if (category === "environmental_shift") return index % 2 ? "surrender" : "preserve";
  if (category === "memory_trace") return "listen";
  if (category === "consequence") return "activate";
  return index % 2 ? "observe" : "approach";
}

function normalizeConsequence(value) {
  let text = String(value || "").replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (!text || text.split(/\s+/).length > 12 || BLOCKED.some((pattern) => pattern.test(text))) return "";
  // The model sometimes writes a transition verb even though this field is
  // the post-action still. Canonicalize only these unambiguous forms into a
  // visible completed state; do not add props or locations.
  text = text.replace(/^(.*)\s+enters\s+(.+)$/i, "$1 is now inside $2")
    .replace(/^(.*)\s+is now entering\s+(.+)$/i, "$1 is now inside $2")
    .replace(/^(.*)\s+leaves\s+(.+)$/i, "$1 is now outside $2")
    .replace(/^(.*)\s+moves closer to\s+(.+)$/i, "$1 is now closer to $2")
    .replace(/^(.*)\s+approaches\s+(.+)$/i, "$1 is now near $2")
    .replace(/^(.*)\s+steps into\s+(.+)$/i, "$1 is now inside $2")
    .replace(/^(.*)\s+stands near\s+(.+)$/i, "$1 is now standing near $2")
    .replace(/^(.*)\s+stands beside\s+(.+)$/i, "$1 is now standing beside $2")
    .replace(/^(.*)\s+is moving toward\s+(.+)$/i, "$1 is now near $2")
    .replace(/^(.*)\s+is now moving toward\s+(.+)$/i, "$1 is now near $2")
    .replace(/^(.*)\s+is now approaching\s+(.+)$/i, "$1 is now near $2");
  if (text.split(/\s+/).length > 12) return "";
  return text;
}

// A single still image must communicate the consequence without relying on
// sound, smell, internal thought or time-based action.  Keep this deliberately
// small and conservative: visible surreal transformations remain allowed.
export function staticVisibleConsequence(text) {
  const value = String(text || "").trim();
  if (!renderablePrompt(value)) return false;
  if (value.split(/\s+/).length < 3) return false;
  if (!/\b(is|are|now|becomes|turns|opens|closes|remains|stands|lies|appears|visible|covered|filled|glows|fades|reaches|leads|shifts|moves|answers|recedes|guides|differs|holds|emerges|stretches|disappears|points|swallowed|warms|vibrates|tilted|changed|changes|forms|divides|falls|gathers|absorbed)\b/i.test(value)) return false;
  const nonVisual = /\b(sound|audible|echo|voice|voices|whisper|whispers|broadcast|speaks|speaking|playing|louder|smell|smells|odor|temperature|warmth|cold|colder|feels|feeling|thinks|thinking|remembers|remembered|memory|time passes|time stops|stops time|heartbeat|breathing|breath|silence|silent|quietly|still)\b/i.test(value);
  if (!nonVisual) return true;
  return /\b(visibly|visible|shows|shown|appears|appeared|handprint|glow|glows|darkens|brightens|rings|line|open|opened|closed|ajar|closer|farther|shifted|tilted|turned|repositioned|stretched|displaced)\b/i.test(value);
}

function candidateEntitiesForText(text, story) {
  const lower = String(text || "").toLowerCase();
  // Use the sanitized committed manifest rather than the bounded historical
  // entity list. The latter can still contain a previous location for memory
  // purposes and must never become a physical affordance in the next scene.
  const activeEntities = sceneManifestFor(story).entities;
  return activeEntities.filter((entity) => {
    const value = String(entity).replaceAll("_", " ").toLowerCase();
    return value && (lower.includes(value) || tokenizeScene(value).some((token) => token.length > 3 && lower.includes(token)));
  }).slice(0, 3);
}

function inferGroundedStateMutation(action, result, manifest, grounded = []) {
  const text = `${action} ${result}`.toLocaleLowerCase("tr-TR");
  const physical = `${manifest.entities.join(" ")} ${manifest.location}`.toLocaleLowerCase("tr-TR").replaceAll("_", " ");
  const targets = [
    ["door", /kapı|kapi|door/], ["machine", /makine|machine/], ["radio", /radyo|radio/],
    ["window", /pencere|window|cam/], ["light", /ışık|isik|light|parıltı|parilti/],
    ["shadow", /gölge|golge|shadow/], ["path", /yol|path/], ["stairs", /merdiven|basamak|stairs/],
    ["water", /su|water/], ["photograph", /fotoğraf|fotograf|photograph|photo/],
    ["mirror", /ayna|mirror|reflection|yansıma/], ["object", /obje|nesne|object/],
    ["figure", /figür|figur|figure|character|anonymous/],
  ];
  const target = targets.find(([name, pattern]) => pattern.test(text) && (physical.includes(name) || grounded.some((item) => String(item).toLowerCase().includes(name))))?.[0] || (grounded.length ? String(grounded[0]).toLowerCase().split(/\s+/).at(-1) : "scene");
  let toState = "changed";
  if (target === "door") toState = /kapat|close/.test(text) ? "closed" : /arala|slightly open|ajar/.test(text) ? "ajar" : /aç|ac|open/.test(text) ? "open" : /gölge|shadow/.test(text) ? "shadow_shifted" : "revealed";
  else if (target === "machine" || target === "radio") toState = /sustur|durdur|deactivate|silent|dark/.test(text) ? "off" : /çalıştır|calistir|activate|turn on|glow/.test(text) ? "on" : /yaklaş|yaklas|closer|approach/.test(text) ? "near" : /uzak|farther|away/.test(text) ? "far" : "revealed";
  else if (target === "figure") toState = /uzak|farther|away/.test(text) ? "far" : /yaklaş|yaklas|closer|near/.test(text) ? "near" : /takip|follow|lead/.test(text) ? "leading" : /saklan|obscur|hide/.test(text) ? "obscured" : /görmezden|ignore|peripheral/.test(text) ? "peripheral" : /turn|dön/.test(text) ? "turned" : "changed";
  else if (target === "light") toState = /dark|sön|off/.test(text) ? "off" : /dim|fades|edge|outside/.test(text) ? "dim" : /bright|glow/.test(text) ? "bright" : "redirected";
  else if (target === "shadow") toState = /stretch|uz|long/.test(text) ? "extended" : /recede|uzak/.test(text) ? "receded" : "shifted";
  else if (target === "water") toState = /ring|ripple|dalga/.test(text) ? "rippled" : /reveal|visible|altına/.test(text) ? "revealed" : "changed";
  else if (target === "photograph") toState = /face down|çevir|cevir/.test(text) ? "turned" : /missing face/.test(text) ? "face_changed" : "revealed";
  else if (target === "window" || target === "mirror") toState = /handprint|el izi/.test(text) ? "marked" : /reflection|yansı|out of sync|shift/.test(text) ? "reflection_changed" : /open|aç|ac/.test(text) ? "open" : /close|kapat/.test(text) ? "closed" : "changed";
  else if (target === "path" || target === "stairs") toState = /farther|ilerle|move|lower|in|geç|cross/.test(text) ? "advanced" : /trace|iz|mark|çatlak/.test(text) ? "marked" : "changed";
  else if (target === "object") toState = /hand|held|al/.test(text) ? "held" : /tilt|orientation|çevir/.test(text) ? "reoriented" : "revealed";
  const current = entityStateForMutation(manifest, { target_entity: target, to_state: toState });
  if (current === toState) return null;
  return { target_entity: target, from_state: current, to_state: toState, opens: [], closes: [] };
}

function qwenCandidateRecord(action, consequence, nextLocation, index, storyState, psyche, emergency = false, entityStateMutation = null) {
  const story = normalizeStoryState(storyState); const rawAction = String(action || "").trim(); const clean = normalizeQwenLabel(rawAction); const result = normalizeConsequence(consequence); const slug = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 36) || `candidate_${index}`;
  const intent = candidateIntent(clean, index); const grounded = candidateEntitiesForText(`${clean} ${result}`, story).filter((entity) => String(entity).trim().split(/\s+/).length <= 5); const anchors = story.scene_anchors.filter((anchor) => Number(anchor?.ttl ?? 3) > 1).slice(-1).map((anchor) => anchor.text).filter((anchor) => renderablePrompt(anchor));
  const sceneAnchor = [...anchors, result].filter((anchor) => renderablePrompt(anchor)).slice(-3);
  const manifest = sceneManifestFor(story);
  // Qwen occasionally appends punctuation or a prose prefix to the place
  // value. Normalize that harmless formatting before applying the adjacency
  // gate so a valid current/neighbor location is not rejected accidentally.
  const requestedLocation = String(nextLocation || "").trim().toLowerCase().replace(/^\s*(?:location|place)\s*[:=]\s*/i, "").replace(/[^a-z0-9_ -]/g, "").replace(/\s+/g, "_");
  // Scene-local observation/stay actions cannot silently become a route just
  // because Qwen copied an adjacent place into the third tuple field. Keep
  // their destination on the committed scene; navigation must be explicit in
  // the Turkish action itself.
  const sceneLocalAction = /^(?:mek[âa]nda(?: sessizce)? kal|mek[âa]n[ıi] gözlemle|çevreyi gözlemle|sessizce bekle|mek[âa]nda dolaş|figürü gözlemle|figürden uzaklaş)$/i.test(clean);
  const location = sceneLocalAction ? manifest.location : ((manifest.adjacent_locations.includes(requestedLocation) || requestedLocation === manifest.location || !requestedLocation) ? (requestedLocation || manifest.location) : manifest.location);
  // A manifest describes the newly committed still, not an ever-growing
  // inventory.  Keep the destination plus only entities actually named by
  // the selected action/result; older entities remain memory-only.
  const destinationEntity = location.replaceAll("_", " ");
  const figureVisible = /figure|character|anonymous|figür|kişi/.test(`${clean} ${result}`.toLowerCase());
  const entities = location === manifest.location
    ? [...manifest.entities]
    : [...new Set([...(SCENE_DEFAULT_ENTITIES[location] || [destinationEntity]), destinationEntity, ...grounded, ...(figureVisible ? ["anonymous figure"] : [])])].slice(0, 5);
  const routeParts = optionRouteParts({ label_tr: clean });
  const routeAction = /(^|[\s,])(ilerle|yaklaş|yaklas|gir|çık|cik|geç|gec|in|dön|don|yönel|yonel|takip|sap|move|enter|return|follow|walk)(?=$|[\s,.!?])/i.test(clean) ? routeParts.target : "";
  const resolvedMutation = entityStateMutation || (location === manifest.location && !routeAction ? inferGroundedStateMutation(clean, result, manifest, grounded) : null);
  // A visible-entity action ("Ağaca dokun", "Makineyi incele") remains
  // scene-local even if the compact model copies a stale/irrelevant third
  // tuple field. Only an actual navigation label is subject to the strict
  // adjacency rejection; the action/result grounding still guards content.
  const hasRealAdjacentLocation = manifest.adjacent_locations.some((adjacent) => adjacent && adjacent !== manifest.location);
  const navigationSelfLoop = Boolean(routeAction && requestedLocation === manifest.location && hasRealAdjacentLocation);
  const invalidLocation = navigationSelfLoop || Boolean(requestedLocation && !sceneLocalAction && routeAction && requestedLocation !== manifest.location && requestedLocation !== location && !manifest.adjacent_locations.includes(requestedLocation));
  const routeType = routeAction && location !== manifest.location ? "navigation" : "scene_local";
  const targetEntity = routeType === "navigation" ? location : (resolvedMutation?.target_entity || String(grounded[0] || "scene").toLowerCase().replace(/\s+/g, "_"));
  return { state_id: `qwen_${slug}_${index}`, label_tr: clean, result_prompt_en: result, next_location: location, raw_action: rawAction, invalid_action_language: !(looksTurkishAction(rawAction) || looksTurkishAction(clean)), invalid_location: invalidLocation, group: optionCategory(`${clean} ${result}`), behavior_family: intent, psychological_vector: psychologicalVectorForBehavior(intent), target_entity: targetEntity, resulting_state: routeType === "navigation" ? `location:${location}` : (resolvedMutation?.to_state || "visible_result"), route_type: routeType, entity_state_mutation: resolvedMutation, state_patch: { current_location: location, recent_event: `qwen_${slug}`, current_scene_entities_add: grounded.slice(0, 3), scene_anchors: sceneAnchor.length ? sceneAnchor : anchors, result_summary: result, ...(resolvedMutation ? { entity_state_mutation: resolvedMutation } : {}), current_scene_manifest: { location, entities, adjacent_locations: SCENE_ADJACENCY[location] || [location], summary: result } }, scene_anchors: sceneAnchor, option_en: englishLabelFromTurkish(clean), intent, psyche_delta: psychologyDeltaForIntent(intent, clean), symbol_delta: sceneAnchor.slice(-1), archetypal_role: index === 0 ? "continuation" : "counterpoint", grounded_entities: sceneEntityTokens(story), emergency };
}

function looksTurkishAction(value) {
  const text = String(value || "").trim().toLocaleLowerCase("tr-TR");
  if (!text || /\b(stand|turn|walk|look|move|stay|wait|open|close|follow|watch|enter|leave)\b/.test(text)) return false;
  return /[çğıöşü]|\b(kapı|kapi|yol|ev|ağaç|agac|figür|figur|yaklaş|yaklas|uzaklaş|uzaklas|ilerle|izle|incele|dön|don|yönel|yonel|düzelt|duzelt|bak|kal|bekle|aç|ac|kapat|dokun|yürü|yuru|çevir|cevir|çalıştır|calistir|bırak|birak|gölge|golge|pencere|fotoğraf|fotograf|makine|radyo|bodrum|merdiven|sokak|içine|in)\b/.test(text);
}

function normalizeQwenLabel(value) {
  let text = String(value || "").replaceAll("_", " ").replace(/\s+/g, " ").trim().toLowerCase();
  // The compact model may echo a destination hint (for example
  // "basement=enter...") inside the action field. The destination is already
  // validated separately, so retain only the actual viewer-facing action.
  text = text.replace(/^[^=]{1,60}=\s*/, "");
  const compounds = [["the figure is now near the red house", "kırmızı eve yaklaş"], ["figure is now near the red house", "kırmızı eve yaklaş"], ["the figure is now near the red house doorstep", "kırmızı eve yaklaş"], ["figure is now yakınında red ev", "kırmızı eve yaklaş"], ["anonymous figure uzaklaş", "figürden uzaklaş"], ["anonymous figure is now moving away", "figürden uzaklaş"], ["anonymous figure is now far away", "figürden uzaklaş"], ["check the red house hallway", "evin koridoruna gir"], ["check red house hallway", "evin koridoruna gir"], ["observe the anonymous figure", "figürü gözlemle"], ["approach the red house doorstep", "kırmızı eve yaklaş"], ["approach red house doorstep", "kırmızı eve yaklaş"], ["enter the red house", "evin içine gir"], ["open the established front door", "ön kapıyı aç"], ["touch the established tree", "ağaca dokun"], ["touch bare ağaç", "ağaca dokun"], ["touch the bare tree", "ağaca dokun"], ["inspect the established machine room", "makine odasını incele"], ["inspect machine room", "makine odasını incele"], ["walk along the established path", "çatlak yolda ilerle"], ["walk along the cracked path", "çatlak yolda ilerle"], ["walk along the path", "yolda ilerle"], ["follow the path", "yolu takip et"], ["touch the tree", "ağaca dokun"], ["approach the basement door", "bodrum kapısına yaklaş"], ["approach basement door", "bodrum kapısına yaklaş"], ["approach the door", "kapıya yaklaş"], ["enter the red house hallway", "evin koridoruna gir"], ["enter the hallway", "koridora gir"], ["enter the machine room", "makine odasına gir"], ["go into the machine room", "makine odasına gir"], ["enter the basement", "bodruma in"], ["go to the basement", "bodruma in"], ["move toward the street", "sokağa ilerle"], ["return outside", "dışarı dön"], ["iron keyyi", "demir anahtarı"], ["overgrown treeyi", "aşırı büyümüş ağacı"], ["broken watchyi", "bozuk saati"], ["old tableyi", "eski masayı"], ["old watchyi", "eski saati"], ["old radioyi", "eski radyoyu"], ["old lanternyi", "eski feneri"], ["giant mirroryi", "büyük aynayı"], ["strange machineyi", "garip makineyi"], ["glowing treeyi", "parlayan ağacı"], ["parlayan orbs", "parlayan küreleri"], ["old photographyi", "eski fotoğrafı"], ["old photography", "eski fotoğraf"], ["long corridor", "uzun koridor"], ["standing alone", "figürü"], ["yol tarzı", "yolu"], ["fotoğrafı çeviryi incele", "fotoğrafı çevir"], ["radyoyu kapatyi incele", "radyoyu kapat"], ["koridoru süzyi incele", "koridoru süz"], ["fogu izle", "sisi izle"], ["fog u izle", "sisi izle"], ["kapıyı yaklaşıyorsun", "kapıya yaklaş"], ["kapıya doğru ilerley", "kapıya doğru ilerle"], ["old radioyi çalıştır", "eski radyoyu çalıştır"], ["slowly", "yavaşça"], ["far end approaches", "köprünün sonuna yaklaş"], ["far end", "uzak köprü sonu"], ["bridge stands alone", "köprüde bekle"], ["dikkat çekici yansımalar", "yansımaları incele"]];
  for (const [from, to] of compounds) text = text.replaceAll(from, to);
  const words = [["the", ""], ["inside", "içinde"], ["into", "içine"], ["outside", "dışarı"], ["near", "yakınında"], ["toward", "doğru"], ["along", "boyunca"], ["walk", "yürü"], ["enter", "gir"], ["leave", "çık"], ["old", "eski"], ["strange", "garip"], ["glowing", "parlayan"], ["silver", "gümüş"], ["fog", "sis"], ["mist", "sis"], ["photography", "fotoğraf"], ["bridge", "köprü"], ["door", "kapı"], ["window", "pencere"], ["stairs", "merdiven"], ["corridor", "koridor"], ["tunnel", "tünel"], ["basement", "bodrum"], ["car", "araba"], ["radio", "radyo"], ["machine", "makine"], ["key", "anahtar"], ["tree", "ağaç"], ["mirror", "ayna"], ["table", "masa"], ["watch", "saat"], ["light", "ışık"], ["path", "yol"], ["water", "su"], ["forest", "orman"], ["house", "ev"], ["room", "oda"], ["orb", "küre"], ["orbs", "küreler"], ["end", "son"], ["far", "uzak"], ["beneath", "altında"], ["under", "altında"], ["approaches", "yaklaşır"], ["approach", "yaklaş"], ["opens", "açılır"], ["opened", "açıldı"], ["moves", "ilerler"], ["flows", "akar"], ["grows", "büyür"], ["observe", "izle"], ["observes", "izler"], ["follows", "takip eder"], ["follow", "takip et"], ["stands", "durur"], ["persists", "sürer"], ["shimmers", "parıldar"], ["ignite", "yak"], ["ignites", "yakar"], ["extinguish", "söndür"], ["extinguishes", "söndürür"], ["turn", "çevir"], ["turns", "çevirir"], ["activate", "aktive et"], ["activates", "aktive eder"], ["silence", "sustur"], ["silent", "sessiz"]];
  // Keep the English-to-Turkish pass exact-token based.  The previous
  // `includes("in")` mapping turned `incele` into the unrelated "go down"
  // action, which then made an otherwise good Qwen answer fail validation.
  for (const [from, to] of words) text = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  const suffixes = [["radyoyi", "radyoyu"], ["lanternyi", "feneri"], ["makineyi", "makineyi"], ["machineyi", "makineyi"], ["keyyi", "anahtarı"], ["treeyi", "ağacı"], ["mirroryi", "aynayı"], ["tableyi", "masayı"], ["watchyi", "saati"], ["radioyi", "radyoyu"]];
  for (const [from, to] of suffixes) text = text.replaceAll(from, to);
  text = text.replaceAll("kapıyu", "kapıyı").replaceAll("kapıyi", "kapıyı").replaceAll("orbsu", "küreyi");
  text = text.replace(/\byaklaş\s+bodrum\s+kapı\b/gi, "bodrum kapısına yaklaş").replace(/\bgir\s+makine\s+oda\b/gi, "makine odasına gir");
  text = text.replace(/\bbasement\s+kapı[^\s]*\s+aç/gi, "bodrum kapısını aç").replace(/\bbasement\s+kapı[^\s]*\s+(gir|yaklaş)/gi, "bodrum kapısına yaklaş").replace(/\bbasement\s+door[^\s]*\s+open\b/gi, "bodrum kapısını aç");
  text = text.replace(/\bevin içine gir\s+(hallway|corridor)\b/gi, "evin içine gir").replace(/\bgir\s+red\s+ev\b/gi, "evin içine gir").replace(/\byürü\s+doğru\s+red\s+evyi\s+incele\b/gi, "kırmızı eve yaklaş");
  // Small local repairs for the compact model's common Turkish infinitives.
  // They keep the viewer-facing label imperative without inventing any scene
  // content or changing the Qwen-authored consequence.
  const infinitives = [["içeri girmek", "içeri gir"], ["yolu kullanmak", "yolda ilerle"], ["kırık yolu kullanmak", "çatlak yolda ilerle"], ["yaklaşmak", "yaklaş"], ["ilerlemek", "ilerle"], ["izlemek", "izle"], ["incelemek", "incele"]];
  for (const [from, to] of infinitives) text = text.replaceAll(from, to);
  // Qwen sometimes appends a Turkish accusative suffix to an already
  // conjugated verb ("konuşyi incele", "kapatyi incele"). Remove that
  // malformed wrapper and keep the original action instead of showing broken
  // text to viewers.
  text = text.replace(/\b(incele|bak|izle|gözlemle|dinle|çevir|kapat|aç|yaklaş|takip et|konuş)(yi|yı|yu|yü)\s+(incele|bak|izle|gözlemle|dinle)\b/gi, "$1");
  text = text.replace(/\b(konuş)(yi|yı|yu|yü)\b/gi, "$1");
  // Qwen's compact Turkish output occasionally drops the circumflex and
  // truncates "mekânda/mekânı" to "mekte". Repair the two scene-local
  // commands instead of ever exposing that malformed label to viewers.
  text = text.replace(/\bmek(?:te|e)\s+kal\b/gi, "mekânda kal").replace(/\bmek(?:te|e)\s+(?:gözlemle|gozlemle)\b/gi, "mekânı gözlemle").replace(/\bmek(?:te|e)\s+dolaş\b/gi, "mekânda dolaş");
  text = text.replace(/\bmek(?:te|e)[^\s]{0,10}\s+(?:gözlemle|gozlemle)\b/gi, "mekânı gözlemle").replace(/\bmek(?:te|e)[^\s]{0,10}\s+dolaş\b/gi, "mekânda dolaş");
  text = text.replace(/\bfigür(?:ü|u)?\s+uzaklaştı\b/gi, "figürden uzaklaş").replace(/\bfigür(?:ü|u)?\s+uzaklasti\b/gi, "figürden uzaklaş");
  text = text.replace(/\b(?:front|cracked)\s+yol(?:u|un)?\s+ar(?:a|ay)\w*\s+incele\b/gi, "çatlak yolda ilerle");
  text = text.replace(/\bfigür(?:ü|u)?\s+gözlemledi\b/gi, "figürü gözlemle");
  text = text.replace(/\bgizli bir kapı izle\b/gi, "gizli kapıya yaklaş");
  // Final canonicalization catches mixed-language full-schema responses whose
  // earlier token pass may have left an attached suffix or an English noun.
  text = text.replace(/fotoğrafı\s+çeviryi\s+incele/gi, "fotoğrafı çevir");
  text = text.replace(/koridoru\s+süzyi\s+incele/gi, "koridoru süz");
  text = text.replace(/radyoyu\s+kapatyi\s+incele/gi, "radyoyu kapat");
  text = text.replace(/([a-zçğıöşü]+)(yi|yı|yu|yü)\s+incele\b/gi, "$1");
  text = text.replace(/\binceleyi\b/gi, "incele").replace(/\bgözlemleyi\b/gi, "gözlemle").replace(/\btaratyi\b/gi, "tara");
  text = text.replace(/(?:eski\s+)?photographyi/gi, "eski fotoğrafı");
  text = text.replace(/\b(?:old|eski)\s+radioyi\b/gi, "eski radyoyu");
  text = text.replace(/\bfotografi\b/gi, "fotoğrafı");
  text = text.replace(/\binceleyin\b/gi, "incele").replace(/\bçalıştırın\b/gi, "çalıştır").replace(/\byaklaşın\b/gi, "yaklaş").replace(/\baçın\b/gi, "aç").replace(/\bkapatın\b/gi, "kapat").replace(/\bbakın\b/gi, "bak").replace(/\bizleyin\b/gi, "izle").replace(/\bsüzün\b/gi, "süz");
  text = text.replace(/\blong\s+corridornin\b/gi, "uzun koridorun").replace(/\bcorridornin\b/gi, "koridorun").replace(/\bkoridornin\b/gi, "koridorun");
  text = text.replace(/\b(küreler|orbs)['’]?u\b/gi, "küreleri");
  text = text.replace(/\b(fogu|fog u)\s+izle/gi, "sisi izle");
  if (!/[a-zçğıöşü]/i.test(text)) return "";
  const hasAction = /(incele|bak|izle|yaklaş|uzaklaş|başlat|gözlemle|tarat|yaklaşır|takip|dinle|bekle|kal|dolaş|dokun|çevir|süz|kapat|aç|yak|söndür|aktive|sustur|değiştir|düzelt|duzelt|bırak|açılır|açıldı|gir|çık|geç|in|ilerle|ilerler|dön|yönel|sap|çalıştır|koru|sor|sürer|akar|büyür|parıldar)/i.test(text);
  if (!hasAction) {
    if (/köprü/.test(text)) text = "Köprüye yaklaş";
    else if (/sis/.test(text)) text = "Sisi izle";
    else if (/ışık/.test(text)) text = "Işığı takip et";
    else if (/kapı/.test(text)) text = "Kapıya yaklaş";
    else if (/pencere/.test(text)) text = "Pencereden bak";
    else if (/merdiven/.test(text)) text = "Merdiveni incele";
    else if (/makine|radyo|fener|anahtar|ağaç|ayna|masa|saat|su|orman|yol|oda|koridor|tünel|araba|ev/.test(text)) text = `${text}yi incele`;
    else return "";
  }
  text = text.replace(/radyoyuyi\b/gi, "radyoyu").replace(/koridoryi\b/gi, "koridoru").replace(/fotoğrafiyi\b/gi, "fotoğrafı");
  text = text.replace(/yolunu\s+çatlamayı\s+düzeltyi\s+incele/gi, "çatlak yolu düzelt").replace(/yolu\s+çatlamayı\s+düzelt/gi, "çatlak yolu düzelt").replace(/yolunu\s+çatlamayı\s+düzelt/gi, "çatlak yolu düzelt");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseJsonObjectPrefix(content) {
  const raw = String(content || ""); const objectStart = raw.indexOf("{"); const arrayStart = raw.indexOf("["); const starts = [objectStart, arrayStart].filter((value) => value >= 0); const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) return null;
  for (const closer of ["}", "]"]) {
    for (let end = raw.lastIndexOf(closer); end > start; end -= 1) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
  }
  return null;
}

function reconstructCompleteCandidateTuples(content) {
  const raw = String(content || "");
  const starts = [];
  const tuples = [];
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "[") { starts.push(index); continue; }
    if (char !== "]" || !starts.length) continue;
    const start = starts.pop();
    try {
      const value = JSON.parse(raw.slice(start, index + 1));
      if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "string" && item.trim())) tuples.push(value);
    } catch {}
  }
  return tuples;
}

function parseQwenCandidates(content, storyState = defaultStoryState(), psyche = normalizeDreamPsyche(), diagnostics = {}) {
  const rawContent = String(content || ""); if (!rawContent) return [];
  const normalize = (items) => items.map((item, index) => {
    if (Array.isArray(item)) return qwenCandidateRecord(item[0], item[1], item[2], index, storyState, psyche);
    if (item && typeof item === "object") return qwenCandidateRecord(item.action || item.tr || item.t || item.label, item.consequence || item.result || item.result_prompt_en, item.next_location || item.location, index, storyState, psyche);
    // Legacy label-only output is accepted only as emergency recovery. The
    // normal path requires Qwen to author its own visible consequence.
    return qwenCandidateRecord(item, resultStateFromLabel(item, storyState), null, index, storyState, psyche, true);
  }).filter((item) => item?.label_tr);
  const strictParsed = parseJsonObjectPrefix(rawContent);
  if (strictParsed) {
    diagnostics.parserRecovery = "strict";
    const raw = Array.isArray(strictParsed) ? strictParsed : (strictParsed.candidates || strictParsed.c || []);
    return normalize(raw).slice(0, 2);
  }
  const completeTuples = reconstructCompleteCandidateTuples(rawContent);
  if (completeTuples.length >= 2) {
    diagnostics.parserRecovery = "complete_tuple_reconstruction";
    return normalize(completeTuples.slice(0, 2));
  }
  diagnostics.parserRecovery = "none";
  // Recover multiple top-level arrays even when Qwen puts them on one line or
  // wraps them in markdown. A prefix parser would otherwise accept only the
  // first valid array and make a good two-branch answer look incomplete.
  const extractedArrays = [];
  let arrayStart = -1; let depth = 0; let inString = false; let escaped = false;
  for (let i = 0; i < rawContent.length; i += 1) {
    const ch = rawContent[i];
    if (inString) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === '[') { if (depth === 0) arrayStart = i; depth += 1; continue; }
    if (ch === ']' && depth > 0) { depth -= 1; if (depth === 0 && arrayStart >= 0) { try { const value = JSON.parse(rawContent.slice(arrayStart, i + 1)); if (Array.isArray(value) && value.length >= 2) extractedArrays.push(value); } catch {} arrayStart = -1; } }
  }
  // A compact {"c":[[candidate],[candidate]]} response is seen by the
  // scanner as one outer array. Unwrap that container before normalizing;
  // otherwise both candidates are accidentally treated as one record and
  // the live round waits/retries forever.
  if (extractedArrays.length === 1 && Array.isArray(extractedArrays[0][0])) return normalize(extractedArrays[0]).slice(0, 4);
  if (extractedArrays.length >= 2) return normalize(extractedArrays).slice(0, 4);
  if (extractedArrays.length === 1 && (rawContent.match(/\[/g) || []).length >= 2) {
    const loosePairs = []; const loosePairRe = /\[\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']?([a-z0-9_ -]+)["']?\s*\]/gi; let match;
    while ((match = loosePairRe.exec(rawContent))) loosePairs.push([match[1], match[2], match[3]]);
    if (loosePairs.length >= 2) return normalize(loosePairs).slice(0, 4);
  }
  // Small local Qwen builds often emit the two JSON arrays on separate lines
  // instead of wrapping them in one outer array. Parse those complete lines
  // first; otherwise the generic prefix parser can mistake the first scalar
  // for a legacy label and lose the authored consequence entirely.
  const lineArrays = rawContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    try { const value = JSON.parse(line); return Array.isArray(value) ? value : null; } catch { return null; }
  }).filter((value) => Array.isArray(value) && value.length >= 2);
  if (lineArrays.length >= 2) return normalize(lineArrays).slice(0, 4);
  try {
    const parsed = parseJsonObjectPrefix(rawContent); if (!parsed) throw new Error("no_complete_json"); const raw = Array.isArray(parsed) ? parsed : (parsed.candidates || parsed.c || []);
    return normalize(raw).slice(0, 2);
  } catch {
    // Qwen occasionally emits an almost-JSON list with descriptive field
    // names inside an array. Recover only the three explicit fields; every
    // recovered value still passes the strict manifest/safety gate below.
    const loose = [];
    const looseRe = /["'](?:Turkish action|action|tr)["']\s*:\s*["']([^"']+)["'][\s,]+["'](?:English visible result|consequence|result)["']\s*:\s*["']([^"']+)["'][\s,]+["'](?:next_location|location)["']\s*:\s*["']([^"']+)["']/gi;
    let looseMatch;
    while ((looseMatch = looseRe.exec(rawContent))) loose.push([looseMatch[1], looseMatch[2], looseMatch[3]]);
    if (loose.length) return normalize(loose).slice(0, 2);
    // Recover complete pair arrays from truncated JSON; scalar legacy labels
    // remain a last-resort emergency path and never become the normal prompt.
    const recovered = []; const pairRe = /\[\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']?([a-z0-9_ -]+)["']?\s*\]/gi; let part;
    while ((part = pairRe.exec(rawContent))) recovered.push([part[1], part[2], part[3]]);
    if (!recovered.length) {
      const shortPairRe = /\[\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\]/g; let shortPart;
      while ((shortPart = shortPairRe.exec(rawContent))) recovered.push([shortPart[1], shortPart[2]]);
    }
    return normalize(recovered).slice(0, 2);
  }
}

// Kept as a narrow compatibility alias for old benchmark imports.
function parseQwenCandidateLabels(content, storyState, psyche) { return parseQwenCandidates(content, storyState, psyche); }

function qwenCandidateGrounded(candidate, storyState) {
  const story = normalizeStoryState(storyState);
  const strictManifest = sceneManifestFor(story);
  const sceneText = [...strictManifest.entities, strictManifest.location, story.character_state, ...story.scene_anchors.filter((anchor) => Number(anchor?.ttl ?? 3) > 1).map((anchor) => anchor.text)].join(" ").toLowerCase().replaceAll("_", " ");
  const aliases = [["machine", "makine"], ["blue", "mavi"], ["reflection", "yansıma"], ["dust", "toz"], ["lantern", "fener"], ["fog", "sis"], ["water", "su"], ["bridge", "köprü"], ["door", "kapı"], ["window", "pencere"], ["stairs", "merdiven"], ["corridor", "koridor"], ["forest", "orman"], ["radio", "radyo"], ["watch", "saat"], ["key", "anahtar"], ["tree", "ağaç"], ["photograph", "fotoğraf"], ["telephone", "telefon"], ["cup", "fincan"], ["tea", "çay"], ["clock", "saat"], ["mirror", "ayna"], ["orb", "küre"], ["path", "yol"]];
  const expanded = `${sceneText} ${aliases.filter(([english, turkish]) => sceneText.includes(english) || sceneText.includes(turkish)).map(([, turkish]) => turkish).join(" ")}`;
  const sceneTokens = new Set(tokenizeScene(expanded));
  const candidateText = `${candidate.label_tr} ${candidate.result_prompt_en}`.toLowerCase();
  if (/\b(unknown person|another person|someone|stranger|second figure|unknown figure)\b/i.test(candidateText) && !/\b(unknown person|another person|someone|stranger|second figure|unknown figure)\b/i.test(sceneText)) return false;
  const candidateTokens = tokenizeScene(candidateText);
  const overlap = candidateTokens.some((token) => [...sceneTokens].some((sceneToken) => sceneToken === token || (token.length >= 4 && sceneToken.startsWith(token.slice(0, 4))) || (sceneToken.length >= 4 && token.startsWith(sceneToken.slice(0, 4)))));
  // Library records have already passed exact manifest tag/state eligibility.
  // Treat their explicit target as grounding evidence when it is physically
  // visible; the remaining forbidden-entity/location gates below still apply.
  const explicitLibraryTarget = String(candidate?.libraryId ? candidate?.target_entity || "" : "").toLowerCase();
  const libraryTargetGrounded = Boolean(explicitLibraryTarget && (explicitLibraryTarget === "scene" || visiblePhysicalEntity(strictManifest, explicitLibraryTarget)));
  const genericAction = /^(yaklaş|ilerle|takip|bekle|izle|dinle|gir|çık|geç|aç|kapat|incele|dokun|kal|dolaş|sor|hatırla|koru|bırak|değiştir|gözlemle|hareket|move|observe|remain|interact)/i.test(candidate.label_tr);
  const memoryDriven = /remember|memory|photograph|photo|trace|echo|hatır|fotoğraf|iz|yankı|unut|suppress/i.test(candidateText) && /remember|memory|photograph|photo|trace|echo|hatır|fotoğraf|iz|yankı|unut|suppress/i.test(candidateText);
  // A memory reference may be reintroduced only by an explicitly memory-led
  // direction; it never becomes a physical affordance by being old.
  const memoryOverlap = memoryDriven && story.memory_entities.some((entity) => candidateText.includes(String(entity).replaceAll("_", " ").toLowerCase()));
  const visibleText = `${strictManifest.location} ${strictManifest.entities.join(" ")}`.toLowerCase().replaceAll("_", " ");
  const allowedLocations = new Set([strictManifest.location, ...strictManifest.adjacent_locations].map((item) => String(item).replaceAll("_", " ").toLowerCase()));
  const locationWords = Object.keys(SCENE_ADJACENCY).map((item) => item.replaceAll("_", " ").toLowerCase());
  if (locationWords.some((item) => candidateText.includes(item) && !allowedLocations.has(item))) return false;
  const forbiddenUnlessVisible = ["corridor", "koridor", "portal", "fog", "mist", "sis", "rain", "yağmur", "light", "ışık", "orb", "küre", "mirror", "ayna"];
  if (forbiddenUnlessVisible.some((term) => {
    if (!candidateText.includes(term) || visibleText.includes(term)) return false;
    // A visible entity may undergo a grounded state change that names the
    // resulting effect (for example an established machine glowing with
    // light). Keep the general anti-invention gate, but avoid rejecting this
    // narrow entity-transformation false-negative.
    if ((term === "light" || term === "ışık") && /machine|makine/.test(visibleText) && /machine|makine/.test(candidateText)) return false;
    return true;
  })) return false;
  const candidateLocation = String(candidate.next_location || strictManifest.location);
  const locationAllowed = candidateLocation === strictManifest.location || strictManifest.adjacent_locations.includes(candidateLocation);
  const routeParts = optionRouteParts(candidate);
  const routeTarget = /\b(ilerle|yaklaş|yaklas|gir|çık|cik|geç|gec|in|dön|don|yönel|yonel|takip|move|enter|return|follow|walk)\b/i.test(String(candidate?.label_tr || "")) ? routeParts.target : "";
  const adjacentText = strictManifest.adjacent_locations.join(" ").replaceAll("_", " ").toLowerCase();
  const adjacentOverlap = routeTarget && candidateTokens.some((token) => adjacentText.split(/\s+/).includes(token));
  const sceneLocal = /^(?:mek[âa]nda(?: sessizce)? kal|mek[âa]n[ıi] gözlemle|çevreyi gözlemle|sessizce bekle|mek[âa]nda dolaş|figürü gözlemle|figürden uzaklaş)$/i.test(candidate.label_tr);
  const localStateOnly = sceneLocal && candidateLocation === strictManifest.location && /\b(scene|environment|current|quiet|still|sakin|sessiz|durgun)\b/i.test(candidate.result_prompt_en);
  // A declared navigation edge is grounded by its validated destination;
  // Turkish wording and English node names need not share a token.
  const declaredRoute = Boolean(routeTarget) && locationAllowed && candidateLocation !== strictManifest.location && strictManifest.adjacent_locations.includes(candidateLocation);
  return locationAllowed && (overlap || libraryTargetGrounded || memoryOverlap || localStateOnly || declaredRoute || (Boolean(routeTarget) && adjacentOverlap)) && (genericAction || overlap || libraryTargetGrounded || localStateOnly || Boolean(routeTarget));
}

function consequenceFamily(text) {
  const value = String(text || "").toLowerCase();
  if (/\b(glow|glows|light|bright|brightness)\b|ışık|parla/.test(value)) return "light_change";
  if (/fog|mist|rain|snow|water|sis|yağmur|kar|su/.test(value)) return "atmosphere_change";
  if (/appear|visible|shows|face|handprint|reflection|photograph|görün|yansı|fotoğraf/.test(value)) return "visible_reveal";
  if (/open|close|door|window|corridor|bridge|tunnel|kapı|pencere|koridor|köprü|tünel/.test(value)) return "spatial_change";
  if (/silent|quiet|still|remain|sessiz|sakin|durgun/.test(value)) return "state_settle";
  if (/machine|radio|watch|mirror|makine|radyo|saat|ayna/.test(value)) return "object_state";
  return "physical_change";
}

// Canonical route identity used to stop near-duplicate navigation labels from
// slipping through with a different verb ("eve yaklaş" vs "eve dön").  This
// is deliberately limited to the small declared scene graph; object actions
// keep their normal Qwen diversity.
export function optionRouteParts(value) {
  // Route cooldown is based on what the viewer is asked to do, not on a
  // model's English consequence sentence. A generic action such as
  // "Mekânda kal" must not be treated as a return merely because Qwen
  // accidentally mentions a neighbouring place in its result text.
  const text = String(typeof value === "object" ? (value.label_tr || value.action || "") : value || "")
    .toLocaleLowerCase("tr-TR").replaceAll("_", " ");
  let target = "";
  if (/kırmızı eve yaklaş|kirmizi eve yaklas|red house doorstep/.test(text)) target = "red_house_doorstep";
  else if (/kırmızı ev|kirmizi ev|red house|eve dön|eve don|return outside/.test(text)) target = "red_house_exterior";
  else if (/çatlak yol|catlak yol|front path|\bpath\b/.test(text)) target = "front_path";
  // Keep a side street distinct from the main quiet-street route. The
  // generic `sokağa` matcher below would otherwise collapse both graph
  // edges, making a valid two-route exhausted pair look like a duplicate.
  else if (/ara sokak|ara sokağa|ara sokaga|alley/.test(text)) target = "alley_mouth";
  else if (/gizli tünel|gizli tunel|hidden tunnel/.test(text)) target = "hidden_tunnel";
  else if (/evin içine gir|evin icine gir|red house hallway|wooden hallway|koridora gir/.test(text)) target = "red_house_hallway";
  else if (/sokağa|sokaga|sokak|quiet street|\bstreet\b/.test(text)) target = "quiet_street";
  else if (/merdiv|stair/.test(text)) target = "stairwell";
  else if (/bodrum|basement/.test(text)) target = "basement";
  else if (/makine odası|makine odasi|machine room/.test(text)) target = "machine_room";
  else if (/kontrol odası|kontrol odasi|control room/.test(text)) target = "control_room";
  else if (/kapı|kapi|door/.test(text)) target = "door";
  if (!target) return { target: "", direction: "" };
  let direction = "progress";
  if (/\b(dön|don|geri|return|outside|dışarı|disari)\b/.test(text)) direction = "return";
  else if (/\b(gir|içine|icine|enter|in|aç|ac|open)\b/.test(text)) direction = "enter";
  else if (/\b(yaklaş|yaklas|approach|ilerle|ilerler|follow|takip|yönel|yonel|move|geç|gec)\b/.test(text)) direction = "progress";
  return { target, direction };
}

export function routeRepeat(candidate, previousOptions = []) {
  const current = optionRouteParts(candidate);
  if (!current.target) return false;
  // Short-horizon physical-loop guard only: an immediate A→B, B→A ping-pong
  // stays blocked, but a route target visited many rounds ago no longer
  // hard-gates a candidate on target+direction alone — longer-horizon
  // novelty is now the structured semantic-repeat check's job (it carries
  // the actual visible consequence via recent_option_records, unlike this
  // route-parts match which only ever saw the bare label text).
  return previousOptions.slice(-NEAR_REPEAT_WINDOW).some((item) => {
    const prior = optionRouteParts(item);
    if (!prior.target || prior.target !== current.target) return false;
    // Same route family + same direction is a semantic duplicate even when
    // the wording changes (cracked path → street, approach → move toward).
    if (prior.direction === current.direction) return true;
    // A return to a location just approached/entered is a near-immediate
    // reversal, not a meaningful new branch.
    return current.direction === "return" || prior.direction === "return";
  });
}

export function futureSignature(candidate) {
  const action = String(candidate?.label_tr || "").toLowerCase().replace(/\b(yakından|sessizce|dikkatle|biraz|doğru)\b/g, "").trim();
  const mutation = candidate?.entity_state_mutation || candidate?.state_patch?.entity_state_mutation;
  const navigation = candidate?.route_type === "navigation";
  const fallbackTarget = tokenizeScene(action).filter((token) => !/^(incele|bak|izle|yaklaş|uzaklaş|ilerle|takip|dinle|aç|kapat|gir|çık|kal|bekle|koru|bırak|sor|çalıştır|sür)$/.test(token)).slice(0, 2).join(" ");
  const target = String(candidate?.target_entity || mutation?.target_entity || (navigation ? candidate?.next_location : "") || fallbackTarget || "scene").replaceAll("_", " ");
  const behavior = String(candidate?.behavior_family || candidate?.intent || situationFamilyForOption(candidate) || inferIntent(action)).toLowerCase();
  const vector = String(candidate?.psychological_vector || psychologicalVectorForBehavior(behavior));
  const resultingState = navigation ? `location:${candidate.next_location}` : String(candidate?.resulting_state || mutation?.to_state || "visible_result");
  return `${target}|${behavior}|${vector}|${consequenceFamily(candidate?.result_prompt_en)}|${resultingState}`;
}

// Two-layer repeat rule: (1) a very-recent display repeat (last
// NEAR_REPEAT_WINDOW shown, regardless of source) is a hard reject on label
// text alone — the viewer should never see the same wording twice in a row
// even if the underlying future differs; (2) beyond that window, only a
// matching FUTURE (recent_option_records, which carries the visible
// consequence) counts as a repeat — the same label with a genuinely
// different consequence survives. Legacy history without a structured
// record cannot be judged semantically, so once it falls outside the near
// window it no longer blocks a candidate on label text alone.
const NEAR_REPEAT_WINDOW = 2;
// Pair history is retained for bounded telemetry/state, but only a recent
// cooldown window should make a combination ineligible. Treating all 256
// stored pairs as a permanent blacklist exhausts the finite pair space on
// long runs and forces deterministic recovery even after the world changes.
const PAIR_REPEAT_WINDOW = 20;
// Returns null (no repeat), "near_display_repeat" (hard reject, last
// NEAR_REPEAT_WINDOW shown labels), or "semantic_future_repeat" (older
// window, matching future signature) — diagnostic-grade reason, same
// accept/reject decision as before (boolean truthiness unchanged).
function optionRepeatCheck(candidate, storyState, previousOptions = []) {
  const story = normalizeStoryState(storyState);
  const records = story.recent_option_records || [];
  const actionNorm = String(candidate?.label_tr || "").trim().toLocaleLowerCase("tr-TR");
  if (!actionNorm) return null;
  const nearRecords = records.slice(-NEAR_REPEAT_WINDOW);
  const olderRecords = records.slice(0, Math.max(0, records.length - NEAR_REPEAT_WINDOW));
  const nearHitFromRecords = nearRecords.some((r) => String(r.label_tr || "").trim().toLocaleLowerCase("tr-TR") === actionNorm);
  // Pads the near window from the plain label history only while records are
  // still accumulating right after rollout, so the very-recent guard is
  // never weaker than the previous behavior during that transition.
  const missing = Math.max(0, NEAR_REPEAT_WINDOW - records.length);
  const legacyNear = missing > 0 ? previousOptions.slice(-missing) : [];
  const nearHitFromLegacy = legacyNear.some((item) => String(typeof item === "string" ? item : (item?.label_tr || item?.action || "")).trim().toLocaleLowerCase("tr-TR") === actionNorm);
  if (nearHitFromRecords || nearHitFromLegacy) return "near_display_repeat";
  const candidateSig = futureSignature(candidate);
  const nearSemanticHit = nearRecords.some((record) => (record.future_signature || futureSignature(record)) === candidateSig);
  if (nearSemanticHit) return "semantic_future_repeat";
  const semanticHit = olderRecords.some((r) => (r.future_signature || futureSignature(r)) === candidateSig);
  return semanticHit ? "semantic_future_repeat" : null;
}

function libraryCandidateGrounded(candidate, storyState) {
  const manifest = sceneManifestFor(storyState);
  if (candidate?.route_type === "navigation") return Boolean(candidate.next_location && candidate.next_location !== manifest.location && manifest.adjacent_locations.includes(candidate.next_location));
  const target = String(candidate?.target_entity || candidate?.entity_state_mutation?.target_entity || "scene").toLowerCase();
  return target === "scene" || visiblePhysicalEntity(manifest, target);
}

function evaluateCandidate(candidate, storyState, previousOptions = []) {
  const action = String(candidate?.label_tr || "").trim();
  const consequence = String(candidate?.result_prompt_en || "").trim();
  const actionWords = action ? action.split(/\s+/).length : 0;
  const staticVisible = staticVisibleConsequence(consequence);
  const grounded = Boolean(action && consequence && (candidate?.libraryId ? libraryCandidateGrounded(candidate, storyState) : qwenCandidateGrounded(candidate, storyState)));
  const safety = Boolean(safe(action) && !BLOCKED.some((pattern) => pattern.test(consequence)));
  const sceneWords = new Set(tokenizeScene(`${sceneManifestFor(storyState).summary} ${(sceneManifestFor(storyState).entities || []).join(" ")}`));
  const resultWords = tokenizeScene(consequence).filter((word) => word.length > 3 && !["anonymous", "figure", "current", "scene", "visible"].includes(word));
  // A choice must produce a new visual state. Do not accept a model echo such
  // as "close the door" when the committed scene already establishes a closed
  // door; that is technically grounded but narratively inert.
  // Qwen may choose a same-room interaction whose visible consequence shares
  // the scene vocabulary (for example inspecting the established machine).
  // Reject only an exact unchanged summary; the older all-token subset rule
  // incorrectly discarded useful authored branches as "no new state".
  const sceneSummary = String(sceneManifestFor(storyState).summary || "").trim().toLowerCase();
  const noNewState = consequence.toLowerCase() === sceneSummary;
  const manifest = sceneManifestFor(storyState);
  const navigationStateChange = Boolean(candidate?.next_location && candidate.next_location !== manifest.location && manifest.adjacent_locations.includes(candidate.next_location));
  const mutation = candidate?.entity_state_mutation || candidate?.state_patch?.entity_state_mutation;
  const mutationTarget = String(mutation?.target_entity || "").toLowerCase();
  const mutationTargetVisible = mutationTarget === "scene" || visiblePhysicalEntity(manifest, mutationTarget);
  const currentMutationState = entityStateForMutation(manifest, mutation);
  const stateful = navigationStateChange || Boolean(mutation && mutationTarget && mutationTargetVisible && mutation.to_state && currentMutationState !== mutation.to_state && (!mutation.from_state || currentMutationState === mutation.from_state));
  const repeatReason = optionRepeatCheck(candidate, storyState, previousOptions);
  const prior = Boolean(repeatReason);
  const routeNearRepeat = routeRepeat(candidate, previousOptions);
  const rejectReason = !action || !consequence ? "incomplete" : candidate?.invalid_action_language ? "action_not_turkish" : candidate?.invalid_location ? "location" : actionWords < 2 || actionWords > 5 ? "action_length" : !staticVisible ? "static_visibility" : !safety ? "safety" : !grounded ? "grounding" : noNewState ? "no_new_state" : !stateful ? "state_change_missing" : prior || routeNearRepeat ? (routeNearRepeat ? "route_repeat" : repeatReason) : null;
  return { action, consequence, static_visible: staticVisible, grounded, stateful, safety: safety ? "pass" : "fail", repeat: (prior || routeNearRepeat) ? "fail" : "pass", action_family: situationFamilyForOption(candidate), consequence_family: consequenceFamily(consequence), reject_reason: rejectReason, accepted: !rejectReason };
}

// Bounded completion for a partially useful Qwen response. This is not the
// fallback catalogue: phrases are composed from the committed scene's live
// objects and affordances, and are used only to supply a missing behavioural
// direction when Qwen returned at least one grounded creative label.
function sceneCompletionCandidates(storyState, previousOptions = [], psyche = normalizeDreamPsyche()) {
  const story = normalizeStoryState(storyState); const used = new Set(previousOptions.slice(-20).map((item) => String(item).trim().toLowerCase())); const values = [];
  const add = (action, consequence) => { const record = qwenCandidateRecord(action, consequence, null, values.length, story, psyche, true); if (record.label_tr && record.result_prompt_en && qwenCandidateGrounded(record, story) && !used.has(record.label_tr.toLowerCase()) && !values.some((item) => item.label_tr.toLowerCase() === record.label_tr.toLowerCase())) values.push(record); };
  const sceneLocation = String(story.current_location || "").replaceAll("_", " ").toLowerCase();
  for (const entity of story.current_scene_entities.slice(-4)) {
    const name = String(entity).replaceAll("_", " "); const lower = name.toLowerCase();
    if (lower === sceneLocation) continue;
    if (/machine|makine/.test(lower)) { add("Makineyi çalıştır", "The established machine is now glowing with blue light"); add("Makineden uzaklaş", "The established machine is now silent in the current scene"); }
    else if (/figure|figür|character|anonymous/.test(lower)) { add("Figürün gölgesini izle", "The anonymous figure's shadow is now stretching across the machine room"); add("Figürden uzaklaş", "The anonymous figure is now farther away in the machine room"); }
    else if (/radio|radyo/.test(lower)) { add("Radyoyu aç", "The established radio is silent and its dial glows"); add("Radyoyu sustur", "The established radio is now completely silent"); }
    else if (/photograph|fotoğraf/.test(lower)) { add("Fotoğrafı çevir", "The established photograph now shows a missing face"); add("Fotoğrafı koru", "The established photograph remains face down on the surface"); }
    else if (/light|ışık|glow|parla/.test(lower)) { add("Işığa yaklaş", "The established light now reflects across the current space"); add("Işıktan uzaklaş", "The established light fades at the edge of the current space"); }
  }
  const location = String(story.current_location || "current scene").replaceAll("_", " ");
  add("Mekânı gözlemle", `The ${location} remains still under dim atmospheric light`);
  add("Mekânda kal", `The ${location} falls into deeper quiet and shadow`);
  return values.slice(0, 8);
}

// If Qwen authored at least one grounded candidate but its companion failed a
// narrow validator gate, preserve the authored branch and pair it with a
// manifest-only local counterpoint. This never invents a prop or location and
// is intentionally limited to the partial-response case.
function salvageQwenPair(candidates, storyState, previousOptions, psyche) {
  // Never manufacture a viewer-facing label here. If Qwen supplied multiple
  // candidates, retry pair selection over those authored records only.
  const authored = candidates.filter((candidate) => !candidate.emergency);
  if (authored.length < 2) return null;
  const pair = selectQwenPair(authored, storyState, previousOptions, psyche);
  if (pair) Object.defineProperty(pair, "_salvageUsed", { value: true, enumerable: false });
  return pair;
}

function behaviorSignature(candidate) {
  const action = String(candidate?.label_tr || "").toLowerCase().replace(/\b(yakından|sessizce|dikkatle|biraz|doğru)\b/g, "").trim();
  const family = situationFamilyForOption(candidate);
  const target = tokenizeScene(action).filter((token) => !/^(incele|bak|izle|yaklaş|ilerle|takip|dinle|aç|kapat|gir|çık|kal|bekle|koru|bırak|sor|çalıştır|sür)$/.test(token)).slice(0, 2).join(" ");
  return `${family}|${target}`;
}

function stableChoiceHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967296;
}
function optionPairSignature(left, right) {
  return [left?.label_tr || left || "", right?.label_tr || right || ""].map((value) => String(value).trim().toLocaleLowerCase("tr-TR")).sort().join(" || ");
}

const ARCHETYPE_VECTOR_AFFINITY = Object.freeze({
  shadow: { aligned: ["confront", "reveal", "approach", "refuse"], counter: ["avoid", "conceal", "withdraw"] },
  persona: { aligned: ["reveal", "conceal", "observe", "separate"], counter: ["accept", "integrate"] },
  trickster: { aligned: ["interrupt", "alter", "refuse", "explore"], counter: ["protect", "wait", "accept"] },
  self: { aligned: ["integrate", "accept", "wait", "approach"], counter: ["separate", "abandon", "refuse"] },
  wise_figure: { aligned: ["follow", "observe", "accept", "explore"], counter: ["interrupt", "refuse", "abandon"] },
  child: { aligned: ["protect", "approach", "explore"], counter: ["avoid", "withdraw"] },
  mother_field: { aligned: ["protect", "accept", "integrate", "withdraw"], counter: ["abandon", "separate", "interrupt"] },
  anima_animus: { aligned: ["approach", "reveal", "follow", "integrate"], counter: ["withdraw", "conceal", "separate"] },
});

const INTENT_VECTOR_MAP = Object.freeze({
  confront: "confront", activate: "control", preserve: "protect", hide: "conceal", abandon: "abandon", return: "withdraw",
  follow: "follow", listen: "observe", inspect: "observe", observe: "observe", touch: "approach", approach: "approach",
  enter: "explore", descend: "explore", ascend: "explore", surrender: "surrender", avoid: "avoid", interrupt: "interrupt",
});

export function psychologicalVectorForOption(candidate) {
  if (candidate?.psychological_vector) return String(candidate.psychological_vector);
  const behavior = candidate?.behavior_family || candidate?.intent || inferIntent(candidate?.label_tr || candidate);
  return INTENT_VECTOR_MAP[behavior] || psychologicalVectorForBehavior(behavior);
}

export function psychologicalTargetForOption(candidate) {
  const mutation = candidate?.entity_state_mutation || candidate?.state_patch?.entity_state_mutation;
  if (mutation?.target_entity) return String(mutation.target_entity).toLowerCase();
  if (candidate?.target_entity) return String(candidate.target_entity).toLowerCase();
  const target = behaviorSignature(candidate).split("|")[1];
  return target || String(candidate?.next_location || "scene").toLowerCase();
}

export function archetypeAffinityScore(candidate, archetype, pressure = 0) {
  const config = ARCHETYPE_VECTOR_AFFINITY[String(archetype || "").toLowerCase()];
  const boundedPressure = Math.max(0, Math.min(1, Number(pressure) || 0));
  if (!config || boundedPressure < 0.2) return 0;
  const vector = psychologicalVectorForOption(candidate);
  if (config.aligned.includes(vector)) return 2 * boundedPressure;
  if (config.counter.includes(vector)) return 1 * boundedPressure;
  return 0;
}

// Coarse semantic families used only to rank otherwise-valid Qwen answers.
// This prevents "bekle / mekânı gözlemle / çevreyi gözlemle" from becoming
// the visible pair every other turn while still allowing a scene-local answer
// when no other grounded branch exists.
function genericOptionFamily(value) {
  const text = String(typeof value === "object" ? (value.label_tr || value.action || "") : value || "").toLocaleLowerCase("tr-TR");
  if (/bekle|mek[âa]nda kal|mek[âa]nda dolaş/.test(text)) return "stay";
  if (/gözlemle|incele|izle|dinle|s[üu]z/.test(text)) return "observe";
  if (/uzaklaş|geri|dön/.test(text)) return "retreat";
  if (/dokun|aç|kapat|çevir|çalıştır|bırak|sor/.test(text)) return "interact";
  if (/ilerle|yaklaş|gir|çık|geç|in|yönel|takip/.test(text)) return "navigate";
  return "";
}

function selectQwenPair(recordsInput, storyState, previousOptions, psyche, { maxCandidates = 4 } = {}) {
  const normalizedPsyche = normalizeDreamPsyche(psyche);
  const archetypeBiasEnabled = process.env.ARCHETYPAL_OPTION_BIAS_ENABLED === "1";
  const activeArchetype = normalizedPsyche.dominant_archetypal_field;
  const archetypePressure = Number(normalizedPsyche.archetypal_pressure?.[activeArchetype]) || 0;
  // Some small Qwen runs author two different consequences but repeat the
  // same generic label (for example "Sessizce bekle" twice). Preserve the
  // authored consequences and repair only the duplicate viewer label from
  // the concrete entity named by that consequence. This is normalization,
  // not a fallback writer: no new prop/place/result is invented here.
  const normalizedRecords = [];
  const usedLabels = new Set();
  for (let index = 0; index < recordsInput.length; index += 1) {
    const original = recordsInput[index];
    let candidate = original;
    const originalLabel = String(original?.label_tr || "").trim();
    const duplicate = usedLabels.has(originalLabel.toLocaleLowerCase("tr-TR"));
    if (duplicate && /^(?:sessizce bekle|mek[âa]nda kal|mek[âa]n[ıi] gözlemle|çevreyi gözlemle|figürü gözlemle|figürden uzaklaş)$/i.test(originalLabel)) {
      const consequence = String(original?.result_prompt_en || "").toLowerCase();
      const story = normalizeStoryState(storyState);
      const entityLabel = story.current_scene_entities.map((entity) => String(entity).replaceAll("_", " ")).find((entity) => {
        const words = entity.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
        return words.some((word) => consequence.includes(word));
      });
      const alternatives = [];
      if (entityLabel) {
        const lower = entityLabel.toLowerCase();
        if (/figure|figür|character|anonymous/.test(lower)) alternatives.push("Figürü gözlemle");
        else if (/tree|ağaç/.test(lower)) alternatives.push("Ağacı gözlemle");
        else if (/path|yol|street|sokak/.test(lower)) alternatives.push("Yolu gözlemle");
        else if (/machine|makine/.test(lower)) alternatives.push("Makineyi gözlemle");
        else if (/radio|radyo/.test(lower)) alternatives.push("Radyoyu dinle");
        else if (/door|kapı/.test(lower)) alternatives.push("Kapıyı gözlemle");
      }
      const replacement = alternatives.find((label) => !usedLabels.has(label.toLocaleLowerCase("tr-TR")) && !routeRepeat({ label_tr: label }, previousOptions));
      if (replacement) {
        const repaired = qwenCandidateRecord(replacement, original.result_prompt_en, original.next_location, index, storyState, psyche, Boolean(original.emergency));
        candidate = { ...repaired, _labelRepair: "duplicate_entity_label" };
      }
    }
    usedLabels.add(String(candidate?.label_tr || "").trim().toLocaleLowerCase("tr-TR"));
    normalizedRecords.push(candidate);
  }
  const evaluated = normalizedRecords.map((candidate) => { const validation = evaluateCandidate(candidate, storyState, previousOptions); Object.defineProperty(candidate, "_validation", { value: validation, enumerable: false, configurable: true }); return candidate; });
  // In live mode Qwen is the only creative author.  Do not fill a malformed
  // answer with deterministic catalogue/completion phrases: the scene waits
  // and Qwen retries against the same committed manifest instead.
  const records = evaluated.filter((candidate) => candidate._validation?.accepted && !candidate.emergency).slice(0, Math.max(2, Math.min(256, Number(maxCandidates) || 4)));
  const recent = new Set(previousOptions.slice(-20).map((item) => String(item).trim().toLowerCase()));
  const fresh = records.filter((candidate) => !recent.has(candidate.label_tr.toLowerCase()));
  const pool = fresh.length >= 2 ? fresh : records;
  if (!pool.length) return null;
  const pairs = []; for (let i = 0; i < pool.length; i += 1) for (let j = i + 1; j < pool.length; j += 1) {
    // Compare every valid route/local combination, but preserve the product
    // contract that a normal pair contains at most one navigation option.
    if (pool[i].route_type === "navigation" && pool[j].route_type === "navigation") continue;
    pairs.push([pool[i], pool[j]]);
  }
  const recentPairSet = new Set((normalizeStoryState(storyState).recent_option_pairs || []).slice(-PAIR_REPEAT_WINDOW));
  const freshPairs = pairs.filter(([left, right]) => !recentPairSet.has(optionPairSignature(left, right)));
  // Never recycle a pair already displayed in the bounded pair ledger. If
  // every grounded combination is exhausted, return null so the caller can
  // advance through a real route or use its existing secondary path instead
  // of silently repeating an old future.
  const pairPool = freshPairs;
  const recentGenericFamilies = new Set(previousOptions.slice(-8).map((item) => genericOptionFamily(item)).filter(Boolean));
  const recentBehaviorTargets = new Set(previousOptions.slice(-8).map((item) => behaviorSignature(item)).filter(Boolean));
  const recentFutureSignatures = new Set(previousOptions.slice(-20).map((item) => futureSignature({ label_tr: typeof item === "string" ? item : item?.label_tr, result_prompt_en: typeof item === "string" ? "" : item?.result_prompt_en })).filter(Boolean));
  const recentSituationFamilies = new Set(normalizeStoryState(storyState).recent_situation_families.slice(-12));
  const recentPsychologicalKeys = new Set(normalizeStoryState(storyState).recent_option_records.slice(-8).map((record) => `${record.archetype || activeArchetype}|${record.psychological_vector || psychologicalVectorForOption(record)}|${record.target_entity || psychologicalTargetForOption(record)}`));
  const recentLabelFrequency = new Map();
  for (const record of normalizeStoryState(storyState).recent_option_records.slice(-20)) {
    const key = String(record?.label_tr || "").trim().toLocaleLowerCase("tr-TR");
    if (key) recentLabelFrequency.set(key, (recentLabelFrequency.get(key) || 0) + 1);
  }
  const pairFrequency = (left, right) => {
    const signature = optionPairSignature(left, right);
    return (normalizeStoryState(storyState).recent_option_pairs || []).filter((item) => item === signature).length;
  };
  const choiceSeed = `${normalizeStoryState(storyState).current_location}|${normalizeStoryState(storyState).recent_options.slice(-20).join("|")}`;
  pairPool.sort((a, b) => {
    const score = ([left, right]) => {
      const leftFamily = genericOptionFamily(left); const rightFamily = genericOptionFamily(right);
      const sameFamily = leftFamily && rightFamily && leftFamily === rightFamily;
      const leftFuture = futureSignature(left); const rightFuture = futureSignature(right);
      const recentPenalty = (leftFamily && recentGenericFamilies.has(leftFamily) ? 8 : 0) + (rightFamily && recentGenericFamilies.has(rightFamily) ? 8 : 0);
      const familyPenalty = (recentSituationFamilies.has(left.action_family || situationFamilyForOption(left)) ? 5 : 0) + (recentSituationFamilies.has(right.action_family || situationFamilyForOption(right)) ? 5 : 0);
      const futurePenalty = (recentFutureSignatures.has(leftFuture) ? 12 : 0) + (recentFutureSignatures.has(rightFuture) ? 12 : 0);
      const behaviorTargetPenalty = (recentBehaviorTargets.has(behaviorSignature(left)) ? 7 : 0) + (recentBehaviorTargets.has(behaviorSignature(right)) ? 7 : 0);
      const targetDiversityBonus = behaviorSignature(left).split("|")[1] !== behaviorSignature(right).split("|")[1] ? -4 : 0;
      const naturalSurpriseBonus = left.intent !== right.intent ? -3 : 0;
      const leftVector = psychologicalVectorForOption(left); const rightVector = psychologicalVectorForOption(right);
      const vectorContrastBonus = archetypeBiasEnabled && leftVector !== rightVector ? -2 : 0;
      const affinityBonus = archetypeBiasEnabled ? -(archetypeAffinityScore(left, activeArchetype, archetypePressure) + archetypeAffinityScore(right, activeArchetype, archetypePressure)) * 2 : 0;
      const archetypeMap = ARCHETYPE_VECTOR_AFFINITY[activeArchetype];
      const alignedCounterBonus = archetypeBiasEnabled && archetypeMap && ((archetypeMap.aligned.includes(leftVector) && archetypeMap.counter.includes(rightVector)) || (archetypeMap.counter.includes(leftVector) && archetypeMap.aligned.includes(rightVector))) ? -2 : 0;
      const psychologicalCooldownPenalty = archetypeBiasEnabled
        ? (recentPsychologicalKeys.has(`${activeArchetype}|${leftVector}|${psychologicalTargetForOption(left)}`) ? 4 : 0) + (recentPsychologicalKeys.has(`${activeArchetype}|${rightVector}|${psychologicalTargetForOption(right)}`) ? 4 : 0)
        : 0;
      const routeRhythmBonus = Number(normalizeStoryState(storyState).location_dwell_turns || 0) >= 3 && (left.route_type === "navigation" || right.route_type === "navigation") ? -Math.min(6, Number(normalizeStoryState(storyState).location_dwell_turns || 0)) : 0;
      const tieBreak = stableChoiceHash(`${choiceSeed}|${leftFuture}|${rightFuture}`);
      // Prefer combinations that have appeared least often.  A capped small
      // penalty still let a frequently replayed pair win once its 20-entry
      // cooldown expired; use an uncapped deterministic frequency weight so
      // long-horizon selection rotates through the grounded candidate pool.
      const pairHistoryPenalty = (pairFrequency(left, right) || 0) * 200;
      const recentUsePenalty = ((recentLabelFrequency.get(String(left.label_tr || "").trim().toLocaleLowerCase("tr-TR")) || 0) + (recentLabelFrequency.get(String(right.label_tr || "").trim().toLocaleLowerCase("tr-TR")) || 0)) * 3;
      const physicalStateProgressBonus = ["closed", "ajar", "open", "idle", "on", "off", "still", "flooded"].includes(String(left.entity_state_mutation?.to_state || "").toLowerCase()) || ["closed", "ajar", "open", "idle", "on", "off", "still", "flooded"].includes(String(right.entity_state_mutation?.to_state || "").toLowerCase()) ? -4 : 0;
      return (left.intent === right.intent ? 20 : 0) + (behaviorSignature(left) === behaviorSignature(right) ? 30 : 0) + (optionCategory(left.label_tr) === optionCategory(right.label_tr) ? 3 : 0) + (sameFamily ? 10 : 0) + recentPenalty + familyPenalty + futurePenalty + behaviorTargetPenalty + pairHistoryPenalty + recentUsePenalty + physicalStateProgressBonus + targetDiversityBonus + naturalSurpriseBonus + vectorContrastBonus + affinityBonus + alignedCounterBonus + psychologicalCooldownPenalty + routeRhythmBonus + tieBreak;
    };
    return score(a) - score(b);
  });
  const distinctVisibleResult = (left, right) => String(left?.result_prompt_en || "").trim().toLowerCase() !== String(right?.result_prompt_en || "").trim().toLowerCase();
  const distinctAction = (left, right) => String(left?.label_tr || "").trim().toLocaleLowerCase("tr-TR") !== String(right?.label_tr || "").trim().toLocaleLowerCase("tr-TR");
  const differentGenericFamilies = (left, right) => {
    const a = genericOptionFamily(left); const b = genericOptionFamily(right);
    return !a || !b || a !== b;
  };
  const chosen = pairPool.find(([left, right]) => distinctAction(left, right) && differentGenericFamilies(left, right) && left.intent !== right.intent && distinctVisibleResult(left, right) && futureSignature(left) !== futureSignature(right))
    || pairPool.find(([left, right]) => distinctAction(left, right) && differentGenericFamilies(left, right) && distinctVisibleResult(left, right) && futureSignature(left) !== futureSignature(right))
    || pairPool.find(([left, right]) => distinctAction(left, right) && distinctVisibleResult(left, right) && futureSignature(left) !== futureSignature(right));
  if (!chosen) return null;
  const make = (candidate, index) => ({ [`option_${index}_tr`]: candidate.label_tr, [`option_${index}_en`]: candidate.option_en, [`option_${index}_result_prompt_en`]: candidate.result_prompt_en, [`option_${index}_scene_anchors`]: candidate.scene_anchors, [`option_${index}_state_patch`]: candidate.state_patch, [`option_${index}_id`]: candidate.state_id, [`option_${index}_intent`]: candidate.intent, [`option_${index}_psyche_delta`]: candidate.psyche_delta, [`option_${index}_symbol_delta`]: candidate.symbol_delta, [`option_${index}_archetypal_role`]: candidate.archetypal_role });
  const pair = { ...make(chosen[0], 1), ...make(chosen[1], 2) };
  Object.defineProperty(pair, "_candidateRecords", { value: records, enumerable: false });
  Object.defineProperty(pair, "_selectedRecords", { value: chosen, enumerable: false });
  Object.defineProperty(pair, "_psychologicalTrace", { value: { enabled: archetypeBiasEnabled, archetype: activeArchetype, pressure: archetypePressure, options: chosen.map((candidate) => ({ vector: psychologicalVectorForOption(candidate), target: psychologicalTargetForOption(candidate), affinity: archetypeAffinityScore(candidate, activeArchetype, archetypePressure) })) }, enumerable: false });
  Object.defineProperty(pair, "_candidateDiagnostics", { value: evaluated.map((candidate) => ({ libraryId: candidate.libraryId || null, action: candidate.label_tr, consequence: candidate.result_prompt_en, intent: candidate.intent, targetEntity: candidate.target_entity || null, future: futureSignature(candidate), nextLocation: candidate.next_location, invalidLocation: candidate.invalid_location, ...(candidate._validation || {}) })), enumerable: false });
  return pair;
}

// This is deliberately not the old creative fallback catalogue. It is a
// bounded liveness guard for an unavailable or malformed Qwen reply: it can
// only walk to an explicitly declared adjacent location and cannot introduce
// a prop, weather, symbol or new world. Qwen remains the normal author.
export function sceneBoundRecoveryOptions({ storyState, previousOptions = [], dreamPsyche, exhausted = false } = {}) {
  const story = normalizeStoryState(storyState);
  const manifest = sceneManifestFor(story);
  const psyche = normalizeDreamPsyche(dreamPsyche);
  const routes = {
    red_house_exterior: ["Kırmızı eve dön", "The anonymous figure is now outside the red house"],
    red_house_doorstep: ["Kırmızı eve yaklaş", "The anonymous figure is now at the red house doorstep"],
    front_path: ["Çatlak yolda ilerle", "The anonymous figure is farther along the cracked front path"],
    quiet_street: ["Sokağa doğru ilerle", "The anonymous figure is now on the quiet street"],
    red_house_hallway: ["Evin içine gir", "The anonymous figure is now inside the red house hallway"],
    wooden_hallway: ["Evin içine gir", "The anonymous figure is now inside the wooden hallway"],
    stairwell: ["Merdivene yönel", "The anonymous figure is now at the stairwell"],
    basement_door: ["Bodrum kapısına yaklaş", "The anonymous figure is now beside the basement door"],
    basement: ["Bodruma in", "The anonymous figure is now in the underground basement"],
    machine_room: ["Makine odasına gir", "The anonymous figure is now inside the machine room"],
    alley_mouth: ["Ara sokağa sap", "The figure is now at the narrow alley mouth"],
    control_room: ["Kontrol odasına gir", "The anonymous figure is now inside a small control room"],
    hidden_tunnel: ["Gizli tünele gir", "The anonymous figure is now inside a hidden tunnel"]
  };
  const records = manifest.adjacent_locations.map((location, index) => {
    const route = routes[location];
    if (!route) return null;
    const record = qwenCandidateRecord(route[0], route[1], location, index, story, psyche);
    // These are two declared graph edges, so mark them as two distinct route
    // directions instead of letting a wording heuristic collapse both as
    // generic navigation.
    record.intent = index === 0 ? "approach" : "follow";
    return record;
  }).filter(Boolean);
  // Prefer actions composed from entities that are physically present in the
  // committed manifest.  This keeps the bounded recovery path from falling
  // back to the old "stay/observe/approach" loop when Qwen is unavailable.
  const localRecords = [];
  const addLocal = (action, consequence) => {
    const record = qwenCandidateRecord(action, consequence, manifest.location, localRecords.length, story, psyche, false);
    const sceneText = `${manifest.location} ${manifest.entities.join(" ")}`.toLocaleLowerCase("tr-TR");
    const groundedToManifest = [record.label_tr, record.result_prompt_en].join(" ").toLocaleLowerCase("tr-TR").split(/[^a-zçğıöşü0-9]+/).filter((token) => token.length > 3).some((token) => sceneText.includes(token));
    const targetAliases = { door: /door|kapı|kapi/, machine: /machine|makine/, figure: /figure|figür|figur|anonymous/, tree: /tree|ağaç|agac/, path: /path|yol|street|sokak/, light: /light|ışık|isik|parıltı|parilti/, water: /water|su/, radio: /radio|radyo/, photograph: /photograph|fotoğraf|fotograf/ };
    const targetGrounded = record.entity_state_mutation?.target_entity && [...manifest.entities].some((entity) => targetAliases[record.entity_state_mutation.target_entity]?.test(String(entity).toLocaleLowerCase("tr-TR")));
    if (record.label_tr && record.result_prompt_en && staticVisibleConsequence(record.result_prompt_en) && record.entity_state_mutation && (groundedToManifest || qwenCandidateGrounded(record, story) || targetGrounded) && !localRecords.some((item) => item.label_tr.toLocaleLowerCase("tr-TR") === record.label_tr.toLocaleLowerCase("tr-TR"))) localRecords.push(record);
  };
  for (const entity of manifest.entities) {
    const name = String(entity).replaceAll("_", " "); const lower = name.toLocaleLowerCase("tr-TR");
    if (lower === String(manifest.location).replaceAll("_", " ").toLocaleLowerCase("tr-TR")) continue;
    if (/door|kapı|kapi/.test(lower)) {
      addLocal("Ön kapıyı aç", "The established front door is now open");
      addLocal("Kapının ardını dinle", "A quiet sound is now audible beyond the established door");
    } else if (/path|yol|street|sokak/.test(lower)) {
      addLocal("Çatlak yolda ilerle", "The anonymous figure is now farther along the established path");
      addLocal("Yolun çatlağını izle", "The deepest crack in the established path is now clearly visible");
    } else if (/tree|ağaç|agac/.test(lower)) {
      addLocal("Ağacın gölgesini izle", "The established tree casts a long shadow across the current scene");
    } else if (/machine|makine/.test(lower)) {
      addLocal("Makineyi çalıştır", "The established machine is now glowing with blue light");
      addLocal("Makinenin ışığını izle", "The established machine light is now reflected across the room");
    } else if (/radio|radyo/.test(lower)) {
      addLocal("Radyoyu aç", "The established radio is now silent and its dial glows");
    } else if (/photograph|fotoğraf/.test(lower)) {
      addLocal("Fotoğrafı çevir", "The established photograph now shows a missing face");
    } else if (/figure|figür|character|anonymous/.test(lower)) {
      addLocal("Figürden uzaklaş", "The anonymous figure is now farther from the current scene");
    }
  }
  const priorFutureKeys = new Set(previousOptions.slice(-20).map((item) => futureSignature({ label_tr: typeof item === "string" ? item : item?.label_tr, result_prompt_en: typeof item === "string" ? "" : item?.result_prompt_en })).filter(Boolean));
  const recentLabels = new Set(previousOptions.slice(-8).map((item) => String(typeof item === "string" ? item : item?.label_tr || "").trim().toLocaleLowerCase("tr-TR")).filter(Boolean));
  const localUsable = exhausted
    ? localRecords
    : localRecords.filter((record) => !recentLabels.has(String(record.label_tr || "").trim().toLocaleLowerCase("tr-TR")) && !routeRepeat(record, previousOptions) && !priorFutureKeys.has(futureSignature(record)));
  const makePair = (left, right) => {
    const make = (candidate, index) => ({ [`option_${index}_tr`]: candidate.label_tr, [`option_${index}_en`]: candidate.option_en, [`option_${index}_result_prompt_en`]: candidate.result_prompt_en, [`option_${index}_scene_anchors`]: candidate.scene_anchors, [`option_${index}_state_patch`]: candidate.state_patch, [`option_${index}_id`]: candidate.state_id, [`option_${index}_intent`]: candidate.intent, [`option_${index}_psyche_delta`]: candidate.psyche_delta, [`option_${index}_symbol_delta`]: candidate.symbol_delta, [`option_${index}_archetypal_role`]: candidate.archetypal_role });
    return { ...make(left, 1), ...make(right, 2) };
  };
  // Each record above is authored from the declared adjacency graph and fixed
  // visible result template. Unlike free-form text, it does not need the
  // generic Qwen diversity heuristic to prove safety. This also keeps a
  // legitimate hallway edge alive when the model repeatedly echoes a past
  // exterior choice.
  // Never recycle an adjacent edge that was just shown under a new wording.
  // If both graph edges are cooled, return null and let the bounded Qwen retry
  // fill the round instead of exposing a misleading reversal.
  // Route records must remain ordinary, fully-grounded navigation candidates
  // even in exhausted mode. History may be relaxed there; graph validity,
  // canonical identity and self-loop protection may not.
  const usable = records
    .filter((record) => record.label_tr && record.result_prompt_en && staticVisibleConsequence(record.result_prompt_en) && record.route_type === "navigation" && !record.invalid_location && record.next_location !== manifest.location && manifest.adjacent_locations.includes(record.next_location) && (exhausted || !routeRepeat(record, previousOptions)))
    .filter((record, index, all) => all.findIndex((candidate) => candidate.next_location === record.next_location) === index);
  // Normal recovery retains its one-route-plus-local shape. Exhausted mode is
  // the only narrowly-scoped exception that may join two distinct graph edges
  // after all scene-local futures are exhausted.
  const normalRouteCandidates = exhausted ? usable : usable.slice(0, 1);
  let pair = localUsable.length >= 2 ? makePair(localUsable[0], localUsable.find((record) => situationFamilyForOption(record) !== situationFamilyForOption(localUsable[0])) || localUsable[1]) : selectQwenPair([...localUsable, ...normalRouteCandidates], story, previousOptions, psyche);
  if (!pair && !exhausted && localUsable.length && normalRouteCandidates.length) {
    pair = makePair(normalRouteCandidates[0], localUsable[0]);
  }
  if (exhausted) {
    // Exhausted-scene mode relaxes history-only filters, never physical
    // safety. Prefer one real route plus one state-changing local future;
    // allow two real routes only when no local future survives.
    pair = null;
    if (usable.length && localRecords.length) pair = makePair(usable[0], localRecords[0]);
    if (!pair && localRecords.length >= 2) pair = makePair(localRecords[0], localRecords[1]);
    if (!pair && usable.length >= 2) pair = makePair(usable[0], usable[1]);
  }
  // The generic diversity gate is tuned for free-form Qwen writing. Two
  // explicitly declared graph edges are already distinct futures; keep that
  // liveness fact rather than turning a valid hallway transition into a blank
  // viewer screen merely because both labels are travel-shaped.
  if (!pair && localUsable.length >= 2) {
    pair = makePair(localUsable[0], localUsable[1]);
  }
  if (!pair && exhausted && usable.length >= 2) {
    const make = (candidate, index) => ({ [`option_${index}_tr`]: candidate.label_tr, [`option_${index}_en`]: candidate.option_en, [`option_${index}_result_prompt_en`]: candidate.result_prompt_en, [`option_${index}_scene_anchors`]: candidate.scene_anchors, [`option_${index}_state_patch`]: candidate.state_patch, [`option_${index}_id`]: candidate.state_id, [`option_${index}_intent`]: candidate.intent, [`option_${index}_psyche_delta`]: candidate.psyche_delta, [`option_${index}_symbol_delta`]: candidate.symbol_delta, [`option_${index}_archetypal_role`]: candidate.archetypal_role });
    pair = { ...make(usable[0], 1), ...make(usable[1], 2) };
  }
  // If every declared route is cooled and Qwen has repeatedly failed to
  // provide two fresh grounded branches, keep the round alive with a tiny
  // scene-local liveness pair. These labels are derived only from entities
  // already present in the committed manifest; they never introduce a new
  // prop, location or motif and are used only after Qwen failure.
  if (!pair) {
    const local = [];
    const locationText = String(manifest.location || "mekân").replaceAll("_", " ");
    const hasFigure = manifest.entities.some((entity) => /figure|figür|character|anonymous/i.test(String(entity)));
    const addLocal = (action, consequence) => {
      const record = qwenCandidateRecord(action, consequence, manifest.location, local.length, story, psyche, true);
      if (record.label_tr && record.result_prompt_en && staticVisibleConsequence(record.result_prompt_en) && record.entity_state_mutation && qwenCandidateGrounded(record, story)) local.push(record);
    };
    addLocal("Mekânda sessizce kal", `The ${locationText} is now quiet and still`);
    if (hasFigure) addLocal("Figüre yaklaş", `The anonymous figure is now closer in the ${locationText}`);
    if (local.length >= 2) {
      const make = (candidate, index) => ({ [`option_${index}_tr`]: candidate.label_tr, [`option_${index}_en`]: candidate.option_en || englishLabelFromTurkish(candidate.label_tr), [`option_${index}_result_prompt_en`]: candidate.result_prompt_en, [`option_${index}_scene_anchors`]: candidate.scene_anchors, [`option_${index}_state_patch`]: candidate.state_patch, [`option_${index}_id`]: candidate.state_id, [`option_${index}_intent`]: candidate.intent, [`option_${index}_psyche_delta`]: candidate.psyche_delta, [`option_${index}_symbol_delta`]: candidate.symbol_delta, [`option_${index}_archetypal_role`]: candidate.archetypal_role });
      pair = { ...make(local[0], 1), ...make(local[1], 2) };
      Object.defineProperty(pair, "_livenessRecovery", { value: true, enumerable: false });
    }
  }
  if (!pair) return null;
  Object.defineProperty(pair, "_sceneBoundRecovery", { value: true, enumerable: false });
  if (exhausted) Object.defineProperty(pair, "_exhaustedSceneRecovery", { value: true, enumerable: false });
  Object.defineProperty(pair, "_qwenTrace", { value: { finalValidationResult: "scene_bound_recovery", fallbackReason: "QWEN_REJECTED_SCENE_BOUND_RECOVERY" }, enumerable: false });
  return pair;
}

// Small prompt-side grammar. It is derived from the committed manifest on
// every turn, so it does not create a second world model or an ever-growing
// catalogue. The first hint is a natural continuation; later hints are
// scene-local transformations of entities that are actually visible.
function sceneGrammarHints(storyState, previousOptions = []) {
  const story = normalizeStoryState(storyState); const manifest = sceneManifestFor(story); const hints = [];
  const add = (label) => { if (!label || routeRepeat({ label_tr: label }, previousOptions)) return; const key = label.toLocaleLowerCase("tr-TR"); if (!hints.some((item) => item.toLocaleLowerCase("tr-TR") === key)) hints.push(label); };
  for (const location of manifest.adjacent_locations) {
    const key = String(location).toLowerCase();
    if (key === "red_house_doorstep") add("kırmızı eve yaklaş");
    else if (key === "front_path") add("çatlak yolda ilerle");
    else if (key === "quiet_street") add("sokağa doğru ilerle");
    else if (key === "red_house_hallway") add("evin içine gir");
    else if (key === "stairwell") add("merdivene yönel");
    else if (key === "basement_door") add("bodrum kapısına yaklaş");
    else if (key === "basement") add("bodruma in");
    else if (key === "machine_room") add("makine odasına gir");
    else if (key === "alley_mouth") add("ara sokağa sap");
    else if (key === "control_room") add("kontrol odasına gir");
    else if (key === "hidden_tunnel") add("gizli tünele gir");
  }
  for (const entity of manifest.entities) {
    const lower = String(entity).toLocaleLowerCase("tr-TR");
    if (/door|kapı|kapi/.test(lower)) { add("ön kapıyı aç"); add("kapının ardını dinle"); }
    else if (/path|yol|street|sokak/.test(lower)) { add("çatlak yolda ilerle"); add("yolun çatlağını izle"); }
    else if (/tree|ağaç|agac/.test(lower)) add("ağacın gölgesini izle");
    else if (/machine|makine/.test(lower)) { add("makineyi çalıştır"); add("makinenin ışığını izle"); }
    else if (/radio|radyo/.test(lower)) add("radyoyu aç");
    else if (/photograph|fotoğraf/.test(lower)) add("fotoğrafı çevir");
    else if (/figure|figür|character|anonymous/.test(lower)) add("figürden uzaklaş");
  }
  return hints.slice(0, 6);
}

const TAG_ALIASES = new Map([
  ["light", ["light", "ışık", "parıltı", "glow", "luminous"]], ["shadow", ["shadow", "gölge"]],
  ["sound", ["sound", "ses", "yankı", "echo"]], ["trace", ["trace", "iz", "mark"]],
  ["crack", ["crack", "çatlak"]], ["door", ["door", "kapı"]], ["window", ["window", "pencere"]],
  ["stairs", ["stairs", "merdiven", "basamak"]], ["path", ["path", "yol"]], ["street", ["street", "sokak"]],
  ["bridge", ["bridge", "köprü"]], ["figure", ["figure", "figür", "character", "anonymous"]],
  ["radio", ["radio", "radyo"]], ["photograph", ["photograph", "fotoğraf", "photo"]],
  ["machine", ["machine", "makine"]], ["button", ["button", "düğme"]], ["mirror", ["mirror", "ayna", "reflection", "yansıma"]],
  ["water", ["water", "su", "flooded", "ıslak"]], ["object", ["object", "obje", "nesne"]], ["scene", ["scene", "sahne"]],
]);

function optionTagsForStory(story) {
  const manifest = sceneManifestFor(story); const text = `${manifest.location} ${manifest.entities.join(" ")} ${manifest.summary}`.toLocaleLowerCase("tr-TR");
  const tags = new Set([...TAG_ALIASES.entries()].filter(([, aliases]) => aliases.some((alias) => text.includes(alias))).map(([tag]) => tag));
  // Every committed manifest is itself a valid scene-local grounding surface;
  // this enables quiet, non-prop actions without inventing physical objects.
  tags.add("scene");
  return tags;
}

function libraryRouteLabel(location) {
  const labels = { red_house_exterior: "Kırmızı eve dön", red_house_doorstep: "Kırmızı eve yaklaş", front_path: "Ön yola ilerle", quiet_street: "Sokağa doğru ilerle", red_house_hallway: "Evin içine gir", stairwell: "Merdivene yönel", basement_door: "Bodrum kapısına yaklaş", basement: "Bodruma in", machine_room: "Makine odasına gir", alley_mouth: "Ara sokağa sap", control_room: "Kontrol odasına gir", hidden_tunnel: "Gizli tünele gir" };
  return labels[location] || `${String(location).replaceAll("_", " ")} yönüne ilerle`;
}

export function libraryTemplateTagsMatch(template, tags) {
  const metadata = optionTemplateMeta(template);
  return metadata.required_tags.every(tag => tags.has(tag)) && !metadata.forbidden_tags.some(tag => tags.has(tag));
}

export function sceneMatchedOptionLibrary(storyState, previousOptions = [], dreamPsyche) {
  const story = normalizeStoryState(storyState); const manifest = sceneManifestFor(story); const tags = optionTagsForStory(story);
  // Prefer the append-only display ledger when available.  The public
  // recent_options field is intentionally deduped for compact state, so it
  // cannot express the true order needed by library cooldowns.
  const ledgerPrevious = story.recent_option_records
    .slice(-20)
    .map((record) => String(record?.label_tr || "").trim())
    .filter(Boolean);
  const previous = (ledgerPrevious.length ? ledgerPrevious : previousOptions).slice(-20);
  // Exact viewer-label cooldown is intentionally short.  The structured
  // future/route repeat gates below retain longer semantic memory; using the
  // entire bounded display ledger as a hard label blacklist starves otherwise
  // grounded options after a location change.
  const recentLabels = new Set(previous.slice(-NEAR_REPEAT_WINDOW).map((item) => String(typeof item === "string" ? item : item?.label_tr || "").trim().toLocaleLowerCase("tr-TR")));
  const records = [];
  for (const target of manifest.adjacent_locations) {
    if (!target || target === manifest.location || routeRepeat({ label_tr: libraryRouteLabel(target), next_location: target }, previous)) continue;
    const routeLabel = libraryRouteLabel(target);
    const r = qwenCandidateRecord(routeLabel, `The figure is now in the established ${target.replaceAll("_", " ")}`, target, records.length, story, dreamPsyche, false);
    // Library labels are authored viewer copy; do not run them through the
    // legacy Qwen English-normalizer, which can erase short Turkish phrases.
    r.label_tr = routeLabel; r.raw_action = routeLabel; r.option_en = r.option_en || target.replaceAll("_", " ");
    r.category = "navigation"; r.intent = "move"; r.route_type = "navigation"; r.libraryId = `route_${target}`; r.psychological_vector = "explore"; r.target_entity = target;
    if (!recentLabels.has(r.label_tr.toLocaleLowerCase("tr-TR"))) records.push(r);
  }
  const entityStates = manifest.entity_states || {};
  const mutationEligible = (template) => {
    const mutation = template[9];
    if (!mutation) return true;
    const target = String(mutation.target_entity || template[5]?.[0] || "").toLowerCase();
    const currentValue = entityStateForMutation(manifest, mutation);
    if (mutation.from_state && currentValue !== mutation.from_state) return false;
    if (mutation.to_state && currentValue === mutation.to_state) return false;
    return target === "scene" || visiblePhysicalEntity(manifest, target);
  };
  const locals = OPTION_LIBRARY.filter((template) => template[7] === "scene_local" && libraryTemplateTagsMatch(template, tags) && mutationEligible(template))
    .map((template, index) => {
      const [id, label, en, category, intent, required] = template; const consequence = template[8]; const mutation = template[9] || null; const r = qwenCandidateRecord(label, consequence, manifest.location, index + records.length, story, dreamPsyche, false, mutation); r.label_tr = label; r.raw_action = label; r.option_en = en; r.category = category; r.intent = intent; r.route_type = "scene_local"; r.invalid_location = false; r.libraryId = id; r.entity_state_mutation = mutation; r.psychological_vector = psychologicalVectorForBehavior(intent); r.target_entity = mutation?.target_entity || required?.[0] || "scene"; if (mutation) r.state_patch.entity_state_mutation = mutation; return r;
    })
    .filter((r) => staticVisibleConsequence(r.result_prompt_en) && r.entity_state_mutation && !recentLabels.has(r.label_tr.toLocaleLowerCase("tr-TR")) && !routeRepeat(r, previous))
    .filter((record, index, list) => list.findIndex((item) => item.label_tr.toLocaleLowerCase("tr-TR") === record.label_tr.toLocaleLowerCase("tr-TR")) === index);
  // Rotate ties deterministically from the current scene + display ledger.
  // This keeps the library reproducible while preventing the first few
  // templates in the source file from dominating every eligible scene.
  const rotationSeed = `${manifest.location}|${previous.join("|")}|${story.recent_events.slice(-2).join("|")}`;
  const offset = locals.length ? Math.floor(stableChoiceHash(rotationSeed) * locals.length) : 0;
  const rotatedLocals = locals.length ? locals.slice(offset).concat(locals.slice(0, offset)) : locals;
  const candidates = [...records, ...rotatedLocals];
  // Library candidates are already manifest-grounded. Evaluate a wider
  // deterministic set here so the reusable template surface is not reduced
  // to the first four records before pair diversity ranking.
  let pair = selectQwenPair(candidates, story, previous, normalizeDreamPsyche(dreamPsyche), { maxCandidates: candidates.length });
  // Library records have already passed manifest/tag filtering. Keep a small
  // direct pairing guard so a generic Qwen diversity heuristic cannot turn a
  // grounded deterministic set into an empty voting round.
  if (!pair) {
    const recentPairSet = new Set((story.recent_option_pairs || []).slice(-PAIR_REPEAT_WINDOW));
    const valid = candidates.filter((record) => qwenCandidateGrounded(record, story) && !routeRepeat(record, previous));
    if (valid.length >= 2) {
      const left = valid[0];
      const right = valid.find((record) => situationFamilyForOption(record) !== situationFamilyForOption(left) && futureSignature(record) !== futureSignature(left) && !recentPairSet.has(optionPairSignature(left, record))) || valid.find((record) => futureSignature(record) !== futureSignature(left) && !recentPairSet.has(optionPairSignature(left, record)));
      if (!right) return null;
      const make = (candidate, index) => ({ [`option_${index}_tr`]: candidate.label_tr, [`option_${index}_en`]: candidate.option_en || englishLabelFromTurkish(candidate.label_tr), [`option_${index}_result_prompt_en`]: candidate.result_prompt_en, [`option_${index}_scene_anchors`]: candidate.scene_anchors, [`option_${index}_state_patch`]: candidate.state_patch, [`option_${index}_id`]: candidate.state_id, [`option_${index}_intent`]: candidate.intent, [`option_${index}_psyche_delta`]: candidate.psyche_delta, [`option_${index}_symbol_delta`]: candidate.symbol_delta, [`option_${index}_archetypal_role`]: candidate.archetypal_role });
      pair = { ...make(left, 1), ...make(right, 2) };
    }
  }
  if (!pair) return null;
  Object.defineProperty(pair, "_libraryTrace", { value: { candidateCount: candidates.length, navigationCount: records.length, sceneLocalCount: locals.length, source: "library" }, enumerable: false });
  return pair;
}

// Diagnostic-only view used by long-horizon benchmarks; it does not participate
// in production selection or mutate story state.
export function debugLibraryCatalogueFlow(storyState, previousOptions = []) {
  const story = normalizeStoryState(storyState); const manifest = sceneManifestFor(story); const tags = optionTagsForStory(story);
  const previous = (story.recent_option_records.length
    ? story.recent_option_records.slice(-20).map((record) => String(record?.label_tr || "").trim()).filter(Boolean)
    : previousOptions).slice(-20);
  const recentLabels = new Set(previous.slice(-NEAR_REPEAT_WINDOW).map((item) => String(typeof item === "string" ? item : item?.label_tr || "").trim().toLocaleLowerCase("tr-TR")));
  return OPTION_LIBRARY.filter((template) => template[7] === "scene_local").map((template) => {
    const metadata = optionTemplateMeta(template);
    const mutation = template[9] || null; const target = String(mutation?.target_entity || template[5]?.[0] || "").toLowerCase(); const current = entityStateForMutation(manifest, mutation || {});
    const visible = staticVisibleConsequence(template[8]); const grounded = target === "scene" || visiblePhysicalEntity(manifest, target);
    const stateReady = !mutation || (!mutation.from_state || current === mutation.from_state) && current !== mutation.to_state;
    const tagMatch = libraryTemplateTagsMatch(template, tags);
    const hasMutation = Boolean(mutation);
    const recentLabel = recentLabels.has(String(template[1] || "").trim().toLocaleLowerCase("tr-TR"));
    const routeRepeated = routeRepeat({ label_tr: template[1], result_prompt_en: template[8], target_entity: target, route_type: "scene_local", entity_state_mutation: mutation }, previous);
    const physicallyEligible = tagMatch && visible && grounded && stateReady && hasMutation;
    const accepted = physicallyEligible && !recentLabel && !routeRepeated;
    const rejectionReason = !tagMatch ? "tag_mismatch" : !grounded ? "missing_entity" : !visible ? "state_visibility" : !hasMutation || !stateReady ? "state_validity" : recentLabel || routeRepeated ? "cooldown" : null;
    return { id: template[0], label: template[1], target, behavior_family: metadata.behavior_family, psychological_vector: metadata.psychological_vector, required_tags: metadata.required_tags, optional_tags: metadata.optional_tags, forbidden_tags: metadata.forbidden_tags, visible, grounded, stateReady, tagMatch, hasMutation, recentLabel, routeRepeated, physicallyEligible, accepted, rejectionReason };
  });
}

// Backward-compatible coverage view: callers historically expect this helper
// to expose only templates whose required tags match the current scene.
export function debugLibraryCoverage(storyState, previousOptions = []) {
  return debugLibraryCatalogueFlow(storyState, previousOptions).filter((row) => row.tagMatch);
}

export async function generateOptions({ storyState, previousOptions = [], qwenUrl, timeoutMs = 8000, dreamPsyche, maxTokens, fallbackOnFailure = true } = {}) {
  const trace = { requestStart: Date.now(), requestEnd: null, totalLatencyMs: null, httpStatus: null, responseBytes: 0, finishReason: null, outputTokenCount: null, rawJsonComplete: false, parserRecovery: null, candidatePairsRecovered: 0, candidatesAfterGrounding: 0, candidatesAfterDiversity: 0, finalValidationResult: "pending", fallbackReason: null, attempts: [] };
  const fallback = (reason = "QWEN_VALIDATION_REJECT") => {
    trace.requestEnd = Date.now(); trace.totalLatencyMs = trace.requestEnd - trace.requestStart; trace.fallbackReason = reason; trace.finalValidationResult = "fallback";
    if (!fallbackOnFailure) {
      const value = { _qwenUnavailable: true };
      Object.defineProperty(value, "_qwenTrace", { value: { ...trace }, enumerable: false });
      return value;
    }
    const value = jungAwareFallbackOptions({ storyState, psyche: dreamPsyche, fallbackFactory: fallbackOptions, previousOptions });
    Object.defineProperty(value, "_qwenTrace", { value: { ...trace }, enumerable: false });
    return value;
  };
  if (!qwenUrl) return fallback("QWEN_HTTP_ERROR");
  const deadline = Date.now() + timeoutMs; const psyche = normalizeDreamPsyche(dreamPsyche); const manifest = compactSceneManifest(storyState, psyche); const visible = manifest.CURRENTLY_VISIBLE_OR_COMMITTED || {}; const jung = manifest.JUNG_STATE || {}; const strict = sceneManifestFor(storyState);
  const entities = strict.entities.join(", ") || "none";
  const routeHints = strict.adjacent_locations.map((location) => {
    const key = location.toLowerCase();
    if (key === "red_house_exterior") return `${location}=return to the red house exterior`;
    if (key === "red_house_doorstep") return `${location}=approach the red house doorstep`;
    if (key === "front_path") return `${location}=walk along the cracked path`;
    if (key === "quiet_street") return `${location}=move toward the quiet street`;
    if (key === "red_house_hallway") return `${location}=enter the red house hallway`;
    if (key === "stairwell") return `${location}=move toward the stairwell`;
    if (key === "basement_door") return `${location}=approach the basement door`;
    if (key === "basement") return `${location}=enter the basement`;
    if (key === "machine_room") return `${location}=enter the machine room`;
    if (key === "alley_mouth") return `${location}=turn into the narrow side alley`;
    if (key === "control_room") return `${location}=enter the control room`;
    if (key === "hidden_tunnel") return `${location}=enter the hidden tunnel`;
    return `${location}=move within the current scene`;
  }).join("; ");
  const promptPrevious = previousOptions.slice(-20).map((item) => typeof item === "string" ? item : (item?.label_tr || item?.action || "")).filter(Boolean).join(" / ").slice(-500) || "none";
  const routeLabels = strict.adjacent_locations.map((location) => {
    const key = location.toLowerCase();
    if (key === "red_house_exterior") return "kırmızı eve dön";
    if (key === "red_house_doorstep") return "kırmızı eve yaklaş";
    if (key === "front_path") return "çatlak yolda ilerle";
    if (key === "quiet_street") return "sokağa doğru ilerle";
    if (key === "red_house_hallway") return "evin içine gir";
    if (key === "stairwell") return "merdivene yönel";
    if (key === "basement_door") return "bodrum kapısına yaklaş";
    if (key === "basement") return "bodruma in";
    if (key === "machine_room") return "makine odasına gir";
    if (key === "alley_mouth") return "ara sokağa sap";
    if (key === "control_room") return "kontrol odasına gir";
    if (key === "hidden_tunnel") return "gizli tünele gir";
    return "";
  }).filter(Boolean);
  const recentLabels = new Set(previousOptions.slice(-20).map((item) => String(typeof item === "string" ? item : (item?.label_tr || item?.action || "")).trim().toLocaleLowerCase("tr-TR")));
  const recentRouteKeys = new Set(previousOptions.slice(-20).map((item) => optionRouteParts(item).target ? `${optionRouteParts(item).target}:${optionRouteParts(item).direction}` : "").filter(Boolean));
  const availableRouteLabels = routeLabels.filter((label) => !routeRepeat({ label_tr: label }, previousOptions));
  const routesExhausted = routeLabels.length > 0 && availableRouteLabels.length === 0;
  const routePrompt = routesExhausted ? "NONE — every route action is forbidden for this turn" : availableRouteLabels.join("; ");
  const entityHints = "visible entities only; author a concrete transformation, reveal, interaction or avoidance";
  const cooledTargets = [...new Set(previousOptions.slice(-20).map((item) => optionRouteParts(item).target).filter(Boolean))].join(", ") || "none";
  const dreamMemorySignals = compactManifestText(manifest).match(/MEMORY_ENTITIES[^.]*\.|JUNG_STATE[^.]*\./g)?.join(" ") || "bounded";
  const prompt = `S=${strict.location.replaceAll("_", " ")}; V=${entities}; N=${strict.adjacent_locations.join(", ")}; R=${routePrompt || "none"}; E=${entityHints}; COOLED=${cooledTargets}. Return JSON only: {"c":[[TR action,EN result,place],[TR action,EN result,place],[TR action,EN result,place]]}. If R exists, candidate 1 navigates to a declared N destination (not S); candidates 2-3 are different scene-local transformations of visible V in S. If R is empty, all are different scene-local V actions. Write actions naturally; no prepared labels. EN result is a short completed visible state (3-6 words, use is now). Never invent props/places; local actions stay in S. Use different behavior families. Avoid these recent actions: ${promptPrevious}.`;
  trace.promptChars = prompt.length;
  trace.previousCount = previousOptions.slice(-20).length;
  const tokenBudget = Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : (Number(process.env.QWEN_MAX_TOKENS) || 80);
  trace.maxTokens = tokenBudget;
  // A single bounded request is intentional: retrying after an 8s client
  // timeout leaves the CPU server still decoding the first request and can
  // create a hidden queue that makes every later round slower.
  let retryExcludedLabels = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = deadline - Date.now(); if (remainingMs <= 0) break; const controller = new AbortController(); let timedOut = false; const timer = setTimeout(() => { timedOut = true; attemptTrace.timeoutFiredAtMs = Date.now() - trace.requestStart; controller.abort(); }, remainingMs);
    // Diagnostic-only lifecycle timestamps (Aşama 1 / harness). Purely
    // additive: no field here is read by any control-flow decision below.
    const attemptTrace = { attemptId: `${trace.requestStart}_${attempt}_${crypto.randomUUID().slice(0, 8)}`, attemptIndex: attempt, remainingBudgetAtAttemptStart: remainingMs, timeoutScheduledMs: remainingMs, timeoutFiredAtMs: null, fetchResolvedAtMs: null, bodyCompleteAtMs: null, usableContentAtMs: null, timedOutFlagAtDecision: null, httpStatus: null, parserRecovery: null, candidatePairsRecovered: null, candidatesAfterGrounding: null, hasPair: null, hasValid: null, validationReason: null };
    trace.attempts.push(attemptTrace);
    try {
      const retryInstruction = attempt ? ` IMPORTANT RETRY: output exactly one complete compact JSON object with key c and THREE arrays, no prose. Author three DIFFERENT unused actions from the visible entities and declared routes. Do NOT use any of these rejected/recent labels or their semantic equivalents: ${[...new Set([...recentLabels, ...retryExcludedLabels])].filter(Boolean).join("; ") || "none"}. N is route-only; never mention a neighboring N entity in a scene-local result. If route labels are unavailable, use three different visible entities or transformations. Each result must be a different, concrete completed state using "is now". Do not copy a prepared label. Shape only: {"c":[["<Turkish action 1>","<English visible state 1>","<S>"],["<Turkish action 2>","<English visible state 2>","<S>"],["<Turkish action 3>","<English visible state 3>","<S>"]]}` : "";
      const response = await fetch(`${qwenUrl}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: "qwen3-4b", temperature: attempt ? 0.65 : 0.35, max_tokens: tokenBudget, chat_template_kwargs: { enable_thinking: false }, messages: [{ role: "system", content: "Return exactly one JSON object with key c containing two arrays. Each array is Turkish imperative action, short English completed visible result, allowed place. Use only visible entities and declared adjacent places; never invent props or locations. No explanation." }, { role: "user", content: `${prompt}${retryInstruction}` }] }) });
      attemptTrace.fetchResolvedAtMs = Date.now() - trace.requestStart;
      trace.httpStatus = response.status ?? 200; attemptTrace.httpStatus = trace.httpStatus;
      const rawBody = typeof response.text === "function" ? await response.text() : JSON.stringify(await response.json()); attemptTrace.bodyCompleteAtMs = Date.now() - trace.requestStart; trace.responseBytes = Buffer.byteLength(rawBody); let body = null; try { body = JSON.parse(rawBody); } catch { trace.fallbackReason = "QWEN_JSON_INVALID"; }
      trace.finishReason = body?.choices?.[0]?.finish_reason ?? null; trace.outputTokenCount = body?.usage?.completion_tokens ?? null;
      const content = body?.choices?.[0]?.message?.content || ""; const parsed = parseJsonObjectPrefix(content); trace.rawJsonComplete = Boolean(parsed);
      if (parsed) attemptTrace.usableContentAtMs = Date.now() - trace.requestStart;
      if (response.ok === false || (Number.isFinite(Number(response.status)) && Number(response.status) >= 400)) return fallback("QWEN_HTTP_ERROR");
      attemptTrace.timedOutFlagAtDecision = timedOut;
      if (timedOut) return fallback("QWEN_TIMEOUT");
      if (!content.trim()) return fallback(trace.finishReason === "length" ? "QWEN_TRUNCATED" : (trace.fallbackReason || "QWEN_JSON_INVALID"));
      const legacyDirect = parsed && typeof parsed === "object" && parsed.option_1_tr && parsed.option_2_tr ? { ...parsed, option_1_tr: normalizeQwenLabel(parsed.option_1_tr), option_2_tr: normalizeQwenLabel(parsed.option_2_tr) } : null; const directDiagnostics = {}; const direct = legacyDirect && validateDynamicOptions(legacyDirect, previousOptions, storyState, directDiagnostics);
      const parserDiagnostics = {}; const candidates = parseQwenCandidates(content, storyState, psyche, parserDiagnostics); trace.parserRecovery = parserDiagnostics.parserRecovery || "none"; attemptTrace.parserRecovery = trace.parserRecovery; trace.candidatePairsRecovered = candidates.length;
      trace.candidatesAfterGrounding = candidates.filter((candidate) => evaluateCandidate(candidate, storyState, previousOptions).grounded).length;
      let pair = selectQwenPair(candidates, storyState, previousOptions, psyche);
      if (!pair && trace.candidatesAfterGrounding >= 1) pair = salvageQwenPair(candidates, storyState, previousOptions, psyche);
      trace.candidatesAfterDiversity = pair ? 2 : Math.min(trace.candidatesAfterGrounding, 1);
      trace.candidateDiagnostics = pair?._candidateDiagnostics || candidates.map((candidate) => ({ action: candidate.label_tr, consequence: candidate.result_prompt_en, intent: candidate.intent, future: futureSignature(candidate), nextLocation: candidate.next_location, invalidLocation: candidate.invalid_location, ...evaluateCandidate(candidate, storyState, previousOptions) }));
      const validationDiagnostics = {}; const valid = pair && validateDynamicOptions(pair, previousOptions, storyState, validationDiagnostics); trace.validationReason = validationDiagnostics.reason || directDiagnostics.reason || null;
      // Diagnostic-only snapshot (Aşama 1 / harness): records already-computed
      // values for THIS attempt before the next loop iteration overwrites the
      // shared trace fields. No new branches, no behavior change.
      attemptTrace.candidatePairsRecovered = trace.candidatePairsRecovered; attemptTrace.candidatesAfterGrounding = trace.candidatesAfterGrounding; attemptTrace.hasPair = Boolean(pair); attemptTrace.hasValid = Boolean(valid); attemptTrace.validationReason = trace.validationReason;
      if (valid && contextuallyRelevant(valid, storyState, candidates)) { trace.requestEnd = Date.now(); trace.totalLatencyMs = trace.requestEnd - trace.requestStart; const authoredPair = Boolean(pair?._selectedRecords?.length === 2 && pair._selectedRecords.every((candidate) => !candidate.emergency)); trace.finalValidationResult = authoredPair ? "qwen" : "emergency_completion"; trace.fallbackReason = authoredPair ? "QWEN_SUCCESS" : "QWEN_ZERO_COMPLETE_PAIRS"; Object.defineProperty(valid, "_qwenTrace", { value: { ...trace }, enumerable: false }); Object.defineProperty(valid, "_creativeTrace", { value: { source: authoredPair ? "qwen" : "qwen_emergency_completion", candidates: candidates.map((candidate) => ({ action: candidate.label_tr, consequence: candidate.result_prompt_en, emergency: Boolean(candidate.emergency), validation: candidate._validation || null })), currentEntities: normalizeStoryState(storyState).current_scene_entities, memoryEntities: normalizeStoryState(storyState).memory_entities.slice(-8) }, enumerable: false }); return valid; }
      if (direct && contextuallyRelevant(direct, storyState, [])) { trace.requestEnd = Date.now(); trace.totalLatencyMs = trace.requestEnd - trace.requestStart; trace.finalValidationResult = "qwen_legacy_emergency"; trace.fallbackReason = "QWEN_SUCCESS"; Object.defineProperty(direct, "_qwenTrace", { value: { ...trace }, enumerable: false }); Object.defineProperty(direct, "_creativeTrace", { value: { source: "qwen_legacy_emergency", candidates: [], currentEntities: normalizeStoryState(storyState).current_scene_entities, memoryEntities: normalizeStoryState(storyState).memory_entities.slice(-8) }, enumerable: false }); return direct; }
      // A malformed/repeated answer is cheap to correct with one bounded
      // retry. Timeout/transport failures are not retried here because doing
      // so could leave the CPU service with an unknown queued request.
      // Reverted: a fixed MIN_RETRY_BUDGET_MS gate here was miscalibrated
      // (it compared remaining shared-deadline budget against attempt-0's
      // OWN typical full latency, which is nearly always more than what is
      // left over — it ended up blocking retry almost unconditionally and
      // measurably dropped the qwen-authored share to 0% in a live check).
      // Restored to the original unconditional retry so this run can gather
      // real attempt-1 outcome data instead. Diagnostic-only: still records
      // the remaining budget at this decision point without acting on it.
      attemptTrace.retryBudgetRemainingMs = deadline - Date.now();
      if (attempt === 0 && trace.candidatePairsRecovered >= 1 && trace.fallbackReason !== "QWEN_TIMEOUT" && trace.fallbackReason !== "QWEN_HTTP_ERROR") {
        trace.retryAttempted = true;
        // Feed the rejected labels back into the bounded retry prompt. Small
        // local Qwen builds sometimes satisfy the JSON shape but echo one of
        // the just-rejected route/entity actions; naming those labels here is
        // enough to make the second sample a genuinely different future
        // without weakening the grounding or repeat gates.
        const rejectedThisAttempt = candidates
          .map((candidate) => ({ candidate, validation: evaluateCandidate(candidate, storyState, previousOptions) }))
          .filter(({ validation }) => !validation.accepted)
          .map(({ candidate }) => String(candidate.label_tr || "").trim())
          .filter(Boolean);
        retryExcludedLabels = [...new Set(rejectedThisAttempt)].slice(0, 6);
        trace.retryExcludedLabels = retryExcludedLabels;
        continue;
      }
      if (trace.candidatePairsRecovered < 2) return fallback("QWEN_ZERO_COMPLETE_PAIRS");
      if (trace.candidatesAfterGrounding < 2) return fallback("QWEN_GROUNDING_REJECT");
      if (!pair) return fallback("QWEN_DIVERSITY_REJECT");
      return fallback("QWEN_VALIDATION_REJECT");
    } catch (error) {
      if (timedOut || error?.name === "AbortError") return fallback("QWEN_TIMEOUT");
      return fallback(error?.cause ? "QWEN_HTTP_ERROR" : "QWEN_HTTP_ERROR");
    } finally { clearTimeout(timer); }
  }
  return fallback("QWEN_TIMEOUT");
}

export { FALLBACK_CATALOG };
