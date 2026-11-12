// "Cómo jugar": los pasos de un juego en lenguaje llano.
// Los juegos con archivo propio traen sus pasos en source.steps y una
// explicación de por qué hace falta el archivo en source.why.

function hostedSteps(game) {
  return [
    `Tocá "Jugar". La primera vez descarga unos ${game.source.downloadMB} MB.`,
    'Abrí "Controles" para ver las teclas de este juego.',
    'Tu partida queda guardada en este navegador: podés cerrar y seguir después.',
  ]
}

export default function GameSteps({ game }) {
  const steps = game.source.steps ?? hostedSteps(game)

  return (
    <section className="steps" aria-labelledby="como-jugar">
      <h2 id="como-jugar" className="steps-title">
        Cómo jugar
      </h2>
      <ol className="steps-list">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {game.source.why && (
        <details className="steps-why">
          <summary>¿Por qué me pide un archivo?</summary>
          <p>{game.source.why}</p>
        </details>
      )}
    </section>
  )
}
