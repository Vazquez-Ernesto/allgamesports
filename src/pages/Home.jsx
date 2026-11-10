import { useEffect, useMemo, useRef, useState } from 'react'

import GameCard from '../components/GameCard.jsx'
import { GAMES, uniqueValues } from '../data/games.js'
import { SITE } from '../site.js'

const ALL = 'Todos'

// Quita acentos y mayúsculas para que "accion" encuentre "Acción".
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

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

export default function Home() {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState(ALL)
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
    return GAMES.filter((game) => {
      if (platform !== ALL && game.platform !== platform) return false
      if (genre !== ALL && game.genre !== genre) return false
      if (!needle) return true
      return normalize(`${game.title} ${game.platform} ${game.genre} ${game.short}`).includes(needle)
    })
  }, [query, platform, genre])

  function clearFilters() {
    setQuery('')
    setPlatform(ALL)
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
              placeholder="Buscar juego, plataforma o género…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <div className="filters">
            <FilterGroup label="Plataforma" options={uniqueValues('platform')} value={platform} onChange={setPlatform} />
            <FilterGroup label="Género" options={uniqueValues('genre')} value={genre} onChange={setGenre} />
          </div>
        </div>

        {results.length > 0 ? (
          <div className="grid">
            {results.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p>Ningún juego coincide con esa búsqueda.</p>
            <button type="button" className="btn" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

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
              Ese código en C se compila con Emscripten a un archivo <code>.wasm</code> que el navegador ejecuta casi a
              velocidad nativa. Video, sonido y controles se conectan con JavaScript.
            </p>
          </li>
          <li>
            <span className="how-num">03</span>
            <h3>Abrís y jugás</h3>
            <p>
              Sin instalar, sin ROMs, sin configurar. Las partidas quedan guardadas en tu navegador y funcionan con
              teclado, mouse o mando.
            </p>
          </li>
        </ol>
      </section>
    </div>
  )
}
