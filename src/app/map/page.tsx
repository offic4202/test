import Link from "next/link"
import { Suspense } from "react"

import { DirectorySkeleton } from "@/components/skeletons"
import { getMap } from "@/lib/queries"

export default function MapPage() {
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <MapBody />
    </Suspense>
  )
}

async function MapBody() {
  const map = await getMap()
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Geographic channels</p>
        <h1 className="font-heading text-4xl tracking-tight">Where the dial reaches</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {map.counts.africa.toLocaleString("en-GB")} African channels and {map.counts.nigeria.toLocaleString("en-GB")} from
          Nigeria, grouped by region. English-language channels from outside the continent sit under the last row.
        </p>
      </div>
      {map.regions.map((region) => (
        <section key={region.id} className="space-y-3">
          <h2 className="font-heading text-3xl">{region.name}</h2>
          {region.countries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No live link from this region in the current directory.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {region.countries.map((country) => (
                <Link
                  key={country.code}
                  href={`/directory?country=${country.code}&scope=africa`}
                  className="rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/50"
                >
                  <p className="text-lg">
                    {country.flag} {country.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {country.count} {country.count === 1 ? "channel" : "channels"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
      {map.elsewhere.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-3xl">English beyond Africa</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {map.elsewhere.map((country) => (
              <Link
                key={country.code}
                href={`/directory?country=${country.code}&scope=english`}
                className="rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/50"
              >
                <p className="text-lg">
                  {country.flag} {country.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {country.count} {country.count === 1 ? "channel" : "channels"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
