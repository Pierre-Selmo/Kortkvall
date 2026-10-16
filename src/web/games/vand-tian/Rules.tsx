export function Rules() {
  return (
    <>
      <h2>Vänd tian</h2>
      <div className="summary">
        <strong>Kort sagt:</strong> lägg lika högt eller högre än översta kortet i högen. 2:an går på allt och ger dig en tur till,
        10:an och fyra lika vänder högen. Bli av med alla dina kort – den som har kort kvar sist förlorar.
      </div>

      <h3>Utdelning</h3>
      <p>
        En vanlig kortlek utan jokrar. Alla får tre högar på bordet – ett nedvänt kort med ett uppvänt ovanpå –
        och tre kort på handen. Resten blir dragbunten.
      </p>

      <h3>Byta kort</h3>
      <ul>
        <li>Innan spelet börjar får alla byta kort mellan handen och sina uppvända kort.</li>
        <li>Byter du mot en hög med två eller fler kort tar du upp hela högen till handen.</li>
        <li>Du kan stapla flera kort av samma valör på en uppvänd hög. Då drar du direkt ett nytt kort, så att du har tre på handen igen – och det nya kortet kan också bytas eller staplas.</li>
        <li>Klicka på en staplad hög för att ta tillbaka det översta kortet till handen.</li>
        <li>Har du samma valör som översta kortet på någon annans uppvända hög får du lägga ditt kort där – markera kortet och klicka på deras hög. Du drar ett nytt kort direkt. Du kan aldrig ta eller byta bort någon annans kort.</li>
        <li>Tryck <strong>Klar</strong> när du är nöjd. Spelet börjar när alla har tryckt Klar.</li>
      </ul>

      <h3>Vem börjar?</h3>
      <p>
        Den som har lägst kort på handen (2:or och 10:or räknas inte, så 3:an är lägst). Vid lika börjar den som har
        hjärter av valören, annars den som har flest av valören, annars avgör slumpen.
      </p>

      <h3>Lägga kort</h3>
      <ul>
        <li>Ordningen är 3, 4, 5, 6, 7, 8, 9, knekt, dam, kung, ess.</li>
        <li>Lägg ett eller flera kort av samma valör som är lika höga eller högre än översta kortet. På en tom hög går allt.</li>
        <li><strong>2:an</strong> går på vad som helst. Lägger du en 2:a lägger du igen, och då får du lägga vad som helst.</li>
        <li><strong>10:an</strong> går på vad som helst och vänder högen – den tas ur spelet och du lägger igen.</li>
        <li><strong>Fyra lika</strong> överst i högen vänder också högen, och du lägger igen.</li>
        <li>Har du <strong>fyra lika</strong> får du lägga dem på vad som helst – även fyra 5:or på en kung. De vänder högen precis som en 10:a.</li>
        <li>Efter ditt drag drar du kort tills du har tre på handen, så länge dragbunten räcker.</li>
      </ul>

      <h3>Kan du inte lägga?</h3>
      <ul>
        <li>Finns det kort kvar i dragbunten kan du <strong>chansa</strong>: översta kortet vänds. Går det att lägga läggs det, annars tar du upp högen och kortet.</li>
        <li>Du kan också välja att <strong>ta upp högen</strong> direkt. Är dragbunten slut måste du ta upp den.</li>
        <li>Du får bara chansa när du inte har något kort som går att lägga.</li>
      </ul>

      <h3>Korten på bordet</h3>
      <ul>
        <li>När handen är tom och dragbunten slut spelar du från bordet.</li>
        <li>Först de uppvända högarna – en hel hög i taget. Går ingen att lägga tar du upp högen.</li>
        <li>Sist de nedvända korten, ett i taget och blint. Går kortet inte att lägga tar du upp högen och kortet.</li>
        <li>Har du kort på handen spelar du alltid dem först.</li>
      </ul>

      <h3>Slut</h3>
      <p>
        Den som blir av med alla sina kort är ute och får sin placering, även om det sista kortet vände högen.
        Spelet fortsätter tills bara en spelare har kort kvar – den spelaren förlorar.
      </p>
      <p className="muted" style={{ color: '#555' }}>2–5 spelare. Turen går i den ordning ni gick med i rummet.</p>
    </>
  );
}
