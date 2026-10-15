# Kortkväll med Vänd tian – implementationsplan

> **För agenter:** OBLIGATORISK UNDERSKILL: använd superpowers:subagent-driven-development (rekommenderas) eller superpowers:executing-plans för att genomföra planen uppgift för uppgift. Stegen använder kryssrutor (`- [ ]`) för att följa upp arbetet.

**Mål:** en spelsajt där 2–5 vänner skapar ett rum, delar kod eller länk och spelar Vänd tian i realtid mot varandra.

**Arkitektur:** en Cloudflare Worker levererar React-appen som statiska filer och skickar WebSocket-anslutningar vidare till en Durable Object per rum. Rummet håller väntrum, spelare och spelläge och anropar en ren spelmotor (`GameDefinition`) som validerar alla drag. Varje spelare får sin egen vy av läget, så att dolda kort aldrig lämnar servern.

**Teknik:** TypeScript, React 19, Vite 8, `@cloudflare/vite-plugin` 1.64, Wrangler 4.151, Vitest 4.1 och `@cloudflare/vitest-pool-workers` 0.23. Node 22 finns installerat.

**Spec:** `docs/superpowers/specs/2026-10-15-kortkvall-vand-tian-design.md`. Läs den. Regelnumren nedan, till exempel "regel 10", syftar på specens avsnitt 4.

## Globala krav

- All text som användaren ser är på svenska.
- Sajtnamnet är "Kortkväll", definierat på ett ställe (`src/web/site.ts`).
- Stilen är grön filt (radiell gradient #2e8b57 → #14532d) med guldaccent #ffd54f, vita kort, röda (♥♦) och svarta (♠♣) färger och vinröda randiga kortbaksidor. Sidorna byggs för dator först (≥ 1024 px) och fungerar ner till 360 px.
- Rumskoden är 4 tecken ur `ABCDEFGHJKLMNPQRSTUVWXYZ`, och skiftläget spelar ingen roll när den skrivs in.
- 2–5 spelare per rum. Namn är 1–16 tecken efter trim, och dubbletter får suffixet " 2", " 3" och så vidare.
- Ett rum raderas efter 3 600 000 ms (1 timme) utan aktivitet.
- Token sparas i `localStorage` under nyckeln `kortkvall:<KOD>`.
- Servern litar aldrig på klienten. Varje drag går genom `applyAction`.
- `applyAction` muterar aldrig sitt indata. Den returnerar ett nytt läge (använd `structuredClone` och mutera kopian).
- En enda Vitest-version (4.1.x) i hela projektet, eftersom pool-workers kräver `^4.1.0`.
- Repot ligger i en djup Windows-sökväg, och `git config core.longpaths true` är redan satt.

## Granskningsfokus

1. **Förfalskade drag:** kort som inte finns på handen, samma kort två gånger eller blandade valörer i `play` ska nekas utan att läget ändras. Tester i uppgift 3.
2. **Drag i fel läge:** när det inte är spelarens tur, ett byte under spelfasen, ett spelardrag under bytesfasen eller ett drag efter att spelaren har gått ut ska nekas. Tester i uppgift 2, 3 och 4.
3. **Trasiga klientmeddelanden:** icke-JSON, okänd `type`, saknade fält eller ett namn på 200 tecken ska ge ett `error` eller ett avkortat namn, och rummet ska inte krascha. Tester i uppgift 6.
4. **Samma spelare i två flikar:** samma token från två flikar ska ge båda flikarna uppdateringar. Spelaren räknas som ansluten tills **båda** har stängts. Tester i uppgift 7.
5. **Dragbunten tar slut mitt i en påfyllning:** handen får bara de kort som finns kvar, utan krasch, och chansa erbjuds inte när dragbunten är tom. Tester i uppgift 3 och 4.

---

## Filstruktur

```
package.json  tsconfig.json  vite.config.ts  vitest.config.ts  wrangler.jsonc  index.html
src/
  shared/rng.ts            Rng-typ, seedad rng (tester), kryptografisk rng (server), shuffle
  shared/protocol.ts       ClientMsg, ServerMsg, RoomSnapshot
  games/types.ts           GameDefinition, GameResult
  games/registry.ts        gameId -> GameDefinition (serversidan)
  games/vand-tian/cards.ts     CardId, rank/suit/value, makeDeck, canPlayOn
  games/vand-tian/state.ts     VTState, VTPlayer, VTAction, VTView, VTEvent
  games/vand-tian/setup.ts     deal, swap-fasens drag, startspelare
  games/vand-tian/play.ts      spelfasens drag, vändning, påfyllning, tur, slut
  games/vand-tian/legal.ts     legal(): källa, canChance, canPickUp
  games/vand-tian/view.ts      viewFor
  games/vand-tian/index.ts     export const vandTian: GameDefinition
  games/vand-tian/testing.ts   testState() för att bygga lägen i tester
  games/vand-tian/*.test.ts
  worker/index.ts          fetch-routing, export av Room
  worker/codes.ts          generateCode, normalizeCode
  worker/room.ts           Durable Object Room
  worker/*.test.ts
  web/main.tsx  web/App.tsx  web/site.ts  web/styles.css  web/api.ts  web/useRoom.ts
  web/components/Card.tsx  web/components/RulesModal.tsx
  web/pages/StartPage.tsx  web/pages/RoomPage.tsx  web/pages/Lobby.tsx
  web/games/registry.ts    gameId -> { name, players, Table, Rules }
  web/games/vand-tian/Table.tsx  web/games/vand-tian/Rules.tsx
```

---

### Uppgift 1: Projektstomme, slump och kort

**Filer:**
- Skapa: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `wrangler.jsonc`, `index.html`, `src/web/main.tsx` (renderar `<h1>Kortkväll</h1>` tills vidare), `src/worker/index.ts` (svarar 404 på `/api/*` tills vidare), `src/shared/rng.ts`, `src/games/vand-tian/cards.ts`
- Test: `src/shared/rng.test.ts`, `src/games/vand-tian/cards.test.ts`

**Gränssnitt:**
- Producerar:
  - `type Rng = () => number` (värden i [0, 1))
  - `seededRng(seed: number): Rng` (mulberry32)
  - `cryptoRng: Rng`
  - `shuffle<T>(items: readonly T[], rng: Rng): T[]` (Fisher–Yates, returnerar en kopia)
  - `type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A'`
  - `type Suit = 'H'|'D'|'C'|'S'`
  - `type CardId = string`, i formatet rank + färg: `"KH"`, `"10S"`
  - `rankOf(c: CardId): Rank`, `suitOf(c: CardId): Suit`
  - `value(r: Rank): number`: 3→3 … 9→9, J→11, Q→12, K→13, A→14. `'2'` ger 2 och `'10'` ger 10, men de jämförs aldrig via value.
  - `isSpecial(r: Rank): boolean`, som är sant för '2' och '10'
  - `makeDeck(): CardId[]` (52 unika kort)
  - `canPlayOn(r: Rank, pile: readonly CardId[]): boolean`

- [ ] **Steg 1: Sätt upp projektet.** Paket: `react@19 react-dom@19`. Dev-paket: `typescript vite@8 @vitejs/plugin-react @cloudflare/vite-plugin wrangler vitest@4.1 @cloudflare/vitest-pool-workers @cloudflare/workers-types @types/react @types/react-dom`. Skript: `dev: vite`, `build: vite build`, `test: vitest run`, `deploy: npm run build && wrangler deploy`. `wrangler.jsonc` ska ha `name: "kortkvall"`, `main: "src/worker/index.ts"`, ett aktuellt `compatibility_date`, `assets: { not_found_handling: "single-page-application", run_worker_first: ["/api/*"] }`, Durable Object-bindningen `ROOM` → klassen `Room` och migreringen `{ tag: "v1", new_sqlite_classes: ["Room"] }`. Klassen `Room` kan vara en tom stub tills uppgift 6. `vite.config.ts` använder `react()` och `cloudflare()`. `vitest.config.ts` har två projekt: `engine` (miljön node, `src/games/**/*.test.ts` och `src/shared/**/*.test.ts`) och `worker` (pool-workers, `src/worker/**/*.test.ts`). Konfigurera pool-workers enligt README för den installerade versionen 0.23, som pekar på `wrangler.jsonc`. Ett worker-projekt utan tester får gärna passera tomt.

- [ ] **Steg 2: Skriv tester som ska misslyckas**

```ts
// rng.test.ts
test('seededRng är deterministisk', () => {
  const a = seededRng(42), b = seededRng(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
test('shuffle behåller elementen och muterar inte', () => {
  const xs = [1,2,3,4,5]; const out = shuffle(xs, seededRng(1));
  expect([...out].sort()).toEqual(xs); expect(xs).toEqual([1,2,3,4,5]);
});
// cards.test.ts
test('makeDeck ger 52 unika kort', () => {
  const d = makeDeck(); expect(d).toHaveLength(52); expect(new Set(d).size).toBe(52);
  expect(d).toContain('10S'); expect(d).toContain('AH');
});
test('rankOf/suitOf hanterar 10', () => {
  expect(rankOf('10S')).toBe('10'); expect(suitOf('10S')).toBe('S'); expect(rankOf('KH')).toBe('K');
});
test('ess är högst', () => { expect(value('A')).toBeGreaterThan(value('K')); });
test('canPlayOn: tom hög tar allt', () => { expect(canPlayOn('3', [])).toBe(true); });
test('canPlayOn: lika eller högre', () => {
  expect(canPlayOn('9', ['9D'])).toBe(true); expect(canPlayOn('K', ['9D'])).toBe(true);
  expect(canPlayOn('8', ['9D'])).toBe(false);
});
test('canPlayOn: 2 och 10 går på allt', () => {
  expect(canPlayOn('2', ['AS'])).toBe(true); expect(canPlayOn('10', ['AS'])).toBe(true);
});
test('canPlayOn: efter en 2:a går allt', () => { expect(canPlayOn('3', ['KS', '2H'])).toBe(true); });
```

- [ ] **Steg 3: Kör `npx vitest run --project engine`.** Förväntat resultat: FAIL, eftersom modulerna saknas.
- [ ] **Steg 4: Implementera `rng.ts` och `cards.ts`** enligt gränssnitten. `cryptoRng` använder `crypto.getRandomValues(new Uint32Array(1))[0] / 2**32`.
- [ ] **Steg 5: Kör `npx vitest run --project engine`.** Förväntat resultat: PASS. Kör också `npx tsc --noEmit`, som ska ge 0 fel, och `npm run build`, som ska lyckas.
- [ ] **Steg 6: Commit** `feat: projektstomme, rng och kort`

---

### Uppgift 2: Speltyper, utdelning, bytesfas och startspelare

**Filer:**
- Skapa: `src/games/types.ts`, `src/games/vand-tian/state.ts`, `src/games/vand-tian/setup.ts`, `src/games/vand-tian/testing.ts`
- Test: `src/games/vand-tian/setup.test.ts`

**Gränssnitt:**
- Konsumerar: uppgift 1 (`Rng`, `shuffle`, `CardId`, `rankOf`, `suitOf`, `value`, `isSpecial`, `makeDeck`).
- Producerar:

```ts
// games/types.ts
export interface GameResult { placements: string[]; loserId: string } // placements: först ut först, förloraren sist
export type ActionResult<S> = { ok: true; state: S } | { ok: false; error: string };
export interface GameDefinition<S, A, V> {
  id: string; name: string; minPlayers: number; maxPlayers: number;
  setup(playerIds: string[], rng: Rng): S;
  applyAction(state: S, playerId: string, action: A, rng: Rng): ActionResult<S>;
  viewFor(state: S, playerId: string): V;
  result(state: S): GameResult | null;
}
// games/vand-tian/state.ts
export interface VTPlayer {
  id: string; hand: CardId[];
  faceUp: CardId[][];            // alltid 3 platser; [] = tom hög
  faceDown: (CardId | null)[];   // alltid 3 platser; null = spelad
  ready: boolean;
}
export type VTEvent =
  | { type: 'burn'; playerId: string }
  | { type: 'pickUp'; playerId: string; count: number }
  | { type: 'chance'; playerId: string; card: CardId; success: boolean }
  | { type: 'faceDown'; playerId: string; card: CardId; success: boolean }
  | { type: 'out'; playerId: string; place: number };
export interface VTState {
  phase: 'swap' | 'play' | 'finished';
  players: VTPlayer[];           // turordning = ordningen spelarna gick med i
  deck: CardId[];                // index 0 = översta kortet
  pile: CardId[];                // sista elementet = översta kortet
  burnedCount: number;
  current: number;               // index i players
  finishOrder: string[];         // id:n i den ordning spelarna gick ut
  events: VTEvent[];             // händelser från det SENASTE draget (för UI)
}
export type VTAction =
  | { type: 'swap'; handCard: CardId; pileIndex: number }
  | { type: 'stack'; handCard: CardId; pileIndex: number }
  | { type: 'unstack'; pileIndex: number }
  | { type: 'ready' }
  | { type: 'play'; cards: CardId[] }
  | { type: 'playFaceUp'; pileIndex: number }
  | { type: 'playFaceDown'; index: number }
  | { type: 'chance' }
  | { type: 'pickUp' };
// games/vand-tian/setup.ts
export function deal(playerIds: string[], rng: Rng): VTState;
export function applySwapAction(s: VTState, playerId: string, a: VTAction, rng: Rng): ActionResult<VTState>;
export function startingPlayer(players: VTPlayer[], rng: Rng): number;
// games/vand-tian/testing.ts
export function testState(p: Partial<VTState> & { players: Partial<VTPlayer>[] }): VTState;
// fyller i standardvärden: hand [], faceUp [[],[],[]], faceDown [null,null,null], ready true,
// id 'p0','p1'…, phase 'play', deck [], pile [], burnedCount 0, current 0, finishOrder [], events []
```

- [ ] **Steg 1: Skriv tester som ska misslyckas** (`setup.test.ts`):
  - `deal ger 3 nedvända, 3 uppvända högar med ett kort och 3 på handen`: för 4 spelare med `seededRng(1)` blir `deck.length` 52 − 36 = 16, och alla 52 kort är unika över hand, högar och dragbunt. Fasen är `'swap'` och alla har `ready === false`.
  - `swap byter handkort mot en hög med ett kort`: handen innehåller `KH` och hög 0 är `['3C']`. Efter swap är handen `['3C', …]` och hög 0 är `['KH']`.
  - `swap nekas på en staplad hög`: hög 0 är `['KH','KD']`, och swap ger `ok: false`.
  - `stack lägger ett kort med samma valör på högen`: hög 0 är `['KH']` och handen har `KD`. Efter stack är hög 0 `['KH','KD']` och handen har ett kort mindre.
  - `stack nekas vid annan valör`: `ok: false`.
  - `unstack lägger tillbaka det översta kortet på handen och nekas när högen bara har ett kort`.
  - `ready fyller på handen till 3`: handen har 2 kort och dragbunten har kort. Efter ready har handen 3 kort och dragbunten ett kort färre.
  - `ready när dragbunten bara har 1 kort`: handen har 1 kort och dragbunten har 1. Efter ready har handen 2 kort och dragbunten 0, utan krasch (granskningsfokus 5).
  - `bytesdrag efter ready nekas` och `bytesdrag i spelfasen nekas` (granskningsfokus 2).
  - `när alla är ready blir fasen 'play' och current = startingPlayer`.
  - `startingPlayer: lägsta normala kortet börjar`: p0 har `['5S','KD','AH']` och p1 har `['4C','QD','QS']`, så p1 börjar.
  - `startingPlayer: 2:or och 10:or räknas inte`: p0 har `['2S','10D','KH']` och p1 har `['3C','AD','AS']`, så p1 börjar.
  - `startingPlayer: hjärter avgör före antal`: p0 har `['3H','KD','AH']` och p1 har `['3S','3C','AD']`, så p0 börjar.
  - `startingPlayer: flest av valören om ingen har hjärter`: p0 har `['3S','KD','AH']` och p1 har `['3C','3D','AD']`, så p1 börjar.
  - `startingPlayer: slumpen vid fullständig lika`: p0 har `['3S','KD','AH']` och p1 har `['3C','QD','AD']`. Med `() => 0` börjar p0, och med `() => 0.99` börjar p1.
  - `startingPlayer: bara specialkort på alla händer avgörs av slumpen bland alla`.
- [ ] **Steg 2: Kör `npx vitest run src/games/vand-tian/setup.test.ts`.** Förväntat resultat: FAIL.
- [ ] **Steg 3: Implementera `types.ts`, `state.ts`, `testing.ts` och `setup.ts`.** `deal` blandar `makeDeck()` och delar ut korten. `applySwapAction` hanterar bara `swap`, `stack`, `unstack` och `ready`, och ger fel om fasen inte är `'swap'` eller om spelaren redan är ready. Felmeddelanden på svenska, till exempel "Du har redan tryckt Klar". `startingPlayer` gör ett slumpdrag bara när det finns flera kandidater, och väljer då `floor(rng() * n)` ur kandidaterna i turordning.
- [ ] **Steg 4: Kör testet igen.** Förväntat resultat: PASS.
- [ ] **Steg 5: Commit** `feat(vand-tian): utdelning, bytesfas och startspelare`

---

### Uppgift 3: Spelfasen – lägga från handen, vändning, påfyllning och tur

**Filer:**
- Skapa: `src/games/vand-tian/legal.ts`, `src/games/vand-tian/play.ts`
- Test: `src/games/vand-tian/play.test.ts`

**Gränssnitt:**
- Konsumerar: uppgift 1 och 2.
- Producerar:

```ts
// legal.ts
export type Source = 'hand' | 'faceUp' | 'faceDown' | null; // null = spelaren är ute
export function sourceOf(p: VTPlayer): Source;  // hand om handen inte är tom, annars uppvända högar om någon har kort, annars nedvända om något finns kvar
export function hasPlayable(s: VTState, playerId: string): boolean; // giltigt kort/hög i nuvarande källa; vid 'faceDown' alltid true (blint)
export function canChance(s: VTState, playerId: string): boolean;  // spelarens tur, fas 'play', källan är 'hand', !hasPlayable, deck.length > 0
export function canPickUp(s: VTState, playerId: string): boolean;  // spelarens tur, fas 'play', källan är 'hand' eller 'faceUp', !hasPlayable, pile.length > 0
export function isOut(p: VTPlayer): boolean;
// play.ts
export function applyPlayAction(s: VTState, playerId: string, a: VTAction, rng: Rng): ActionResult<VTState>;
```

Den här uppgiften implementerar bara `play` i `applyPlayAction`. Övriga drag ger "Ogiltigt drag" tills uppgift 4. Varje lyckat drag börjar med `events = []`.

**Gemensam efterbehandling** (en privat funktion `afterPlay(s, playerIndex)` i `play.ts`, som återanvänds i uppgift 4). Algoritmen bestäms inte helt av testerna, så här är den:

```
burned = pile.top rank == '10' || (pile.length >= 4 && de fyra översta har samma rank)
if burned: burnedCount += pile.length; pile = []; events.push(burn)
fyll på spelarens hand till 3 från deck (så många som finns)
if isOut(spelare): finishOrder.push(id); events.push(out, place = finishOrder.length)
   om bara en spelare inte är ute: finishOrder.push(den); phase = 'finished'; return
   current = nästa spelare som inte är ute
else if burned: current oförändrad (samma spelare lägger igen)
else current = nästa spelare som inte är ute
```

- [ ] **Steg 1: Skriv tester som ska misslyckas** (`play.test.ts`). Alla bygger läget med `testState`.
  - `lägger ett kort som är högre och går vidare till nästa spelare`: pile `['9D']` och p0 har handen `['KS','4C','5C']` med deck `['6H']`. Efter `play ['KS']` är pile.top `KS`, p0:s hand `['4C','5C','6H']` och current 1.
  - `nekas vid lägre kort och läget är oförändrat`: `play ['4C']` på `9D` ger `ok: false`, felet innehåller "9" och indataobjektet är oförändrat (`toEqual` mot en `structuredClone` tagen före).
  - `flera av samma valör, frivilligt antal`: handen `['KS','KD','KH']` på `9D`. `play ['KS']` är ok och lämnar 2 kungar på handen. `play ['KS','KD']` lägger 2.
  - `nekas: blandade valörer, kort som inte finns på handen, samma kort två gånger, tom lista` (granskningsfokus 1).
  - `nekas när det inte är spelarens tur` (granskningsfokus 2).
  - `nekas när källan inte är handen` (handen är tom men uppvända kort finns).
  - `2:an går på ess, och nästa spelare får lägga 3`.
  - `10:an vänder högen och samma spelare lägger igen`: pile `['AS','KD']`, p0 lägger `10H`. Pile blir `[]`, burnedCount ökar med 3, current är 0 och events innehåller burn.
  - `fyra lika över flera drag vänder högen`: pile `['7S','7D','7H']`, p0 lägger `7C`. Pile blir `[]` och current är 0.
  - `fyra lika i ett drag`: pile `['5S']`, p0 lägger `['8S','8D','8H','8C']`. Pile blir `[]`.
  - `fyra lika med 2:or vänder`.
  - `påfyllning när dragbunten tar slut`: p0 har handen `['KS','4C','5C']` och deck `[]`. Efter play har handen 2 kort, utan krasch (granskningsfokus 5).
  - `påfyllning sker före omspel efter vändning`: handen `['10H','4C','5C']` och deck `['6H','7H']`. Efter 10:an har handen 3 kort.
  - `turordningen hoppar över spelare som är ute`: p1 är ute (allt tomt), så p0 → p2.
- [ ] **Steg 2: Kör `npx vitest run src/games/vand-tian/play.test.ts`.** Förväntat resultat: FAIL.
- [ ] **Steg 3: Implementera `legal.ts` och `play` i `play.ts`**, inklusive `afterPlay` enligt algoritmen ovan.
- [ ] **Steg 4: Kör testet igen.** Förväntat resultat: PASS.
- [ ] **Steg 5: Commit** `feat(vand-tian): lägga från handen, vändning och tur`

---

### Uppgift 4: Chansa, ta upp, bordskort, gå ut och slut

**Filer:**
- Ändra: `src/games/vand-tian/play.ts`
- Test: `src/games/vand-tian/endgame.test.ts`

**Gränssnitt:**
- Konsumerar: `legal.ts`, `afterPlay` och `applyPlayAction` från uppgift 3.
- Producerar: `applyPlayAction` hanterar nu även `chance`, `pickUp`, `playFaceUp` och `playFaceDown`. Dessutom `vtResult(s: VTState): GameResult | null`, som returnerar `{ placements: finishOrder, loserId: finishOrder.at(-1) }` när fasen är `'finished'`, annars null.

- [ ] **Steg 1: Skriv tester som ska misslyckas** (`endgame.test.ts`):
  - `chansa lyckas`: pile `['9D']`, handen `['4C','5C','6C']` och deck `['KS','3H']`. Efter chance är pile.top `KS`, events innehåller `{type:'chance', card:'KS', success:true}`, handen fylls på till 3 (redan 3) och current är 1.
  - `chansa misslyckas`: deck `['4S']` och pile `['9D','JD']`. Handen får 3 + 2 + 1 = 6 kort, pile blir `[]`, success är false och current är 1.
  - `chansa med en 10:a vänder och spelaren lägger igen`.
  - `chansa nekas när spelaren har ett giltigt kort` och `chansa nekas när dragbunten är tom` (granskningsfokus 5).
  - `ta upp är tillåtet när spelaren inte kan lägga, även om dragbunten har kort`: hela högen hamnar på handen och current går vidare.
  - `ta upp nekas när spelaren har ett giltigt kort`.
  - `playFaceUp lägger hela den staplade högen`: handen är tom, deck tom, hög 1 `['KH','KD']` och pile `['9D']`. Pile slutar med båda kungarna och hög 1 blir `[]`.
  - `playFaceUp nekas när handen inte är tom` och `nekas när högen inte går att lägga`.
  - `uppvända högar som inte går att lägga leder till ta upp`: canPickUp är true, och efter pickUp är högen spelarens hand.
  - `playFaceDown lyckas`: faceDown `['KS', null, null]` och pile `['9D']`. playFaceDown 0 ger pile.top `KS`, och faceDown[0] blir null.
  - `playFaceDown misslyckas`: faceDown `['4S', …]` och pile `['9D','JD']`. Handen blir `['9D','JD','4S']` i valfri ordning, pile `[]`, och events har `faceDown success:false`.
  - `playFaceDown nekas när det finns uppvända kort kvar` och `nekas på en tom plats`.
  - `sista kortet ger ut-placering och spelet fortsätter för de andra`: 3 spelare och p0 lägger sitt sista kort. finishOrder är `['p0']`, fasen är fortfarande `'play'` och events har `out place 1`.
  - `vänder högen med sista kortet och är ändå ute`: p0:s sista kort är `10H`. p0 är ute och current går till nästa.
  - `spelet slutar när alla utom en har gått ut`: 2 kvar och p1 går ut. Fasen blir `'finished'` och `vtResult` ger `{ placements: ['p0','p1','p2'], loserId: 'p2' }` (för 3 spelare där p0 gick ut först).
  - `alla drag nekas i fasen 'finished'` och `drag från en spelare som är ute nekas` (granskningsfokus 2).
- [ ] **Steg 2: Kör `npx vitest run src/games/vand-tian/endgame.test.ts`.** Förväntat resultat: FAIL.
- [ ] **Steg 3: Implementera de fyra dragen och `vtResult`.** Ett lyckat chansdrag eller `playFaceUp`/`playFaceDown` går via `afterPlay`. Misslyckade drag och `pickUp` lägger högen (+ det dragna eller vända kortet) på handen, sätter pile till `[]` och flyttar current till nästa spelare som inte är ute.
- [ ] **Steg 4: Kör hela motorns tester med `npx vitest run --project engine`.** Förväntat resultat: PASS.
- [ ] **Steg 5: Commit** `feat(vand-tian): chansa, bordskort och slut`

---

### Uppgift 5: Spelarvyer och `vandTian`-definitionen

**Filer:**
- Skapa: `src/games/vand-tian/view.ts`, `src/games/vand-tian/index.ts`, `src/games/registry.ts`
- Test: `src/games/vand-tian/view.test.ts`

**Gränssnitt:**
- Konsumerar: uppgift 2–4.
- Producerar:

```ts
export interface VTPublicPlayer {
  id: string; handCount: number; faceUp: CardId[][]; faceDown: boolean[]; // true = kort finns kvar
  ready: boolean; place: number | null;
}
export interface VTView {
  phase: VTState['phase'];
  players: VTPublicPlayer[];          // alla i turordning, inklusive mig själv
  myHand: CardId[];
  pileTop: CardId[];                  // högst de 4 översta, sista = överst
  pileCount: number; deckCount: number; burnedCount: number;
  currentPlayerId: string | null;     // null i swap-fasen och när spelet är slut
  mySource: Source; canChance: boolean; canPickUp: boolean;
  events: VTEvent[];
}
export function viewFor(s: VTState, playerId: string): VTView;
export const vandTian: GameDefinition<VTState, VTAction, VTView>; // id 'vand-tian', name 'Vänd tian', 2..5
export const games: Record<string, GameDefinition<any, any, any>>; // { 'vand-tian': vandTian }
```

`vandTian.applyAction` skickar vidare till `applySwapAction` när fasen är `'swap'`, annars till `applyPlayAction`. Okänd action eller fel form (inte ett objekt, okänd `type`, fel fälttyp) ger `{ ok:false, error:'Ogiltigt drag' }`, och validering sker innan något annat görs.

- [ ] **Steg 1: Skriv tester som ska misslyckas**:
  - `viewFor läcker inte andras hand`: `JSON.stringify(viewFor(s,'p0'))` innehåller inte något av p1:s handkort eller nedvända kort, och inte heller något kort från deck (förutom kort som syns i pileTop eller faceUp).
  - `viewFor visar mina kort och motståndarnas antal`: myHand är p0:s hand och players[1].handCount är p1:s antal.
  - `canChance och canPickUp syns bara för spelaren vars tur det är`.
  - `vandTian.applyAction med skräpindata`: `null`, `{type:'fly'}` och `{type:'play', cards:'KS'}` ger alla ok:false och kastar inget fel.
  - `ett helt slumpat parti tar slut`: med `seededRng(7)`, 4 spelare och alla ready. Upprepa: välj första tillåtna drag (play med det lägsta giltiga kortet, annars playFaceUp eller playFaceDown på första möjliga, annars pickUp) tills `result` inte är null, högst 5 000 drag. Förvänta att resultatet inte är null och att placements har längden 4.
- [ ] **Steg 2: Kör `npx vitest run src/games/vand-tian/view.test.ts`.** Förväntat resultat: FAIL.
- [ ] **Steg 3: Implementera `view.ts`, `index.ts` och `registry.ts`.**
- [ ] **Steg 4: Kör `npx vitest run --project engine`.** Förväntat resultat: PASS.
- [ ] **Steg 5: Commit** `feat(vand-tian): spelarvyer och speldefinition`

---

### Uppgift 6: Worker, rumskoder och väntrum

**Filer:**
- Skapa: `src/shared/protocol.ts`, `src/worker/codes.ts`, `src/worker/room.ts`
- Ändra: `src/worker/index.ts`
- Test: `src/worker/codes.test.ts`, `src/worker/lobby.test.ts`

**Gränssnitt:**
- Konsumerar: `games` och `GameResult` (uppgift 5), `cryptoRng` (uppgift 1).
- Producerar:

```ts
// shared/protocol.ts
export type ClientMsg =
  | { type: 'join'; name: string; token?: string }
  | { type: 'leave' } | { type: 'start' } | { type: 'playAgain' }
  | { type: 'action'; action: unknown };
export interface RoomPlayer { id: string; name: string; connected: boolean }
export interface RoomSnapshot {
  code: string; gameId: string; phase: 'lobby' | 'playing' | 'finished';
  hostId: string; players: RoomPlayer[]; youId: string;
  view: unknown | null; result: GameResult | null;
}
export type ServerMsg =
  | { type: 'welcome'; playerId: string; token: string }
  | { type: 'room'; room: RoomSnapshot }
  | { type: 'error'; message: string }
  | { type: 'gone' };
// worker/codes.ts
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function generateCode(rng: Rng): string;           // 4 tecken
export function normalizeCode(raw: string): string | null; // trim + versaler; null om ogiltig
// worker/room.ts
export class Room extends DurableObject<Env> {
  init(gameId: string): Promise<boolean>; // false om rummet redan finns
  fetch(req: Request): Promise<Response>; // WebSocket-uppgradering
}
```

**Serverbeteende:**
- `POST /api/rooms` med `{ game }` ger 400 för okänt spel. Annars görs upp till 5 försök med `generateCode` + `env.ROOM.getByName(code).init(game)`, och svaret är `{ code }` med status 201.
- `GET /api/rooms/:code/ws`: ogiltig kod ger 404, saknad `Upgrade: websocket` ger 426, annars `stub.fetch(req)`. Övriga `/api/*` ger 404.
- Rummet sparar `RoomData { code, gameId, hostId, players: {id,name,token}[], game: unknown|null, result: GameResult|null }` under nyckeln `'room'` i `ctx.storage` efter varje förändring. Använd Hibernatable WebSockets (`ctx.acceptWebSocket`, `serializeAttachment({ playerId })`, `webSocketMessage` och `webSocketClose`).
- Ett okänt eller raderat rum accepterar anslutningen, skickar `{type:'gone'}` och stänger med koden 4004.
- `join`: namnet trimmas och kortas till 16 tecken. Ett tomt namn ger felet "Skriv ett namn". Dubbletter får " 2", " 3" och så vidare. Ett matchande token kopplar anslutningen till den spelaren. Annars gäller att om fasen inte är lobby blir svaret "Spelet har redan startat", och om det redan finns 5 spelare blir svaret "Rummet är fullt". I båda fallen stängs anslutningen. En ny spelare får `id = crypto.randomUUID()` och `token = crypto.randomUUID()`, och den första spelaren blir värd. Efter join skickas `welcome` till den anslutningen och sedan `room` till alla.
- `leave` (bara i lobbyn): spelaren tas bort, och om det var värden blir `players[0]` ny värd. Anslutningen stängs.
- Varje meddelande kontrolleras med `JSON.parse` i try/catch och en kontroll av formen. Ett fel ger `{type:'error', message:'Ogiltigt meddelande'}`, och anslutningen hålls öppen.
- Meddelanden före `join` (utom `join`) ger felet "Gå med först".

- [ ] **Steg 1: Skriv tester som ska misslyckas**:
  - `codes.test.ts`: `generateCode` ger 4 tecken ur alfabetet (inga I och inget O, över 1 000 försök). `normalizeCode(' kxqt ')` ger `'KXQT'`. `normalizeCode('KXQ')`, `normalizeCode('KXQI')` och `normalizeCode('KX1T')` ger null.
  - `lobby.test.ts` (använd `SELF.fetch` och hjälpfunktionen `connect(code)` som öppnar en WebSocket via `SELF.fetch` med `Upgrade` och samlar `ServerMsg` i en kö med `next()`):
    - `POST /api/rooms skapar ett rum med en giltig kod` och `ett okänt spel ger 400`.
    - `ws mot en okänd kod ger gone`.
    - `den första som går med blir värd och får welcome och room`.
    - `en dubblett av namnet får suffixet " 2"`, `ett namn på 200 tecken kortas till 16` och `ett tomt namn ger fel` (granskningsfokus 3).
    - `den sjätte spelaren nekas med "Rummet är fullt"`.
    - `värden lämnar och nästa spelare blir värd`.
    - `skräpmeddelanden ger error utan att stänga anslutningen`: `'hej'`, `'{"type":"x"}'` och `'{"type":"join"}'` (granskningsfokus 3).
- [ ] **Steg 2: Kör `npx vitest run --project worker`.** Förväntat resultat: FAIL.
- [ ] **Steg 3: Implementera `protocol.ts`, `codes.ts`, `room.ts` (init, fetch, join, leave och sändning) och routingen i `index.ts`.** Exportera `Room` från `index.ts`.
- [ ] **Steg 4: Kör testet igen.** Förväntat resultat: PASS.
- [ ] **Steg 5: Commit** `feat(worker): rumskoder, väntrum och WebSocket-protokoll`

---

### Uppgift 7: Spelflöde i rummet, återanslutning och rensning

**Filer:**
- Ändra: `src/worker/room.ts`
- Test: `src/worker/game.test.ts`

**Gränssnitt:**
- Konsumerar: uppgift 6 och `games` (uppgift 5).
- Producerar: rummet hanterar `start`, `action` och `playAgain`, återanslutning med token, statusen `connected` och alarmet för rensning efter inaktivitet.

**Beteende:**
- `start`: bara värden får starta (annars "Bara värden kan starta"), och bara i lobbyn med ett antal spelare inom spelets min–max (annars "Det behövs 2–5 spelare"). Då körs `game = def.setup(ids, cryptoRng)`.
- `action`: kräver att fasen är `'playing'`. `def.applyAction` körs, och ett fel skickas som `error` till den anslutningen. Lyckas draget sparas läget, och sedan `result = def.result(game)`.
- `playAgain`: bara värden, och bara när fasen är `'finished'`. Då körs `setup` igen med samma spelare och `result = null`.
- `room.view` per anslutning är `def.viewFor(game, playerId)`, eller null i lobbyn.
- `connected` är true om minst en öppen socket har den spelarens `playerId` (`ctx.getWebSockets()`). Vid `webSocketClose` skickas `room` på nytt till de andra.
- Aktivitet (varje meddelande och varje ny anslutning) sätter `ctx.storage.setAlarm(Date.now() + 3_600_000)`. `alarm()` stänger alla sockets med 4004 efter att ha skickat `gone` och kör `ctx.storage.deleteAll()`.

- [ ] **Steg 1: Skriv tester som ska misslyckas**:
  - `värden startar, alla får fasen 'playing' och en egen vy`: varje spelares `view.myHand` har längden 3, och ingen spelares JSON innehåller en annan spelares handkort.
  - `en icke-värd kan inte starta` och `start med 1 spelare nekas`.
  - `ett ogiltigt drag ger error bara till den som skickade det`.
  - `återanslutning med token efter start ger samma playerId och samma hand`.
  - `en ny anslutning utan token efter start nekas med "Spelet har redan startat"`.
  - `två flikar med samma token`: båda får `room` efter ett drag. När den ena stängs är spelaren fortfarande `connected:true`, och när båda har stängts är den `false` (granskningsfokus 4).
  - `playAgain efter 'finished' delar ut på nytt`. För att nå `'finished'` snabbt: skriv ett slutläge direkt med `runInDurableObject` (från `cloudflare:test`) och sätt `RoomData.game` till ett läge med `phase:'finished'` byggt med `testState`.
  - `alarmet raderar rummet`: kör `runDurableObjectAlarm(stub)`. Därefter ger en ny ws `gone`.
- [ ] **Steg 2: Kör `npx vitest run --project worker`.** Förväntat resultat: FAIL.
- [ ] **Steg 3: Implementera beteendet ovan.**
- [ ] **Steg 4: Kör `npm test`, alltså alla projekt.** Förväntat resultat: PASS.
- [ ] **Steg 5: Commit** `feat(worker): spelflöde, återanslutning och rensning`

---

### Uppgift 8: Webbappens skal, startsida och regelruta

**Filer:**
- Skapa: `src/web/site.ts`, `src/web/styles.css`, `src/web/api.ts`, `src/web/App.tsx`, `src/web/pages/StartPage.tsx`, `src/web/components/RulesModal.tsx`, `src/web/components/Card.tsx`, `src/web/games/registry.ts`, `src/web/games/vand-tian/Rules.tsx`
- Ändra: `src/web/main.tsx`
- Test: `src/web/api.test.ts` (lägg till `src/web/**/*.test.ts` i engine-projektet)

**Gränssnitt:**
- Konsumerar: `normalizeCode` (uppgift 6). Klienten importerar den från `src/worker/codes.ts`, som inte får ha några worker-beroenden.
- Producerar:

```ts
export const SITE_NAME = 'Kortkväll';                          // site.ts
export async function createRoom(game: string): Promise<string>; // api.ts, returnerar koden och kastar Error('Kunde inte skapa rum') om svaret inte är ok
export function tokenKey(code: string): string;                  // api.ts, 'kortkvall:' + code
// App.tsx: routing på location.pathname: '/' -> StartPage, '/r/:code' -> RoomPage (uppgift 9). Navigering sker med history.pushState och popstate.
export interface WebGame { id: string; name: string; players: string; icon: string;
  Table: React.FC<TableProps>; Rules: React.FC; comingSoon?: false }
// TableProps definieras i uppgift 10, och här räcker en stub-komponent.
export const webGames: WebGame[];                                 // Vänd tian
export const comingSoon: { name: string; icon: string }[];        // Ludo 🎲, Finns i sjön 🐟
export function Card(props: { card: CardId | 'back'; size?: 'sm'|'md'|'lg'; selected?: boolean; onClick?: () => void }): JSX.Element;
export function RulesModal(props: { open: boolean; onClose: () => void; children: React.ReactNode }): JSX.Element | null;
```

- [ ] **Steg 1: Skriv ett test som ska misslyckas** (`api.test.ts`): `createRoom` anropar `POST /api/rooms` med `{game:'vand-tian'}` och returnerar `code` (mocka `fetch` med `vi.stubGlobal`). Svaret 500 ger ett fel. `tokenKey('KXQT')` ger `'kortkvall:KXQT'`.
- [ ] **Steg 2: Kör testet.** Förväntat resultat: FAIL. **Steg 3: implementera `api.ts`.** **Steg 4: kör testet igen.** Förväntat resultat: PASS.
- [ ] **Steg 5: Bygg startsidan enligt specens avsnitt 2 och 3:** rubrik med `SITE_NAME`, spelrutor (Vänd tian med knappen "Regler", Ludo och Finns i sjön nedtonade med texten "Kommer snart") och fältet "Har du en kod?" med knappen "Gå med". Ett klick på Vänd tian öppnar ett namnfält, där namnet förifylls från `localStorage['kortkvall:name']`. Sedan anropas `createRoom`, namnet sparas och sidan navigerar till `/r/KOD`. En ogiltig kod ger texten "Ogiltig kod". `RulesModal` stängs med ✕, Esc och klick utanför. `Rules.tsx` innehåller en kort sammanfattning och sedan specens regler 1–15 omskrivna för spelare (inte tekniskt). `styles.css` innehåller den gröna filten från de globala kraven.
- [ ] **Steg 6: Verifiera.** Kör `npm run dev`, öppna `http://localhost:5173` i webbläsarpanelen, ta en skärmbild i 1280×800 och i 375×812, öppna och stäng regelrutan och klicka på Vänd tian och sedan Skapa. Det ska navigera till `/r/XXXX`, och en tom sida där är okej i det här steget.
- [ ] **Steg 7: Commit** `feat(web): startsida, regelruta och kortkomponent`

---

### Uppgift 9: Uppkoppling och väntrum i webbappen

**Filer:**
- Skapa: `src/web/useRoom.ts`, `src/web/pages/RoomPage.tsx`, `src/web/pages/Lobby.tsx`

**Gränssnitt:**
- Konsumerar: `ClientMsg`, `ServerMsg` och `RoomSnapshot` (uppgift 6), samt `tokenKey` och `RulesModal` (uppgift 8).
- Producerar:

```ts
export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'gone';
export function useRoom(code: string, name: string | null): {
  status: ConnStatus; room: RoomSnapshot | null; error: string | null;
  send(msg: ClientMsg): void; clearError(): void;
};
```

**Beteende:**
- WebSocket mot `/api/rooms/:code/ws` (protokollet `wss:` på https). Vid `open` skickas `join` med namnet och eventuell token från `localStorage[tokenKey(code)]`. Vid `welcome` sparas token.
- Om anslutningen stängs med en annan kod än 4004 återansluter klienten efter 1, 2, 4 och 8 sekunder och sedan var 10:e sekund. Status är `'reconnecting'` under tiden.
- `gone` eller stängning med 4004 ger status `'gone'`.
- `error`-meddelanden visas i 4 sekunder.

`RoomPage` gör så här: saknas sparat namn och token visas ett namnfält först. Status `'gone'` visar "Rummet finns inte längre" med en knapp till startsidan. Fasen `'lobby'` visar `<Lobby>`, och övriga faser visar spelets `Table` från `webGames`. Under `'reconnecting'` visas en banner med texten "Återansluter…".

`Lobby` visar rumskoden stort, knappen "Dela länk" (`navigator.share` om det finns, annars `navigator.clipboard.writeText` och sedan texten "Länk kopierad!"), spelarlistan med markeringen "värd" och en prick för ansluten, knappen "Starta" (bara för värden, aktiv vid 2–5 spelare), knappen "Lämna" och knappen "Regler".

- [ ] **Steg 1: Implementera `useRoom`, `RoomPage` och `Lobby`.**
- [ ] **Steg 2: Verifiera i webbläsarpanelen** med två flikar. Flik 1 skapar ett rum som "Anna" och flik 2 öppnar länken som "Bertil". Båda flikarna ska visa båda namnen. Ladda om flik 2, och den ska fortfarande vara Bertil (inte "Bertil 2"). Bertil trycker Lämna och försvinner hos Anna. Öppna `/r/ZZZZ`, som ska visa "Rummet finns inte längre".
- [ ] **Steg 3: Commit** `feat(web): uppkoppling och väntrum`

---

### Uppgift 10: Spelbordet för Vänd tian

**Filer:**
- Skapa: `src/web/games/vand-tian/Table.tsx` och vid behov `src/web/games/vand-tian/selection.ts`
- Test: `src/web/games/vand-tian/selection.test.ts`

**Gränssnitt:**
- Konsumerar: `VTView`, `VTAction` och `CardId`/`rankOf` (uppgift 1 och 5), `Card` och `RulesModal` (uppgift 8), samt `RoomSnapshot` (uppgift 6).
- Producerar:

```ts
export interface TableProps { room: RoomSnapshot; send(msg: ClientMsg): void; isHost: boolean }
// selection.ts – ren logik för att markera kort
export function toggleSelect(selected: CardId[], card: CardId): CardId[]; // annan valör ersätter markeringen, samma valör lägger till eller tar bort
export function swapIntent(handCard: CardId, pile: CardId[]): VTAction['type'] | null; // 'stack' om pilen har samma valör, 'swap' om pilen har ett kort av annan valör, annars null
```

**Layout:** enligt specens avsnitt 3. På dator (≥ 768 px) ligger motståndarlistan till vänster (260 px) och bordet till höger. Under 768 px ligger allt i en kolumn. Rubrikraden har koden, "Vänd tian", knappen "Regler" och menyn ⋯ med "Kopiera länk" och "Lämna".

**Interaktion:**
- **Bytesfasen:** klicka på ett handkort för att markera det, och klicka sedan på en uppvänd hög. Det skickar `swapIntent`, alltså swap eller stack. Ett klick på en staplad hög skickar `unstack`. Knappen "Klar" skickar `ready`. Turraden visar "Byt kort – tryck Klar när du är nöjd", eller "Väntar på de andra…" efter Klar.
- **Spelfasen:** när källan är `'hand'` markeras kort med `toggleSelect`, och knappen "Lägg N" skickar `play`. Knapparna "Chansa" och "Ta upp högen" visas bara när `canChance` eller `canPickUp` är sant. När källan är `'faceUp'` skickar ett klick på en hög `playFaceUp`, och när källan är `'faceDown'` skickar ett klick på en plats `playFaceDown`.
- **Turraden:** "Din tur – lägg X eller högre" (X är rangen på pileTop, "valfritt kort" om högen är tom eller toppkortet är en 2:a), annars "Bertils tur".
- **Händelser:** `events` visas som en kort toast, till exempel "Vänd!" (burn, med en CSS-animation på högen), "Bertil tog upp högen (7 kort)", "Anna chansade: K♠ – lyckades!" och "Du gick ut som 1:a!".
- **Den som är ute** ser bordet och sin placering.
- **Fasen `'finished'`:** en resultatruta visar placeringarna och förloraren tydligt. Värden har knappen "Spela igen" (skickar `playAgain`), och andra ser texten "Väntar på att värden startar igen".

- [ ] **Steg 1: Skriv tester som ska misslyckas** för `toggleSelect` (lägg till samma valör, ersätt vid annan valör, ta bort vid nytt klick) och `swapIntent` (`'stack'`, `'swap'` och null för en staplad hög av annan valör).
- [ ] **Steg 2: Kör testet.** Förväntat resultat: FAIL. **Steg 3: implementera `selection.ts`.** **Steg 4: kör testet igen.** Förväntat resultat: PASS.
- [ ] **Steg 5: Implementera `Table.tsx`** enligt layout och interaktion ovan.
- [ ] **Steg 6: Verifiera i webbläsarpanelen** med två flikar i 1280×800: bytesfas med stapling, Klar och spel med en 10:a, en 2:a och flera av samma valör. Ta också en skärmbild i 375×812.
- [ ] **Steg 7: Commit** `feat(web): spelbord för Vänd tian`

---

### Uppgift 11: Provspel från början till slut

**Filer:** rättningar där fel hittas, och nya regressionstester i motorns eller workerns testfiler.

- [ ] **Steg 1:** kör `npm test`, `npx tsc --noEmit` och `npm run build`. Allt ska vara grönt.
- [ ] **Steg 2:** spela med `npm run dev` och 3 flikar i webbläsarpanelen ett helt parti tills fasen är `'finished'`. Kontrollera under partiet: att spelet fortsätter efter att den första spelaren har gått ut, minst ett lyckat och ett misslyckat chansdrag, ta upp högen, en staplad uppvänd hög, ett nedvänt kort som misslyckas, återanslutning efter omladdning mitt i partiet, regelrutan från startsidan, väntrummet och bordet, "Spela igen", samt att DevTools-fliken Network → WS aldrig visar en annan spelares handkort.
- [ ] **Steg 3:** för varje fel skrivs först ett test som misslyckas, sedan rättas felet. Commit `fix: …` per fel.

---

### Uppgift 12: Publicering

- [ ] **Steg 1:** användaren skapar själv ett gratis Cloudflare-konto och kör `npx wrangler login`. Agenten loggar inte in åt användaren.
- [ ] **Steg 2:** kör `npm run deploy`. Förväntat resultat: Wrangler skriver ut `https://kortkvall.<konto>.workers.dev`.
- [ ] **Steg 3:** öppna adressen och kör ett kort provspel med två flikar. Kontrollera att WebSocket går över `wss:`.
- [ ] **Steg 4:** lägg till en `README.md` med `npm run dev`, `npm test` och `npm run deploy`. Commit `docs: README och publicering`.
