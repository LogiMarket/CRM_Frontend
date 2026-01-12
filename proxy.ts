import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")
  const { pathname } = request.nextUrl

  // Redirect to login if not authenticated and trying to access protected routes
  if (!sessionCookie && pathname.startsWith("/inbox")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to inbox if authenticated and trying to access login
  if (sessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/inbox", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/inbox/:path*", "/login"],
}
