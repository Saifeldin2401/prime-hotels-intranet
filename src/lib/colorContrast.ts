/**
 * WCAG contrast helpers for dynamically-applied tenant brand colors. A tenant can save
 * any hex color as their header background via Organization Details / Settings — this
 * guards against a light color choice making the header's fixed white text unreadable.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '')
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// WCAG relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const WHITE_LUMINANCE = 1

/** Contrast ratio of white text (#fff) against the given background hex. Returns null for an unparseable color. */
export function contrastWithWhite(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return contrastRatio(WHITE_LUMINANCE, relativeLuminance(rgb))
}

/**
 * Returns `hex` unchanged if white text on it already meets `minRatio` (WCAG AA for
 * normal text is 4.5:1). Otherwise progressively darkens it (reducing HSL lightness,
 * hue/saturation preserved) until it does, so a tenant's chosen hue still comes through
 * but never renders white text illegible. Falls back to the original value if it can't
 * be parsed as a hex color.
 */
export function ensureReadableOnWhiteText(hex: string, minRatio = 4.5): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  if (contrastRatio(WHITE_LUMINANCE, relativeLuminance(rgb)) >= minRatio) return hex

  const hsl = rgbToHsl(rgb)
  // Step lightness down in a fine loop; black-vs-white contrast is 21:1, so this always
  // converges well before reaching l = 0.
  for (let l = hsl.l; l >= 0; l -= 0.02) {
    const candidate = hslToRgb({ h: hsl.h, s: hsl.s, l })
    if (contrastRatio(WHITE_LUMINANCE, relativeLuminance(candidate)) >= minRatio) {
      return rgbToHex(candidate.r, candidate.g, candidate.b)
    }
  }
  return '#000000'
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case rN:
      h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6
      break
    case gN:
      h = ((bN - rN) / d + 2) / 6
      break
    default:
      h = ((rN - gN) / d + 4) / 6
  }
  return { h, s, l }
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  }
}
