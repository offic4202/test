import { getCatalog } from "@/lib/catalog"
import { programsFor } from "@/lib/guide"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const catalog = await getCatalog()
  const channel = catalog.byId.get(id)
  if (!channel) return Response.json({ error: "Unknown channel" }, { status: 404 })
  const programs = await programsFor(id)
  return Response.json({
    programs,
    listings: channel.guides.map(({ site, siteName, lang, feed }) => ({ site, siteName, lang, feed })),
  })
}
