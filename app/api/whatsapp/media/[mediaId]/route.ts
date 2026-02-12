import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export const runtime = "nodejs"

function missingTokenResponse(request: Request) {
  const accept = (request.headers.get("accept") || "").toLowerCase()

  // If the browser expects an image (e.g. <img src>), return an SVG so the UI
  // shows a readable error instead of a broken-image icon.
  if (accept.includes("image/")) {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220">
  <rect width="100%" height="100%" fill="#fee2e2"/>
  <rect x="16" y="16" width="608" height="188" rx="12" fill="#fff" stroke="#ef4444"/>
  <text x="32" y="70" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI" font-size="20" fill="#991b1b">WHATSAPP_ACCESS_TOKEN missing</text>
  <text x="32" y="105" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI" font-size="14" fill="#7f1d1d">Configura la variable de entorno en el deploy del frontend (server-side),</text>
  <text x="32" y="128" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI" font-size="14" fill="#7f1d1d">reinicia el servicio y vuelve a cargar la conversación.</text>
  <text x="32" y="170" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI" font-size="12" fill="#7f1d1d">Ruta: /api/whatsapp/media/[mediaId]</text>
</svg>`

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    })
  }

  return NextResponse.json({ error: "WHATSAPP_ACCESS_TOKEN missing" }, { status: 500 })
}

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
    return missingTokenResponse(request)
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
