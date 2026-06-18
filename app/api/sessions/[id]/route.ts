import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSession, deleteSession } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    const body = await req.json()
    const fields: Record<string, unknown> = {}
    if (typeof body.title === 'string' && body.title.trim()) fields.title = body.title.trim()
    if (typeof body.pinned === 'boolean') fields.pinned = body.pinned
    if (typeof body.status === 'string') fields.status = body.status

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const updated = await updateSession(params.id, fields)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update session.' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteSession(params.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete session.' }, { status: 500 })
  }
}
