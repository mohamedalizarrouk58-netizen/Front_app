import { Globe } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

const LANGUAGES = [
  { code: 'fr', labelKey: 'lang.fr' },
  { code: 'en', labelKey: 'lang.en' },
  { code: 'ar', labelKey: 'lang.ar' },
]

const MENU_WIDTH = 152
const MENU_ITEM_HEIGHT = 40
const MENU_PADDING = 8
const MENU_GAP = 6

function isLanguageActive(current, code) {
  return current === code || current?.startsWith(`${code}-`)
}

function getMenuPosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect()
  const menuHeight = MENU_PADDING + LANGUAGES.length * MENU_ITEM_HEIGHT
  const isRtl = document.documentElement.dir === 'rtl'

  let left = isRtl ? rect.left : rect.right - MENU_WIDTH
  left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))

  let top = rect.bottom + MENU_GAP
  if (top + menuHeight > window.innerHeight - 8) {
    top = rect.top - menuHeight - MENU_GAP
  }
  top = Math.max(8, top)

  return { top, left }
}

export function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    setMenuPosition(getMenuPosition(triggerRef.current))
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      const target = event.target
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    function handleReposition() {
      if (triggerRef.current) {
        setMenuPosition(getMenuPosition(triggerRef.current))
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open])

  const setLanguage = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('language', code)
    document.documentElement.lang = code
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
    setOpen(false)
  }

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          className="fixed z-[99999] min-w-[152px] rounded-xl border border-slate-200 bg-white p-1 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
        >
          {LANGUAGES.map(({ code, labelKey }) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={isLanguageActive(i18n.language, code)}
              onClick={() => setLanguage(code)}
              className={`w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                isLanguageActive(i18n.language, code)
                  ? 'bg-sky-50 font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <div ref={triggerRef} className={`relative ${className}`}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Language"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="rounded-full w-9 h-9 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </div>
      {menu}
    </>
  )
}
