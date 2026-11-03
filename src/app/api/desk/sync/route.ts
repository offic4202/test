import { NextResponse } from "next/server"

import { reloadCatalog } from "@/lib/catalog"
import { deskOpen, publicOrigin } from "@/lib/desk-auth"

export async function POST(request: Request) {
  const origin = publicOrigin(request)
  if (!(await deskOpen())) {
    return NextResponse.redirect(`${origin}/desk`, 303)
  }
  await reloadCatalog()
  return NextResponse.redirect(`${origin}/desk?synced=1`, 303)
}
