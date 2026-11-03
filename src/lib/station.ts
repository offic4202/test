import type { ShelfId } from "@/lib/types"

export const AFRICAN_COUNTRIES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG",
  "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN",
  "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ",
  "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
  "TZ", "TG", "TN", "UG", "ZM", "ZW",
])

/** Languages spoken across the continent, aside from English. */
export const AFRICAN_LANGUAGES = new Set([
  "hau", "yor", "ibo", "pcm", "swa", "afr", "zul", "xho", "amh", "som",
  "aka", "ewe", "ful", "wol", "kin", "lin", "sna", "nya", "lug", "bem",
  "tiv", "efi", "ibb", "orm", "tir", "mlg", "tsn", "tso", "ssw", "ven",
  "nso", "ndo", "kik", "luo", "mos", "bam", "dyu", "kab", "zgh", "sot",
  "run", "kon", "sag", "her", "nbl", "bin", "kby", "fuv", "kau",
])

/**
 * Used only when a feed has no language tag. African countries are already
 * included by country, so this list catches English-language channels whose
 * feed record never named a language.
 */
export const ENGLISH_FALLBACK_COUNTRIES = new Set([
  "US", "GB", "IE", "AU", "NZ", "CA", "JM", "TT", "BB", "BS", "GY", "BZ",
  "MT", "AG", "DM", "GD", "KN", "LC", "VC",
])

export const REGIONS: { id: string; name: string; countries: string[] }[] = [
  {
    id: "west",
    name: "West Africa",
    countries: ["BJ", "BF", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "ML", "MR", "NE", "NG", "SN", "SL", "TG"],
  },
  {
    id: "east",
    name: "East Africa",
    countries: ["BI", "KM", "DJ", "ER", "ET", "KE", "MG", "MU", "RW", "SC", "SO", "SS", "TZ", "UG"],
  },
  {
    id: "central",
    name: "Central Africa",
    countries: ["AO", "CM", "CF", "TD", "CG", "CD", "GQ", "GA", "ST"],
  },
  {
    id: "north",
    name: "North Africa",
    countries: ["DZ", "EG", "LY", "MA", "SD", "TN"],
  },
  {
    id: "south",
    name: "Southern Africa",
    countries: ["BW", "SZ", "LS", "MW", "MZ", "NA", "ZA", "ZM", "ZW"],
  },
]

const regionByCountry = new Map<string, string>()
for (const region of REGIONS) {
  for (const code of region.countries) regionByCountry.set(code, region.id)
}

export function regionFor(country: string): string | null {
  return regionByCountry.get(country) ?? null
}

export function regionName(id: string): string {
  return REGIONS.find((region) => region.id === id)?.name ?? id
}

type ShelfRule = {
  id: ShelfId
  name: string
  kicker: string
  categories: string[]
  place?: "local" | "foreign"
}

export const SHELVES: ShelfRule[] = [
  { id: "cartoon", name: "Cartoon", kicker: "Animation, kids, and family", categories: ["animation", "kids", "family"] },
  { id: "music", name: "Music", kicker: "Music desks with a live link", categories: ["music"] },
  { id: "local-movies", name: "Local pictures", kicker: "Movie and series channels from African countries", categories: ["movies", "series"], place: "local" },
  { id: "foreign-movies", name: "Foreign pictures", kicker: "Movie and series channels from outside Africa", categories: ["movies", "series"], place: "foreign" },
  { id: "news", name: "News", kicker: "News desks", categories: ["news"] },
  { id: "sports", name: "Sports", kicker: "Sport on the dial", categories: ["sports"] },
  { id: "religious", name: "Faith", kicker: "Religious channels", categories: ["religious"] },
  { id: "education", name: "Learning", kicker: "Education, science, and documentary", categories: ["education", "science", "documentary"] },
  { id: "entertainment", name: "Entertainment", kicker: "Comedy and entertainment", categories: ["entertainment", "comedy"] },
  { id: "lifestyle", name: "Lifestyle", kicker: "Culture, food, and travel", categories: ["lifestyle", "cooking", "travel", "culture"] },
  { id: "business", name: "Business", kicker: "Business, shop, and public affairs", categories: ["business", "shop", "legislative", "public"] },
]

export function shelfName(id: string): string {
  return SHELVES.find((shelf) => shelf.id === id)?.name ?? id
}

export function shelvesFor(categories: string[], african: boolean): ShelfId[] {
  const set = new Set(categories)
  const shelves: ShelfId[] = []
  for (const shelf of SHELVES) {
    if (!shelf.categories.some((category) => set.has(category))) continue
    if (shelf.place === "local" && !african) continue
    if (shelf.place === "foreign" && african) continue
    shelves.push(shelf.id)
  }
  return shelves
}

export function qualityRank(quality: string | null): number {
  if (!quality) return 0
  const match = quality.match(/(\d{3,4})/)
  if (!match) return 1
  return Number(match[1])
}

export const LANGUAGE_SPOTLIGHTS = [
  { code: "hau", name: "Hausa" },
  { code: "yor", name: "Yoruba" },
  { code: "ibo", name: "Igbo" },
  { code: "pcm", name: "Nigerian Pidgin" },
  { code: "swa", name: "Swahili" },
  { code: "afr", name: "Afrikaans" },
  { code: "amh", name: "Amharic" },
  { code: "zul", name: "Zulu" },
] as const

export const SCOPES: { id: "station" | "nigeria" | "africa" | "english"; name: string }[] = [
  { id: "station", name: "Entire station" },
  { id: "nigeria", name: "Nigeria" },
  { id: "africa", name: "Africa" },
  { id: "english", name: "English" },
]
