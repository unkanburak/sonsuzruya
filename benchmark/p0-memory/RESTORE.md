# P0 runtime note

Original production Node: PID 21040, `C:\Program Files\nodejs\node.exe app/server.mjs`, project working directory `<PROJECT_ROOT>` (matching existing startup script).

Read-only initial health: Node ok, Comfy true, Qwen true, IMAGE_MOTION, YouTube false. Existing config and source copies are in `before/`; `before/current.json` is evidence only, not a state-reset instruction.

Deploy only Node after tests, between generation jobs. Keep Comfy 8188 and Qwen 8080 untouched. Start with the same command and working directory, hidden, logs under this benchmark directory. No public tunnel or flag changes.

If rollback is required, restore only edited source from the copies, stop Node between jobs and restart with the command above. Do not reset the live story to the old snapshot.
