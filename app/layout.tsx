import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'Design Project Hub — track Jira projects and Slack comms in one place',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme')||'light';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.setAttribute('data-theme',r);if(r==='dark')document.documentElement.classList.add('dark');var a=localStorage.getItem('mc_accent')||'orange';document.documentElement.setAttribute('data-accent',a);var g=new Set(['aubergine','raspberry','chill','banana','pbj','seaglass','mintchip','bigbiz']);document.documentElement.setAttribute('data-accent-type',g.has(a)?'gradient':'solid');var f=localStorage.getItem('mc_font');if(f&&f!=='default')document.documentElement.setAttribute('data-font',f)}catch(e){}})()`,
        }} />
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', overflow: 'hidden' }}>
        <ThemeProvider>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
