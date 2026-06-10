import { AnimatePresence } from 'framer-motion'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { OperationFeedbackOverlay } from '../components/ui/OperationFeedbackOverlay'

const OperationFeedbackContext = createContext(null)

const INITIAL = {
  open: false,
  phase: 'loading',
  action: 'create',
  entity: '',
}

export function OperationFeedbackProvider({ children }) {
  const [state, setState] = useState(INITIAL)

  const hide = useCallback(() => {
    setState(INITIAL)
  }, [])

  const runWithFeedback = useCallback(async (operation, options = {}) => {
    const { action = 'create', entity = '' } = options

    setState({ open: true, phase: 'loading', action, entity })

    try {
      const result = await operation()
      setState({ open: true, phase: 'success', action, entity })
      await new Promise((resolve) => setTimeout(resolve, 1700))
      hide()
      return result
    } catch (error) {
      hide()
      throw error
    }
  }, [hide])

  const value = useMemo(() => ({ runWithFeedback }), [runWithFeedback])

  return (
    <OperationFeedbackContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state.open ? (
          <OperationFeedbackOverlay
            phase={state.phase}
            action={state.action}
            entity={state.entity}
          />
        ) : null}
      </AnimatePresence>
    </OperationFeedbackContext.Provider>
  )
}

export function useOperationFeedback() {
  const ctx = useContext(OperationFeedbackContext)
  if (!ctx) {
    throw new Error('useOperationFeedback must be used within OperationFeedbackProvider')
  }
  return ctx
}
