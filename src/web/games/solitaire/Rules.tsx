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

      <h3>Så här klickar du</h3>
      <ul>
        <li>Klicka på ett kort för att välja det. I en kolumn väljs kortet och allt ovanför det.</li>
        <li>Klicka sedan på en kolumn eller en basruta där det ska ligga.</li>
        <li>Klicka på talongen för att dra ett kort. När talongen är tom kan du lägga tillbaka skräphögen.</li>
      </ul>

      <h3>Slut</h3>
      <p>Du vinner när alla fyra basrutor är klara. Finns det inga drag kvar är spelet fast.</p>
    </>
  );
}
