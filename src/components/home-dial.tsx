import Link from "next/link"

import { ChannelCard, Logo } from "@/components/channel-card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { lagosStamp, viewersLabel } from "@/lib/format"
import { getHome } from "@/lib/queries"

export async function HomeDial() {
  const home = await getHome()
  const audience = viewersLabel(home.hero.plays, home.hero.returns)
  return (
    <div className="space-y-10">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_280px]">
        <article className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
            <Logo name={home.hero.name} logo={home.hero.logo} className="aspect-auto min-h-48 md:min-h-full" />
            <div className="flex flex-col gap-4 p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
                {home.mode === "trending" ? "Most watched on this station" : "Opening lineup"}
              </p>
              <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl">{home.hero.name}</h1>
              <p className="text-sm text-muted-foreground">
                {home.hero.flag} {home.hero.countryName}
                {home.hero.languageNames.length ? ` · ${home.hero.languageNames.slice(0, 3).join(", ")}` : ""}
                {home.hero.bestQuality ? ` · ${home.hero.bestQuality}` : ""}
                {` · ${home.hero.streamCount} ${home.hero.streamCount === 1 ? "link" : "links"}`}
              </p>
              <div className="flex flex-wrap gap-2">
                {home.hero.categoryNames.slice(0, 3).map((category) => (
                  <Badge key={category} variant="outline">
                    {category}
                  </Badge>
                ))}
                {audience ? <Badge>{audience}</Badge> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href={`/watch/${encodeURIComponent(home.hero.id)}`} className={buttonVariants({ size: "lg" })}>
                  Play channel
                </Link>
                <Link href="/directory?scope=nigeria" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Nigeria desk
                </Link>
              </div>
            </div>
          </div>
        </article>
        <aside className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat label="On the station" value={home.counts.station} />
          <Stat label="Nigeria" value={home.counts.nigeria} />
          <Stat label="Africa" value={home.counts.africa} />
          <Stat label="English" value={home.counts.english} />
          <p className="col-span-2 text-xs text-muted-foreground lg:col-span-1">
            Directory synced {lagosStamp(home.syncedAt)}. {home.counts.withGuide} channels are named in a program guide.
          </p>
        </aside>
      </section>

      <Shelf
        title={home.mode === "trending" ? "Trending" : "First on the dial"}
        kicker={
          home.mode === "trending"
            ? "Ranked by plays, with return visits counted heavier."
            : "No audience yet. These are the strongest Nigerian, African, and English links."
        }
        href="/directory?sort=trending"
        channels={home.trending}
      />

      {home.returns.length > 0 ? (
        <Shelf
          title="Coming back"
          kicker="Channels people on this station opened again."
          href="/directory?sort=returns"
          channels={home.returns}
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground">
          Coming back stays empty until a viewer returns to a channel they already played.
        </section>
      )}

      {home.rows.map((row) => (
        <Shelf key={row.id} title={row.title} kicker={row.kicker} href={row.href} channels={row.channels} />
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="font-heading text-3xl">{value.toLocaleString("en-GB")}</p>
    </div>
  )
}

function Shelf({
  title,
  kicker,
  href,
  channels,
}: {
  title: string
  kicker: string
  href: string
  channels: React.ComponentProps<typeof ChannelCard>["channel"][]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{kicker}</p>
        </div>
        <Link href={href} className="shrink-0 text-sm text-primary hover:underline">
          Open
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </section>
  )
}
