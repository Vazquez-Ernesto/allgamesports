import { Link } from 'react-router-dom'

const asset = (path) => import.meta.env.BASE_URL + path

export default function GameCard({ game }) {
  const isByo = game.source.type === 'byo'

  return (
    <Link to={`/juego/${game.slug}`} className="card">
      <div className="card-cover">
        <img src={asset(game.cover)} alt="" loading="lazy" width="320" height="200" />
        <span className="card-play">Jugar</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{game.title}</h3>
        <p className="card-credit">
          {game.year} · {game.developer}
        </p>
        <p className="card-short">{game.short}</p>
        <ul className="tags" aria-label="Características">
          <li className="tag">{game.genre}</li>
          <li className={isByo ? 'tag tag-byo' : 'tag tag-free'}>{isByo ? 'Con descarga gratis' : 'Listo para jugar'}</li>
        </ul>
      </div>
    </Link>
  )
}
