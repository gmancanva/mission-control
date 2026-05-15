'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
export type ColorMode = 'light' | 'dark' | 'system'
export type Accent =
  | 'orange' | 'blue' | 'purple' | 'teal' | 'rose' | 'slate'
  | 'aubergine' | 'raspberry' | 'chill' | 'banana' | 'pbj'
  | 'seaglass' | 'mintchip' | 'bigbiz'
export type Font = 'default' | 'inter' | 'system' | 'serif' | 'mono'

type ThemeContextValue = {
  theme: Theme
  colorMode: ColorMode
  toggle: () => void
  setColorMode: (m: ColorMode) => void
  accent: Accent
  setAccent: (a: Accent) => void
  font: Font
  setFont: (f: Font) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  colorMode: 'light',
  toggle: () => {},
  setColorMode: () => {},
  accent: 'orange',
  setAccent: () => {},
  font: 'default',
  setFont: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function resolveTheme(mode: ColorMode): Theme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function applyThemeToDom(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  document.documentElement.classList.toggle('dark', t === 'dark')
}

const GRADIENT_ACCENTS = new Set<Accent>(['aubergine', 'raspberry', 'chill', 'banana', 'pbj', 'seaglass', 'mintchip', 'bigbiz'])

function applyAccentToDom(a: Accent) {
  document.documentElement.setAttribute('data-accent', a)
  document.documentElement.setAttribute('data-accent-type', GRADIENT_ACCENTS.has(a) ? 'gradient' : 'solid')
}

function applyFontToDom(f: Font) {
  if (f === 'default') {
    document.documentElement.removeAttribute('data-font')
  } else {
    document.documentElement.setAttribute('data-font', f)
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>('light')
  const [theme, setTheme] = useState<Theme>('light')
  const [accent, setAccentState] = useState<Accent>('orange')
  const [font, setFontState] = useState<Font>('default')

  useEffect(() => {
    const savedMode = (localStorage.getItem('theme') as ColorMode) || 'light'
    const savedAccent = (localStorage.getItem('mc_accent') as Accent) || 'orange'
    const savedFont = (localStorage.getItem('mc_font') as Font) || 'default'

    const resolved = resolveTheme(savedMode)
    setColorModeState(savedMode)
    setTheme(resolved)
    applyThemeToDom(resolved)
    setAccentState(savedAccent)
    applyAccentToDom(savedAccent)
    setFontState(savedFont)
    applyFontToDom(savedFont)

    if (savedMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        const t: Theme = e.matches ? 'dark' : 'light'
        setTheme(t)
        applyThemeToDom(t)
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [])

  function setColorMode(mode: ColorMode) {
    localStorage.setItem('theme', mode)
    setColorModeState(mode)
    const resolved = resolveTheme(mode)
    setTheme(resolved)
    applyThemeToDom(resolved)
  }

  function toggle() {
    setColorMode(theme === 'dark' ? 'light' : 'dark')
  }

  function setAccent(a: Accent) {
    localStorage.setItem('mc_accent', a)
    setAccentState(a)
    applyAccentToDom(a)
  }

  function setFont(f: Font) {
    localStorage.setItem('mc_font', f)
    setFontState(f)
    applyFontToDom(f)
  }

  return (
    <ThemeContext.Provider value={{ theme, colorMode, toggle, setColorMode, accent, setAccent, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  )
}
