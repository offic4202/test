import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import { connection } from "next/server"

import { catalogDir } from "@/lib/paths"
import {
  AFRICAN_COUNTRIES,
  AFRICAN_LANGUAGES,
  ENGLISH_FALLBACK_COUNTRIES,
  qualityRank,
  regionFor,
  shelvesFor,
} from "@/lib/station"
import type { ChannelCard, GuideListing, PublicStream } from "@/lib/types"

const FILES = [
  "channels",
  "streams",
  "feeds",
  "logos",
  "guides",
  "countries",
  "languages",
  "categories",
  "blocklist",
] as const

const STALE_MS = 12 * 60 * 60 * 1000
const API = "https://iptv-org.github.io/api"

type RawChannel = {
  id: string
  name: string
  alt_names?: string[]
  network?: string | null
  owners?: string[]
  country?: string
  categories?: string[]
  is_nsfw?: boolean
  closed?: string | null
  website?: string | null
}

type RawStream = {
  channel?: string | null
  feed?: string | null
  title?: string
  url?: string
  referrer?: string | null
  user_agent?: string | null
  quality?: string | null
  labels?: string[]
}

type RawFeed = {
  channel?: string
  id?: string
  languages?: string[]
  is_main?: boolean
}

type RawLogo = {
  channel?: string
  feed?: string | null
  in_use?: boolean
  width?: number
  url?: string
}

type RawGuide = {
  channel?: string | null
  feed?: string | null
  site?: string
  site_name?: string
  lang?: string
  sources?: { url?: string; format?: string }[]
}

type RawCountry = { name: string; code: string; flag?: string; languages?: string[] }
type RawLanguage = { name: string; code: string }
type RawCategory = { id: string; name: string }
type RawBlock = { channel?: string }

export type StoredStream = {
  feed: string | null
  title: string
  url: string
  referrer: string | null
  userAgent: string | null
  quality: string | null
  labels: string[]
}

export type StoredGuide = GuideListing & {
  sources: { url: string; format: string }[]
}

export type StoredChannel = {
  card: ChannelCard
  altNames: string[]
  website: string | null
  owners: string[]
  streams: StoredStream[]
  guides: StoredGuide[]
  search: string
}

export type Catalog = {
  syncedAt: number
  channels: StoredChannel[]
  byId: Map<string, StoredChannel>
}

let cache: Catalog | null = null
let pending: Promise<Catalog> | null = null

export async function getCatalog(): Promise<Catalog> {
  await connection()
  if (cache && Date.now() - cache.syncedAt < STALE_MS) return cache
  if (!pending) {
    pending = loadCatalog()
      .then((catalog) => {
        cache = catalog
        pending = null
        return catalog
      })
      .catch((error) => {
        pending = null
        if (cache) return cache
        throw error
      })
  }
  return pending
}

export async function reloadCatalog(): Promise<Catalog> {
  await connection()
  cache = null
  pending = null
  const catalog = await loadCatalog(true)
  cache = catalog
  return catalog
}

async function loadCatalog(force = false): Promise<Catalog> {
  const syncedAt = await ensureDatasets(force)
  const dir = catalogDir()
  const [channels, streams, feeds, logos, guides, countries, languages, categories, blocklist] =
    await Promise.all(FILES.map((name) => readJson<unknown[]>(path.join(dir, `${name}.json`))))

  const countryByCode = new Map<string, RawCountry>()
  for (const country of countries as RawCountry[]) countryByCode.set(country.code, country)
  const languageByCode = new Map<string, string>()
  for (const language of languages as RawLanguage[]) languageByCode.set(language.code, language.name)
  const categoryById = new Map<string, string>()
  for (const category of categories as RawCategory[]) categoryById.set(category.id, category.name)
  const blocked = new Set((blocklist as RawBlock[]).map((entry) => entry.channel).filter(Boolean) as string[])

  const streamsByChannel = new Map<string, StoredStream[]>()
  for (const stream of streams as RawStream[]) {
    if (!stream.channel || !stream.url || !/^https?:\/\//i.test(stream.url)) continue
    const list = streamsByChannel.get(stream.channel) ?? []
    list.push({
      feed: stream.feed ?? null,
      title: stream.title || stream.channel,
      url: stream.url,
      referrer: stream.referrer ?? null,
      userAgent: stream.user_agent ?? null,
      quality: stream.quality ?? null,
      labels: stream.labels ?? [],
    })
    streamsByChannel.set(stream.channel, list)
  }

  const languagesByChannel = new Map<string, Set<string>>()
  for (const feed of feeds as RawFeed[]) {
    if (!feed.channel) continue
    const set = languagesByChannel.get(feed.channel) ?? new Set<string>()
    for (const code of feed.languages ?? []) set.add(code)
    languagesByChannel.set(feed.channel, set)
  }

  const logoByChannel = new Map<string, { url: string; width: number; feed: string | null }>()
  for (const logo of logos as RawLogo[]) {
    if (!logo.channel || !logo.url || logo.in_use === false) continue
    const current = logoByChannel.get(logo.channel)
    const width = logo.width ?? 0
    const mainFeed = logo.feed == null
    if (!current || (mainFeed && current.feed) || width > current.width) {
      logoByChannel.set(logo.channel, { url: logo.url, width, feed: logo.feed ?? null })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const stored: StoredChannel[] = []

  for (const channel of channels as RawChannel[]) {
    if (!channel.id || !channel.name) continue
    if (channel.is_nsfw || (channel.categories ?? []).includes("xxx")) continue
    if (channel.closed && channel.closed <= today) continue
    if (blocked.has(channel.id)) continue
    const rawStreams = streamsByChannel.get(channel.id)
    if (!rawStreams?.length) continue

    const country = channel.country || ""
    const feedLanguages = [...(languagesByChannel.get(channel.id) ?? [])]
    const african = AFRICAN_COUNTRIES.has(country)
    const africanLanguage = feedLanguages.some((code) => AFRICAN_LANGUAGES.has(code))
    const taggedEnglish = feedLanguages.includes("eng")
    const fallbackEnglish = feedLanguages.length === 0 && ENGLISH_FALLBACK_COUNTRIES.has(country)
    const english = taggedEnglish || fallbackEnglish || (african && (countryByCode.get(country)?.languages ?? []).includes("eng") && feedLanguages.length === 0)
    if (!african && !africanLanguage && !taggedEnglish && !fallbackEnglish) continue

    const spoken = feedLanguages.length
      ? feedLanguages
      : english
        ? ["eng"]
        : (countryByCode.get(country)?.languages ?? [])

    rawStreams.sort((a, b) => {
      const geo = Number(a.labels.includes("Geo-blocked")) - Number(b.labels.includes("Geo-blocked"))
      if (geo) return geo
      const part = Number(a.labels.includes("Not 24/7")) - Number(b.labels.includes("Not 24/7"))
      if (part) return part
      const secure = Number(!a.url.startsWith("https")) - Number(!b.url.startsWith("https"))
      if (secure) return secure
      const hls = Number(!/\.m3u8?(\?|$)/i.test(a.url)) - Number(!/\.m3u8?(\?|$)/i.test(b.url))
      if (hls) return hls
      return qualityRank(b.quality) - qualityRank(a.quality)
    })

    const usable = rawStreams.find((stream) => !stream.labels.includes("Geo-blocked")) ?? rawStreams[0]
    const countryInfo = countryByCode.get(country)
    const categories = channel.categories ?? []
    const card: ChannelCard = {
      id: channel.id,
      name: channel.name,
      network: channel.network ?? null,
      country,
      countryName: countryInfo?.name || country || "Unknown",
      flag: countryInfo?.flag || "",
      categories,
      categoryNames: categories.map((id) => categoryById.get(id) || id),
      languages: spoken,
      languageNames: spoken.map((code) => languageByCode.get(code) || code),
      logo: logoByChannel.get(channel.id)?.url ?? null,
      streamCount: rawStreams.length,
      bestQuality: usable?.quality ?? null,
      hasGuide: false,
      shelves: shelvesFor(categories, african),
      region: regionFor(country),
      nigerian: country === "NG",
      african,
      english: spoken.includes("eng") || taggedEnglish || fallbackEnglish,
      geoBlocked: rawStreams.every((stream) => stream.labels.includes("Geo-blocked")),
      dial: 0,
    }
    card.dial = dialScore(card)

    const altNames = channel.alt_names ?? []
    stored.push({
      card,
      altNames,
      website: channel.website ?? null,
      owners: channel.owners ?? [],
      streams: rawStreams,
      guides: [],
      search: [
        channel.name,
        ...altNames,
        channel.network,
        card.countryName,
        country,
        ...card.languageNames,
        ...card.categoryNames,
        ...spoken,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    })
  }

  const byId = new Map(stored.map((channel) => [channel.card.id, channel]))
  for (const guide of guides as RawGuide[]) {
    if (!guide.channel) continue
    const channel = byId.get(guide.channel)
    if (!channel) continue
    const listing: StoredGuide = {
      site: guide.site || "guide",
      siteName: guide.site_name || guide.site || "Guide",
      lang: guide.lang || "",
      feed: guide.feed ?? null,
      sources: (guide.sources ?? [])
        .filter((source) => source.url && /^https?:\/\//i.test(source.url))
        .map((source) => ({ url: source.url as string, format: source.format || "XML" })),
    }
    const duplicate = channel.guides.some(
      (item) => item.site === listing.site && item.siteName === listing.siteName && item.feed === listing.feed,
    )
    if (!duplicate) channel.guides.push(listing)
  }
  for (const channel of stored) channel.card.hasGuide = channel.guides.length > 0

  stored.sort((a, b) => b.card.dial - a.card.dial || a.card.name.localeCompare(b.card.name))
  return { syncedAt, channels: stored, byId }
}

function dialScore(card: ChannelCard): number {
  let score = 0
  if (card.nigerian) score += 80
  else if (card.african) score += 36
  if (card.english) score += 8
  score += Math.min(card.streamCount, 4) * 6
  score += Math.min(qualityRank(card.bestQuality), 1080) / 80
  if (card.logo) score += 6
  if (card.geoBlocked) score -= 12
  return score
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T
}

async function ensureDatasets(force = false): Promise<number> {
  const dir = catalogDir()
  await mkdir(dir, { recursive: true })
  const metaPath = path.join(dir, "meta.json")
  const present = await allPresent(dir)
  let syncedAt = 0
  try {
    const meta = JSON.parse(await readFile(metaPath, "utf8")) as { syncedAt?: number }
    syncedAt = meta.syncedAt ?? 0
  } catch {
    syncedAt = 0
  }
  if (!force && present && syncedAt && Date.now() - syncedAt < STALE_MS) return syncedAt
  if (!force && present && !syncedAt) {
    const info = await stat(path.join(dir, "channels.json"))
    syncedAt = info.mtimeMs
    await writeFile(metaPath, JSON.stringify({ syncedAt }))
    return syncedAt
  }
  await Promise.all(
    FILES.map(async (name) => {
      const response = await fetch(`${API}/${name}.json`, { cache: "no-store" })
      if (!response.ok) throw new Error(`iptv-org ${name}.json returned ${response.status}`)
      const body = await response.text()
      await writeFile(path.join(dir, `${name}.json`), body)
    }),
  )
  syncedAt = Date.now()
  await writeFile(metaPath, JSON.stringify({ syncedAt }))
  return syncedAt
}

async function allPresent(dir: string) {
  const checks = await Promise.all(
    FILES.map(async (name) => {
      try {
        const info = await stat(path.join(dir, `${name}.json`))
        return info.size > 20
      } catch {
        return false
      }
    }),
  )
  return checks.every(Boolean)
}

export function toPublicStreams(streams: StoredStream[]): PublicStream[] {
  return streams.map((stream, index) => ({
    index,
    title: stream.title,
    quality: stream.quality,
    labels: stream.labels,
    feed: stream.feed,
  }))
}
