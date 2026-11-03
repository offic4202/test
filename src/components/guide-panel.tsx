"use client"

import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { lagosClock } from "@/lib/format"
import type { GuideListing, ProgramSlot } from "@/lib/types"

export function GuidePanel({ channelId, listings }: { channelId: string; listings: GuideListing[] }) {
  const [programs, setPrograms] = useState<ProgramSlot[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/guide/${encodeURIComponent(channelId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The guide did not answer.")
        return (await response.json()) as { programs: ProgramSlot[] }
      })
      .then((body) => setPrograms(body.programs))
      .catch((reason: Error) => {
        if (reason.name === "AbortError") return
        setError("The guide did not answer.")
        setPrograms([])
      })
    return () => controller.abort()
  }, [channelId])

  return (
    <aside className="rounded-3xl border border-border bg-card p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Program guide</p>
      <h2 className="mt-1 font-heading text-2xl">Now and next</h2>
      {programs === null ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-muted-foreground">{error}</p> : null}
      {programs && programs.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {programs.map((program, index) => (
            <li key={`${program.start}-${program.title}-${index}`} className="border-t border-border pt-3 first:border-0 first:pt-0">
              <p className="text-xs text-primary">
                {lagosClock(program.start)}
                {program.stop ? ` – ${lagosClock(program.stop)} WAT` : " WAT"}
                {index === 0 ? " · on now" : ""}
              </p>
              <p className="font-medium">{program.title}</p>
              {program.description ? <p className="text-sm text-muted-foreground">{program.description}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {programs && programs.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {listings.length
            ? "The guide index names this channel, but iptv-org has not published a schedule file for it."
            : "This channel has no guide entry in the iptv-org index."}
        </p>
      ) : null}
      {listings.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {listings.slice(0, 6).map((listing) => (
            <li key={`${listing.site}-${listing.siteName}-${listing.feed}`}>
              Named in {listing.siteName}
              {listing.lang ? ` · ${listing.lang}` : ""}
              <span className="block text-xs">{listing.site}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  )
}
