import { redirect } from 'next/navigation'
import { checkAuth } from '@/lib/auth'

export default async function Home() {
  const authed = await checkAuth()
  if (authed) {
    redirect('/overview')
  } else {
    redirect('/login')
  }
}
