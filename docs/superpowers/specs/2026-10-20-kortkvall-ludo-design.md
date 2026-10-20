# Ludo i Kortkväll – spec (utkast)

Datum: 2026-10-20
Status: utkast för granskning

## 1. Syfte

Ludo blir det andra spelet på Kortkväll. Det kopplas in på samma grund som Vänd tian: rum, väntrum, realtid och en ren spelmotor (`GameDefinition`).

## 2. Regler

Besluten nedan kommer från användarens svar. Punkter markerade **(antaget)** är mina egna val, som kan ändras.

1. **Antal spelare:** 2–4 (**antaget**: fyra färger, så 5 spelare ryms inte på brädet). Varje spelare får en färg.
2. **Pjäser:** 4 per spelare.
3. **Ut ur boet:** bara med en 6:a, ett slag. Man måste slå en 6:a för att få ut en pjäs från boet. Har man ingen pjäs ute och slår något annat än 6 passar man turen. En 6:a tar ut en pjäs på spelarens startruta.
4. **6:an ger ett extra slag:** man slår igen efter en 6:a. Ingen gräns för antal 6:or i rad.
5. **Exakt slag i mål:** en pjäs måste landa exakt i mål. Ett för högt slag får inte användas på den pjäsen.
6. **Knuffa:** landar man på en ruta med en motståndares pjäs skickas den tillbaka till sitt bo.
7. **Inga särskilda regler för två av samma färg:** två egna pjäser får stå på samma ruta, och det finns ingen spärr. Motståndares pjäser kan inte stå kvar tillsammans med sina egna på en ruta i den meningen att de knuffas.
8. **Ingen giltig rörelse:** om det inte finns något giltigt drag går turen vidare utan drag.
9. **Turordning:** i den ordning spelarna gick med i rummet, medurs runt brädet.
10. **Slag:** ett vanligt sexsidigt tärningsslag, slumpat på servern med `cryptoRng`.
11. **Vinst:** den spelare som först får alla sina fyra pjäser i mål vinner. De andra får placeringar i den ordning de blev klara, precis som i Vänd tian (`GameResult`). Spelet fortsätter tills alla utom en är klara, **(antaget)** så att resultatet blir en rangordning.

## 3. Spelmotorn

- `games/ludo/` följer samma mönster som `games/vand-tian/`: `state.ts`, `setup.ts`, `play.ts`, `view.ts`, `index.ts` och tester.
- Motorn är ren: slump skickas in som `rng`, och `applyAction` muterar aldrig indata.
- Servern validerar varje drag. Klienten får bara ett drag att välja mellan, eller skickar ett drag som motorn kontrollerar.
- Varje drag är `{ type: 'move', pieceIndex }`. Turen börjar med `roll` som servern gör automatiskt, så att klienten inte kan påverka tärningen.

## 4. Utseende

- Ett kvadratiskt bräde med fyra färgade hem och ett korsformat spelfält, som i den klassiska Ludo-plattan. Ritas i SVG så att det skalar.
- Man klickar på en av sina pjäser som kan flyttas. Tärningen visas tydligt, och den som har turen ser sitt slag.
- Följer samma stil som resten av sajten: grön filt, guldaccent och svenska texter.
- Fungerar på dator (ungefär från 1024 px) och mobil.

## 5. Teknik och test

- Spelmotorn testas med Vitest, med tester för: ut ur boet med 6, extra slag efter 6, exakt slag i mål, knuff, passa när inget drag finns, vinst och placeringar.
- `games/registry.ts` och `web/games/registry.ts` utökas med Ludo. Väntrummet fungerar som för Vänd tian, med 2–4 spelare.

## 6. Utanför omfattningen nu

- Chatt, åskådare och tidsgräns per drag.
- Spara statistik.
