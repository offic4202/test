import { allStats } from "@/lib/audience"
import { getCatalog, type StoredChannel } from "@/lib/catalog"
import { LANGUAGE_SPOTLIGHTS, REGIONS, SHELVES, regionName, shelfName } from "@/lib/station"
import type {
  ChannelDetail,
  DirectoryResult,
  Facet,
  HomePayload,
  HomeRow,
  ListedChannel,
  ScopeId,
  SortId,
  StationCounts,
} from "@/lib/types"

const PAGE_SIZE = 24

export async function getHome(): Promise<HomePayload> {
  const catalog = await getCatalog()
  const stats = await allStats()
  const listed = catalog.channels.map((channel) => withStats(channel, stats))
  const counts = countStation(listed)
  const watched = listed.filter((channel) => channel.plays > 0)
  const mode = watched.length > 0 ? "trending" : "opening"
  const trending = [...listed]
    .sort((a, b) => heat(b) - heat(a) || b.dial - a.dial)
    .slice(0, 18)
  const returns = listed
    .filter((channel) => channel.returns > 0)
    .sort((a, b) => b.returns - a.returns || b.plays - a.plays)
    .slice(0, 18)
  const heroPool = mode === "trending" ? trending : listed.filter((channel) => channel.nigerian && channel.logo)
  const hero = heroPool[0] ?? listed[0]
  if (!hero) throw new Error("The iptv-org directory did not yield any playable channels.")

  const rows: HomeRow[] = [
    row("nigeria", "Nigeria", "Channels broadcasting from Nigeria", "/directory?scope=nigeria", listed.filter((channel) => channel.nigerian)),
  ]
  for (const language of LANGUAGE_SPOTLIGHTS) {
    const channels = listed.filter((channel) => channel.languages.includes(language.code))
    if (channels.length < 3) continue
    rows.push(
      row(
        language.code,
        language.name,
        `Feeds tagged ${language.name}`,
        `/directory?language=${language.code}`,
        channels,
      ),
    )
  }
  for (const shelf of SHELVES.slice(0, 7)) {
    rows.push(
      row(
        shelf.id,
        shelf.name,
        shelf.kicker,
        `/directory?shelf=${shelf.id}`,
        listed.filter((channel) => channel.shelves.includes(shelf.id)),
      ),
    )
  }
  rows.push(
    row(
      "english-abroad",
      "English desk",
      "English-language channels outside Africa",
      "/directory?scope=english",
      listed.filter((channel) => channel.english && !channel.african),
    ),
  )

  return {
    syncedAt: catalog.syncedAt,
    counts,
    mode,
    hero,
    trending: mode === "trending" ? trending : listed.slice(0, 18),
    returns,
    rows: rows.filter((item) => item.channels.length > 0),
  }
}

export async function getChannel(id: string): Promise<ChannelDetail | null> {
  const catalog = await getCatalog()
  const channel = catalog.byId.get(id)
  if (!channel) return null
  const stats = await allStats()
  const listed = withStats(channel, stats)
  const related = catalog.channels
    .filter((item) => item.card.id !== id && (item.card.country === channel.card.country || sharesShelf(item, channel)))
    .slice(0, 12)
    .map((item) => withStats(item, stats))
  return {
    ...listed,
    altNames: channel.altNames,
    website: channel.website,
    owners: channel.owners,
    streams: channel.streams.map((stream, index) => ({
      index,
      title: stream.title,
      quality: stream.quality,
      labels: stream.labels,
      feed: stream.feed,
    })),
    guides: channel.guides.map(({ site, siteName, lang, feed }) => ({ site, siteName, lang, feed })),
    related,
  }
}

export async function searchDirectory(input: {
  q?: string
  shelf?: string
  country?: string
  language?: string
  region?: string
  scope?: string
  sort?: string
  page?: string | number
}): Promise<DirectoryResult> {
  const catalog = await getCatalog()
  const stats = await allStats()
  const query = normalize(input)
  const all = catalog.channels.map((channel) => withStats(channel, stats))
  const base = all.filter((channel) => matchesScope(channel, query.scope))
  const searched = query.q ? base.filter((channel) => matchesQuery(catalog.byId.get(channel.id)!, query.q)) : base
  const faceted = searched.filter(
    (channel) =>
      (!query.country || channel.country === query.country) &&
      (!query.language || channel.languages.includes(query.language)) &&
      (!query.region || channel.region === query.region),
  )
  const results = faceted.filter((channel) => !query.shelf || channel.shelves.includes(query.shelf as never))
  const sorted = [...results].sort((a, b) => compare(a, b, query, catalog))
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(query.page, pages)
  const start = (page - 1) * PAGE_SIZE

  return {
    total: sorted.length,
    page,
    pages,
    channels: sorted.slice(start, start + PAGE_SIZE),
    facets: {
      shelves: shelfFacets(faceted),
      countries: countryFacets(searched.filter((channel) => !query.shelf || channel.shelves.includes(query.shelf as never))),
      languages: languageFacets(searched.filter((channel) => (!query.shelf || channel.shelves.includes(query.shelf as never)) && (!query.country || channel.country === query.country))),
      regions: regionFacets(searched),
    },
    syncedAt: catalog.syncedAt,
    counts: countStation(all),
  }
}

export async function getMap() {
  const catalog = await getCatalog()
  const stats = await allStats()
  const listed = catalog.channels.map((channel) => withStats(channel, stats))
  const countries = new Map<string, { code: string; name: string; flag: string; count: number; region: string | null }>()
  for (const channel of listed) {
    if (!channel.country) continue
    const current = countries.get(channel.country) ?? {
      code: channel.country,
      name: channel.countryName,
      flag: channel.flag,
      count: 0,
      region: channel.region,
    }
    current.count += 1
    countries.set(channel.country, current)
  }
  return {
    syncedAt: catalog.syncedAt,
    counts: countStation(listed),
    regions: REGIONS.map((region) => ({
      id: region.id,
      name: region.name,
      countries: region.countries
        .map((code) => countries.get(code))
        .filter((country): country is NonNullable<typeof country> => Boolean(country && country.count > 0))
        .sort((a, b) => b.count - a.count),
    })),
    elsewhere: [...countries.values()]
      .filter((country) => !country.region)
      .sort((a, b) => b.count - a.count)
      .slice(0, 24),
  }
}

function row(id: string, title: string, kicker: string, href: string, channels: ListedChannel[]): HomeRow {
  return {
    id,
    title,
    kicker,
    href,
    channels: [...channels].sort((a, b) => heat(b) - heat(a) || b.dial - a.dial).slice(0, 18),
  }
}

function withStats(channel: StoredChannel, stats: Map<string, { plays: number; returns: number }>): ListedChannel {
  const rowStats = stats.get(channel.card.id) ?? { plays: 0, returns: 0 }
  return { ...channel.card, ...rowStats }
}

function heat(channel: ListedChannel) {
  return channel.plays + channel.returns * 1.75
}

function sharesShelf(a: StoredChannel, b: StoredChannel) {
  return a.card.shelves.some((shelf) => b.card.shelves.includes(shelf))
}

function countStation(channels: ListedChannel[]): StationCounts {
  return {
    station: channels.length,
    nigeria: channels.filter((channel) => channel.nigerian).length,
    africa: channels.filter((channel) => channel.african).length,
    english: channels.filter((channel) => channel.english).length,
    withGuide: channels.filter((channel) => channel.hasGuide).length,
  }
}

function normalize(input: {
  q?: string
  shelf?: string
  country?: string
  language?: string
  region?: string
  scope?: string
  sort?: string
  page?: string | number
}) {
  const scope = (["station", "nigeria", "africa", "english"].includes(input.scope || "")
    ? input.scope
    : "station") as ScopeId
  const sort = (["relevance", "trending", "name", "returns"].includes(input.sort || "")
    ? input.sort
    : input.q
      ? "relevance"
      : "trending") as SortId
  const page = Math.max(1, Number(input.page) || 1)
  return {
    q: (input.q || "").trim().toLowerCase(),
    shelf: input.shelf || "",
    country: (input.country || "").toUpperCase(),
    language: (input.language || "").toLowerCase(),
    region: input.region || "",
    scope,
    sort,
    page,
  }
}

function matchesScope(channel: ListedChannel, scope: ScopeId) {
  if (scope === "nigeria") return channel.nigerian
  if (scope === "africa") return channel.african
  if (scope === "english") return channel.english
  return true
}

function matchesQuery(channel: StoredChannel, q: string) {
  return q.split(/\s+/).filter(Boolean).every((token) => channel.search.includes(token))
}

function compare(a: ListedChannel, b: ListedChannel, query: ReturnType<typeof normalize>, catalog: { byId: Map<string, StoredChannel> }) {
  if (query.sort === "name") return a.name.localeCompare(b.name)
  if (query.sort === "returns") return b.returns - a.returns || b.plays - a.plays || b.dial - a.dial
  if (query.sort === "relevance" && query.q) {
    const diff = relevance(catalog.byId.get(b.id)!, query.q) - relevance(catalog.byId.get(a.id)!, query.q)
    if (diff) return diff
  }
  return heat(b) - heat(a) || b.dial - a.dial || a.name.localeCompare(b.name)
}

function relevance(channel: StoredChannel, q: string) {
  const name = channel.card.name.toLowerCase()
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  if (name.includes(q)) return 60
  if (channel.altNames.some((alt) => alt.toLowerCase().includes(q))) return 50
  if ((channel.card.network || "").toLowerCase().includes(q)) return 40
  return 20
}

function shelfFacets(channels: ListedChannel[]): Facet[] {
  return SHELVES.map((shelf) => ({
    id: shelf.id,
    name: shelf.name,
    count: channels.filter((channel) => channel.shelves.includes(shelf.id)).length,
  })).filter((facet) => facet.count > 0)
}

function countryFacets(channels: ListedChannel[]): Facet[] {
  const map = new Map<string, Facet>()
  for (const channel of channels) {
    if (!channel.country) continue
    const current = map.get(channel.country) ?? {
      id: channel.country,
      name: channel.countryName,
      flag: channel.flag,
      count: 0,
    }
    current.count += 1
    map.set(channel.country, current)
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 48)
}

function languageFacets(channels: ListedChannel[]): Facet[] {
  const map = new Map<string, Facet>()
  for (const channel of channels) {
    channel.languages.forEach((code, index) => {
      const current = map.get(code) ?? { id: code, name: channel.languageNames[index] || code, count: 0 }
      current.count += 1
      map.set(code, current)
    })
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 28)
}

function regionFacets(channels: ListedChannel[]): Facet[] {
  return REGIONS.map((region) => ({
    id: region.id,
    name: regionName(region.id),
    count: channels.filter((channel) => channel.region === region.id).length,
  })).filter((facet) => facet.count > 0)
}

export function emptyDirectoryNote(shelf: string) {
  return shelf ? shelfName(shelf) : "this filter"
}
