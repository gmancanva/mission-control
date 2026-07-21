'use client'

import { useState, useEffect } from 'react'
import { loadAvatars, getGlobalAvatars } from '@/lib/avatarStore'

// ─── Brand logos ─────────────────────────────────────────────────────────────

export function SlackLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none">
      <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#2EB67D"/>
      <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#36C5F0"/>
      <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386H34.048a5.381 5.381 0 0 0-5.376 5.386 5.381 5.381 0 0 0 5.376 5.387" fill="#ECB22E"/>
      <path d="M0 34.248a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387v-5.386H5.376A5.381 5.381 0 0 0 0 34.248m14.336 0v14.365A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.248a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386" fill="#E01E5A"/>
    </svg>
  )
}

export function CanvaLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#7D2AE8"/>
      <path d="M22.4 20.5c-.9 1.4-2.4 2.3-4.4 2.3-3.2 0-5.5-2.4-5.5-5.8s2.3-5.8 5.5-5.8c1.9 0 3.3.8 4.3 2l2-1.9C22.8 9.8 20.6 9 18 9c-4.7 0-8 3.4-8 8s3.3 8 8 8c2.7 0 4.9-1.1 6.3-2.8l-1.9-1.7z" fill="white"/>
    </svg>
  )
}

export function FigmaLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 57" fill="none">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/>
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/>
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/>
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF"/>
    </svg>
  )
}

export function JiraLogo({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M15.9 2L2 15.9l5.1 5.1 3-3 8.8 8.8-3 3 5.1 5.1L30 21.1z" fill="#2684FF"/>
      <path d="M15.9 2l-5 14 5.1 5.1 5-14z" fill="url(#jira-grad-s)"/>
      <path d="M16 16l-5 14 5.1 5.1 5-14z" fill="url(#jira-grad2-s)"/>
      <defs>
        <linearGradient id="jira-grad-s" x1="13" y1="14" x2="18" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/>
        </linearGradient>
        <linearGradient id="jira-grad2-s" x1="14" y1="28" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Source badge ─────────────────────────────────────────────────────────────

type Source = 'slack' | 'canva' | 'figma' | 'jira'

const SOURCE_STYLES: Record<Source, string> = {
  slack:  'bg-[#4A154B]/10 text-[#611f69] border-[#4A154B]/20 dark:bg-[#611f69]/20 dark:text-[#e8b4f8] dark:border-[#611f69]/30',
  canva:  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/40',
  figma:  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40',
  jira:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40',
}

export function SourceBadge({ source }: { source: Source }) {
  const logo = {
    slack:  <SlackLogo />,
    canva:  <CanvaLogo />,
    figma:  <FigmaLogo />,
    jira:   <JiraLogo />,
  }[source]
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${SOURCE_STYLES[source]}`}>
      {logo}
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const SLACK_CDN_PREFIXES = [
  'https://avatars.slack-edge.com/',
  'https://a.slack-edge.com/',
  'https://files.slack.com/',
]

function toProxiedUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (SLACK_CDN_PREFIXES.some(p => url.startsWith(p))) {
    return `/api/slack/image?url=${encodeURIComponent(url)}`
  }
  return url
}

const AVATAR_COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']

export function MentionAvatar({ author, avatarUrl, size = 24 }: { author: string; avatarUrl?: string; size?: number }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(
    toProxiedUrl(avatarUrl ?? getGlobalAvatars()?.[author])
  )

  useEffect(() => {
    const direct = avatarUrl ?? getGlobalAvatars()?.[author]
    if (direct) { setResolvedUrl(toProxiedUrl(direct)); return }
    loadAvatars().then(map => {
      const url = map[author]
      if (url) setResolvedUrl(toProxiedUrl(url))
    })
  }, [author, avatarUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = AVATAR_COLORS[author.charCodeAt(0) % AVATAR_COLORS.length]

  return resolvedUrl ? (
    <img src={resolvedUrl} alt={author} width={size} height={size}
      onError={() => setResolvedUrl(undefined)}
      className="rounded-full object-cover shrink-0" style={{ border: '1px solid var(--pdBorder)' }} />
  ) : (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} rounded-full shrink-0 flex items-center justify-center text-white font-semibold`}>
      {initials}
    </div>
  )
}
