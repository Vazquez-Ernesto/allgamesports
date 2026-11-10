import { SITE } from '../site.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-inner">
        <p>
          <strong>{SITE.name}</strong> solo hospeda juegos con código y datos libres. Los juegos comerciales se juegan
          con tu propia copia, que nunca sale de tu navegador.
        </p>
        <p className="site-footer-meta">
          DOOM es marca de id Software. Motor bajo GPL-2.0, Freedoom bajo BSD-3.
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
