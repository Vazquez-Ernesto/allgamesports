import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="wrap not-found">
      <p className="eyebrow">Error 404</p>
      <h1 className="hero-title">Acá no hay nada</h1>
      <p className="hero-copy">La página que buscás no existe o el juego cambió de dirección.</p>
      <Link to="/" className="btn btn-primary">
        Volver al catálogo
      </Link>
    </div>
  )
}
