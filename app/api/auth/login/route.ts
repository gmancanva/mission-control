import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json() as { password?: string }
    const correctPassword = process.env.DASHBOARD_PASSWORD

    if (!correctPassword) {
      // No password configured — always succeed
      return NextResponse.json({ ok: true })
    }

    if (!password || password !== correctPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set('pd_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
