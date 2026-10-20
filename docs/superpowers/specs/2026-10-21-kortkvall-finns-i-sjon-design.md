# Finns i sjön – spec

Datum: 2026-10-21
Status: utkast

## Regler

1. **Mål:** samla fyrtal, fyra kort av samma valör. Varje komplett fyrtal läggs ut på bordet och ger 1 poäng. Det finns 13 fyrtal.
2. **Förberedelser:** en vanlig kortlek med 52 kort. 2 spelare får 7 kort vardera, 3–5 spelare får 5 kort vardera. Resten blir sjön (plockhögen), med baksidan upp.
3. **Tur:**
   - Den aktiva spelaren väljer en motspelare och frågar efter en valör. Man måste själv ha minst ett kort av valören.
   - **Träff:** motspelaren ger alla sina kort av valören. Den aktiva spelaren får dem och fortsätter sin tur och får fråga igen.
   - **Miss ("Finns i sjön!"):** den aktiva spelaren drar översta kortet från sjön. Om kortet har samma valör som frågan visas det och turen fortsätter. Annars går turen vidare till nästa spelare.
   - **Fyrtal:** så fort en spelare har fyra av samma valör på handen läggs de ut och ger 1 poäng. Det gäller efter varje ändring av handen.
   - **Tom hand:** blir en hand tom medan sjön har kort, drar spelaren ett kort direkt.
4. **Slut:** när alla 13 fyrtal är lagda, eller när sjön och alla händer är tomma. Den med flest fyrtal vinner. Vid lika delar spelarna placeringen med varandra.

## Antaganden

- Två spelare med 7 kort och tre till fem spelare med 5 kort, enligt regeln.
- Spelare utan kort hoppas över i turordningen.
- Vid miss från en tom sjö går turen vidare utan att man drar något.
- Varje spelare kan frågas, även den som har tom hand. Det är då ett miss.
- Turordningen är den ordning spelarna gick med i rummet.

## Teknik

- `games/finns-i-sjon/`: `state.ts`, `setup.ts`, `rules.ts` (fyrtal, påfyllning av tom hand, slut), `play.ts`, `view.ts`, `index.ts` och tester.
- Motorn är ren. Slumpen för utdelningen skickas in som `rng`.
- Varje drag är `{ type: 'ask', targetId, rank }`. Servern kontrollerar allt.
- Korten på andras händer är dolda i vyn. Det som syns är antal kort och lagda fyrtal. Ett drag som visas i händelserna röjer inte mer än vad som hände.
