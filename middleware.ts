import { NextResponse } from "next/server"

export function middleware() {
  // No-op middleware to avoid blocking routes
  return NextResponse.next()
}
