import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Diálogo modal. Se monta dentro del elemento en pantalla completa si lo hay
// (si no, quedaría tapado por el juego).
export default function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const container = document.fullscreenElement ?? document.body

  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.focus()

    function onKeyDown(event) {
      // Los paneles pueden frenar el evento (p. ej. mientras se reasigna una tecla).
      if (event.key === 'Escape' && !event.defaultPrevented) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    container,
  )
}
