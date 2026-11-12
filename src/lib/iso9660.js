// Lector mínimo de imágenes de CD (ISO 9660), sin dependencias.
//
// Sirve para sacar archivos del disco de un juego sin cargar la imagen entera
// en memoria: lee de a pedazos con blob.slice().
//
// Un CD se divide en sectores. Una imagen puede guardarlos de dos formas:
//   - "cocida" (.iso): solo los 2048 bytes de datos de cada sector.
//   - "cruda" (.bin, .img): los 2352 bytes completos, con una cabecera
//     adelante. Los discos de PlayStation son de este tipo (modo 2), con los
//     datos a partir del byte 24.
// El sector 16 tiene el descriptor del volumen, que apunta a la carpeta raíz.
// Cada carpeta es una lista de registros: nombre, dónde empieza y tamaño.
//
// No lee audio ni video de PlayStation (sectores "form 2").

const DATA_SIZE = 2048
const RAW_SIZE = 2352
const VOLUME_SECTOR = 16
const FLAG_DIRECTORY = 2

const SYNC = [0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00]

async function readBytes(blob, start, length) {
  return new Uint8Array(await blob.slice(start, start + length).arrayBuffer())
}

// { size: bytes por sector en la imagen, offset: dónde empiezan los datos }
async function detectLayout(blob) {
  const head = await readBytes(blob, 0, 16)
  const isRaw = SYNC.every((byte, i) => head[i] === byte)
  if (!isRaw) return { size: DATA_SIZE, offset: 0 }
  const mode = head[15]
  return { size: RAW_SIZE, offset: mode === 2 ? 24 : 16 }
}

// Lee `length` bytes de datos a partir del sector `lba`.
async function readData(blob, layout, lba, length) {
  const sectors = Math.ceil(length / DATA_SIZE)
  const raw = await readBytes(blob, lba * layout.size, sectors * layout.size)
  if (layout.size === DATA_SIZE) return raw.subarray(0, length)

  const out = new Uint8Array(sectors * DATA_SIZE)
  for (let i = 0; i < sectors; i++) {
    const start = i * layout.size + layout.offset
    out.set(raw.subarray(start, start + DATA_SIZE), i * DATA_SIZE)
  }
  return out.subarray(0, length)
}

function parseRecord(sector, offset) {
  const view = new DataView(sector.buffer, sector.byteOffset + offset)
  const nameLength = sector[offset + 32]
  const rawName = new TextDecoder('ascii').decode(sector.subarray(offset + 33, offset + 33 + nameLength))
  return {
    name: rawName.replace(/;\d+$/, ''), // los archivos terminan en ";1" (versión)
    lba: view.getUint32(2, true),
    size: view.getUint32(10, true),
    isDirectory: (sector[offset + 25] & FLAG_DIRECTORY) !== 0,
    isSelfOrParent: nameLength === 1 && sector[offset + 33] <= 1,
  }
}

// Registros de una carpeta. No cruzan sectores: un largo 0 salta al siguiente.
function parseDirectory(bytes) {
  const records = []
  for (let offset = 0; offset < bytes.length; ) {
    const length = bytes[offset]
    if (length === 0) {
      offset = (Math.floor(offset / DATA_SIZE) + 1) * DATA_SIZE
      continue
    }
    const record = parseRecord(bytes, offset)
    if (!record.isSelfOrParent) records.push(record)
    offset += length
  }
  return records
}

async function walk(blob, layout, directory, prefix, files) {
  const bytes = await readData(blob, layout, directory.lba, directory.size)
  for (const record of parseDirectory(bytes)) {
    const path = prefix + record.name
    if (record.isDirectory) await walk(blob, layout, record, `${path}/`, files)
    else files.push({ path, size: record.size, read: () => readData(blob, layout, record.lba, record.size) })
  }
}

// Lista los archivos de una imagen de CD: [{ path, size, read() }].
export async function listDisc(blob) {
  const layout = await detectLayout(blob)
  const volume = await readData(blob, layout, VOLUME_SECTOR, DATA_SIZE)
  const isIso = volume[0] === 1 && new TextDecoder('ascii').decode(volume.subarray(1, 6)) === 'CD001'
  if (!isIso) throw new Error('El archivo no es una imagen de CD.')

  const files = []
  await walk(blob, layout, parseRecord(volume, 156), '', files)
  return files
}
