# 200 Displayed Round Option Trace and Root-Cause Finding

Generated from authoritative chronological OPTIONS_CREATED events in state/events.jsonl*. No production code was changed for this report.

## Summary

- Displayed rounds traced: **200**
- Scene range: **4290–4489**
- Unique labels: **37**
- Unique exact pairs: **98**
- Exact pair repeats: **102**
- Semantic pair repeats (action + visible consequence normalized): **102**
- Two-navigation exhausted-recovery pairs: **86**
- Maximum consecutive recovery streak: **21**

### Source distribution

- library: 75
- bounded_recovery_exhausted: 113
- scene_bound_recovery: 11
- qwen: 1

### Most frequent labels

- Kırmızı eve yaklaş: 52
- Kırmızı eve dön: 52
- Evin içine gir: 43
- Figürden uzaklaş: 25
- Merdivene yönel: 21
- Çatlak yolda ilerle: 21
- Bodruma in: 20
- Bodrum kapısına yaklaş: 13
- Ön kapıyı aç: 13
- Makine odasına gir: 12
- Figüre yaklaş: 11
- Sokağa doğru ilerle: 11
- Figürü görmezden gel: 9
- Figürün gölgesini izle: 9
- Figürü takip et: 7

### Most frequent exact pairs

- Kırmızı eve yaklaş || Merdivene yönel: 20
- Evin içine gir || Kırmızı eve dön: 20
- Bodruma in || Evin içine gir: 16
- Kırmızı eve yaklaş || Çatlak yolda ilerle: 13
- Bodrum kapısına yaklaş || Makine odasına gir: 8

## Point-blank finding

The “120+ option” count is the size of the template catalogue, not the number of choices available in one scene. Every round first intersects that catalogue with the committed manifest’s current entities/tags, entity-state mutations, route adjacency, recent-label cooldown, semantic-future cooldown, route-repeat checks and pair-diversity gates. In the traced window, the effective pool repeatedly collapsed to the same figure/route families because most scenes contained only an anonymous figure plus a sparse location entity.

The second bottleneck is orchestration: when the library pair selector returns no pair, the normal flow enters Qwen; when Qwen misses the liveness deadline or fails validation, bounded recovery supplies a small deterministic route/local pair. This is why the viewer sees a few familiar labels even though the catalogue is large. The repetition is therefore an eligibility/pair-selection bottleneck plus recovery dominance—not missing raw templates.

The existing 20-item display ledger also made exact labels unavailable across unrelated locations. That was corrected separately by scoping the library’s exact-label cooldown to the two-item near window. The post-fix run restored the library source, but the remaining semantic repeats in this historical trace are evidence that sparse manifests and recovery paths still limit long-horizon variety.

## Ordered displayed options (oldest → newest)

| # | Scene | Location | Source | Option 1 | Option 2 |
|---:|---:|---|---|---|---|
| 1 | 4290 | machine_room | library | Bodruma in → The figure is now in the established basement | Makineden uzaklaş → The established machine is now farther behind the figure |
| 2 | 4291 | machine_room | library | Kontrol odasına gir → The figure is now in the established control room | Makinenin sesini takip et → The established machine light now points across the room |
| 3 | 4292 | control_room | library | Makine odasına gir → The figure is now in the established machine room | Figürü görmezden gel → The figure remains present at the edge of attention |
| 4 | 4293 | control_room | library | Gizli tünele gir → The figure is now in the established hidden tunnel | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 5 | 4294 | hidden_tunnel | library | Kontrol odasına gir → The figure is now in the established control room | Figürü takip et → The figure now leads through the existing scene |
| 6 | 4295 | hidden_tunnel | library | Ara sokağa sap → The figure is now in the established alley mouth | Figürden uzaklaş → The anonymous figure is now farther away |
| 7 | 4296 | alley_mouth | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 8 | 4297 | alley_mouth | library | Gizli tünele gir → The figure is now in the established hidden tunnel | Figürü görmezden gel → The figure remains present at the edge of attention |
| 9 | 4298 | hidden_tunnel | library | Kontrol odasına gir → The figure is now in the established control room | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 10 | 4299 | hidden_tunnel | library | Ara sokağa sap → The figure is now in the established alley mouth | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 11 | 4300 | alley_mouth | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Figürden uzaklaş → The anonymous figure is now farther away |
| 12 | 4301 | alley_mouth | library | Gizli tünele gir → The figure is now in the established hidden tunnel | Figürü takip et → The figure now leads through the existing scene |
| 13 | 4302 | hidden_tunnel | library | Kontrol odasına gir → The figure is now in the established control room | Figürü görmezden gel → The figure remains present at the edge of attention |
| 14 | 4303 | hidden_tunnel | library | Ara sokağa sap → The figure is now in the established alley mouth | Figürü takip et → The figure now leads through the existing scene |
| 15 | 4304 | alley_mouth | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 16 | 4305 | alley_mouth | library | Gizli tünele gir → The figure is now in the established hidden tunnel | Figürden uzaklaş → The anonymous figure is now farther away |
| 17 | 4306 | hidden_tunnel | bounded_recovery_exhausted | Kontrol odasına gir → The anonymous figure is now inside a small control room | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 18 | 4307 | hidden_tunnel | bounded_recovery_exhausted | Kontrol odasına gir → The anonymous figure is now inside a small control room | Ara sokağa sap → The figure is now at the narrow alley mouth |
| 19 | 4308 | control_room | library | Makine odasına gir → The figure is now in the established machine room | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 20 | 4309 | control_room | bounded_recovery_exhausted | Makine odasına gir → The anonymous figure is now inside the machine room | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 21 | 4310 | machine_room | library | Makineyi çalıştır → The established machine is now glowing with blue light | Figürün arkasına bak → A detail behind the figure becomes visible |
| 22 | 4311 | machine_room | library | Bodruma in → The figure is now in the established basement | Figürü görmezden gel → The figure remains present at the edge of attention |
| 23 | 4312 | basement | library | Bodrum kapısına yaklaş → The figure is now in the established basement door | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 24 | 4313 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 25 | 4314 | basement_door | library | Evin içine gir → The figure is now in the established red house hallway | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 26 | 4315 | basement_door | library | Figürü görmezden gel → The figure remains present at the edge of attention | Kapının ardını dinle → The shadow beneath the established door is now visibly displaced |
| 27 | 4316 | basement_door | library | Evin içine gir → The figure is now in the established red house hallway | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 28 | 4317 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 29 | 4318 | red_house_hallway | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 30 | 4319 | red_house_hallway | library | Merdivene yönel → The figure is now in the established stairwell | Figürden uzaklaş → The anonymous figure is now farther away |
| 31 | 4320 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 32 | 4321 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 33 | 4322 | red_house_hallway | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 34 | 4323 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 35 | 4324 | red_house_doorstep | library | Kırmızı eve dön → The figure is now in the established red house exterior | Kapıyı kapat → The established door closes and seals the current space |
| 36 | 4325 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Ön kapıyı aç → The established front door is now open |
| 37 | 4326 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Ön kapıyı aç → The established front door is now open |
| 38 | 4327 | red_house_exterior | library | Ön yola ilerle → The figure is now in the established front path | Figürden uzaklaş → The anonymous figure is now farther away |
| 39 | 4328 | front_path | library | Yolda ilerle → The figure is now farther along the established path | Figürü görmezden gel → The figure remains present at the edge of attention |
| 40 | 4329 | front_path | library | Yolun çatlağını izle → The path crack now forms a visible direction | Yoldan kenara çekil → The figure is now outside the center of the established path |
| 41 | 4330 | front_path | library | Kapının arkasına bak → The space behind the established door becomes visible | Yoldaki izi ortaya çıkar → A trace already on the path becomes visible |
| 42 | 4331 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 43 | 4332 | red_house_exterior | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Figürü takip et → The figure now leads through the existing scene |
| 44 | 4333 | red_house_exterior | scene_bound_recovery | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 45 | 4334 | front_path | library | Yolun çevresinde dolaş → The path appears different from its other side | Kapının ardını dinle → The shadow beneath the established door is now visibly displaced |
| 46 | 4335 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Yoldan kenara çekil → The figure is now outside the center of the established path |
| 47 | 4336 | red_house_exterior | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Karanlıkta oyalan → The darkness of the current scene now gathers at its edges |
| 48 | 4337 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 49 | 4338 | red_house_doorstep | library | Kırmızı eve dön → The figure is now in the established red house exterior | Kapıya yaklaş → The established door is now directly before the figure |
| 50 | 4339 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Ön kapıyı aç → The established front door is now open |
| 51 | 4340 | red_house_exterior | qwen | Çatlak yolda ilerle → doorstep is visible | Front yol is visibleyi incele → front_path is visible |
| 52 | 4341 | red_house_exterior | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Kapıya yaklaş → The established door is now directly before the figure |
| 53 | 4342 | red_house_doorstep | library | Kırmızı eve dön → The figure is now in the established red house exterior | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 54 | 4343 | red_house_exterior | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Kapının ardını dinle → The shadow beneath the established door is now visibly displaced |
| 55 | 4344 | red_house_doorstep | scene_bound_recovery | Kırmızı eve dön → The anonymous figure is now outside the red house | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 56 | 4345 | red_house_doorstep | scene_bound_recovery | Evin içine gir → The anonymous figure is now inside the red house hallway | Ön kapıyı aç → The established front door is now open |
| 57 | 4346 | red_house_doorstep | library | Kırmızı eve dön → The figure is now in the established red house exterior | Figürü takip et → The figure now leads through the existing scene |
| 58 | 4347 | red_house_exterior | library | Figürü görmezden gel → The figure remains present at the edge of attention | Kapıyı kapat → The established door closes and seals the current space |
| 59 | 4348 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 60 | 4349 | red_house_doorstep | library | Figürün arkasına bak → A detail behind the figure becomes visible | Kapının arkasına bak → The space behind the established door becomes visible |
| 61 | 4350 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 62 | 4351 | red_house_doorstep | library | Evin içine gir → The figure is now in the established red house hallway | Kapıyı kapat → The established door closes and seals the current space |
| 63 | 4352 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 64 | 4353 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 65 | 4354 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 66 | 4355 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 67 | 4356 | red_house_exterior | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Kapıyı kapat → The established door closes and seals the current space |
| 68 | 4357 | red_house_doorstep | library | Figüre yaklaş → The anonymous figure is now closer in the scene | Figürü takip et → The figure now leads through the existing scene |
| 69 | 4358 | red_house_doorstep | scene_bound_recovery | Kırmızı eve dön → The anonymous figure is now outside the red house | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 70 | 4359 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 71 | 4360 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 72 | 4361 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 73 | 4362 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 74 | 4363 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 75 | 4364 | basement | library | Bodrum kapısına yaklaş → The figure is now in the established basement door | Figürü görmezden gel → The figure remains present at the edge of attention |
| 76 | 4365 | basement | scene_bound_recovery | Makine odasına gir → The anonymous figure is now inside the machine room | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 77 | 4366 | machine_room | library | Makineyi çalıştır → The established machine is now glowing with blue light | Makineye dokun → A thin light line is now visible across the established machine |
| 78 | 4367 | machine_room | library | Makineden uzaklaş → The established machine is now farther behind the figure | Figürün arkasına bak → A detail behind the figure becomes visible |
| 79 | 4368 | machine_room | scene_bound_recovery | Bodruma in → The anonymous figure is now in the underground basement | Makinenin ışığını izle → The established machine light is now reflected across the room |
| 80 | 4369 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 81 | 4370 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 82 | 4371 | basement_door | library | Kapının ardını dinle → The shadow beneath the established door is now visibly displaced | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 83 | 4372 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 84 | 4373 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 85 | 4374 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 86 | 4375 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 87 | 4376 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 88 | 4377 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 89 | 4378 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 90 | 4379 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 91 | 4380 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 92 | 4381 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 93 | 4382 | red_house_exterior | library | Kapıyı kapat → The established door closes and seals the current space | Kapının arkasına bak → The space behind the established door becomes visible |
| 94 | 4383 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Ön kapıyı aç → The established front door is now open |
| 95 | 4384 | red_house_exterior | library | Ön yola ilerle → The figure is now in the established front path | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene |
| 96 | 4385 | front_path | library | Yoldan kenara çekil → The figure is now outside the center of the established path | Yolun başında bekle → The established path remains open ahead |
| 97 | 4386 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Yolda ilerle → The figure is now farther along the established path |
| 98 | 4387 | red_house_exterior | library | Kırmızı eve yaklaş → The figure is now in the established red house doorstep | Kapının arkasına bak → The space behind the established door becomes visible |
| 99 | 4388 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Ön kapıyı aç → The established front door is now open |
| 100 | 4389 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Ön kapıyı aç → The established front door is now open |
| 101 | 4390 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Ön kapıyı aç → The established front door is now open |
| 102 | 4391 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Ön kapıyı aç → The established front door is now open |
| 103 | 4392 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 104 | 4393 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 105 | 4394 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 106 | 4395 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 107 | 4396 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Yolun çevresinde dolaş → The path appears different from its other side |
| 108 | 4397 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 109 | 4398 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 110 | 4399 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 111 | 4400 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 112 | 4401 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 113 | 4402 | machine_room | scene_bound_recovery | Makineyi çalıştır → The established machine is now glowing with blue light | Makinenin ışığını izle → The established machine light is now reflected across the room |
| 114 | 4403 | machine_room | library | Figürün gölgesini izle → The anonymous figure shadow now reaches across the scene | Makineden uzaklaş → The established machine is now farther behind the figure |
| 115 | 4404 | machine_room | library | Makineye dokun → A thin light line is now visible across the established machine | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 116 | 4405 | machine_room | scene_bound_recovery | Bodruma in → The anonymous figure is now in the underground basement | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 117 | 4406 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 118 | 4407 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 119 | 4408 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 120 | 4409 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 121 | 4410 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 122 | 4411 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 123 | 4412 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 124 | 4413 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 125 | 4414 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 126 | 4415 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 127 | 4416 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 128 | 4417 | basement | bounded_recovery_exhausted | Bodrum kapısına yaklaş → The anonymous figure is now beside the basement door | Makine odasına gir → The anonymous figure is now inside the machine room |
| 129 | 4418 | basement_door | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 130 | 4419 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 131 | 4420 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 132 | 4421 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 133 | 4422 | red_house_doorstep | library | Kapının arkasına bak → The space behind the established door becomes visible | Kapının ardını dinle → The shadow beneath the established door is now visibly displaced |
| 134 | 4423 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Ön kapıyı aç → The established front door is now open |
| 135 | 4424 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Ön kapıyı aç → The established front door is now open |
| 136 | 4425 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Ön kapıyı aç → The established front door is now open |
| 137 | 4426 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 138 | 4427 | red_house_exterior | library | Figürün arkasına bak → A detail behind the figure becomes visible | Kapıyı kapat → The established door closes and seals the current space |
| 139 | 4428 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Ön kapıyı aç → The established front door is now open |
| 140 | 4429 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 141 | 4430 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Yoldaki izi ortaya çıkar → A trace already on the path becomes visible |
| 142 | 4431 | front_path | library | Yolun çatlağını izle → The path crack now forms a visible direction | Yolun başında bekle → The established path remains open ahead |
| 143 | 4432 | front_path | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Yolun çatlağını izle → The deepest crack in the established path is now clearly visible |
| 144 | 4433 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 145 | 4434 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 146 | 4435 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 147 | 4436 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 148 | 4437 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 149 | 4438 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 150 | 4439 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 151 | 4440 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 152 | 4441 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 153 | 4442 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 154 | 4443 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 155 | 4444 | stairwell | bounded_recovery_exhausted | Evin içine gir → The anonymous figure is now inside the red house hallway | Bodruma in → The anonymous figure is now in the underground basement |
| 156 | 4445 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 157 | 4446 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 158 | 4447 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 159 | 4448 | front_path | library | Yolda ilerle → The figure is now farther along the established path | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 160 | 4449 | front_path | library | Yoldaki izi ortaya çıkar → A trace already on the path becomes visible | Kapının ardını dinle → The shadow beneath the established door is now visibly displaced |
| 161 | 4450 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Karanlıkta oyalan → The darkness of the current scene now gathers at its edges |
| 162 | 4451 | front_path | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Yolun çevresinde dolaş → The path appears different from its other side |
| 163 | 4452 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Figürü görmezden gel → The figure remains present at the edge of attention |
| 164 | 4453 | red_house_exterior | scene_bound_recovery | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 165 | 4454 | red_house_exterior | library | Ön yola ilerle → The figure is now in the established front path | Kapıya yaklaş → The established door is now directly before the figure |
| 166 | 4455 | front_path | library | Figürün arkasına bak → A detail behind the figure becomes visible | Yolun çatlağını izle → The path crack now forms a visible direction |
| 167 | 4456 | front_path | library | Kırmızı eve dön → The figure is now in the established red house exterior | Yolun başında bekle → The established path remains open ahead |
| 168 | 4457 | front_path | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Kapıyı kapat → The established door closes and seals the current space |
| 169 | 4458 | quiet_street | scene_bound_recovery | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 170 | 4459 | front_path | library | Yoldan kenara çekil → The figure is now outside the center of the established path | Figüre yaklaş → The anonymous figure is now closer in the scene |
| 171 | 4460 | front_path | scene_bound_recovery | Kırmızı eve dön → The anonymous figure is now outside the red house | Yolun çatlağını izle → The deepest crack in the established path is now clearly visible |
| 172 | 4461 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Figürden uzaklaş → The anonymous figure is now farther from the current scene |
| 173 | 4462 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 174 | 4463 | front_path | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Yolun çatlağını izle → The deepest crack in the established path is now clearly visible |
| 175 | 4464 | front_path | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Yoldaki izi ortaya çıkar → A trace already on the path becomes visible |
| 176 | 4465 | quiet_street | bounded_recovery_exhausted | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Kırmızı eve dön → The anonymous figure is now outside the red house |
| 177 | 4466 | front_path | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Yolda ilerle → The figure is now farther along the established path |
| 178 | 4467 | quiet_street | bounded_recovery_exhausted | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Kırmızı eve dön → The anonymous figure is now outside the red house |
| 179 | 4468 | front_path | library | Sokağa doğru ilerle → The figure is now in the established quiet street | Figürü takip et → The figure now leads through the existing scene |
| 180 | 4469 | quiet_street | bounded_recovery_exhausted | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Kırmızı eve dön → The anonymous figure is now outside the red house |
| 181 | 4470 | front_path | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Sokağa doğru ilerle → The anonymous figure is now on the quiet street |
| 182 | 4471 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 183 | 4472 | front_path | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Sokağa doğru ilerle → The anonymous figure is now on the quiet street |
| 184 | 4473 | quiet_street | bounded_recovery_exhausted | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Kırmızı eve dön → The anonymous figure is now outside the red house |
| 185 | 4474 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 186 | 4475 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 187 | 4476 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 188 | 4477 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 189 | 4478 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 190 | 4479 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 191 | 4480 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 192 | 4481 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 193 | 4482 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 194 | 4483 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 195 | 4484 | red_house_hallway | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Merdivene yönel → The anonymous figure is now at the stairwell |
| 196 | 4485 | red_house_doorstep | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Evin içine gir → The anonymous figure is now inside the red house hallway |
| 197 | 4486 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
| 198 | 4487 | front_path | bounded_recovery_exhausted | Kırmızı eve dön → The anonymous figure is now outside the red house | Sokağa doğru ilerle → The anonymous figure is now on the quiet street |
| 199 | 4488 | quiet_street | bounded_recovery_exhausted | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path | Kırmızı eve dön → The anonymous figure is now outside the red house |
| 200 | 4489 | red_house_exterior | bounded_recovery_exhausted | Kırmızı eve yaklaş → The anonymous figure is now at the red house doorstep | Çatlak yolda ilerle → The anonymous figure is farther along the cracked front path |
