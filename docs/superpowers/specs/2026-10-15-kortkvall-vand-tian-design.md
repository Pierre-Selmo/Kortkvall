# Kortkväll – spelsajt med Vänd tian (design)

Datum: 2026-10-15
Status: utkast för granskning

## 1. Syfte och mål

En webbsida där man och ens vänner kan spela kort- och brädspel mot varandra, var och en på sin egen mobil eller dator. Från början används den av en vänskapskrets, men den kan bli offentlig senare.

**Första leveransen** (den här specen):
- Grunden för sajten: startsida, rum med kod och länk, väntrum och realtidsuppkoppling.
- Ett första spel: **Vänd tian**.

**Senare**, i egna specar: Ludo och Finns i sjön, som kopplas in på samma grund.

**Det är klart när:**
- 2–5 personer kan starta ett rum, dela länken eller koden, gå med från olika enheter och spela ett helt parti Vänd tian enligt reglerna i avsnitt 4.
- Ingen spelare kan se andras dolda kort, inte ens i webbläsarens utvecklarverktyg.
- En spelare som laddar om sidan eller tappar uppkopplingen kommer tillbaka till sin plats.
- Sidan fungerar bäst på dator, men går också att använda på mobilen.
- Spelreglerna går att läsa när som helst.
- Sidan är publicerad på Cloudflare och kostar inget att driva.

## 2. Spelarflöde

### Startsida
- Sidans namn, **"Kortkväll"**. Det är ett platshållarnamn som är enkelt att byta.
- En ruta per spel: **Vänd tian** (aktiv, 2–5 spelare), **Ludo** och **Finns i sjön** (nedtonade, "Kommer snart").
- Varje aktiv spelruta har en liten knapp **Regler** som öppnar spelreglerna (se "Regelruta" i avsnitt 3).
- Ett fält med texten "Har du en kod?" och en knapp, **Gå med**.

### Skapa rum
1. Spelaren klickar på Vänd tian och anger ett namn.
2. Servern skapar ett rum med en **kod på 4 bokstäver**, till exempel `KXQT`. Koden består av A–Z utom I och O, som lätt förväxlas, och skiftläget spelar ingen roll när man skriver in den.
3. Spelaren hamnar i väntrummet på adressen `/r/KXQT`.

### Gå med
- Via länken `/r/KXQT`, eller genom att skriva koden på startsidan.
- Spelaren anger ett namn på 1–16 tecken. Finns namnet redan i rummet läggs en siffra till, till exempel "Anna 2".
- Ett rum tar emot nya spelare bara medan det står i väntrummet och har färre än 5 spelare. Den som redan är med kan alltid komma tillbaka.

### Väntrum
- Rumskoden visas stort, med en knapp **Dela länk**. Den öppnar mobilens dela-meny om den finns, annars kopieras länken.
- En lista över spelarna i den ordning de gick med. Den som skapade rummet är **värd** och markeras.
- Värden har en knapp **Starta** som är aktiv när det finns 2–5 spelare.
- En knapp **Regler** finns även här.
- Spelare kan **lämna** väntrummet. Lämnar värden blir den som har varit med längst ny värd.

### Under spelet
- Varje spelare ser sin egen hand och sina egna högar. För motståndarna syns namn, antal kort på handen och deras bordshögar (uppvända kort syns, nedvända visas som baksidor).
- Allt uppdateras i realtid.
- Tappar en spelare uppkopplingen visas den nedtonad som "frånkopplad", och spelet väntar på den.
- När en spelare går ut fortsätter spelet för de andra. Den som är ute ser bordet och sin placering ("Du gick ut som 1:a!") och kan fortsätta titta på tills partiet är slut.

### Efter spelet
- Resultatet visas: vem som förlorade och i vilken ordning de andra gick ut.
- Värden har en knapp **Spela igen**. Den delar ut på nytt till samma spelare i samma rum.

### Rensning
- Ett rum raderas efter **1 timme utan aktivitet**. Aktivitet är alla meddelanden från en spelare: att gå med, ett drag eller en återanslutning.
- Den som försöker öppna ett raderat eller okänt rum får meddelandet "Rummet finns inte längre" och en knapp för att skapa ett nytt.

## 3. Utseende

- **Stil för hela sajten: klassiskt spelbord.** Grön filt (radiell gradient från #2e8b57 till #14532d), guldaccenter (#ffd54f), en serif-rubrik och vita kort med röda och svarta färger. Kortbaksidorna är vinröda och randiga.
- Sajten byggs först och främst för **dator** (från ungefär 1024 px bredd). Den fungerar också på mobilen (porträttläge från ungefär 360 px), där samma delar staplas i en kolumn.
- Spelet styrs med musen genom att klicka på kort. Tangentbordsgenvägar ingår inte nu.
- Allt är på **svenska**.

### Spelbordet (kompakt lista)
**På dator:** motståndarlistan ligger i en kolumn till vänster (ungefär 260 px bred). Resten av skärmen är bordet, med högen och dragbunten i mitten och dina bordshögar och din hand i stort format längst ner.

**På mobil:** allt ligger i en kolumn i ordningen nedan.

1. Rubrikrad: rumskoden, spelets namn, en synlig knapp **Regler** och en meny (⋯) med "Kopiera länk" och "Lämna".
2. **Motståndare som rader:** namn, antal kort på handen och deras tre bordshögar i liten storlek. Den spelare vars tur det är markeras, frånkopplade spelare visas nedtonade och spelare som har gått ut visas med sin placering.
3. **Mitten:** dragbunten med antal kort och högen med översta kortet i stort format och antal kort.
4. **Turrad:** "Din tur – lägg 9 eller högre", eller "Bertils tur".
5. **Dina tre bordshögar:** uppvänd hög ovanpå nedvänt kort. Staplade högar visar hur många kort de innehåller.
6. **Din hand** som en solfjäder. Ett tryck markerar ett kort och lyfter det.
7. **Åtgärdsknappar:** "Lägg N" när giltiga kort är markerade, och "Chansa" och "Ta upp högen" när du inte kan lägga.

- När högen vänds visas en kort animation med texten "Vänd!".
- Under bytesfasen visar turraden "Byt kort – tryck Klar när du är nöjd", och knapparna byts ut mot **Klar**.

### Regelruta
- Knappen **Regler** finns på startsidan (på spelrutan), i väntrummet och på spelbordet.
- Den öppnar en ruta ovanpå sidan med spelets regler i läsvänlig form: en kort sammanfattning överst och sedan reglerna från avsnitt 4 under rubriker. Spelet fortsätter i bakgrunden.
- Rutan stängs med ✕, med Esc eller genom att klicka utanför den.
- Reglerna är skrivna som text i webbappen, en fil per spel, så att varje nytt spel kommer med sina egna regler.

## 4. Spelregler: Vänd tian

1. **Utdelning:** en vanlig kortlek med 52 kort och inga jokrar blandas. Varje spelare får 3 nedvända kort, 3 uppvända kort ovanpå dem (ett per hög, alltså tre högar) och 3 kort på handen. Resten bildar dragbunten.
2. **Bytesfas:** alla spelare gör den samtidigt.
   - Man får byta kort mellan handen och de uppvända högarna.
   - Man får **stapla** flera kort av samma valör på **en** uppvänd hög. Alla kort i en hög måste ha samma valör. Efter varje stapling drar man direkt från dragbunten tills handen har 3 kort, så att även det nya kortet kan bytas eller staplas.
   - Man får ångra stapling genom att ta tillbaka kort från en hög till handen, men varje hög måste ha minst ett kort.
   - När man trycker **Klar** fylls handen på till 3 kort från dragbunten om den har färre än 3. Spelet börjar när alla har tryckt Klar.
3. **Vem börjar:** den som har det lägsta kortet på handen börjar. 2:or och 10:or räknas inte, så 3:an är lägst. Om flera har samma lägsta valör:
   1. börjar den som har **hjärter** av den valören,
   2. annars den som har **flest** kort av den valören,
   3. annars avgör **slumpen**.

   Har ingen spelare något annat än 2:or och 10:or på handen avgör slumpen.
4. **Valörordning:** 3 < 4 < 5 < 6 < 7 < 8 < 9 < J < Q < K < A. 2:an och 10:an är specialkort.
5. **Lägga från handen:** man lägger ett eller flera kort av **samma valör** som är lika höga eller högre än det översta kortet i högen. Man väljer själv hur många av valören man lägger. På en tom hög får man lägga vad som helst.
6. **2:an** får läggas på vad som helst. Efter en 2:a får nästa spelare lägga vad som helst.
7. **10:an** får läggas på vad som helst och **vänder högen**: högen, inklusive 10:an, tas ur spelet. Samma spelare lägger sedan igen på den tomma högen.
8. **Fyra lika:** om de fyra översta korten i högen har samma valör vänds högen, oavsett om de lades av en eller flera spelare och i ett eller flera drag. Samma spelare lägger sedan igen.
9. **Påfyllning:** efter sitt drag fyller man på handen till 3 kort från dragbunten, så länge den räcker. Detta sker även innan man lägger igen efter att ha vänt högen.
10. **Kan inte lägga:**
    - Om dragbunten **inte är tom** får man välja mellan att **chansa** och att ta upp högen. Att chansa betyder att man drar översta kortet från dragbunten. Går det att lägga, läggs det automatiskt, och reglerna 6–9 gäller som vanligt. Går det inte att lägga tar man upp hela högen **plus** det dragna kortet.
    - Om dragbunten **är tom** måste man ta upp högen.
    - Man får bara chansa när man inte har något giltigt kort att lägga.
    - Efter att man har tagit upp högen går turen vidare till nästa spelare.
11. **Spela från bordet:** när handen är tom och dragbunten är slut spelar man från bordet.
    - **Uppvända högar** först. En hög spelas **alltid i sin helhet** och man spelar en hög per drag. Går ingen hög att lägga tar man upp högen på bordet (regel 10), och de korten blir ens nya hand.
    - **Nedvända kort** sist, ett per drag och blint. Man väljer ett kort som vänds upp. Går det att lägga, läggs det. Annars tar man upp högen plus det kortet.
    - Har man kort på handen spelar man alltid från handen först.
12. **Gå ut:** den som inte har några kort kvar, varken på handen eller på bordet, är ute och får sin placering. Vänder man högen med sitt sista kort är man ändå ute.
13. **Slut:** spelet fortsätter tills **alla utom en** har gått ut. Den sista spelaren som har kort kvar **förlorar**. Den som gick ut först vinner, och alla andra får placeringar i den ordning de gick ut.
14. **Turordning:** i den ordning spelarna gick med i rummet. Spelare som är ute hoppas över.
15. **Antal spelare:** 2–5.

## 5. Teknisk arkitektur

### Plattform
- **Cloudflare Workers** levererar webbsidan som statiska filer och tar emot API-anrop och WebSocket-anslutningar.
- **Durable Objects** (SQLite-backade, som ingår i gratisplanen) används med **en instans per rum**, nämnd efter rumskoden.
- Allt drivs på Cloudflares gratisplan. Adressen blir `<namn>.workers.dev`, och en egen domän kan kopplas på senare.

### Språk och verktyg
- TypeScript överallt.
- Frontend: React + Vite.
- Wrangler för lokal utveckling och publicering.
- Vitest för tester, med `@cloudflare/vitest-pool-workers` för servertester.

### Enheter

| Enhet | Ansvar | Beror på |
|---|---|---|
| `shared/protocol` | Typer för meddelanden mellan klient och server | inget |
| `games/types` | Gemensamt gränssnitt `GameDefinition` som alla spel implementerar | inget |
| `games/vand-tian` | Spelmotorn: ren logik för start, drag, regler och vad varje spelare får se | `games/types` |
| `worker` | HTTP-routing: skapa rum, statiska filer, WebSocket till rätt rum | `room` |
| `room` (Durable Object) | Väntrum, spelare, tokens, spelets läge, sändning till klienter, rensning efter inaktivitet | `games/*`, `shared/protocol` |
| `web` | React-appen: startsida, väntrum och spelbord | `shared/protocol` |

### Spelgränssnittet

```ts
interface GameDefinition<State, Action, View> {
  id: string;                       // "vand-tian"
  minPlayers: number;
  maxPlayers: number;
  setup(playerIds: string[], rng: Rng): State;
  applyAction(state: State, playerId: string, action: Action, rng: Rng):
    { ok: true; state: State } | { ok: false; error: string };
  viewFor(state: State, playerId: string): View;  // bara det spelaren får se
  result(state: State): GameResult | null;        // null medan spelet pågår
}
```

- Motorn är **ren**: inga nätverksanrop, ingen tid och ingen global slump. Slump skickas in som `rng`, vilket gör testerna deterministiska.
- Felmeddelanden från `applyAction` är på svenska och visas direkt för spelaren.

### Vänd tian: drag (Action)

- `swap { handCard, pileIndex }`: byt ett handkort mot den uppvända högen (gäller bara högar med ett kort).
- `stack { handCard, pileIndex }`: lägg handkortet på en hög med samma valör.
- `unstack { pileIndex }`: ta tillbaka det översta kortet från en hög med fler än ett kort.
- `ready`: klar med bytesfasen.
- `play { cards }`: lägg ett eller flera kort av samma valör från handen.
- `playFaceUp { pileIndex }`: lägg en hel uppvänd hög.
- `playFaceDown { index }`: vänd och lägg ett nedvänt kort.
- `chance`: chansa.
- `pickUp`: ta upp högen.

Kort identifieras med ett id, till exempel `"KH"` för hjärter kung eller `"10S"` för spader tia.

### Protokoll (WebSocket, JSON)

Klient till server:
- `join { name, token? }`: gå med, eller återanslut med en sparad token.
- `leave`: lämna väntrummet.
- `start`: bara värden.
- `action { action }`: ett spelardrag.
- `playAgain`: bara värden, efter ett avslutat spel.

Server till klient:
- `welcome { playerId, token }`: klienten sparar token i `localStorage` per rumskod.
- `room { phase, players, hostId, view? }`: hela läget som den här spelaren får se. Det skickas efter varje förändring. `view` kommer från `viewFor`.
- `error { message }`.

HTTP:
- `POST /api/rooms { game: "vand-tian" }` returnerar `{ code }`. Servern skapar en ny kod och försöker igen om den redan används.
- `GET /api/rooms/:code/ws` uppgraderar till en WebSocket mot rummets Durable Object.
- Allt annat returnerar webbappen (single-page app), där `/r/:code` hanteras av React.

### Identitet och återanslutning
- När en spelare går med skapar servern ett `playerId` och en slumpad hemlig `token`.
- Klienten sparar token i `localStorage` under nyckeln `kortkvall:<KOD>`.
- Vid ny anslutning skickas token med. Matchar den en spelare kopplas anslutningen till den spelaren, även om spelet har startat.
- Utan giltig token behandlas anslutningen som en ny spelare, vilket bara är tillåtet i väntrummet och med färre än 5 spelare.

### Lagring och rensning
- Rummets läge (spelare, tokens och spelläge) sparas i Durable Objectets lagring efter varje förändring, så att det överlever omstarter.
- Vid varje aktivitet sätts ett **alarm** till nu + 1 timme. När alarmet går raderas all lagring och öppna anslutningar stängs. Ett raderat rum svarar som okänt.

### Felhantering
- Ogiltigt drag ger ett `error` med förklaring. Läget ändras inte.
- Okänt eller raderat rum ger "Rummet finns inte längre".
- Fullt rum eller redan startat spel, utan giltig token, ger ett meddelande. Anslutningen nekas.
- Om klienten tappar anslutningen försöker den återansluta automatiskt med ökande väntetid, och visar "Återansluter…" under tiden.
- Servern litar aldrig på klienten. Varje drag valideras i motorn.

## 6. Testning

- **Spelmotorn (Vitest), utförligt.** Varje regel i avsnitt 4 får egna tester, bland annat:
  - utdelning och bytesfas, inklusive stapling, ångra stapling och påfyllning vid Klar,
  - vem som börjar, inklusive hjärter, antal och slump,
  - lika eller högre, flera av samma valör och frivilligt antal,
  - 2:an, 10:an och fyra lika (även över flera drag),
  - chansa: lyckad, misslyckad och förbjuden när man har ett giltigt kort eller dragbunten är tom,
  - uppvända högar i helhet och nedvända kort blint,
  - att gå ut, att spelet tar slut och vem som förlorar,
  - att `viewFor` aldrig läcker andras hand, nedvända kort eller dragbuntens ordning.
- **Rummet (vitest-pool-workers):** gå med, namnkrockar, fullt rum, start, återanslutning med token, nekad anslutning efter start, ny värd när värden lämnar, Spela igen och rensning via alarm.
- **Provspel:** flera webbläsarflikar som olika spelare i den lokala utvecklingsmiljön, med ett helt parti från start till slut, där spelet fortsätter efter att den första spelaren har gått ut. Kontroll främst i datorstorlek, och även i mobilstorlek. Regelrutan öppnas och stängs från alla tre ställena.

## 7. Publicering

- `wrangler deploy` publicerar till `<namn>.workers.dev`.
- Användaren skapar själv ett gratis Cloudflare-konto och loggar in i Wrangler (`wrangler login`).
- Nya versioner publiceras på samma sätt och har samma adress.

## 8. Utanför omfattningen (ingår inte nu)

- Ludo och Finns i sjön, som får egna specar.
- Konton, inloggning och statistik.
- Chatt, åskådare, ljud och tidsgräns per drag.
- Lösenord för sajten (kan läggas till senare).
- Att sparka ut en frånkopplad spelare.
- Egen domän (kan kopplas på senare).
