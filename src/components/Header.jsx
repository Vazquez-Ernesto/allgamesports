import { Link, NavLink } from 'react-router-dom'
import { SITE } from '../site.js'

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap site-header-inner">
        <Link to="/" className="brand" aria-label={`${SITE.name}, inicio`}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">{SITE.name}</span>
        </Link>
        <nav className="site-nav" aria-label="Principal">
          <NavLink to="/" end>
            Catálogo
          </NavLink>
          <a href={`${import.meta.env.BASE_URL}#como-funciona`}>Cómo funciona</a>
          {SITE.repoUrl && (
            <a href={SITE.repoUrl} target="_blank" rel="noreferrer">
              Código
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
