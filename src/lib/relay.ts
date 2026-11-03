import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { lookup } from "node:dns/promises"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import net from "node:net"
import path from "node:path"

import { dataDir } from "@/lib/paths"

type RelayTicket = {
  u: string
  r: string | null
  a: string | null
  e: number
}

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000
const hostCache = new Map<string, { ok: boolean; at: number }>()

let secretPromise: Promise<string> | null = null

async function secret() {
  if (process.env.STATION_SECRET) return process.env.STATION_SECRET
  if (!secretPromise) {
    secretPromise = (async () => {
      const file = path.join(dataDir(), "secret")
      try {
        const existing = (await readFile(file, "utf8")).trim()
        if (existing) return existing
      } catch {
        /* first boot */
      }
      const created = randomBytes(32).toString("hex")
      await mkdir(dataDir(), { recursive: true })
      await writeFile(file, created, { mode: 0o600 })
      return created
    })()
  }
  return secretPromise
}

export async function signTicket(url: string, referrer: string | null, userAgent: string | null) {
  const body = Buffer.from(
    JSON.stringify({ u: url, r: referrer, a: userAgent, e: Date.now() + TOKEN_TTL_MS } satisfies RelayTicket),
  ).toString("base64url")
  const sig = createHmac("sha256", await secret()).update(body).digest("base64url")
  return `${body}.${sig}`
}

export async function readTicket(token: string): Promise<RelayTicket | null> {
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = createHmac("sha256", await secret()).update(body).digest("base64url")
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const ticket = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RelayTicket
    if (!ticket.u || ticket.e < Date.now()) return null
    const url = new URL(ticket.u)
    if (!(await isPublicHttpUrl(url))) return null
    return ticket
  } catch {
    return null
  }
}

export async function relayPath(url: string, referrer: string | null, userAgent: string | null) {
  const token = await signTicket(url, referrer, userAgent)
  return `/api/relay?t=${token}`
}

export function rewritePlaylist(text: string, baseUrl: string, referrer: string | null, userAgent: string | null) {
  const lines = text.split(/\r?\n/)
  return Promise.all(
    lines.map(async (line) => {
      if (line.startsWith("#")) {
        const pieces = line.split(/URI="([^"]*)"/g)
        if (pieces.length === 1) return line
        let next = ""
        for (let i = 0; i < pieces.length; i++) {
          if (i % 2 === 0) next += pieces[i]
          else {
            const absolute = await absolutePublic(pieces[i], baseUrl)
            next += absolute ? `URI="${await relayPath(absolute, referrer, userAgent)}"` : `URI=""`
          }
        }
        return next
      }
      const trimmed = line.trim()
      if (!trimmed) return line
      const absolute = await absolutePublic(trimmed, baseUrl)
      return absolute ? relayPath(absolute, referrer, userAgent) : ""
    }),
  ).then((rows) => rows.join("\n"))
}

async function absolutePublic(raw: string, baseUrl: string) {
  try {
    const url = new URL(raw, baseUrl)
    if (!(await isPublicHttpUrl(url))) return null
    return url.toString()
  } catch {
    return null
  }
}

export async function isPublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  if (url.username || url.password) return false
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false
  }
  if (/^\d+$/.test(host)) return false
  if (host === "metadata.google.internal") return false
  if (net.isIP(host)) return !isPrivateIp(host)
  const cached = hostCache.get(host)
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.ok
  try {
    const looked = await lookup(host, { all: true, verbatim: true })
    const ok = looked.length > 0 && looked.every((entry) => !isPrivateIp(entry.address))
    hostCache.set(host, { ok, at: Date.now() })
    return ok
  } catch {
    hostCache.set(host, { ok: false, at: Date.now() })
    return false
  }
}

function isPrivateIp(ip: string) {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }
  const value = ip.toLowerCase()
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80")
}

export async function fetchPublic(url: string, init: RequestInit & { headers?: Headers }) {
  const current = new URL(url)
  for (let hop = 0; hop < 4; hop++) {
    if (!(await isPublicHttpUrl(current))) throw new Error("blocked")
    const response = await fetch(current, { ...init, redirect: "manual" })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) throw new Error("redirect")
      current.href = new URL(location, current).toString()
      continue
    }
    return { response, url: current.toString() }
  }
  throw new Error("redirects")
}
