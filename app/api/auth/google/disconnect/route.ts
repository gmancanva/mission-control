import { NextResponse } from 'next/server'
import { deleteToken } from '@/lib/token-store'

export async function POST() {
  await deleteToken('google')
  return NextResponse.json({ ok: true })
}
