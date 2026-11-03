import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { dataDir } from "@/lib/paths"

export type AudienceRecord = {
  plays: number
  returns: number
  lastPlayed: number
  viewers: Record<string, number>
}

type AudienceFile = {
  channels: Record<string, AudienceRecord>
}

const empty = (): AudienceFile => ({ channels: {} })

let cache: AudienceFile | null = null
let queue: Promise<unknown> = Promise.resolve()

function filePath() {
  return path.join(dataDir(), "audience.json")
}

async function readAudience(): Promise<AudienceFile> {
  if (cache) return cache
  try {
    const parsed = JSON.parse(await readFile(filePath(), "utf8")) as AudienceFile
    cache = parsed?.channels ? parsed : empty()
  } catch {
    cache = empty()
  }
  return cache
}

function locked<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function statsFor(ids: string[]): Promise<Map<string, { plays: number; returns: number }>> {
  const audience = await readAudience()
  const map = new Map<string, { plays: number; returns: number }>()
  for (const id of ids) {
    const row = audience.channels[id]
    map.set(id, { plays: row?.plays ?? 0, returns: row?.returns ?? 0 })
  }
  return map
}

export type AudienceChannel = {
  id: string
  plays: number
  returns: number
  browsers: number
  lastPlayed: number
}

export async function audienceOverview(): Promise<{
  plays: number
  returns: number
  watched: number
  top: AudienceChannel[]
}> {
  const audience = await readAudience()
  let plays = 0
  let returns = 0
  const top: AudienceChannel[] = []
  for (const [id, row] of Object.entries(audience.channels)) {
    const channelPlays = row.plays ?? 0
    const channelReturns = row.returns ?? 0
    if (!channelPlays && !channelReturns) continue
    plays += channelPlays
    returns += channelReturns
    top.push({
      id,
      plays: channelPlays,
      returns: channelReturns,
      browsers: Object.keys(row.viewers ?? {}).length,
      lastPlayed: row.lastPlayed ?? 0,
    })
  }
  top.sort((a, b) => b.plays + b.returns * 1.6 - (a.plays + a.returns * 1.6))
  return { plays, returns, watched: top.length, top: top.slice(0, 20) }
}

export async function allStats(): Promise<Map<string, { plays: number; returns: number }>> {
  const audience = await readAudience()
  const map = new Map<string, { plays: number; returns: number }>()
  for (const [id, row] of Object.entries(audience.channels)) {
    map.set(id, { plays: row.plays ?? 0, returns: row.returns ?? 0 })
  }
  return map
}

export async function recordPlay(channelId: string, viewerId: string): Promise<{ plays: number; returns: number }> {
  return locked(async () => {
    const audience = await readAudience()
    const row = audience.channels[channelId] ?? {
      plays: 0,
      returns: 0,
      lastPlayed: 0,
      viewers: {},
    }
    const seen = row.viewers[viewerId] ?? 0
    row.plays += 1
    if (seen > 0) row.returns += 1
    row.viewers[viewerId] = seen + 1
    row.lastPlayed = Date.now()
    const ids = Object.keys(row.viewers)
    if (ids.length > 500) {
      for (const id of ids.slice(0, ids.length - 500)) delete row.viewers[id]
    }
    audience.channels[channelId] = row
    cache = audience
    await mkdir(dataDir(), { recursive: true })
    await writeFile(filePath(), JSON.stringify(audience))
    return { plays: row.plays, returns: row.returns }
  })
}
