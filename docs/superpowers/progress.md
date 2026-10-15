# SDD ledger — plan: docs/superpowers/plans/2026-10-15-kortkvall-vand-tian.md
Spec: docs/superpowers/specs/2026-10-15-kortkvall-vand-tian-design.md
Branch: feat/vand-tian (from main 634f839)
Pre-flight:
- T3→T5: Source type from legal.ts used by VTView — consistent.
- T5→T6/T7: games registry + GameResult — consistent.
- T6→T8: normalizeCode imported by web from worker/codes.ts — codes.ts must stay free of worker-only imports. OK.
- T8↔T10: WebGame.Table uses TableProps defined in T10. Ruling: define TableProps in src/web/games/types.ts in T8 (shape exactly as T10) — avoids forward reference/circular import — cost if wrong: one file move.
- T7 uses testState (T2) inside worker tests — OK, pure module.
Ruling: task-start/task-done scripts need 'Task N' headings; plan uses 'Uppgift N' — run steps manually, BASE via git rev-parse, ledger lines written by hand — cost if wrong: none (bookkeeping only)
T1 BASE 634f839
Task 1: Ruling: @cloudflare/vitest-pool-workers is deprecated (renamed) — use @cloudflare/vitest-plugin 1.4.3 with cloudflareTest() plugin — cost if wrong: config swap
Task 1: Ruling: npm peer-resolution crash (edgesOut) — install with legacy-peer-deps (.npmrc) — cost if wrong: peer mismatch warnings only
Task 1: complete (commits 634f839..9190736, tests: npm test → 12/12 pass; tsc 0 errors; build ok)
Task 2: Ruling: added shared helpers fail() in games/types.ts and refill() in state.ts (not in plan) — reused by tasks 3–4 — cost if wrong: none
Task 2: complete (commits 9190736..6456063, tests: npm test → 34/34 pass; tsc 0 errors)
Task 3: complete (commits 6456063..3442678, tests: npm test → 51/51 pass; tsc 0 errors)
Task 4: Ruling: failed chance/faceDown also emit a pickUp event (count incl. extra card) in addition to chance/faceDown event — UI can show both — cost if wrong: duplicate toast text
Task 4: complete (commits 3442678..e4495d9, tests: npm test → 71/71 pass; tsc 0 errors)
Task 5: Ruling: plan's 'first legal move' full-game test cycles forever (seed 9: 2 players alternate play-lowest/pickUp — a strategy artifact, not an engine bug); replaced with random legal moves over 100 seeds and 2–5 players — cost if wrong: none, stronger test
Task 5: Ruling: exported isVTAction() from index.ts for shape validation — cost if wrong: none
Task 5: complete (commits e4495d9..9902af6, tests: npm test → 80/80 pass; tsc 0 errors)
Task 6: BLOCKED — worker tests fail with 'Vitest failed to find the current suite' in the MSIX-virtualized AppData\Roaming path; real path can't spawn workerd.exe; scratchpad copy hits MAX_PATH. Committed WIP b4ab4e9. Need project moved to a short normal folder, then rerun: npx vitest run --project worker
