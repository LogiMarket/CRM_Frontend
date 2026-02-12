import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json(
      { error: "WHATSAPP_ACCESS_TOKEN missing" },
      { status: 500 },
    )
  }

  const { mediaId } = await params
  const { searchParams } = new URL(request.url)
  const filename = (searchParams.get("filename") || "").trim()

  // 1) Media info (gives us a temporary download URL)
  const infoResp = await fetch(
    `https://graph.facebook.com/v19.0/${encodeURIComponent(mediaId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  )

  const infoJson = await infoResp.json().catch(() => null)
  if (!infoResp.ok) {
    return NextResponse.json(
      { error: "Failed to fetch media info", details: infoJson },
      { status: infoResp.status },
    )
  }

  const url = String(infoJson?.url || "")
  if (!url) {
    return NextResponse.json(
      { error: "Cloud API did not return media url", details: infoJson },
      { status: 502 },
    )
  }

  // 2) Download binary
  const fileResp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!fileResp.ok) {
    const text = await fileResp.text().catch(() => "")
    return NextResponse.json(
      { error: "Failed to download media", details: text },
      { status: fileResp.status },
    )
  }

  const contentType =
    fileResp.headers.get("content-type") ||
    String(infoJson?.mime_type || "") ||
    "application/octet-stream"

  const headers = new Headers()
  headers.set("Content-Type", contentType)
  headers.set("Cache-Control", "private, no-store")

  if (filename) {
    const safeName = filename.replace(/[\r\n"\\]/g, "_")
    headers.set("Content-Disposition", `inline; filename="${safeName}"`)
  }

  return new Response(fileResp.body, { status: 200, headers })
}
