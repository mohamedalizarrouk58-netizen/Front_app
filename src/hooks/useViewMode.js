import { useEffect, useState } from 'react'

export function useViewMode(scope, defaultMode = 'list') {
  const storageKey = `gmao-view-${scope}`

  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'cards' || stored === 'list') return stored
    } catch {
      /* ignore */
    }
    return defaultMode
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, viewMode)
    } catch {
      /* ignore */
    }
  }, [storageKey, viewMode])

  return [viewMode, setViewMode]
}

export function viewContainerClass(viewMode, listClass = 'space-y-3', cardClass = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3') {
  return viewMode === 'cards' ? cardClass : listClass
}
