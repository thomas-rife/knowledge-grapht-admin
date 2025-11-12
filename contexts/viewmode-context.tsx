'use client'

import { createContext, useReducer, ReactNode } from 'react'

interface ViewModeContextState {
  viewMode: 'dark' | 'light'
}

interface ViewModeContextAction {
  field: keyof ViewModeContextState
  value: any
}

const ViewModeInitialContextState: ViewModeContextState = {
  viewMode: 'dark',
}

const reducer = (state: ViewModeContextState, action: ViewModeContextAction) => {
  return { ...state, [action.field]: action.value }
}

interface ViewModeContextType {
  settings: ViewModeContextState
  dispatch: React.Dispatch<ViewModeContextAction>
}

const initialContext: ViewModeContextType = {
  settings: ViewModeInitialContextState,
  dispatch: () => {},
}

export const ViewModeContext = createContext(initialContext)

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const [settings, dispatch] = useReducer(reducer, ViewModeInitialContextState)

  return (
    <ViewModeContext.Provider value={{ settings, dispatch }}>{children}</ViewModeContext.Provider>
  )
}
