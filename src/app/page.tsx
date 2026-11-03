import { Suspense } from "react"

import { HomeDial } from "@/components/home-dial"
import { HomeSkeleton } from "@/components/skeletons"

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeDial />
    </Suspense>
  )
}
