"use client"

import { useEffect, useState } from "react"

import { Logo } from "@/components/channel-card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { viewersLabel } from "@/lib/format"
import { SCOPES } from "@/lib/station"
import type { DirectoryResult } from "@/lib/types"
import { cn } from "cn"

type Query = {
  q: string
  shelf: string
  country: string
  language: string
  region: string
  scope: string
  sort: string
  page: string
}

export function DirectoryView({ initial, first }: { initial: Query; first: DirectoryResult }) {
  const [params, setParams] = useState(initial)
  const [draft, setDraft] = useState(initial.q)
  const [data, setData] = useState(first)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onSearch(event: Event) {
      setDraft((event as CustomEvent<string>).detail)
    }
    window.addEventListener("station-search", onSearch)
    return () => window.removeEventListener("station-search", onSearch)
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setParams((current) => (current.q === draft ? current : { ...current, q: draft, page: "1" }))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [draft])

  useEffect(() => {
    const same =
      params.q === initial.q &&
      params.shelf === initial.shelf &&
      params.country === initial.country &&
      params.language === initial.language &&
      params.region === initial.region &&
      params.scope === initial.scope &&
      params.sort === initial.sort &&
      params.page === initial.page
    if (same) return
    const search = toSearch(params)
    const url = search ? `/directory?${search}` : "/directory"
    window.history.replaceState(null, "", url)
    const controller = new AbortController()
    const showLoading = window.setTimeout(() => {
      setLoading(true)
      setError(null)
    }, 0)
    fetch(`/api/directory?${search}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The directory did not answer.")
        return (await response.json()) as DirectoryResult
      })
      .then((body) => {
        setData(body)
        setLoading(false)
      })
      .catch((reason: Error) => {
        if (reason.name === "AbortError") return
        setError(reason.message)
        setLoading(false)
      })
    return () => {
      window.clearTimeout(showLoading)
      controller.abort()
    }
  }, [params, initial])

  function update(patch: Partial<Query>) {
    setParams((current) => ({ ...current, page: "1", ...patch }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Search directory</p>
          <h1 className="font-heading text-4xl tracking-tight">Find a channel</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Searching…" : `${data.total.toLocaleString("en-GB")} ${data.total === 1 ? "channel" : "channels"}`} in{" "}
            {SCOPES.find((scope) => scope.id === params.scope)?.name ?? "the station"}.
          </p>
        </div>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>Filters</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow the station by place, language, and shelf.</SheetDescription>
            </SheetHeader>
            <Filters params={params} data={data} draft={draft} onDraft={setDraft} onChange={update} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <Filters params={params} data={data} draft={draft} onDraft={setDraft} onChange={update} />
        </div>
        <div className="space-y-3">
          {error ? (
            <div className="rounded-2xl border border-destructive/40 bg-card p-4 text-sm">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => setParams({ ...params })}>
                Try again
              </Button>
            </div>
          ) : null}
          {!error && data.channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Nothing in this cut of the directory. Clear a filter or try another language.
            </div>
          ) : null}
          <ul className="space-y-2">
            {data.channels.map((channel) => {
              const audience = viewersLabel(channel.plays, channel.returns)
              return (
                <li key={channel.id}>
                  <a
                    href={`/watch/${encodeURIComponent(channel.id)}`}
                    className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border bg-card p-2 transition hover:border-primary/40"
                  >
                    <Logo name={channel.name} logo={channel.logo} className="aspect-video rounded-xl" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{channel.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {channel.flag} {channel.countryName}
                        {channel.languageNames.length ? ` · ${channel.languageNames.slice(0, 2).join(", ")}` : ""}
                        {channel.bestQuality ? ` · ${channel.bestQuality}` : ""}
                        {` · ${channel.streamCount} ${channel.streamCount === 1 ? "link" : "links"}`}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {channel.categoryNames.slice(0, 2).join(" · ") || "Uncategorised"}
                        {audience ? ` · ${audience}` : ""}
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              disabled={data.page <= 1 || loading}
              onClick={() => update({ page: String(data.page - 1) })}
            >
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.pages}
            </p>
            <Button
              variant="outline"
              disabled={data.page >= data.pages || loading}
              onClick={() => setParams({ ...params, page: String(data.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Filters({
  params,
  data,
  draft,
  onDraft,
  onChange,
}: {
  params: Query
  data: DirectoryResult
  draft: string
  onDraft: (value: string) => void
  onChange: (patch: Partial<Query>) => void
}) {
  return (
    <div className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Search</span>
        <input
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          placeholder="Name, country, language"
          aria-label="Filter the directory"
          className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {SCOPES.map((scope) => (
          <Button
            key={scope.id}
            size="sm"
            variant={params.scope === scope.id ? "default" : "outline"}
            onClick={() => onChange({ scope: scope.id })}
          >
            {scope.name}
          </Button>
        ))}
      </div>
      <Select
        label="Sort"
        value={params.sort || "trending"}
        onChange={(sort) => onChange({ sort })}
        options={[
          ["trending", "Trending"],
          ["returns", "Returns"],
          ["relevance", "Relevance"],
          ["name", "Name"],
        ]}
      />
      <ChipSet
        label="Shelf"
        value={params.shelf}
        onChange={(shelf) => onChange({ shelf })}
        options={data.facets.shelves.map((facet) => [facet.id, `${facet.name} (${facet.count})`] as [string, string])}
      />
      <Select
        label="Country"
        value={params.country}
        onChange={(country) => onChange({ country })}
        options={[[ "", "Any country" ], ...data.facets.countries.map((facet) => [facet.id, `${facet.flag ?? ""} ${facet.name} (${facet.count})`] as [string, string])]}
      />
      <Select
        label="Language"
        value={params.language}
        onChange={(language) => onChange({ language })}
        options={[[ "", "Any language" ], ...data.facets.languages.map((facet) => [facet.id, `${facet.name} (${facet.count})`] as [string, string])]}
      />
      <Select
        label="Region"
        value={params.region}
        onChange={(region) => onChange({ region })}
        options={[[ "", "Any region" ], ...data.facets.regions.map((facet) => [facet.id, `${facet.name} (${facet.count})`] as [string, string])]}
      />
      <Button
        variant="ghost"
        onClick={() => {
          onDraft("")
          onChange({ q: "", shelf: "", country: "", language: "", region: "", scope: "station", sort: "trending", page: "1" })
        }}
      >
        Clear filters
      </Button>
    </div>
  )
}

function ChipSet({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn("rounded-full border px-2.5 py-1 text-xs", !value ? "border-primary bg-primary text-primary-foreground" : "border-border")}
          onClick={() => onChange("")}
        >
          Any
        </button>
        {options.map(([id, name]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs",
              value === id ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
            onClick={() => onChange(id)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm"
      >
        {options.map(([id, name]) => (
          <option key={id || "any"} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}

function toSearch(params: Query) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (!value || (key === "scope" && value === "station") || (key === "sort" && value === "trending" && !params.q) || (key === "page" && value === "1")) {
      continue
    }
    search.set(key, value)
  }
  return search.toString()
}
