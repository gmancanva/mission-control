'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mc_profile_avatar'
const MAX_PX = 128

const TRANSPARENT_TYPES = new Set(['image/png', 'image/gif', 'image/webp'])

function resizeToDataURL(file: File): Promise<string> {
  const preserveAlpha = TRANSPARENT_TYPES.has(file.type)
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_PX / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      if (preserveAlpha) {
        ctx.clearRect(0, 0, w, h)
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(preserveAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function ProfileAvatar() {
  const [src, setSrc] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSrc(saved)
    } catch { /* ignore */ }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      const dataUrl = await resizeToDataURL(file)
      localStorage.setItem(STORAGE_KEY, dataUrl)
      setSrc(dataUrl)
    } catch { /* ignore */ }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <button
      type="button"
      title="Click to upload profile photo"
      className="PdSidebar__avatarBtn"
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {src ? (
        <img src={src} alt="Profile" className="PdSidebar__avatarImg" />
      ) : (
        <span className="PdSidebar__avatarInitials">GM</span>
      )}
      {hovering && (
        <span className="PdSidebar__avatarOverlay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </button>
  )
}
