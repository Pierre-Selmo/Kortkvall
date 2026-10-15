# Kortkväll

En spelsajt där vänner spelar kortspel mot varandra, var och en på sin egen mobil eller dator.
Första spelet är **Vänd tian** (2–5 spelare). Ludo och Finns i sjön kommer senare.

Specen finns i `docs/superpowers/specs/` och planen i `docs/superpowers/plans/`.

## Kom igång

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # spelmotorn och servern
npm run build
```

För att prova med flera spelare på samma dator: öppna rummet i ett vanligt fönster och i ett privat fönster
(flikar i samma fönster delar sparad inloggning och blir samma spelare).

## Publicera på Cloudflare (gratis)

1. Skapa ett gratis konto på cloudflare.com.
2. `npx wrangler login`
3. `npm run deploy` – adressen blir `https://kortkvall.<ditt-konto>.workers.dev`.

## Struktur

- `src/games/` – spelmotorer (ren logik, inga nätverksanrop). `vand-tian/` är Vänd tian.
- `src/worker/` – Cloudflare Worker och rummet (Durable Object) som håller spelet och validerar alla drag.
- `src/shared/` – protokollet mellan klient och server, och slumpfunktioner.
- `src/web/` – React-appen: startsida, väntrum och spelbord.
