import { NextResponse } from "next/server"
import { getSession, verifyToken } from "@/lib/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: "WhatsApp credentials missing" },
        { status: 500 }
      )
    }

    // Optional auth: accept cookie session or bearer token
    const user = await getSession()
    if (!user) {
      const authorization = request.headers.get("authorization") || ""
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
      if (token) {
        const verified = await verifyToken(token)
        if (!verified) {
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }
      }
    }

    const body = await request.json()
    const phoneNumberRaw = body.phone_number
    const message = body.message
    const template = body.template

    if (!phoneNumberRaw || (!message && !template)) {
      return NextResponse.json(
        { error: "phone_number and message or template are required" },
        { status: 400 }
      )
    }

    const phoneNumber = normalizePhoneNumber(phoneNumberRaw)

    const payload = template
      ? {
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "template",
          template,
        }
      : {
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: { body: message },
        }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send message", details: data },
        { status: response.status }
      )
    }

    return NextResponse.json({ status: "ok", data })
  } catch (error) {
    console.error("[WhatsApp Send] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

function normalizePhoneNumber(value: string) {
  return String(value).replace("whatsapp:", "").replace(/\D/g, "")
}