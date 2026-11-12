import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'

import GameSteps from '../components/GameSteps.jsx'
import Player from '../components/Player.jsx'
import NotFound from './NotFound.jsx'
import { findGame } from '../data/games.js'
import { platformOf } from '../data/platforms.js'
import { SITE } from '../site.js'

export default function GamePage() {
  const { slug } = useParams()
  const game = findGame(slug)

  useEffect(() => {
    if (!game) return
    document.title = `${game.title} — ${SITE.name}`
    window.scrollTo(0, 0)
    return () => {
      document.title = `${SITE.name} — ${SITE.tagline.toLowerCase()}`
    }
  }, [game])

  if (!game) return <NotFound />

  const platform = platformOf(game)
  // Datos del juego original, antes de los datos técnicos del port.
  const facts = [
    ['Plataforma', `${platform.name} (${platform.maker}, ${platform.years})`],
    ['Año', String(game.year)],
    ['Estudio', game.developer],
    ['Publicó', game.publisher],
    ...game.facts,
  ]

  return (
    <div className="wrap game-page">
      <nav className="crumbs" aria-label="Ruta">
        <Link to="/">Catálogo</Link>
        <span aria-hidden="true">/</span>
        <span>{game.title}</span>
      </nav>

      <div className="game-layout">
        {/* key: al cambiar de juego se desmonta el reproductor y se libera el motor */}
        <Player key={game.slug} game={game} />

        <aside className="game-info">
          <h1 className="game-title">{game.title}</h1>
          <ul className="tags">
            <li className="tag">{platform.name}</li>
            <li className="tag">{game.genre}</li>
            <li className="tag">{game.year}</li>
          </ul>
          <GameSteps game={game} />
          {game.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <dl className="facts">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  )
}
