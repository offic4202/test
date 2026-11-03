import { fetchPublic, readTicket, rewritePlaylist } from "@/lib/relay"

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") || ""
  const ticket = await readTicket(token)
  if (!ticket) return Response.json({ error: "This link has expired." }, { status: 403 })

  const headers = new Headers()
  headers.set("user-agent", ticket.a || "Mozilla/5.0 (compatible; PlayStation/1.0)")
  if (ticket.r) headers.set("referer", ticket.r)
  const range = request.headers.get("range")
  if (range) headers.set("range", range)

  try {
    const { response, url } = await fetchPublic(ticket.u, { headers, signal: request.signal })
    const type = response.headers.get("content-type") || ""
    const playlist = /mpegurl|m3u8/i.test(type) || url.includes(".m3u8")
    if (playlist && !range) {
      const text = await response.text()
      if (text.includes("#EXTM3U")) {
        const rewritten = await rewritePlaylist(text, url, ticket.r, ticket.a)
        return new Response(rewritten, {
          status: response.status,
          headers: {
            "content-type": "application/vnd.apple.mpegurl",
            "cache-control": "no-store",
            "x-accel-buffering": "no",
          },
        })
      }
    }
    const out = new Headers()
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const value = response.headers.get(name)
      if (value) out.set(name, value)
    }
    out.set("cache-control", "no-store")
    out.set("x-accel-buffering", "no")
    return new Response(response.body, { status: response.status, headers: out })
  } catch {
    return Response.json({ error: "The segment did not answer." }, { status: 502 })
  }
}
