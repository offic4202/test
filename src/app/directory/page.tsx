import { Suspense } from "react"

import { DirectoryView } from "@/components/directory-view"
import { DirectorySkeleton } from "@/components/skeletons"
import { searchDirectory } from "@/lib/queries"

export default function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <DirectoryGate searchParams={searchParams} />
    </Suspense>
  )
}

async function DirectoryGate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const initial = {
    q: one(raw.q),
    shelf: one(raw.shelf),
    country: one(raw.country).toUpperCase(),
    language: one(raw.language).toLowerCase(),
    region: one(raw.region),
    scope: one(raw.scope) || "station",
    sort: one(raw.sort) || (one(raw.q) ? "relevance" : "trending"),
    page: one(raw.page) || "1",
  }
  const first = await searchDirectory(initial)
  return <DirectoryView key={JSON.stringify(initial)} initial={initial} first={first} />
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || ""
}
