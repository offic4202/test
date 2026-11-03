import { NextResponse } from "next/server"

import { deskCookie, deskPassword, passwordsMatch, publicOrigin } from "@/lib/desk-auth"

export async function POST(request: Request) {
  const origin = publicOrigin(request)
  const expected = deskPassword()
  const form = await request.formData()
  const given = String(form.get("password") ?? "")
  if (!expected || !passwordsMatch(given, expected)) {
    return NextResponse.redirect(`${origin}/desk?denied=1`, 303)
  }
  const cookie = deskCookie(expected, origin.startsWith("https://"))
  const response = NextResponse.redirect(`${origin}/desk`, 303)
  response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}
