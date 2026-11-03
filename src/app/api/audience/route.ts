import { recordPlay } from "@/lib/audience"
import { getCatalog } from "@/lib/catalog"

export async function POST(request: Request) {
  let body: { channelId?: string; viewerId?: string }
  try {
    body = (await request.json()) as { channelId?: string; viewerId?: string }
  } catch {
    return Response.json({ error: "Send a channel and a viewer id." }, { status: 400 })
  }
  const channelId = body.channelId || ""
  const viewerId = body.viewerId || ""
  if (!/^[A-Za-z0-9._:-]{8,80}$/.test(viewerId)) {
    return Response.json({ error: "Viewer id is not usable." }, { status: 400 })
  }
  const catalog = await getCatalog()
  if (!catalog.byId.has(channelId)) {
    return Response.json({ error: "That channel is not on this station." }, { status: 404 })
  }
  const stats = await recordPlay(channelId, viewerId)
  return Response.json(stats)
}
