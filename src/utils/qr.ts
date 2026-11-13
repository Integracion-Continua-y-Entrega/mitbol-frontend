// Generador QR ISO/IEC 18004 (Modo Byte, Nivel L, Versiones 1 a 6) sin dependencias externas

const CAPACITIES = [0, 19, 34, 55, 80, 108, 136]
const EC_CODEWORDS_PER_BLOCK = [0, 7, 10, 15, 20, 26, 18]
const NUM_BLOCKS = [0, 1, 1, 1, 1, 1, 2]
const ALIGNMENT_POS: number[][] = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]]

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

;(function initGaloisField() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i])
    }
    poly = next
  }
  return poly
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = getGeneratorPoly(ecLen)
  const msg = new Uint8Array(data.length + ecLen)
  msg.set(data, 0)

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef)
      }
    }
  }
  return msg.slice(data.length)
}

function encodeDataCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const totalDataCw = CAPACITIES[version]
  const bits: number[] = []

  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1)
    }
  }

  // Modo Byte (0100) + longitud en 8 bits
  pushBits(0b0100, 4)
  pushBits(bytes.length, 8)
  for (const b of bytes) {
    pushBits(b, 8)
  }

  // Terminador hasta 4 ceros
  const maxBits = totalDataCw * 8
  const terminator = Math.min(4, maxBits - bits.length)
  pushBits(0, terminator)

  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  const codewords = new Uint8Array(totalDataCw)
  const byteLen = bits.length / 8
  for (let i = 0; i < byteLen; i++) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j]
    }
    codewords[i] = b
  }

  const pads = [0xec, 0x11]
  for (let i = byteLen; i < totalDataCw; i++) {
    codewords[i] = pads[(i - byteLen) % 2]
  }

  return codewords
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  let version = 1
  while (version <= 6 && bytes.length + 2 > CAPACITIES[version]) {
    version++
  }
  if (version > 6) {
    throw new Error('La URL excede la longitud máxima soportada por el generador QR.')
  }

  const dataCw = encodeDataCodewords(bytes, version)
  const numBlocks = NUM_BLOCKS[version]
  const ecLen = EC_CODEWORDS_PER_BLOCK[version]
  const blockSize = dataCw.length / numBlocks

  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  for (let b = 0; b < numBlocks; b++) {
    const block = dataCw.slice(b * blockSize, (b + 1) * blockSize)
    dataBlocks.push(block)
    ecBlocks.push(computeReedSolomon(block, ecLen))
  }

  const finalCodewords: number[] = []
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i])
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i])
    }
  }

  const size = version * 4 + 17
  const modules: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false))

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark
      isFunc[r][c] = true
    }
  }

  const drawFinder = (r: number, c: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const isBorder = dy === -1 || dy === 7 || dx === -1 || dx === 7
        const isOuter = dy === 0 || dy === 6 || dx === 0 || dx === 6
        const isInner = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4
        setFunctionModule(r + dy, c + dx, !isBorder && (isOuter || isInner))
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0)
    setFunctionModule(i, 6, i % 2 === 0)
  }

  const align = ALIGNMENT_POS[version]
  for (const r of align) {
    for (const c of align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dark = Math.max(Math.abs(dy), Math.abs(dx)) !== 1
          setFunctionModule(r + dy, c + dx, dark)
        }
      }
    }
  }

  // Reservar áreas de formato y módulo oscuro fijo
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      setFunctionModule(8, i, false)
      setFunctionModule(i, 8, false)
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, false)
    setFunctionModule(size - 1 - i, 8, false)
  }
  setFunctionModule(size - 8, 8, true)

  // Colocar bits de datos en zigzag
  let bitIdx = 0
  const totalBits = finalCodewords.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      const upwards = ((right + 1) & 2) === 0
      const r = upwards ? size - 1 - vert : vert
      for (let j = 0; j < 2; j++) {
        const c = right - j
        if (!isFunc[r][c]) {
          let dark = false
          if (bitIdx < totalBits) {
            const cw = finalCodewords[bitIdx >>> 3]
            dark = ((cw >>> (7 - (bitIdx & 7))) & 1) === 1
            bitIdx++
          }
          // Aplicar máscara 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) dark = !dark
          modules[r][c] = dark
        }
      }
    }
  }

  // Bits de formato para Nivel L (01) + Máscara 0 (000) -> 0x77c4
  const formatBits = 0x77c4
  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, ((formatBits >>> i) & 1) === 1)
  setFunctionModule(8, 7, ((formatBits >>> 6) & 1) === 1)
  setFunctionModule(8, 8, ((formatBits >>> 7) & 1) === 1)
  setFunctionModule(7, 8, ((formatBits >>> 8) & 1) === 1)
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, ((formatBits >>> i) & 1) === 1)

  for (let i = 0; i < 8; i++) setFunctionModule(8, size - 1 - i, ((formatBits >>> i) & 1) === 1)
  for (let i = 8; i < 15; i++) setFunctionModule(size - 15 + i, 8, ((formatBits >>> i) & 1) === 1)

  return modules
}

export function downloadQrAsPng(matrix: boolean[][], filename = 'mitbol-menu-qr.png') {
  const quietZone = 4
  const scale = 12
  const totalModules = matrix.length + quietZone * 2
  const canvasSize = totalModules * scale

  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  ctx.fillStyle = '#1E293B'
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (matrix[r][c]) {
        ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale)
      }
    }
  }

  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}