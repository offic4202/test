import { searchDirectory } from "@/lib/queries"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const result = await searchDirectory({
    q: url.searchParams.get("q") ?? "",
    shelf: url.searchParams.get("shelf") ?? "",
    country: url.searchParams.get("country") ?? "",
    language: url.searchParams.get("language") ?? "",
    region: url.searchParams.get("region") ?? "",
    scope: url.searchParams.get("scope") ?? "",
    sort: url.searchParams.get("sort") ?? "",
    page: url.searchParams.get("page") ?? "1",
  })
  return Response.json(result)
}
