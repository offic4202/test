"use client"

import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { viewersLabel } from "@/lib/format"
import type { ListedChannel } from "@/lib/types"
import { cn } from "cn"

export function ChannelCard({
  channel,
  className,
}: {
  channel: ListedChannel
  className?: string
}) {
  const audience = viewersLabel(channel.plays, channel.returns)
  return (
    <Link
      href={`/watch/${encodeURIComponent(channel.id)}`}
      className={cn(
        "group flex w-44 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/50",
        className,
      )}
    >
      <Logo name={channel.name} logo={channel.logo} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 font-medium leading-snug tracking-tight">{channel.name}</p>
        <p className="text-xs text-muted-foreground">
          {channel.flag} {channel.countryName}
          {channel.bestQuality ? ` · ${channel.bestQuality}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap gap-1">
          {channel.languageNames.slice(0, 2).map((language) => (
            <Badge key={language} variant="secondary">
              {language}
            </Badge>
          ))}
        </div>
        {audience ? <p className="text-[11px] text-primary">{audience}</p> : null}
      </div>
    </Link>
  )
}

export function Logo({ name, logo, className }: { name: string; logo: string | null; className?: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  return (
    <div className={cn("flex aspect-video items-center justify-center bg-muted/70 p-4", className)}>
      {logo && !failed ? (
        // Logos come from many hosts in the iptv-org database.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="max-h-full max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-heading text-2xl text-primary">{initials}</span>
      )}
    </div>
  )
}
