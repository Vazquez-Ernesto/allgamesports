// Lector mínimo de archivos .zip, sin dependencias.
//
// Un zip guarda al final un "directorio central": la lista de archivos con
// su tamaño, su método de compresión y dónde empiezan sus datos. Se lee esa
// lista y se descomprime cada archivo con DecompressionStream del navegador.

import { decompress } from './fetchBytes.js'

const END_OF_DIRECTORY = 0x06054b50
const DIRECTORY_ENTRY = 0x02014b50
const LOCAL_HEADER = 0x04034b50
const STORED = 0
const DEFLATED = 8

// Devuelve [{ name, size, read() }]; read() descomprime ese archivo.
export function listZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = findEndOfDirectory(view)
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const entries = []

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== DIRECTORY_ENTRY) throw new Error('El archivo .zip está dañado.')
    const entry = readDirectoryEntry(view, bytes, offset)
    if (!entry.name.endsWith('/')) entries.push(entry)
    offset += 46 + entry.nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
  }
  return entries
}

function findEndOfDirectory(view) {
  // Está en los últimos 22 bytes, salvo que el zip tenga un comentario al final.
  const lowest = Math.max(0, view.byteLength - 22 - 0xffff)
  for (let offset = view.byteLength - 22; offset >= lowest; offset--) {
    if (view.getUint32(offset, true) === END_OF_DIRECTORY) return offset
  }
  throw new Error('No es un archivo .zip válido.')
}

function readDirectoryEntry(view, bytes, offset) {
  const method = view.getUint16(offset + 10, true)
  const compressedSize = view.getUint32(offset + 20, true)
  const nameLength = view.getUint16(offset + 28, true)
  const headerOffset = view.getUint32(offset + 42, true)
  const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
  const size = view.getUint32(offset + 24, true)
  const read = () => readData(view, bytes, headerOffset, method, compressedSize)
  return { name, size, nameLength, read }
}

async function readData(view, bytes, headerOffset, method, compressedSize) {
  if (view.getUint32(headerOffset, true) !== LOCAL_HEADER) throw new Error('El archivo .zip está dañado.')
  const start = headerOffset + 30 + view.getUint16(headerOffset + 26, true) + view.getUint16(headerOffset + 28, true)
  const data = bytes.subarray(start, start + compressedSize)
  if (method === STORED) return data
  if (method === DEFLATED) return decompress(data, 'deflate-raw')
  throw new Error(`El .zip usa una compresión que el navegador no soporta (método ${method}).`)
}
