import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql, isDemoMode } from "@/lib/db"
import { DEMO_ORDERS } from "@/lib/demo-data"

export async function GET(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const contactId = searchParams.get("contactId")

    if (isDemoMode) {
      let orders = DEMO_ORDERS

      if (contactId) {
        orders = orders.filter((o) => o.contact_id === Number.parseInt(contactId))
      } else if (search) {
        orders = orders.filter(
          (o) =>
            o.order_number.toLowerCase().includes(search.toLowerCase()) ||
            o.shipping_address.toLowerCase().includes(search.toLowerCase()),
        )
      }

      return NextResponse.json({ orders })
    }

    let orders

    if (contactId) {
      // Get orders for specific contact
      orders = await sql`
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.total_amount,
          o.items,
          o.shipping_address,
          o.created_at,
          o.updated_at,
          contacts.name as contact_name,
          contacts.phone_number
        FROM orders o
        LEFT JOIN contacts ON o.contact_id = contacts.id
        WHERE o.contact_id = ${contactId}
        ORDER BY o.created_at DESC
      `
    } else if (search) {
      // Search orders by order number or contact name
      orders = await sql`
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.total_amount,
          o.items,
          o.shipping_address,
          o.created_at,
          o.updated_at,
          contacts.name as contact_name,
          contacts.phone_number
        FROM orders o
        LEFT JOIN contacts ON o.contact_id = contacts.id
        WHERE o.order_number ILIKE ${`%${search}%`}
          OR contacts.name ILIKE ${`%${search}%`}
        ORDER BY o.created_at DESC
        LIMIT 20
      `
    } else {
      // Get all recent orders
      orders = await sql`
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.total_amount,
          o.items,
          o.shipping_address,
          o.created_at,
          o.updated_at,
          contacts.name as contact_name,
          contacts.phone_number
        FROM orders o
        LEFT JOIN contacts ON o.contact_id = contacts.id
        ORDER BY o.created_at DESC
        LIMIT 20
      `
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("[v0] Get orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
