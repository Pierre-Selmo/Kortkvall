export function Rules() {
  return (
    <>
      <h2>Finns i sjön</h2>
      <div className="summary">
        <strong>Kort sagt:</strong> samla fyra kort av samma valör. Fråga en motspelare efter en valör du själv har.
        Har hen den, får du korten. Har hen inte den, drar du ett kort från sjön.
      </div>

      <h3>Mål</h3>
      <p>Samla så många fyrtal du kan. Varje komplett fyrtal läggs ut på bordet och ger en poäng. Det finns 13 fyrtal.</p>

      <h3>Utdelning</h3>
      <p>Med två spelare får var och en sju kort. Med tre till fem spelare får var och en fem kort. Resten är sjön.</p>

      <h3>Din tur</h3>
      <ul>
        <li>Klicka på ett av dina kort för att välja valör. Det måste vara en valör du själv har.</li>
        <li>Klicka sedan på en motspelare för att fråga efter den valören.</li>
        <li><strong>Träff:</strong> motspelaren ger dig alla sina kort av valören, och du får fråga igen.</li>
        <li><strong>Finns i sjön!</strong> Motspelaren har ingen. Du drar översta kortet från sjön. Har det samma valör som du frågade efter visas det, och du får fråga igen. Annars går turen vidare.</li>
      </ul>

      <h3>Fyrtal</h3>
      <p>Så fort du har fyra av samma valör på handen läggs de ut och ger en poäng.</p>

      <h3>Tom hand</h3>
      <p>Blir din hand tom medan sjön har kort, drar du ett kort direkt.</p>

      <h3>Slut och vinnare</h3>
      <p>Spelet slutar när alla 13 fyrtal är lagda, eller när sjön och alla händer är tomma. Den med flest fyrtal vinner.</p>
    </>
  );
}
