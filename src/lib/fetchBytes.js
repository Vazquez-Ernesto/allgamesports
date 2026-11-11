// Descarga con progreso. Si el archivo viene comprimido con gzip, lo descomprime.
export async function fetchBytes(url, onProgress) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo descargar ${url} (HTTP ${response.status})`)

  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body.getReader()
  const chunks = []
  let loaded = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress?.(loaded, total)
  }

  const bytes = joinChunks(chunks, loaded)
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
  return isGzip ? decompress(bytes, 'gzip') : bytes
}

function joinChunks(chunks, length) {
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

// format: 'gzip' o 'deflate-raw' (el que usan los zip).
export async function decompress(bytes, format) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
