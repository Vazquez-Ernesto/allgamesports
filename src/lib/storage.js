// localStorage con JSON, tolerante a fallos (modo privado, cuota llena, etc.).

const PREFIX = 'webports:'

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // sin almacenamiento: la preferencia dura lo que dure la pestaña
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // nada que hacer
  }
}
