import { NextResponse } from 'next/server'
import { deleteToken } from '@/lib/token-store'

export async function POST() {
  await deleteToken('canva')
  return NextResponse.json({ ok: true })
}
