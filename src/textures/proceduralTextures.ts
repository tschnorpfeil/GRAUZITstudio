import * as THREE from 'three'

export interface RoadTextureSet {
  albedo: THREE.CanvasTexture
  normal: THREE.CanvasTexture
  roughness: THREE.CanvasTexture
  bump: THREE.CanvasTexture
}

// Global texture cache to prevent re-allocation
const textureCache = new Map<string, RoadTextureSet>()

/**
 * Hyper-Realistic Procedural Asphalt PBR Generator (ZTV Asphalt-StB / RLS-19)
 * Generates tightly interlocked 2/4 mm aggregate chips with mineral facets,
 * dense asphalt mastic filler, and smooth anti-aliased normal maps.
 */
export function generateRoadTextures(isGrauzit: boolean): RoadTextureSet {
  const cacheKey = `${isGrauzit ? 'grauzit_v4' : 'standard_v4'}`
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!
  }

  const width = 1024
  const height = 1024

  const albedoCanvas = document.createElement('canvas')
  albedoCanvas.width = width
  albedoCanvas.height = height
  const albedoCtx = albedoCanvas.getContext('2d', { willReadFrequently: true })!

  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = width
  normalCanvas.height = height
  const normalCtx = normalCanvas.getContext('2d', { willReadFrequently: true })!

  const roughnessCanvas = document.createElement('canvas')
  roughnessCanvas.width = width
  roughnessCanvas.height = height
  const roughnessCtx = roughnessCanvas.getContext('2d', { willReadFrequently: true })!

  const heightCanvas = document.createElement('canvas')
  heightCanvas.width = width
  heightCanvas.height = height
  const heightCtx = heightCanvas.getContext('2d', { willReadFrequently: true })!

  // 1. Fill base mastic/bitumen matrix with natural micro-mineral porosity
  const baseImageData = albedoCtx.createImageData(width, height)
  for (let i = 0; i < baseImageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14
    if (isGrauzit) {
      // GRAUZIT: Lighter bitumen mastic dusted with fine quartz aggregate filler
      baseImageData.data[i] = Math.max(0, Math.min(255, 42 + noise))
      baseImageData.data[i + 1] = Math.max(0, Math.min(255, 45 + noise))
      baseImageData.data[i + 2] = Math.max(0, Math.min(255, 48 + noise))
    } else {
      // Standard Asphalt: Deep dark bituminous binder
      baseImageData.data[i] = Math.max(0, Math.min(255, 20 + noise))
      baseImageData.data[i + 1] = Math.max(0, Math.min(255, 21 + noise))
      baseImageData.data[i + 2] = Math.max(0, Math.min(255, 22 + noise))
    }
    baseImageData.data[i + 3] = 255
  }
  albedoCtx.putImageData(baseImageData, 0, 0)

  const roughImageData = roughnessCtx.createImageData(width, height)
  for (let i = 0; i < roughImageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20
    const rVal = Math.max(0, Math.min(255, 185 + noise))
    roughImageData.data[i] = rVal // R: Roughness
    roughImageData.data[i + 1] = Math.max(0, Math.min(255, 30 + Math.random() * 15)) // G: Void depth
    roughImageData.data[i + 2] = rVal
    roughImageData.data[i + 3] = 255
  }
  roughnessCtx.putImageData(roughImageData, 0, 0)

  // 2. High-Density Interlocking Aggregate Chip Mosaic (3,800 micro-chips)
  const numChips = 3800
  const rng = (seed: number) => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }

  let seed = isGrauzit ? 888 : 1444

  for (let i = 0; i < numChips; i++) {
    const cx = rng(seed++) * width
    const cy = rng(seed++) * height
    // Radius: 4.0px to 9.5px (calibrated to 2/4 mm physical scale on 1024 canvas)
    const radius = rng(seed++) * 5.5 + 4.0
    const isQuartz = isGrauzit && rng(seed++) > 0.46 // ~50% Henauer Quarzit in GRAUZIT

    let stoneR = 0
    let stoneG = 0
    let stoneB = 0
    let roughVal = 0
    let heightVal = 0

    if (isQuartz) {
      // Henauer Quarzit: Radiant light creamy-white/silver with faint crystalline warmth
      const bright = Math.floor(rng(seed++) * 25 + 215)
      const warmth = Math.floor(rng(seed++) * 8)
      stoneR = bright + warmth
      stoneG = bright + Math.floor(warmth * 0.5)
      stoneB = bright
      roughVal = Math.floor(rng(seed++) * 20 + 25) // Smooth crystalline facets = brilliant specular glints
      heightVal = Math.floor(rng(seed++) * 25 + 230)
    } else if (isGrauzit) {
      // Treis-Kardener Grauwacke: Natural slate-grey / blue-grey mineral contrast
      const grey = Math.floor(rng(seed++) * 35 + 110)
      stoneR = grey
      stoneG = grey + 3
      stoneB = grey + 7
      roughVal = Math.floor(rng(seed++) * 25 + 110)
      heightVal = Math.floor(rng(seed++) * 25 + 200)
    } else {
      // Standard Basalt / Dark Aggregate (Uniform dark charcoal)
      const dark = Math.floor(rng(seed++) * 25 + 32)
      stoneR = dark
      stoneG = dark + 1
      stoneB = dark + 2
      roughVal = Math.floor(rng(seed++) * 30 + 160)
      heightVal = Math.floor(rng(seed++) * 30 + 170)
    }

    const numPoints = Math.floor(rng(seed++) * 3) + 5
    const points: [number, number][] = []
    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2
      const r = radius * (0.80 + rng(seed++) * 0.40)
      points.push([Math.cos(angle) * r, Math.sin(angle) * r])
    }

    const drawPolygon = (ox: number, oy: number) => {
      // Draw 3D Shaded Stone with Facet Gradient
      albedoCtx.save()
      albedoCtx.beginPath()
      for (let p = 0; p < points.length; p++) {
        const px = cx + points[p][0] + ox
        const py = cy + points[p][1] + oy
        if (p === 0) albedoCtx.moveTo(px, py)
        else albedoCtx.lineTo(px, py)
      }
      albedoCtx.closePath()

      // Radial stone facet gradient (gives genuine 3D stone depth rather than flat stickers!)
      const grad = albedoCtx.createRadialGradient(
        cx + ox - radius * 0.25,
        cy + oy - radius * 0.25,
        0,
        cx + ox,
        cy + oy,
        radius * 1.1
      )
      const highlight = isQuartz ? 25 : 12
      const shadow = isQuartz ? -15 : -8
      grad.addColorStop(0, `rgb(${Math.min(255, stoneR + highlight)}, ${Math.min(255, stoneG + highlight)}, ${Math.min(255, stoneB + highlight)})`)
      grad.addColorStop(1, `rgb(${Math.max(0, stoneR + shadow)}, ${Math.max(0, stoneG + shadow)}, ${Math.max(0, stoneB + shadow)})`)

      albedoCtx.fillStyle = grad
      albedoCtx.fill()
      albedoCtx.restore()

      // Draw Roughness & Height
      roughnessCtx.beginPath()
      for (let p = 0; p < points.length; p++) {
        const px = cx + points[p][0] + ox
        const py = cy + points[p][1] + oy
        if (p === 0) roughnessCtx.moveTo(px, py)
        else roughnessCtx.lineTo(px, py)
      }
      roughnessCtx.closePath()
      const rHex = roughVal.toString(16).padStart(2, '0')
      const gHex = heightVal.toString(16).padStart(2, '0')
      roughnessCtx.fillStyle = `#${rHex}${gHex}${rHex}`
      roughnessCtx.fill()

      // Draw Height Only
      heightCtx.beginPath()
      for (let p = 0; p < points.length; p++) {
        const px = cx + points[p][0] + ox
        const py = cy + points[p][1] + oy
        if (p === 0) heightCtx.moveTo(px, py)
        else heightCtx.lineTo(px, py)
      }
      heightCtx.closePath()
      heightCtx.fillStyle = `rgb(${heightVal}, ${heightVal}, ${heightVal})`
      heightCtx.fill()
    }

    // Seamless edge wrapping across 1024x1024 canvas
    const offsets = [
      [0, 0],
      [width, 0], [-width, 0],
      [0, height], [0, -height],
      [width, height], [-width, -height],
      [width, -height], [-width, height]
    ]

    for (const [ox, oy] of offsets) {
      if (
        cx + ox >= -radius * 2 &&
        cx + ox <= width + radius * 2 &&
        cy + oy >= -radius * 2 &&
        cy + oy <= height + radius * 2
      ) {
        drawPolygon(ox, oy)
      }
    }
  }

  // 3. Smooth 3x3 Sobel Normal Filter (Anti-Aliased, Zero Noise Spikes)
  const heightData = heightCtx.getImageData(0, 0, width, height)
  const normalData = normalCtx.createImageData(width, height)
  const hPixels = heightData.data
  const nPixels = normalData.data

  const bumpScale = 3.2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      const xPrev = x === 0 ? width - 1 : x - 1
      const xNext = x === width - 1 ? 0 : x + 1
      const yPrev = y === 0 ? height - 1 : y - 1
      const yNext = y === height - 1 ? 0 : y + 1

      const hLeft = hPixels[(y * width + xPrev) * 4] / 255.0
      const hRight = hPixels[(y * width + xNext) * 4] / 255.0
      const hUp = hPixels[(yPrev * width + x) * 4] / 255.0
      const hDown = hPixels[(yNext * width + x) * 4] / 255.0

      const dx = (hRight - hLeft) * bumpScale
      const dy = (hDown - hUp) * bumpScale
      const dz = 1.0

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const nx = (-dx / len) * 0.5 + 0.5
      const ny = (-dy / len) * 0.5 + 0.5
      const nz = (dz / len) * 0.5 + 0.5

      nPixels[idx] = Math.floor(nx * 255)
      nPixels[idx + 1] = Math.floor(ny * 255)
      nPixels[idx + 2] = Math.floor(nz * 255)
      nPixels[idx + 3] = 255
    }
  }
  normalCtx.putImageData(normalData, 0, 0)

  const createTexture = (canvas: HTMLCanvasElement): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.anisotropy = 16
    tex.needsUpdate = true
    return tex
  }

  const result: RoadTextureSet = {
    albedo: createTexture(albedoCanvas),
    normal: createTexture(normalCanvas),
    roughness: createTexture(roughnessCanvas),
    bump: createTexture(heightCanvas),
  }

  textureCache.set(cacheKey, result)
  return result
}

let markingTexCache: THREE.CanvasTexture | null = null

/**
 * Porous Matte Micro-Granular Road Marking Texture (Heißplastik / Kaltplastik)
 */
export function generateMarkingTexture(size = 128): THREE.CanvasTexture {
  if (markingTexCache) return markingTexCache

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const imgData = ctx.createImageData(size, size)
  for (let i = 0; i < imgData.data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 45
    const val = Math.max(0, Math.min(255, 220 + grain))
    imgData.data[i] = val
    imgData.data[i + 1] = val
    imgData.data[i + 2] = val
    imgData.data[i + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 32)
  tex.anisotropy = 4
  tex.needsUpdate = true

  markingTexCache = tex
  return tex
}

let crossSectionTexCache: THREE.CanvasTexture | null = null

/**
 * Stratified Road Construction Cross-Section Texture (Asphaltaufbau nach RStO)
 */
export function generateSlabCrossSectionTexture(): THREE.CanvasTexture {
  if (crossSectionTexCache) return crossSectionTexCache

  const width = 512
  const height = 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Layer 1: Deckschicht (Top 20% -> 0 to 4cm)
  ctx.fillStyle = '#1e2126'
  ctx.fillRect(0, 0, width, height * 0.22)

  // Layer 2: Asphaltbinderschicht (Middle 40% -> 4 to 12cm)
  ctx.fillStyle = '#16181b'
  ctx.fillRect(0, height * 0.22, width, height * 0.40)

  // Layer 3: Asphalttragschicht (Bottom 40% -> 12 to 20cm)
  ctx.fillStyle = '#111214'
  ctx.fillRect(0, height * 0.62, width, height * 0.38)

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const isTop = y < height * 0.22
    const isMid = y >= height * 0.22 && y < height * 0.62

    const r = isTop ? Math.random() * 2.5 + 1.2 : isMid ? Math.random() * 4.0 + 2.0 : Math.random() * 6.0 + 3.0
    const brightness = Math.floor(Math.random() * (isTop ? 120 : 60) + 40)
    ctx.fillStyle = `rgb(${brightness}, ${brightness + 2}, ${brightness + 4})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height * 0.22)
  ctx.lineTo(width, height * 0.22)
  ctx.moveTo(0, height * 0.62)
  ctx.lineTo(width, height * 0.62)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(4, 1)
  tex.anisotropy = 4
  tex.needsUpdate = true

  crossSectionTexCache = tex
  return tex
}
