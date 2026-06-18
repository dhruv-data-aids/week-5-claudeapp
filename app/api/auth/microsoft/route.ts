import { NextResponse } from 'next/server'
import { getMsalClient, AZURE_SCOPES, REDIRECT_URI } from '@/lib/azure'

export async function GET() {
  try {
    const client = getMsalClient()
    const url = await client.getAuthCodeUrl({
      scopes: AZURE_SCOPES,
      redirectUri: REDIRECT_URI,
    })
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json({ error: 'Failed to initiate Microsoft login.' }, { status: 500 })
  }
}
