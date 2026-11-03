import { NextResponse } from "next/server"

import { publicOrigin } from "@/lib/desk-auth"

export async function POST(request: Request) {
  const response = NextResponse.redirect(`${publicOrigin(request)}/desk`, 303)
  response.cookies.set("ps_desk", "", { httpOnly: true, path: "/", maxAge: 0 })
  return response
}
