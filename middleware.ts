import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth-token'

const COOKIE_NAME = 'pd_auth'

export async function middleware(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD

  // If no password is configured, allow all traffic (dev mode)
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Always allow: login page, login/logout API, OAuth start + callback (NOT disconnect —
  // that's a state-changing route and must stay behind auth), static assets
  if (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/canva' ||
    pathname === '/api/auth/canva/callback' ||
    pathname === '/api/auth/google' ||
    pathname === '/api/auth/google/callback' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Vercel cron requests authenticate via CRON_SECRET bearer token, not cookies
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) {
    return NextResponse.next()
  }

  // Check auth cookie — stores a hash of the password, not the password itself
  const authCookie = request.cookies.get(COOKIE_NAME)?.value
  if (authCookie && authCookie === await hashPassword(password)) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
