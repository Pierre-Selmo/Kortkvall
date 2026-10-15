# Kortkväll

Spelsajt där vänner spelar kortspel mot varandra i realtid. Första spelet: **Vänd tian**.

- Spec: `docs/superpowers/specs/2026-10-15-kortkvall-vand-tian-design.md`
- Plan: `docs/superpowers/plans/2026-10-15-kortkvall-vand-tian.md`
- Framstegslogg: `docs/superpowers/progress.md`

## Kom igång

Kräver Node.js 22 och Git. Lägg projektet i en vanlig mapp med kort sökväg (t.ex. `C:\Kortkvall`).

```bash
npm install
npm test
npm run dev
```

## Status

- Klart: uppgift 1–5 (spelmotorn, 80 tester).
- Pågår: uppgift 6 (servern). Koden är skriven men servertesterna har inte körts än
  (de gick inte att köra i den tidigare, virtualiserade mappen). Kör `npx vitest run --project worker`.
- Kvar: uppgift 7–12.

## Fortsätta med Claude Code

Öppna mappen i Claude Code och skriv:

> Fortsätt bygga enligt planen i docs/superpowers/plans med executing-plans, från uppgift 6.
> Läs docs/superpowers/progress.md först (tidigare beslut och var vi är).
