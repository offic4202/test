import { createHmac, timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"

const COOKIE = "ps_desk"
const WEEK_MS = 14 * 24 * 60 * 60 * 1000

export function deskPassword() {
  return process.env.DESK_PASSWORD?.trim() ?? ""
}

export function siteDomain() {
  return process.env.SITE_DOMAIN?.trim() || "playstation.9ja.space"
}

export function publicOrigin(request: Request) {
  const url = new URL(request.url)
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || url.host
  const proto = forwarded || url.protocol.replace(":", "")
  return `${proto}://${host}`
}

function sameText(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function sign(exp: number, password: string) {
  const body = String(exp)
  const sig = createHmac("sha256", password).update(body).digest("base64url")
  return `${body}.${sig}`
}

export async function deskOpen() {
  const password = deskPassword()
  if (!password) return false
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return false
  const [body, sig] = raw.split(".")
  if (!body || !sig) return false
  const exp = Number(body)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const expected = sign(exp, password).split(".")[1]
  return sameText(sig, expected)
}

export function deskCookie(password: string, secure: boolean) {
  const exp = Date.now() + WEEK_MS
  return {
    name: COOKIE,
    value: sign(exp, password),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
      path: "/",
      maxAge: Math.floor(WEEK_MS / 1000),
    },
  }
}

export function passwordsMatch(given: string, expected: string) {
  return sameText(given, expected)
}
