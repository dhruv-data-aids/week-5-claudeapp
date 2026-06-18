import { NextRequest, NextResponse } from 'next/server'
import { getMsalClient, AZURE_SCOPES, REDIRECT_URI } from '@/lib/azure'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  try {
    const client = getMsalClient()
    const result = await client.acquireTokenByCode({
      code,
      scopes: AZURE_SCOPES,
      redirectUri: REDIRECT_URI,
    })

    const token = result?.accessToken
    if (!token) {
      return NextResponse.redirect(new URL('/login?error=no_token', req.url))
    }

    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    response.cookies.set('azure_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url))
  }
}
