import { getCatalog } from "@/lib/catalog"
import type { ProgramSlot } from "@/lib/types"

const cache = new Map<string, { at: number; programs: ProgramSlot[] }>()
const MAX_BYTES = 12 * 1024 * 1024

export async function programsFor(channelId: string): Promise<ProgramSlot[]> {
  const catalog = await getCatalog()
  const channel = catalog.byId.get(channelId)
  if (!channel) return []
  const source = channel.guides.flatMap((guide) => guide.sources)[0]
  if (!source) return []
  const cached = cache.get(source.url)
  if (cached && Date.now() - cached.at < 3 * 60 * 60 * 1000) {
    return filterUpcoming(cached.programs)
  }
  const programs = await fetchPrograms(source.url)
  cache.set(source.url, { at: Date.now(), programs })
  return filterUpcoming(programs)
}

async function fetchPrograms(url: string): Promise<ProgramSlot[]> {
  const candidates = guideCandidates(url)
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "PlayStation/1.0 (self-hosted EPG reader)" },
      })
      if (!response.ok) continue
      const length = Number(response.headers.get("content-length") || 0)
      if (length > MAX_BYTES) continue
      const text = await response.text()
      if (text.length > MAX_BYTES) continue
      const programs = candidate.endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[")
        ? parseJsonGuide(text)
        : parseXmlGuide(text)
      if (programs.length) return programs
    } catch {
      continue
    }
  }
  return []
}

function guideCandidates(url: string) {
  const list = [url]
  if (url.endsWith(".xml")) list.unshift(url.replace(/\.xml$/, ".json"))
  if (url.endsWith(".xml.gz")) list.unshift(url.replace(/\.xml\.gz$/, ".json"))
  return [...new Set(list)]
}

function parseJsonGuide(text: string): ProgramSlot[] {
  const data = JSON.parse(text) as unknown
  const programs = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { programs?: unknown[] }).programs)
      ? (data as { programs: unknown[] }).programs
      : []
  return programs.slice(0, 400).map(readProgram).filter((program): program is ProgramSlot => Boolean(program))
}

function readProgram(value: unknown): ProgramSlot | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const title = textValue(record.title)
  if (!title) return null
  return {
    title,
    description: textValue(record.description) || textValue(record.desc),
    start: timeValue(record.start),
    stop: timeValue(record.stop),
    category: textValue(record.category),
  }
}

function textValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) return item.trim()
      if (item && typeof item === "object" && "value" in item && typeof item.value === "string") return item.value.trim()
    }
  }
  if (value && typeof value === "object" && "value" in value && typeof (value as { value: unknown }).value === "string") {
    return ((value as { value: string }).value || "").trim() || null
  }
  return null
}

function timeValue(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null
  const iso = Date.parse(value)
  if (!Number.isNaN(iso)) return new Date(iso).toISOString()
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/)
  if (!match) return null
  const [, year, month, day, hour, minute, second, zone] = match
  const offset = zone ? `${zone.slice(0, 3)}:${zone.slice(3)}` : "Z"
  const parsed = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

function parseXmlGuide(text: string): ProgramSlot[] {
  const programs: ProgramSlot[] = []
  const pattern = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) && programs.length < 400) {
    const attrs = match[1]
    const body = match[2]
    const title = decodeXml(body.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "")
    if (!title) continue
    programs.push({
      title,
      description: decodeXml(body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/)?.[1] || "") || null,
      start: timeValue(attr(attrs, "start")),
      stop: timeValue(attr(attrs, "stop")),
      category: decodeXml(body.match(/<category[^>]*>([\s\S]*?)<\/category>/)?.[1] || "") || null,
    })
  }
  return programs
}

function attr(source: string, name: string) {
  return source.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function filterUpcoming(programs: ProgramSlot[]) {
  const now = Date.now()
  const windowEnd = now + 18 * 60 * 60 * 1000
  const upcoming = programs.filter((program) => {
    const stop = program.stop ? Date.parse(program.stop) : program.start ? Date.parse(program.start) + 60 * 60 * 1000 : NaN
    const start = program.start ? Date.parse(program.start) : NaN
    if (Number.isNaN(stop) || Number.isNaN(start)) return false
    return stop >= now && start <= windowEnd
  })
  upcoming.sort((a, b) => Date.parse(a.start || "") - Date.parse(b.start || ""))
  return upcoming.slice(0, 8)
}
