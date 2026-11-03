import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Off the dial</p>
      <h1 className="mt-2 font-heading text-4xl">That channel is not on this station.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        It may have closed, lost its stream, or never matched the English, Nigerian, and African cut.
      </p>
      <Link href="/directory" className={cn(buttonVariants(), "mt-6")}>
        Search the directory
      </Link>
    </div>
  )
}
