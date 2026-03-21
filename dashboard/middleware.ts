import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth']

async function hashPassword(password: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:${secret}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('osr_ops_auth')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  const password = process.env.OPS_DASHBOARD_PASSWORD || ''
  const expected = await hashPassword(password, secret)

  if (token !== expected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
