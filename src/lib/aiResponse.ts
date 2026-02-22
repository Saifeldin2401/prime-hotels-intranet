const DEFAULT_TEXT_KEYS = [
  'contentHtml',
  'content_html',
  'html',
  'markdown',
  'content',
  'text',
  'result',
  'response',
  'message',
  'output',
  'answer',
]

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const trimOuterQuotes = (value: string): string => {
  return value.replace(/^['"]|['"]$/g, '').trim()
}

export const stripCodeFences = (value: string): string => {
  let output = (value || '').trim()
  if (!output) return ''

  // Remove only outer fences so valid inner markdown/code remains intact.
  let changed = true
  while (changed) {
    changed = false
    const next = output
      .replace(/^\s*```[a-zA-Z0-9_-]*\s*\r?\n?/, '')
      .replace(/\r?\n?\s*```\s*$/, '')
      .trim()
    if (next !== output) {
      output = next
      changed = true
    }
  }

  return output
}

const tryParseJson = <T = unknown>(value: string): T | null => {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const extractBalancedJson = (value: string): string | null => {
  const text = value.trim()
  if (!text) return null

  const firstObject = text.indexOf('{')
  const firstArray = text.indexOf('[')
  let start = -1

  if (firstObject === -1) start = firstArray
  else if (firstArray === -1) start = firstObject
  else start = Math.min(firstObject, firstArray)

  if (start < 0) return null

  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const char = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === open) depth += 1
    if (char === close) depth -= 1

    if (depth === 0) {
      return text.slice(start, i + 1)
    }
  }

  return null
}

export const parseJsonFromAiResponse = <T = unknown>(raw: string): T | null => {
  const cleaned = stripCodeFences(raw)
  if (!cleaned) return null

  const direct = tryParseJson<T>(cleaned)
  if (direct !== null) return direct

  const balanced = extractBalancedJson(cleaned)
  if (!balanced) return null

  return tryParseJson<T>(balanced)
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const decodeLooseEscapes = (value: string): string => {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
}

const extractLooseObjectValue = (source: string, key: string): string | null => {
  const keyPattern = new RegExp(`(?:["']?${escapeRegExp(key)}["']?)\\s*:`, 'i')
  const keyMatch = keyPattern.exec(source)
  if (!keyMatch) return null

  let cursor = keyMatch.index + keyMatch[0].length
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1
  if (cursor >= source.length) return null

  const first = source[cursor]
  if (first === '"' || first === "'") {
    const quote = first
    cursor += 1
    let value = ''

    while (cursor < source.length) {
      const char = source[cursor]
      if (char === '\\' && cursor + 1 < source.length) {
        value += `\\${source[cursor + 1]}`
        cursor += 2
        continue
      }
      if (char === quote) break
      value += char
      cursor += 1
    }

    return decodeLooseEscapes(trimOuterQuotes(value).trim())
  }

  let value = ''
  let depthObj = 0
  let depthArr = 0
  let inString = false
  let quoteChar: '"' | "'" | null = null
  let escaped = false

  while (cursor < source.length) {
    const char = source[cursor]

    if (inString) {
      value += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quoteChar) {
        inString = false
        quoteChar = null
      }
      cursor += 1
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      quoteChar = char
      value += char
      cursor += 1
      continue
    }

    if (char === '{') depthObj += 1
    if (char === '}') {
      if (depthObj === 0 && depthArr === 0) break
      depthObj -= 1
    }
    if (char === '[') depthArr += 1
    if (char === ']') depthArr = Math.max(0, depthArr - 1)
    if (char === ',' && depthObj === 0 && depthArr === 0) break

    value += char
    cursor += 1
  }

  const candidate = value.trim()
  if (!candidate) return null

  if (
    (candidate.startsWith('"') && candidate.endsWith('"')) ||
    (candidate.startsWith("'") && candidate.endsWith("'"))
  ) {
    return decodeLooseEscapes(trimOuterQuotes(candidate))
  }

  return decodeLooseEscapes(candidate)
}

const extractTextFromLooseObject = (raw: string, preferredKeys: string[]): string | null => {
  for (const key of preferredKeys) {
    const value = extractLooseObjectValue(raw, key)
    if (value && value.trim()) return value.trim()
  }
  return null
}

const extractTextFromParsedJson = (
  payload: unknown,
  preferredKeys: string[],
  depth = 0,
): string | null => {
  if (depth > 20) return null

  if (typeof payload === 'string') {
    const text = trimOuterQuotes(payload)
    return text || null
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const extracted = extractTextFromParsedJson(item, preferredKeys, depth + 1)
      if (extracted) return extracted
    }
    return null
  }

  if (!isRecord(payload)) return null

  for (const key of preferredKeys) {
    if (!(key in payload)) continue
    const extracted = extractTextFromParsedJson(payload[key], preferredKeys, depth + 1)
    if (extracted) return extracted
  }

  // OpenAI-like response payloads.
  const choices = payload.choices
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      const extracted = extractTextFromParsedJson(choice, preferredKeys, depth + 1)
      if (extracted) return extracted
    }
  }

  // Generic deep fallback.
  for (const value of Object.values(payload)) {
    const extracted = extractTextFromParsedJson(value, preferredKeys, depth + 1)
    if (extracted) return extracted
  }

  return null
}

export const extractTextFromAiResponse = (
  raw: string,
  preferredKeys: string[] = DEFAULT_TEXT_KEYS,
): string => {
  const cleaned = stripCodeFences(raw)
  if (!cleaned) return ''

  const parsed = parseJsonFromAiResponse(cleaned)
  if (parsed !== null) {
    const extracted = extractTextFromParsedJson(parsed, preferredKeys)
    if (extracted) {
      const nestedParsed = parseJsonFromAiResponse(extracted)
      if (nestedParsed !== null) {
        const nestedExtracted = extractTextFromParsedJson(nestedParsed, preferredKeys)
        if (nestedExtracted) return stripCodeFences(nestedExtracted).trim()
      }
      return stripCodeFences(extracted).trim()
    }
  }

  const looseExtracted = extractTextFromLooseObject(cleaned, preferredKeys)
  if (looseExtracted) {
    return stripCodeFences(looseExtracted).trim()
  }

  return trimOuterQuotes(cleaned)
}
