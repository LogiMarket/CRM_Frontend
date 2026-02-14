import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_MESSAGES } from "@/lib/demo-data"

const demoMessagesStore = [...DEMO_MESSAGES]

function normalizeWhatsappToDigits(value: string) {
  return String(value || "").replace(/^whatsapp:/i, "").replace(/\D/g, "")
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    if (isDemoMode) {
      const conversationId = isNaN(Number(id)) ? id : Number.parseInt(id)
      const messages = demoMessagesStore
        .filter((m) => {
          if (typeof conversationId === "number") {
            return m.conversation_id === conversationId
          }
          return m.conversation_id === Number.parseInt(id)
        })
        .map((m) => ({
          id: m.id,
          content: m.content,
          sender_type: m.sender_type,
          sender_id: m.user_id || null,
          message_type: "text",
          created_at: m.created_at,
          sender_name: m.sender_type === "agent" ? user.name : "Cliente",
        }))

      return NextResponse.json({ messages })
    }

    // Query messages - try to get by UUID first, then try as integer.
    // Also support alternative schemas (e.g. CRM backend) where media fields may be stored in columns.
    let messages: any = []
    try {
      messages = await sql`
        SELECT 
          m.id,
          m.content,
          m.message_type,
          m.metadata,
          m.media_id,
          m.media_filename,
          m.media_mime_type,
          m.media_caption,
          m.sender_type,
          m.sender_id,
          m.created_at,
          COALESCE(
            CASE WHEN m.sender_type = 'contact' THEN c.name END,
            CASE WHEN m.sender_type = 'agent' THEN u.name END,
            'Unknown'
          ) as sender_name
        FROM messages m
        LEFT JOIN contacts c ON m.sender_type IN ('contact','customer') AND m.sender_id = c.id
        LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
        WHERE m.conversation_id::text = ${id}
        ORDER BY m.created_at ASC
      `
    } catch (queryError) {
      console.error("[GET messages] Query with ::text failed, trying alternate:", queryError)

      // If the failure was due to missing media columns, retry without them.
      const queryMsg = String((queryError as any)?.message || "")
      const missingMediaColumns =
        queryMsg.includes("m.media_id") ||
        queryMsg.includes("m.media_filename") ||
        queryMsg.includes("m.media_mime_type") ||
        queryMsg.includes("m.media_caption")

      if (missingMediaColumns) {
        try {
          messages = await sql`
            SELECT 
              m.id,
              m.content,
              m.message_type,
              m.metadata,
              m.sender_type,
              m.sender_id,
              m.created_at,
              COALESCE(
                CASE WHEN m.sender_type = 'contact' THEN c.name END,
                CASE WHEN m.sender_type = 'agent' THEN u.name END,
                'Unknown'
              ) as sender_name
            FROM messages m
            LEFT JOIN contacts c ON m.sender_type IN ('contact','customer') AND m.sender_id = c.id
            LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
            WHERE m.conversation_id::text = ${id}
            ORDER BY m.created_at ASC
          `
        } catch {
          // fall through to CAST retry
        }
      }

      // Try alternate approach if UUID casting fails (or previous retry didn't produce results)
      if (!messages?.length) {
        try {
          messages = await sql`
            SELECT 
              m.id,
              m.content,
              m.message_type,
              m.metadata,
              m.media_id,
              m.media_filename,
              m.media_mime_type,
              m.media_caption,
              m.sender_type,
              m.sender_id,
              m.created_at,
              COALESCE(
                CASE WHEN m.sender_type = 'contact' THEN c.name END,
                CASE WHEN m.sender_type = 'agent' THEN u.name END,
                'Unknown'
              ) as sender_name
            FROM messages m
            LEFT JOIN contacts c ON m.sender_type IN ('contact','customer') AND m.sender_id = c.id
            LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
            WHERE CAST(m.conversation_id AS VARCHAR) = ${id}
            ORDER BY m.created_at ASC
          `
        } catch (castError: any) {
          const castMsg = String(castError?.message || "")
          const castMissingMediaColumns =
            castMsg.includes("m.media_id") ||
            castMsg.includes("m.media_filename") ||
            castMsg.includes("m.media_mime_type") ||
            castMsg.includes("m.media_caption")

          if (castMissingMediaColumns) {
            messages = await sql`
              SELECT 
                m.id,
                m.content,
                m.message_type,
                m.metadata,
                m.sender_type,
                m.sender_id,
                m.created_at,
                COALESCE(
                  CASE WHEN m.sender_type = 'contact' THEN c.name END,
                  CASE WHEN m.sender_type = 'agent' THEN u.name END,
                  'Unknown'
                ) as sender_name
              FROM messages m
              LEFT JOIN contacts c ON m.sender_type IN ('contact','customer') AND m.sender_id = c.id
              LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.id
              WHERE CAST(m.conversation_id AS VARCHAR) = ${id}
              ORDER BY m.created_at ASC
            `
          } else {
            throw castError
          }
        }
      }
    }

    const normalizedMessages = (messages || []).map((m: any) => {
      let metadata: any = m.metadata ?? null
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          // keep as-is
        }
      }

      const rowMediaId = (m as any)?.media_id
      const rowFilename = (m as any)?.media_filename
      const rowCaption = (m as any)?.media_caption
      const rowMimeType = (m as any)?.media_mime_type

      const mediaId =
        metadata?.media_id ??
        metadata?.mediaId ??
        metadata?.id ??
        rowMediaId ??
        null

      const filename =
        metadata?.filename ??
        metadata?.media_filename ??
        metadata?.mediaFilename ??
        rowFilename ??
        null

      // If media metadata lives in columns, expose a consistent shape to the UI
      if (rowCaption && !metadata?.caption) {
        metadata = { ...(metadata || {}), caption: rowCaption }
      }
      if (rowMimeType && !metadata?.mime_type) {
        metadata = { ...(metadata || {}), mime_type: rowMimeType }
      }

      let media_url: string | null = null
      if (mediaId) {
        media_url = `/api/whatsapp/media/${encodeURIComponent(String(mediaId))}`
        if (filename) {
          media_url += `?filename=${encodeURIComponent(String(filename))}`
        }
      }

      return {
        ...m,
        metadata,
        media_url,
      }
    })

    // Mark messages as read - silently ignore if it fails
    try {
      await sql`
        UPDATE messages 
        SET read_at = NOW() 
        WHERE conversation_id::text = ${id}
          AND read_at IS NULL 
          AND sender_type = 'contact'
      `
    } catch (error) {
      console.error("[GET messages] Error marking as read:", error)
    }

    return NextResponse.json({ messages: normalizedMessages })
  } catch (error) {
    console.error("[GET messages] Error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params
    const { content } = await request.json()

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (isDemoMode) {
      const newMessage = {
        id: demoMessagesStore.length + 1,
        conversation_id: Number.parseInt(id),
        sender_type: "agent" as const,
        user_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
      }

      demoMessagesStore.push(newMessage)

      return NextResponse.json({
        message: {
          id: newMessage.id,
          content: newMessage.content,
          sender_type: newMessage.sender_type,
          sender_id: newMessage.user_id,
          message_type: "text",
          created_at: newMessage.created_at,
          sender_name: user.name,
        },
      })
    }

    // Fetch delivery info (best-effort across schemas)
    let delivery: { channel: string; phoneNumber: string | null } = { channel: "whatsapp", phoneNumber: null }
    try {
      const cols: any[] = await sql!`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_name IN ('conversations', 'contacts')
          AND column_name = 'channel'
        ORDER BY table_name
      `
      const hasConvChannel = (cols || []).some((r: any) => String(r?.table_name || "") === "conversations")
      const hasContactChannel = (cols || []).some((r: any) => String(r?.table_name || "") === "contacts")

      let rows: any[] = []
      if (hasConvChannel && hasContactChannel) {
        rows = await sql!`
          SELECT
            COALESCE(conv.channel, c.channel, 'whatsapp') as channel,
            c.phone_number
          FROM conversations conv
          LEFT JOIN contacts c ON conv.contact_id = c.id
          WHERE conv.id::text = ${id}
          LIMIT 1
        `
      } else if (hasConvChannel) {
        rows = await sql!`
          SELECT
            COALESCE(conv.channel, 'whatsapp') as channel,
            c.phone_number
          FROM conversations conv
          LEFT JOIN contacts c ON conv.contact_id = c.id
          WHERE conv.id::text = ${id}
          LIMIT 1
        `
      } else if (hasContactChannel) {
        rows = await sql!`
          SELECT
            COALESCE(c.channel, 'whatsapp') as channel,
            c.phone_number
          FROM conversations conv
          LEFT JOIN contacts c ON conv.contact_id = c.id
          WHERE conv.id::text = ${id}
          LIMIT 1
        `
      } else {
        rows = await sql!`
          SELECT
            'whatsapp' as channel,
            c.phone_number
          FROM conversations conv
          LEFT JOIN contacts c ON conv.contact_id = c.id
          WHERE conv.id::text = ${id}
          LIMIT 1
        `
      }

      delivery = {
        channel: String(rows?.[0]?.channel || "whatsapp").toLowerCase(),
        phoneNumber: rows?.[0]?.phone_number ? String(rows[0].phone_number) : null,
      }
    } catch {
      delivery = { channel: "whatsapp", phoneNumber: null }
    }

    // Deliver message externally (WhatsApp) BEFORE inserting into DB so UI doesn't show false success
    if (delivery.channel !== "facebook") {
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL

      // If a backend is configured, keep forwarding (legacy)
      if (backendUrl && user.id) {
        try {
          if (delivery.phoneNumber) {
            const sessionToken = request.headers.get("authorization") || ""
            const sendResponse = await fetch(`${backendUrl}/api/whatsapp/send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: sessionToken,
              },
              body: JSON.stringify({
                phone_number: delivery.phoneNumber,
                message: content,
              }),
            })

            const sendData = await sendResponse.json().catch(() => null)
            if (!sendResponse.ok) {
              return NextResponse.json(
                { error: "Failed to send WhatsApp message", details: sendData },
                { status: sendResponse.status || 502 },
              )
            }
          } else {
            return NextResponse.json({ error: "Recipient phone missing" }, { status: 400 })
          }
        } catch (forwardError) {
          console.error("[POST messages] Forward to backend failed:", forwardError)
          return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 502 })
        }
      } else {
        // Direct Cloud API send
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
        if (!accessToken || !phoneNumberId) {
          return NextResponse.json(
            { error: "WhatsApp not configured", hint: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID" },
            { status: 500 },
          )
        }

        if (!delivery.phoneNumber) {
          return NextResponse.json({ error: "Recipient phone missing" }, { status: 400 })
        }

        const to = normalizeWhatsappToDigits(delivery.phoneNumber)
        if (!to) {
          return NextResponse.json({ error: "Recipient phone invalid" }, { status: 400 })
        }

        const waRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: content },
          }),
        })

        const waData = await waRes.json().catch(() => null)
        if (!waRes.ok) {
          return NextResponse.json(
            { error: waData?.error?.message || "Failed to send WhatsApp message", details: waData },
            { status: waRes.status || 502 },
          )
        }
      }
    }

    // Try to insert message - handle both UUID and integer conversation_id
    let message = null
    try {
      // Try UUID first
      const result = await sql`
        INSERT INTO messages (conversation_id, sender_type, sender_id, content)
        VALUES (${id}::uuid, 'agent', ${user.id}, ${content})
        RETURNING id, content, sender_type, sender_id, created_at
      `
      message = result[0]
    } catch (uuidError) {
      console.error("[POST messages] UUID insert failed, trying integer:", uuidError)
      // Try as integer
      try {
        const result = await sql`
          INSERT INTO messages (conversation_id, sender_type, sender_id, content)
          VALUES (${Number.parseInt(id)}, 'agent', ${user.id}, ${content})
          RETURNING id, content, sender_type, sender_id, created_at
        `
        message = result[0]
      } catch (intError) {
        console.error("[POST messages] Integer insert also failed:", intError)
        throw intError
      }
    }

    // Update conversation last_message_at - try both formats
    try {
      await sql`
        UPDATE conversations 
        SET last_message_at = NOW() 
        WHERE id::text = ${id}
      `
    } catch (updateError) {
      console.error("[POST messages] Update failed (not critical):", updateError)
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        sender_type: message.sender_type,
        sender_id: message.sender_id,
        created_at: message.created_at,
        sender_name: user.name,
      },
    })
  } catch (error) {
    console.error("[POST messages] Error:", error)
    return NextResponse.json({ error: "Failed to send message", details: String(error) }, { status: 500 })
  }
}
