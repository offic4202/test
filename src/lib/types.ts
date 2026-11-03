export type ShelfId =
  | "cartoon"
  | "music"
  | "local-movies"
  | "foreign-movies"
  | "news"
  | "sports"
  | "religious"
  | "education"
  | "entertainment"
  | "lifestyle"
  | "business"

export type ScopeId = "station" | "nigeria" | "africa" | "english"

export type SortId = "relevance" | "trending" | "name" | "returns"

export type ChannelCard = {
  id: string
  name: string
  network: string | null
  country: string
  countryName: string
  flag: string
  categories: string[]
  categoryNames: string[]
  languages: string[]
  languageNames: string[]
  logo: string | null
  streamCount: number
  bestQuality: string | null
  hasGuide: boolean
  shelves: ShelfId[]
  region: string | null
  nigerian: boolean
  african: boolean
  english: boolean
  geoBlocked: boolean
  dial: number
}

export type ChannelStats = {
  plays: number
  returns: number
}

export type ListedChannel = ChannelCard & ChannelStats

export type PublicStream = {
  index: number
  title: string
  quality: string | null
  labels: string[]
  feed: string | null
}

export type GuideListing = {
  site: string
  siteName: string
  lang: string
  feed: string | null
}

export type ProgramSlot = {
  title: string
  description: string | null
  start: string | null
  stop: string | null
  category: string | null
}

export type ChannelDetail = ListedChannel & {
  altNames: string[]
  website: string | null
  owners: string[]
  streams: PublicStream[]
  guides: GuideListing[]
  related: ListedChannel[]
}

export type Facet = {
  id: string
  name: string
  count: number
  flag?: string
}

export type DirectoryResult = {
  total: number
  page: number
  pages: number
  channels: ListedChannel[]
  facets: {
    shelves: Facet[]
    countries: Facet[]
    languages: Facet[]
    regions: Facet[]
  }
  syncedAt: number
  counts: StationCounts
}

export type StationCounts = {
  station: number
  nigeria: number
  africa: number
  english: number
  withGuide: number
}

export type HomeRow = {
  id: string
  title: string
  kicker: string
  href: string
  channels: ListedChannel[]
}

export type HomePayload = {
  syncedAt: number
  counts: StationCounts
  mode: "trending" | "opening"
  hero: ListedChannel
  trending: ListedChannel[]
  returns: ListedChannel[]
  rows: HomeRow[]
}
