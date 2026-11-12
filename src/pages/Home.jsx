import { useEffect, useMemo, useRef, useState } from 'react'

import GameCard from '../components/GameCard.jsx'
import { GAMES, uniqueValues } from '../data/games.js'
import { PLATFORMS, platformOf } from '../data/platforms.js'
import { SITE } from '../site.js'

const ALL = 'Todos'

// Quita acentos y mayúsculas para que "accion" encuentre "Acción".
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const searchText = (game) =>
  normalize(`${game.title} ${platformOf(game).name} ${game.genre} ${game.year} ${game.developer} ${game.short}`)

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="filter-group" role="group" aria-label={label}>
      <span className="filter-label">{label}</span>
      {[ALL, ...options].map((option) => (
        <button
          key={option}
          type="button"
          className="chip"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

// Para quien entra por primera vez: qué hacer, sin tecnicismos.
function StartHere() {
  return (
    <section className="start" aria-labelledby="empezar-titulo">
      <h2 id="empezar-titulo" className="start-title">
        ¿Primera vez? Empezá acá
      </h2>
      <ol className="start-steps">
        <li>
          <strong>Elegí un juego.</strong> Los que dicen <span className="tag tag-free">Listo para jugar</span> arrancan
          con un clic.
        </li>
        <li>
          <strong>Tocá Jugar.</strong> La primera vez descarga unos pocos MB. No hay que instalar nada ni crear una
          cuenta.
        </li>
        <li>
          <strong>Mirá los controles.</strong> Cada juego tiene un botón “Controles” con sus teclas. Tu partida queda
          guardada en este navegador.
        </li>
      </ol>
      <p className="start-note">
        Algunos juegos dicen <span className="tag tag-byo">Necesita tu copia</span>: son gratis de jugar acá, pero te
        piden un archivo del juego original. Su página explica cuál es y de dónde sacarlo.
      </p>
    </section>
  )
}

// Una sección del catálogo: la plataforma original y sus juegos.
function PlatformSection({ id, games }) {
  const platform = PLATFORMS[id]
  return (
    <section className="platform" aria-labelledby={`plataforma-${id}`}>
      <header className="platform-head">
        <h3 id={`plataforma-${id}`} className="platform-name">
          {platform.name}
        </h3>
        <p className="platform-meta">
          {platform.maker} · {platform.years} · {games.length} {games.length === 1 ? 'juego' : 'juegos'}
        </p>
        <p className="platform-about">{platform.about}</p>
      </header>
      <div className="grid">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="how" aria-labelledby="como-funciona-titulo">
      <div className="section-head">
        <h2 id="como-funciona-titulo">Cómo funciona</h2>
        <span className="section-rule" aria-hidden="true" />
      </div>
      <ol className="how-steps">
        <li>
          <span className="how-num">01</span>
          <h3>Código fuente real</h3>
          <p>
            Cada juego parte del código original liberado por sus autores o reconstruido por la comunidad. No hay un
            emulador imitando una consola.
          </p>
        </li>
        <li>
          <span className="how-num">02</span>
          <h3>Compilado a WebAssembly</h3>
          <p>
            Ese código se compila con Emscripten a un archivo <code>.wasm</code> que el navegador ejecuta casi a
            velocidad nativa. Video, sonido y controles se conectan con JavaScript.
          </p>
        </li>
        <li>
          <span className="how-num">03</span>
          <h3>Solo lo que se puede compartir</h3>
          <p>
            Acá se hospedan únicamente juegos cuyos autores permiten distribuirlos. Los demás se juegan con tu propia
            copia, que nunca sale de tu navegador.
          </p>
        </li>
      </ol>
    </section>
  )
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState(ALL)
  const searchRef = useRef(null)

  // Atajo: "/" enfoca el buscador.
  useEffect(() => {
    function onKeyDown(event) {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Si se llega con #como-funciona (desde otra página), bajar a esa sección.
  useEffect(() => {
    if (window.location.hash) {
      document.querySelector(window.location.hash)?.scrollIntoView()
    }
  }, [])

  const results = useMemo(() => {
    const needle = normalize(query.trim())
    return GAMES.filter((game) => (genre === ALL || game.genre === genre) && searchText(game).includes(needle))
  }, [query, genre])

  // Plataformas que tienen al menos un resultado, en el orden de platforms.js.
  const platformIds = Object.keys(PLATFORMS).filter((id) => results.some((game) => game.platform === id))

  function clearFilters() {
    setQuery('')
    setGenre(ALL)
  }

  return (
    <div className="wrap">
      <section className="hero">
        <p className="eyebrow">WebAssembly · código abierto</p>
        <h1 className="hero-title">
          Juegos que corren
          <br />
          en tu <em>navegador</em>
        </h1>
        <p className="hero-copy">{SITE.description}</p>
      </section>

      <StartHere />

      <section aria-labelledby="catalogo">
        <div className="section-head">
          <h2 id="catalogo">Catálogo</h2>
          <span className="section-rule" aria-hidden="true" />
          <span className="section-count">{String(results.length).padStart(2, '0')}</span>
        </div>

        <div className="toolbar">
          <label className="search">
            <span className="visually-hidden">Buscar juego</span>
            <input
              ref={searchRef}
              type="search"
              placeholder="Buscar por juego, género, año o estudio…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <div className="filters">
            <FilterGroup label="Género" options={uniqueValues('genre')} value={genre} onChange={setGenre} />
          </div>
        </div>

        {platformIds.map((id) => (
          <PlatformSection key={id} id={id} games={results.filter((game) => game.platform === id)} />
        ))}

        {results.length === 0 && (
          <div className="empty">
            <p>Ningún juego coincide con esa búsqueda.</p>
            <button type="button" className="btn" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      <HowItWorks />
    </div>
  )
}
