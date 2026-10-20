export function Rules() {
  return (
    <>
      <h2>Solitaire (Klondike)</h2>
      <div className="summary">
        <strong>Kort sagt:</strong> flytta alla 52 kort till de fyra basrutorna, en per färg, från ess till kung.
      </div>

      <h3>Bordet</h3>
      <p>
        Sju kolumner. Kolumn 1 har ett kort, kolumn 2 två, och så vidare. Bara det översta kortet i varje kolumn är öppet.
        Talongen är resten av kortleken, och skräphögen är de kort du har dragit från talongen.
      </p>

      <h3>Att flytta kort</h3>
      <ul>
        <li>I kolumnerna byggs det nedåt: ett kort läggs på ett öppet kort som är en valör högre och har motsatt färg.</li>
        <li>En sekvens av sådana kort kan flyttas tillsammans.</li>
        <li>Bara en kung får läggas i en tom kolumn.</li>
        <li>Basrutorna byggs upp från ess, en färg i taget, till kung.</li>
        <li>Lyfter du ett öppet kort och ett dolt kort ligger under, vänds det dolda kortet upp.</li>
      </ul>

      <h3>Så här flyttar du</h3>
      <ul>
        <li>Dra ett kort eller en sekvens dit du vill, till en kolumn eller en basruta.</li>
        <li>Klickar du på ett kort flyttas det automatiskt dit det går. Går det inte händer ingenting.</li>
        <li>Klicka på talongen för att dra ett kort. När talongen är tom kan du lägga tillbaka skräphögen.</li>
      </ul>

      <h3>Ångra</h3>
      <p>Knappen Ångra tar tillbaka det senaste draget, till exempel en flytt eller att du drog ett kort från talongen. Du kan ångra upp till 100 drag.</p>

      <h3>Slut</h3>
      <p>Du vinner när alla fyra basrutor är klara. Finns det inga drag kvar är spelet fast.</p>
    </>
  );
}
