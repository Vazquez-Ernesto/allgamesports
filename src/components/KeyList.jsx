// Controles fijos de un motor que no permite reasignar teclas desde el sitio.
export default function KeyList({ keys, note }) {
  return (
    <div className="controls">
      {note && <p className="controls-help">{note}</p>}
      <div className="controls-groups">
        <section className="controls-group">
          <h3>Teclado</h3>
          <ul>
            {keys.map(([key, label]) => (
              <li key={key} className="bind-row">
                <span className="bind-label">{label}</span>
                <span className="keycap is-static">{key}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
