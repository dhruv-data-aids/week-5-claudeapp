import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { getUser, createUser } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const existing = await getUser(email)
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcryptjs.hash(password, 10)
    const user = await createUser(email, passwordHash)

    return NextResponse.json({ userId: user.id, email: user.email }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
