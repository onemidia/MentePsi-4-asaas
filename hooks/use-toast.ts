"use client"

import * as React from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type Toast = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

// Estado Global (Singleton) para persistência entre rotas
let memoryState: Toast[] = []
const listeners: Array<(state: Toast[]) => void> = []
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function notifyListeners() {
  listeners.forEach((listener) => listener([...memoryState]))
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 9)
}

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const dismiss = React.useCallback((toastId?: string) => {
    if (toastId) {
      if (timers.has(toastId)) {
        clearTimeout(timers.get(toastId))
        timers.delete(toastId)
      }
      memoryState = memoryState.filter((t) => t.id !== toastId)
    } else {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      memoryState = []
    }
    notifyListeners()
  }, [])

  const toast = React.useCallback(({ ...props }: Omit<Toast, "id">) => {
    const id = generateId()
    
    const newToast: Toast = { id, ...props }
    
    memoryState = [newToast, ...memoryState].slice(0, TOAST_LIMIT)
    notifyListeners()

    const timer = setTimeout(() => {
      dismiss(id)
    }, TOAST_REMOVE_DELAY)
    
    timers.set(id, timer)

    return id
  }, [dismiss])

  // UX: Pause on Hover
  const pause = React.useCallback((id: string) => {
    if (timers.has(id)) {
      clearTimeout(timers.get(id))
      timers.delete(id)
    }
  }, [])

  const resume = React.useCallback((id: string) => {
    if (!timers.has(id) && memoryState.find(t => t.id === id)) {
      const timer = setTimeout(() => {
        dismiss(id)
      }, TOAST_REMOVE_DELAY)
      timers.set(id, timer)
    }
  }, [dismiss])

  return {
    toast,
    toasts: state,
    dismiss,
    pause,
    resume
  }
}