import { NextRequest, NextResponse } from 'next/server'
import { createFeedback } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, rating, comment } = await req.json()

    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'userId and sessionId are required.' }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating is required and must be 1–5.' },
        { status: 400 }
      )
    }

    const feedback = await createFeedback(userId, sessionId, rating, comment)
    return NextResponse.json(feedback, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Could not save feedback. Please try again.' },
      { status: 500 }
    )
  }
}
