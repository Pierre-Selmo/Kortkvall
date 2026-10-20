export function Rules() {
  return (
    <>
      <h2>Ludo</h2>
      <div className="summary">
        <strong>Kort sagt:</strong> ta ut dina fyra pjäser, ta dem runt brädet och in i mål. Slå exakt rätt antal för att komma i mål.
      </div>

      <h3>Ut ur boet</h3>
      <p>Du behöver en 6:a för att få ut en pjäs från boet. Har du inga pjäser ute och slår något annat passar du turen.</p>

      <h3>Att slå en 6:a</h3>
      <p>En 6:a ger ett extra slag, så länge du kan flytta något med den.</p>

      <h3>Knuffa</h3>
      <p>Landar du på en motståndares pjäs på den gemensamma banan skickas den tillbaka till sitt bo. Det går inte att knuffa i hemfältet.</p>

      <h3>I mål</h3>
      <p>En pjäs måste landa exakt i mål. Ett för högt slag får du inte använda på den pjäsen.</p>

      <h3>Vinst</h3>
      <p>Den som först får alla fyra pjäser i mål vinner. Spelet fortsätter tills bara en spelare är kvar.</p>
    </>
  );
}
