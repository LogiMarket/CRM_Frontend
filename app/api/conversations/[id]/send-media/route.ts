import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"

export const runtime = "nodejs"

function normalizeToDigits(value: string) {
  return String(value || "").replace("whatsapp:", "").replace(/\D/g, "")
}

function inferWhatsappMediaType(mimeType: string, filename: string): "image" | "video" | "audio" | "document" | "sticker" {
  const mime = String(mimeType || "").toLowerCase()
  const name = String(filename || "").toLowerCase()

  if (mime === "image/webp" || name.endsWith(".webp")) return "sticker"
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"

  return "document"
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    if (isDemoMode) {
      return NextResponse.json(
        { error: "Media sending is not available in demo mode" },
        { status: 400 },
      )
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "WHATSAPP_ACCESS_TOKEN missing",
          hint: "Configura WHATSAPP_ACCESS_TOKEN en Railway (servicio del frontend). Debe ser un token válido de WhatsApp Cloud API.",
        },
        { status: 500 },
      )
    }
    if (!phoneNumberId) {
      return NextResponse.json(
        {
          error: "WHATSAPP_PHONE_NUMBER_ID missing",
          hint: "Configura WHATSAPP_PHONE_NUMBER_ID en Railway (servicio del frontend). Ojo: NO es el WABA ID; es el Phone Number ID que ves en Meta Developers > WhatsApp > API Setup.",
        },
        { status: 500 },
      )
    }

    const form = await request.formData()
    const file = form.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    const caption = String(form.get("caption") || "").trim()
    const requestedType = String(form.get("type") || "").trim()

    const fileObj = file as File
    const filename = fileObj.name || "archivo"
    const mimeType = fileObj.type || "application/octet-stream"

    const type = ((): "image" | "video" | "audio" | "document" | "sticker" => {
      const allowed = ["image", "video", "audio", "document", "sticker"]
      if (allowed.includes(requestedType)) return requestedType as any
      return inferWhatsappMediaType(mimeType, filename)
    })()

    // Lookup recipient (WhatsApp "to") by conversation id
    let recipientDigits = ""
    try {
      const conv = await sql!`
        SELECT
          conv.channel,
          conv.external_user_id,
          c.phone_number
        FROM conversations conv
        LEFT JOIN contacts c ON conv.contact_id = c.id
        WHERE conv.id::text = ${id}
        LIMIT 1
      `

      if (conv?.[0]) {
        const channel = String(conv[0].channel || "whatsapp")
        if (channel !== "whatsapp") {
          return NextResponse.json(
            { error: `Unsupported channel for media send: ${channel}` },
            { status: 400 },
          )
        }
        recipientDigits = normalizeToDigits(conv[0].external_user_id || conv[0].phone_number || "")
      }
    } catch (e: any) {
      const message = String(e?.message || "")
      const code = String(e?.code || "")

      const missingColumn =
        message.includes("conv.channel") ||
        message.includes("conv.external_user_id") ||
        message.includes("column conv.channel") ||
        message.includes("column conv.external_user_id")

      // fallback to CAST if id is integer OR to schema without those columns
      try {
        if (missingColumn && (code === "42703" || !code)) {
          const conv = await sql!`
            SELECT
              c.phone_number
            FROM conversations conv
            LEFT JOIN contacts c ON conv.contact_id = c.id
            WHERE conv.id::text = ${id}
            LIMIT 1
          `
          if (conv?.[0]) {
            recipientDigits = normalizeToDigits(conv[0].phone_number || "")
          }
        } else {
          const conv = await sql!`
            SELECT
              conv.channel,
              conv.external_user_id,
              c.phone_number
            FROM conversations conv
            LEFT JOIN contacts c ON conv.contact_id = c.id
            WHERE CAST(conv.id AS VARCHAR) = ${id}
            LIMIT 1
          `

          if (conv?.[0]) {
            const channel = String(conv[0].channel || "whatsapp")
            if (channel !== "whatsapp") {
              return NextResponse.json(
                { error: `Unsupported channel for media send: ${channel}` },
                { status: 400 },
              )
            }
            recipientDigits = normalizeToDigits(conv[0].external_user_id || conv[0].phone_number || "")
          }
        }
      } catch (e2: any) {
        const message2 = String(e2?.message || "")
        const code2 = String(e2?.code || "")
        const missingColumn2 =
          message2.includes("conv.channel") ||
          message2.includes("conv.external_user_id") ||
          message2.includes("column conv.channel") ||
          message2.includes("column conv.external_user_id")

        if (missingColumn2 && (code2 === "42703" || !code2)) {
          const conv = await sql!`
            SELECT
              c.phone_number
            FROM conversations conv
            LEFT JOIN contacts c ON conv.contact_id = c.id
            WHERE CAST(conv.id AS VARCHAR) = ${id}
            LIMIT 1
          `
          if (conv?.[0]) {
            recipientDigits = normalizeToDigits(conv[0].phone_number || "")
          }
        } else {
          throw e2
        }
      }
    }

    if (!recipientDigits) {
      return NextResponse.json(
        { error: "Recipient phone not found for conversation" },
        { status: 400 },
      )
    }

    // 1) Upload media
    const uploadForm = new FormData()
    uploadForm.append("messaging_product", "whatsapp")
    uploadForm.append("file", fileObj, filename)

    const uploadResp = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: uploadForm,
      },
    )

    const uploadJson = await uploadResp.json().catch(() => null)
    if (!uploadResp.ok) {
      return NextResponse.json(
        { error: "Failed to upload media", details: uploadJson },
        { status: uploadResp.status },
      )
    }

    const mediaId = String(uploadJson?.id || "")
    if (!mediaId) {
      return NextResponse.json(
        { error: "Cloud API did not return media id", details: uploadJson },
        { status: 502 },
      )
    }

    // 2) Send message
    const payload: any = {
      messaging_product: "whatsapp",
      to: recipientDigits,
      type,
    }

    if (type === "image") payload.image = { id: mediaId, ...(caption ? { caption } : {}) }
    if (type === "video") payload.video = { id: mediaId, ...(caption ? { caption } : {}) }
    if (type === "audio") payload.audio = { id: mediaId }
    if (type === "sticker") payload.sticker = { id: mediaId }
    if (type === "document") {
      payload.document = {
        id: mediaId,
        ...(caption ? { caption } : {}),
        ...(filename ? { filename } : {}),
      }
    }

    const sendResp = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    )

    const sendJson = await sendResp.json().catch(() => null)
    if (!sendResp.ok) {
      return NextResponse.json(
        { error: "Failed to send media", details: sendJson },
        { status: sendResp.status },
      )
    }

    const externalMessageId =
      String(sendJson?.messages?.[0]?.id || sendJson?.message_id || "") || null

    const storedContent = caption || filename || `[${type}]`
    const metadata = {
      type,
      media_id: mediaId,
      mime_type: mimeType,
      filename,
      caption: caption || undefined,
    }

    // 3) Store message in DB (best-effort, compatible with multiple schemas)
    let inserted: any = null
    try {
      const rows = await sql!`
        INSERT INTO messages (
          conversation_id,
          sender_type,
          sender_id,
          content,
          channel,
          external_message_id,
          direction,
          message_type,
          metadata,
          created_at
        )
        VALUES (
          ${id}::uuid,
          'agent',
          ${user.id},
          ${storedContent},
          'whatsapp',
          ${externalMessageId},
          'outbound',
          ${type},
          ${JSON.stringify(metadata)}::jsonb,
          NOW()
        )
        RETURNING id, content, sender_type, sender_id, created_at, message_type, metadata
      `
      inserted = rows?.[0] || null
    } catch (e1: any) {
      // Retry as integer id or reduced columns
      try {
        const rows = await sql!`
          INSERT INTO messages (
            conversation_id,
            sender_type,
            sender_id,
            content,
            message_type,
            metadata,
            created_at
          )
          VALUES (
            ${Number.parseInt(id)},
            'agent',
            ${user.id},
            ${storedContent},
            ${type},
            ${JSON.stringify(metadata)}::jsonb,
            NOW()
          )
          RETURNING id, content, sender_type, sender_id, created_at, message_type, metadata
        `
        inserted = rows?.[0] || null
      } catch (e2) {
        // don't fail send if DB insert fails
        inserted = null
      }
    }

    // Update conversation timestamps (best-effort)
    try {
      await sql!`
        UPDATE conversations
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE id::text = ${id}
      `
    } catch {
      // ignore
    }

    // Normalize metadata if needed
    let normalizedMetadata: any = inserted?.metadata ?? metadata
    if (typeof normalizedMetadata === "string") {
      try {
        normalizedMetadata = JSON.parse(normalizedMetadata)
      } catch {
        // keep
      }
    }

    const media_url = `/api/whatsapp/media/${encodeURIComponent(String(mediaId))}?filename=${encodeURIComponent(filename)}`

    return NextResponse.json({
      success: true,
      media_id: mediaId,
      external_message_id: externalMessageId,
      message: inserted
        ? {
            ...inserted,
            sender_name: user.name,
            metadata: normalizedMetadata,
            media_url,
          }
        : {
            id: Date.now(),
            content: storedContent,
            sender_type: "agent",
            sender_id: user.id,
            sender_name: user.name,
            created_at: new Date().toISOString(),
            message_type: type,
            metadata,
            media_url,
          },
    })
  } catch (error) {
    console.error("[send-media] Error:", error)
    return NextResponse.json(
      { error: "Failed to send media", details: String(error) },
      { status: 500 },
    )
  }
}
