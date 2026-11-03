import { getCatalog } from "@/lib/catalog"
import { fetchPublic, rewritePlaylist } from "@/lib/relay"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const index = Number(new URL(request.url).searchParams.get("n") || "0")
  const catalog = await getCatalog()
  const channel = catalog.byId.get(id)
  const stream = channel?.streams[index]
  if (!channel || !stream) {
    return Response.json({ error: "No stream at that position." }, { status: 404 })
  }

  const headers = new Headers()
  headers.set("user-agent", stream.userAgent || "Mozilla/5.0 (compatible; PlayStation/1.0)")
  if (stream.referrer) headers.set("referer", stream.referrer)

  try {
    const { response, url } = await fetchPublic(stream.url, {
      headers,
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) {
      return Response.json({ error: `Upstream answered ${response.status}` }, { status: 502 })
    }
    const type = response.headers.get("content-type") || ""
    const looksPlaylist = /mpegurl|m3u8/i.test(type) || url.includes(".m3u8") || url.includes(".m3u")
    if (!looksPlaylist) {
      return pipeMedia(response)
    }
    const text = await response.text()
    if (!text.includes("#EXTM3U") && !looksPlaylist) return pipeMedia(response)
    const rewritten = await rewritePlaylist(text, url, stream.referrer, stream.userAgent)
    return new Response(rewritten, {
      headers: playlistHeaders(),
    })
  } catch {
    return Response.json({ error: "The stream did not answer." }, { status: 502 })
  }
}

function playlistHeaders() {
  return {
    "content-type": "application/vnd.apple.mpegurl",
    "cache-control": "no-store",
    "x-accel-buffering": "no",
  }
}

function pipeMedia(response: Response) {
  const headers = new Headers()
  const type = response.headers.get("content-type")
  if (type) headers.set("content-type", type)
  headers.set("cache-control", "no-store")
  headers.set("x-accel-buffering", "no")
  return new Response(response.body, { status: response.status, headers })
}
