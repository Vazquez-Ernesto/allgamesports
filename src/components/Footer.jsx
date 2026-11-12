import { SITE } from '../site.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-inner">
        <p>
          <strong>{SITE.name}</strong> solo publica juegos que se pueden jugar gratis y sin tener nada de antemano. Lo
          que guardás queda en tu navegador.
        </p>
        <p className="site-footer-meta">
          Cada juego pertenece a sus autores; su ficha indica el estudio y la licencia. Los motores son software
          libre (GPL). DOOM es marca de id Software.
          {SITE.contactEmail && (
            <>
              {' '}
              Contacto y avisos de derechos: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            </>
          )}
        </p>
      </div>
    </footer>
  )
}
