"use client"

import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="text-[11px] uppercase tracking-[0.18em] text-destructive">Directory trouble</p>
      <h1 className="mt-2 font-heading text-4xl">The station could not open the directory.</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message || "The iptv-org files did not load."}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
