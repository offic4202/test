import Link from "next/link"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { audienceOverview } from "@/lib/audience"
import { getCatalog } from "@/lib/catalog"
import { deskOpen, deskPassword, siteDomain } from "@/lib/desk-auth"
import { lagosStamp } from "@/lib/format"

export default function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; synced?: string }>
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening the desk…</p>}>
      <Desk searchParams={searchParams} />
    </Suspense>
  )
}

async function Desk({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; synced?: string }>
}) {
  const query = await searchParams
  const domain = siteDomain()
  const password = deskPassword()

  if (!password) {
    return (
      <section className="mx-auto max-w-lg space-y-4 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Station desk</p>
        <h1 className="font-heading text-4xl tracking-tight">The desk is shut</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Set <span className="text-foreground">DESK_PASSWORD</span> in the environment file on the server, then start
          the container again. The public dial stays open. This page does not.
        </p>
      </section>
    )
  }

  if (!(await deskOpen())) {
    return (
      <section className="mx-auto max-w-lg space-y-5 py-10">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Station desk</p>
        <h1 className="font-heading text-4xl tracking-tight">{domain}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Plays, return visits, and the directory clock for this server. The certificate and the domain stay in Nginx
          Proxy Manager.
        </p>
        {query.denied ? <p className="text-sm text-destructive">That password did not match.</p> : null}
        <form action="/api/desk/login" method="post" className="space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Desk password</span>
            <Input name="password" type="password" autoComplete="current-password" required className="h-10" />
          </label>
          <Button type="submit">Open the desk</Button>
        </form>
      </section>
    )
  }

  const [catalog, traffic] = await Promise.all([getCatalog(), audienceOverview()])
  const nigeria = catalog.channels.filter((channel) => channel.card.nigerian).length
  const africa = catalog.channels.filter((channel) => channel.card.african).length
  const withGuide = catalog.channels.filter((channel) => channel.card.hasGuide).length

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Station desk</p>
          <h1 className="font-heading text-4xl tracking-tight">{domain}</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Traffic on this server is a play when a feed starts, and a return when the same browser comes back to that
            channel. Directory synced {lagosStamp(catalog.syncedAt)}.
            {query.synced ? " The directory was just read again." : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <form action="/api/desk/sync" method="post">
            <Button type="submit" variant="outline">
              Read the directory again
            </Button>
          </form>
          <form action="/api/desk/logout" method="post">
            <Button type="submit" variant="ghost">
              Lock
            </Button>
          </form>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Plays" value={traffic.plays} />
        <Stat label="Returns" value={traffic.returns} />
        <Stat label="Channels watched" value={traffic.watched} />
        <Stat label="On the dial" value={catalog.channels.length} detail={`${nigeria} Nigeria · ${africa} Africa · ${withGuide} with a guide name`} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-2xl">What people came for</h2>
          <p className="text-sm text-muted-foreground">Browsers are counted per channel, on this server only.</p>
        </div>
        {traffic.top.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No plays yet. When someone starts a feed, it lands here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">Plays</th>
                  <th className="px-4 py-2 font-medium">Returns</th>
                  <th className="px-4 py-2 font-medium">Browsers</th>
                  <th className="px-4 py-2 font-medium">Last play</th>
                </tr>
              </thead>
              <tbody>
                {traffic.top.map((row) => {
                  const channel = catalog.byId.get(row.id)
                  return (
                    <tr key={row.id} className="border-t border-border/80">
                      <td className="px-4 py-3">
                        <Link href={`/watch/${row.id}`} className="font-medium hover:underline">
                          {channel?.card.name ?? row.id}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {channel ? `${channel.card.flag} ${channel.card.countryName}` : row.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.plays}</td>
                      <td className="px-4 py-3 tabular-nums">{row.returns}</td>
                      <td className="px-4 py-3 tabular-nums">{row.browsers}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.lastPlayed ? lagosStamp(row.lastPlayed) : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function Stat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-4xl tabular-nums">{value.toLocaleString("en-GB")}</p>
      {detail ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
