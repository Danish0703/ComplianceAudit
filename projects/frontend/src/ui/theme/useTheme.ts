import { useCallback, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'complianceaudit:theme'

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (stored === 'light' || stored === 'dark') return stored
    return getSystemTheme()
  })

  useEffect(() => {
    applyThemeClass(mode)
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [])

  return useMemo(() => ({ mode, setMode, toggle }), [mode, toggle])
}
