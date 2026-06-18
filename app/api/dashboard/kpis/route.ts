import { NextRequest, NextResponse } from 'next/server'
import { getKPIs } from '@/lib/db'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 })
  }
  try {
    const kpis = await getKPIs(userId)
    return NextResponse.json(kpis)
  } catch {
    return NextResponse.json({ error: 'Failed to load KPIs.' }, { status: 500 })
  }
}
