import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setAuthCookie, clearAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  await setAuthCookie()
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  if (action === 'logout') {
    await clearAuth()
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
