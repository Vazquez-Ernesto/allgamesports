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

// ---------------------------------------------------------------------------
// Escritura: un .zip sin comprimir ("stored"), para guardar varios archivos
// del jugador como uno solo. files: [{ name, bytes }].
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// Cabecera de un archivo: la local (antes de sus datos) o la del directorio.
function header(signature, name, bytes, offset) {
  const isDirectory = signature === DIRECTORY_ENTRY
  const view = new DataView(new ArrayBuffer((isDirectory ? 46 : 30) + name.length))
  const at = isDirectory ? 6 : 4 // la del directorio lleva 2 bytes más al principio
  view.setUint32(0, signature, true)
  view.setUint16(at, 20, true) // versión mínima para leerlo
  view.setUint32(at + 10, crc32(bytes), true)
  view.setUint32(at + 14, bytes.length, true)
  view.setUint32(at + 18, bytes.length, true)
  view.setUint16(at + 22, name.length, true)
  if (isDirectory) view.setUint32(42, offset, true)
  new Uint8Array(view.buffer).set(name, isDirectory ? 46 : 30)
  return new Uint8Array(view.buffer)
}

function endOfDirectory(count, size, offset) {
  const view = new DataView(new ArrayBuffer(22))
  view.setUint32(0, END_OF_DIRECTORY, true)
  view.setUint16(8, count, true)
  view.setUint16(10, count, true)
  view.setUint32(12, size, true)
  view.setUint32(16, offset, true)
  return new Uint8Array(view.buffer)
}

export async function createZip(files) {
  const parts = []
  const directory = []
  let offset = 0
  for (const file of files) {
    const name = new TextEncoder().encode(file.name)
    const local = header(LOCAL_HEADER, name, file.bytes)
    directory.push(header(DIRECTORY_ENTRY, name, file.bytes, offset))
    parts.push(local, file.bytes)
    offset += local.length + file.bytes.length
  }
  const directorySize = directory.reduce((total, entry) => total + entry.length, 0)
  const blob = new Blob([...parts, ...directory, endOfDirectory(files.length, directorySize, offset)])
  return new Uint8Array(await blob.arrayBuffer())
}
