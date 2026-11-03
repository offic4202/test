import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ChannelCard } from "@/components/channel-card"
import { GuidePanel } from "@/components/guide-panel"
import { Player } from "@/components/player"
import { WatchSkeleton } from "@/components/skeletons"
import { Badge } from "@/components/ui/badge"
import { viewersLabel } from "@/lib/format"
import { getChannel } from "@/lib/queries"

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WatchSkeleton />}>
      <WatchBody params={params} />
    </Suspense>
  )
}

async function WatchBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const channel = await getChannel(id)
  if (!channel) notFound()
  const audience = viewersLabel(channel.plays, channel.returns)
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/directory" className="text-xs uppercase tracking-[0.16em] text-primary">
            Back to the directory
          </Link>
          <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">{channel.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {channel.flag} {channel.countryName}
            {channel.network ? ` · ${channel.network}` : ""}
            {channel.languageNames.length ? ` · ${channel.languageNames.join(", ")}` : ""}
          </p>
        </div>
        {audience ? <Badge>{audience}</Badge> : <Badge variant="outline">No plays yet</Badge>}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_320px]">
        <Player channelId={channel.id} streams={channel.streams} />
        <GuidePanel channelId={channel.id} listings={channel.guides} />
      </div>
      <div className="flex flex-wrap gap-2">
        {channel.categoryNames.map((category) => (
          <Badge key={category} variant="secondary">
            {category}
          </Badge>
        ))}
        {channel.altNames.slice(0, 4).map((name) => (
          <Badge key={name} variant="outline">
            {name}
          </Badge>
        ))}
      </div>
      {channel.website ? (
        <p className="text-sm">
          <a href={channel.website} className="text-primary hover:underline" rel="noreferrer" target="_blank">
            Broadcaster site
          </a>
        </p>
      ) : null}
      {channel.related.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-3xl">Nearby on the dial</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {channel.related.map((item) => (
              <ChannelCard key={item.id} channel={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
