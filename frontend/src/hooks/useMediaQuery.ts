'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    function listener(event: MediaQueryListEvent) {
      setMatches(event.matches)
    }

    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Breakpoints do Tailwind
export function useIsMobile() {
  return !useMediaQuery('(min-width: 768px)')
}

export function useIsTablet() {
  const isMin768 = useMediaQuery('(min-width: 768px)')
  const isMax1023 = !useMediaQuery('(min-width: 1024px)')
  return isMin768 && isMax1023
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}
