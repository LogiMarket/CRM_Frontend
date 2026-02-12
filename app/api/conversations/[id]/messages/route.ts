import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_MESSAGES } from "@/lib/demo-data"

const demoMessagesStore = [...DEMO_MESSAGES]

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
    let messages: any[] = []
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

    // Optional: forward message to external backend (WhatsApp sender)
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
    if (backendUrl && user.id) {
      try {
        // Get conversation contact phone number for WhatsApp sending
        const conversation = await sql`
          SELECT c.phone_number FROM conversations conv
          LEFT JOIN contacts c ON conv.contact_id = c.id
          WHERE conv.id::text = ${id}
          LIMIT 1
        `
        
        if (conversation && conversation[0] && conversation[0].phone_number) {
          const phoneNumber = conversation[0].phone_number
          console.log("[POST messages] Forwarding to WhatsApp:", { phoneNumber, content })
          
          // Get JWT token to authenticate with backend
          const sessionToken = request.headers.get('authorization') || ''
          
          const sendResponse = await fetch(`${backendUrl}/api/whatsapp/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": sessionToken
            },
            body: JSON.stringify({ 
              phone_number: phoneNumber,
              message: content
            }),
          })
          
          const sendData = await sendResponse.json()
          console.log("[POST messages] WhatsApp send response:", { status: sendResponse.status, data: sendData })
        } else {
          console.warn("[POST messages] No phone number found for conversation", { id })
        }
      } catch (forwardError) {
        console.error("[POST messages] Forward to backend failed (non-blocking):", forwardError)
      }
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
