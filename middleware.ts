import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'pd_auth'

export function middleware(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD

  // If no password is configured, allow all traffic (dev mode)
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Always allow: login page, login API, OAuth callbacks, static assets
  if (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname.startsWith('/api/auth/canva') ||
    pathname.startsWith('/api/auth/google') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME)?.value
  if (authCookie === password) {
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
