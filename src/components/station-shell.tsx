"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "cn"

const links = [
  { href: "/", label: "Dial" },
  { href: "/directory", label: "Directory" },
  { href: "/map", label: "Map" },
]

export function StationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              PS
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
            </span>
            <span>
              <span className="block font-heading text-xl leading-none tracking-tight">Play Station</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lagos desk</span>
            </span>
          </Link>
          <Suspense fallback={<div className="h-10 flex-1 rounded-lg border border-input bg-card" />}>
            <HeaderSearch />
          </Suspense>
          <Suspense fallback={<NavFallback className="hidden md:flex" />}>
            <DesktopNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-10">{children}</main>
      <footer className="mx-auto hidden w-full max-w-6xl items-center justify-between gap-4 px-4 pb-8 text-xs leading-relaxed text-muted-foreground md:flex">
        <p>
          Channels, feeds, and guide names come from the public iptv-org directory. Adult listings are left out. Plays and
          return visits are stored on this server.
        </p>
        <Link href="/desk" className="shrink-0 hover:text-foreground">
          Desk
        </Link>
      </footer>
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </div>
  )
}

function DesktopNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            active(pathname, link.href) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
      <DeskNotes />
    </nav>
  )
}

function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn("px-2 py-3 text-center text-xs text-muted-foreground", active(pathname, link.href) && "text-primary")}
        >
          {link.label}
        </Link>
      ))}
      <DeskNotes compact />
    </nav>
  )
}

function NavFallback({ className }: { className?: string }) {
  return (
    <nav className={cn("items-center gap-1", className)}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground">
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

function HeaderSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get("q") ?? "")
  const timer = useRef<number | null>(null)

  function onChange(next: string) {
    setValue(next)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (window.location.pathname === "/directory") {
        window.dispatchEvent(new CustomEvent("station-search", { detail: next }))
        return
      }
      const search = new URLSearchParams()
      if (next.trim()) search.set("q", next.trim())
      router.push(`/directory?${search.toString()}`)
    }, 200)
  }

  return (
    <form action="/directory" className="flex-1">
      <input
        name="q"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search Channels TV, Hausa, cartoons, Lagos"
        aria-label="Search the station"
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </form>
  )
}

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

function DeskNotes({ compact = false }: { compact?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size={compact ? "sm" : "sm"} className={compact ? "h-auto rounded-none py-3 text-xs" : ""} />
        }
      >
        {compact ? "Notes" : "Desk notes"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">What this station keeps</DialogTitle>
          <DialogDescription>
            A living-room dial for live channels, counted by the people actually watching here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Play Station reads the public iptv-org channel database, stream directory, and guide index. It keeps channels
            with a working link in English, from Nigeria, from other African countries, or in an African language.
          </p>
          <p>
            Trending is not a borrowed chart. A play is counted when a feed actually starts, and a return is counted when
            the same viewer comes back to that channel. Until anyone has watched, the dial opens on an editorial lineup.
          </p>
          <p>
            Some links are geo-blocked or quiet. The player walks to the next link on that channel. Run the container
            behind WireGuard and point Nginx Proxy Manager at it when you put the station on a VPS.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
