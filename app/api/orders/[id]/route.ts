import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    const [order] = await sql`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.items,
        o.shipping_address,
        o.created_at,
        o.updated_at,
        o.contact_id,
        contacts.name as contact_name,
        contacts.phone_number
      FROM orders o
      LEFT JOIN contacts ON o.contact_id = contacts.id
      WHERE o.id = ${id}
    `

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("[v0] Get order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
