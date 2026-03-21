import { cookies } from 'next/headers'
import { createHash } from 'crypto'

const COOKIE_NAME = 'osr_ops_auth'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function hashPassword(password: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  const data = `${password}:${secret}`
  return createHash('sha256').update(data).digest('hex')
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.OPS_DASHBOARD_PASSWORD
  if (!expected) return false
  return input === expected
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  const token = hashPassword(process.env.OPS_DASHBOARD_PASSWORD || '')
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false
  const expected = hashPassword(process.env.OPS_DASHBOARD_PASSWORD || '')
  return token === expected
}

export async function clearAuth(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
